#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClient.h>
#include <WebServer.h>
#include <Preferences.h>
#include "DHT.h"
#include <math.h>

/* ====== Hardware Pins ====== */
#define DHTPIN            4       // DHT22 data pin
#define DHTTYPE           DHT22
#define LDR_PIN           13      // LDR module digital out (for light state)
#define DOOR_SENSOR_PIN   19      // Door sensor pin (used as generic sensor state)
#define CONFIG_SWITCH_PIN 25      // Pin for config switch
#define LED_PIN           2       // Built-in LED (for ESP32 DevKit V1)

DHT dht(DHTPIN, DHTTYPE);
Preferences preferences;
WebServer server(80);

/* ====== Default AP (for config portal) ====== */
const char* defaultAPSSID = "ESP32_Config";
const char* defaultAPPASS = "password123";

/* ====== Configuration Variables (stored in Preferences) ====== */
String wifiSSID         = "DIGISOL";
String wifiPassword     = "admin@123";

// New unified sensor configuration variables
String sensorID         = "Sensor001";   // Unique sensor identifier
String assetID          = "AssetA001";     // Unique asset identifier (if applicable)
String zoneID           = "Zone1";         // Zone identifier (can be non-unique)
String vendorID         = "VendorX";       // Vendor identifier (non-unique)

// API endpoints (update as needed)
String sensorApiUrl     = "https://192.168.2.15:3000/api/sensor-state";
String tempHumiApiUrl   = "https://192.168.2.15:3000/api/temp-humi";
String lightApiUrl      = "https://192.168.2.15:3000/api/light-state";

/* ====== Stored States (to detect changes) ====== */
int   lastdoorState   = -1;    // For door sensor state; -1 = unknown
int   lastLightState    = -1;    // For light state; -1 = unknown
float lastTemp          = -999.0;
float lastHumi          = -999.0;

/* ====== DHT Reading Interval & Thresholds ====== */
const unsigned long DHT_READ_INTERVAL = 2000; // 2 seconds for DHT22
unsigned long lastDHTReadTime         = 0;
const float TEMP_THRESHOLD            = 0.2;  // Send update if ΔT >= 0.2°C
const float HUMI_THRESHOLD            = 0.5;  // Send update if ΔH >= 0.5%

/* ====== Config Switch Press Logic ====== */
const unsigned long CONFIG_PRESS_DURATION = 3000; // 3 seconds
bool switchWasPressed = false;
unsigned long switchPressStart = 0;

void setup() {
  Serial.begin(115200);

  // Configure sensor pins
  pinMode(DHTPIN, INPUT);
  pinMode(LDR_PIN, INPUT);
  pinMode(DOOR_SENSOR_PIN, INPUT_PULLUP);
  pinMode(CONFIG_SWITCH_PIN, INPUT_PULLUP); // Config switch to GND
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  dht.begin();
  preferences.begin("config", false);

  // Load stored configuration parameters
  wifiSSID       = preferences.getString("wifiSSID", wifiSSID);
  wifiPassword   = preferences.getString("wifiPassword", wifiPassword);
  sensorID       = preferences.getString("sensorID", sensorID);
  assetID        = preferences.getString("assetID", assetID);
  zoneID         = preferences.getString("zoneID", zoneID);
  vendorID       = preferences.getString("vendorID", vendorID);
  sensorApiUrl   = preferences.getString("sensorApiUrl", sensorApiUrl);
  tempHumiApiUrl = preferences.getString("tempHumiApiUrl", tempHumiApiUrl);
  lightApiUrl    = preferences.getString("lightApiUrl", lightApiUrl);

  // Connect to WiFi
  if (!connectToWiFi()) {
    startConfigPortal(); // If unable to connect, enter config mode
  }
}

bool connectToWiFi() {
  WiFi.begin(wifiSSID.c_str(), wifiPassword.c_str());
  Serial.print("Connecting to Wi-Fi");
  for (int i = 0; i < 10; i++) {
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("\nConnected to Wi-Fi");
      Serial.print("IP Address: ");
      Serial.println(WiFi.localIP());
      return true;
    }
    Serial.print(".");
    delay(1000);
  }
  Serial.println("\nFailed to connect to Wi-Fi");
  return false;
}

void loop() {
  // Check if configuration switch is pressed
  checkConfigSwitch();

  // 1) Read door sensor (acting as a generic sensor state)
  int currentDoorSensorReading = digitalRead(DOOR_SENSOR_PIN);
  int currentdoorState = (currentDoorSensorReading == HIGH) ? 1 : 0;
  if (currentdoorState != lastdoorState) {
    lastdoorState = currentdoorState;
    senddoorState(lastdoorState);
  }

  // 2) Read light sensor (LDR)
  int currentLightReading = digitalRead(LDR_PIN);
  // Example: Assume LDR HIGH means dark; invert if needed
  int currentLightState = (currentLightReading == HIGH) ? 0 : 1;
  if (currentLightState != lastLightState) {
    lastLightState = currentLightState;
    sendLightState(lastLightState);
  }

  // 3) Read Temperature and Humidity every defined interval
  unsigned long now = millis();
  if (now - lastDHTReadTime >= DHT_READ_INTERVAL) {
    lastDHTReadTime = now;

    float newTemp = dht.readTemperature();  // in °C
    float newHumi = dht.readHumidity();       // in %
    if (!isnan(newTemp) && !isnan(newHumi)) {
      bool tempChanged = (fabs(newTemp - lastTemp) >= TEMP_THRESHOLD);
      bool humiChanged = (fabs(newHumi - lastHumi) >= HUMI_THRESHOLD);
      if (tempChanged || humiChanged) {
        lastTemp = newTemp;
        lastHumi = newHumi;
        sendTempAndHumiState(newTemp, newHumi);
      }
    } else {
      Serial.println("Failed to read from DHT sensor!");
    }
  }
  // Run continuously without delay
}

void checkConfigSwitch() {
  // Config switch is active LOW
  bool pressed = (digitalRead(CONFIG_SWITCH_PIN) == LOW);
  if (pressed) {
    if (!switchWasPressed) {
      // Button just pressed
      switchWasPressed = true;
      switchPressStart = millis();
    } else {
      // Already pressed; check duration
      if (millis() - switchPressStart >= CONFIG_PRESS_DURATION) {
        startConfigPortal();
      }
    }
  } else {
    switchWasPressed = false;
  }
}

void startConfigPortal() {
  Serial.println("\nEntering CONFIG MODE...");
  WiFi.disconnect(true);
  WiFi.mode(WIFI_AP);
  WiFi.softAP(defaultAPSSID, defaultAPPASS);

  server.on("/", HTTP_GET, []() {
    String html = "<h2>ESP32 Configuration</h2>";
    html += "<form action='/save' method='POST'>";
    html += "Wi-Fi SSID: <input type='text' name='ssid' value='" + wifiSSID + "'><br>";
    html += "Wi-Fi Password: <input type='text' name='password' value='" + wifiPassword + "'><br>";
    html += "Sensor ID: <input type='text' name='sensorID' value='" + sensorID + "'><br>";
    html += "Asset ID: <input type='text' name='assetID' value='" + assetID + "'><br>";
    html += "Zone ID: <input type='text' name='zoneID' value='" + zoneID + "'><br>";
    html += "Vendor ID: <input type='text' name='vendorID' value='" + vendorID + "'><br>";
    html += "Sensor API URL: <input type='text' name='sensorApiUrl' value='" + sensorApiUrl + "'><br>";
    html += "Temp/Humi API URL: <input type='text' name='tempHumiApiUrl' value='" + tempHumiApiUrl + "'><br>";
    html += "Light API URL: <input type='text' name='lightApiUrl' value='" + lightApiUrl + "'><br>";
    html += "<button type='submit'>Save</button>";
    html += "</form>";
    server.send(200, "text/html", html);
  });

  server.on("/save", HTTP_POST, []() {
    wifiSSID       = server.arg("ssid");
    wifiPassword   = server.arg("password");
    sensorID       = server.arg("sensorID");
    assetID        = server.arg("assetID");
    zoneID         = server.arg("zoneID");
    vendorID       = server.arg("vendorID");
    sensorApiUrl   = server.arg("sensorApiUrl");
    tempHumiApiUrl = server.arg("tempHumiApiUrl");
    lightApiUrl    = server.arg("lightApiUrl");

    preferences.putString("wifiSSID", wifiSSID);
    preferences.putString("wifiPassword", wifiPassword);
    preferences.putString("sensorID", sensorID);
    preferences.putString("assetID", assetID);
    preferences.putString("zoneID", zoneID);
    preferences.putString("vendorID", vendorID);
    preferences.putString("sensorApiUrl", sensorApiUrl);
    preferences.putString("tempHumiApiUrl", tempHumiApiUrl);
    preferences.putString("lightApiUrl", lightApiUrl);

    server.send(200, "text/plain", "Settings saved. Rebooting...");
    Serial.println("Settings saved. Rebooting...");
    delay(2000);
    ESP.restart();
  });

  server.begin();
  // In config mode, continuously handle client requests and blink LED
  while (true) {
    server.handleClient();
    blinkLed();
  }
}

void blinkLed() {
  static unsigned long lastBlink = 0;
  static bool ledState = false;
  unsigned long now = millis();
  if (now - lastBlink >= 500) { // Toggle LED every 500ms
    lastBlink = now;
    ledState = !ledState;
    digitalWrite(LED_PIN, ledState ? HIGH : LOW);
  }
}

/* ========== SENSOR STATE UPDATE (e.g., door sensor) ========== */
void senddoorState(int state) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(sensorApiUrl);
    http.addHeader("Content-Type", "application/json");
    // Build JSON payload with unified sensor data and new fields
    String payload = "{\"type\": \"doorState\",";
    payload += "\"sensorID\": \"" + sensorID + "\",";
    payload += "\"state\": " + String(state) + ",";
    payload += "\"assetID\": \"" + assetID + "\",";
    payload += "\"zoneID\": \"" + zoneID + "\",";
    payload += "\"vendorID\": \"" + vendorID + "\"}";
    
    Serial.println("Sending doorState: " + payload);
    int httpResponseCode = http.POST(payload);
    if (httpResponseCode > 0) {
      Serial.print("Response: ");
      Serial.println(http.getString());
    } else {
      Serial.println("Error sending doorState update");
    }
    http.end();
  }
}

/* ========== LIGHT STATE UPDATE ========== */
void sendLightState(int lightValue) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(lightApiUrl);
    http.addHeader("Content-Type", "application/json");
    String payload = "{\"type\": \"lightState\",";
    payload += "\"sensorID\": \"" + sensorID + "\",";
    payload += "\"state\": " + String(lightValue) + ",";
    payload += "\"assetID\": \"" + assetID + "\",";
    payload += "\"zoneID\": \"" + zoneID + "\",";
    payload += "\"vendorID\": \"" + vendorID + "\"}";
    
    Serial.println("Sending lightState: " + payload);
    int httpResponseCode = http.POST(payload);
    if (httpResponseCode > 0) {
      Serial.print("Response: ");
      Serial.println(http.getString());
    } else {
      Serial.println("Error sending lightState update");
    }
    http.end();
  }
}

/* ========== TEMPERATURE & HUMIDITY UPDATE ========== */
void sendTempAndHumiState(float temperature, float humidity) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(tempHumiApiUrl);
    http.addHeader("Content-Type", "application/json");
    String payload = "{\"type\": \"tempAndHumiState\",";
    payload += "\"sensorID\": \"" + sensorID + "\",";
    payload += "\"temperature\": " + String(temperature) + ",";
    payload += "\"humidity\": " + String(humidity) + ",";
    payload += "\"assetID\": \"" + assetID + "\",";
    payload += "\"zoneID\": \"" + zoneID + "\",";
    payload += "\"vendorID\": \"" + vendorID + "\"}";
    
    Serial.println("Sending tempAndHumiState: " + payload);
    int httpResponseCode = http.POST(payload);
    if (httpResponseCode > 0) {
      Serial.print("Response: ");
      Serial.println(http.getString());
    } else {
      Serial.println("Error sending tempAndHumiState update");
    }
    http.end();
  }
}
