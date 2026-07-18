#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <WebServer.h>
#include <Preferences.h>
#include <ArduinoJson.h>
#include "DHT.h"
#include <math.h>

/* ====== Hardware Pins ====== */
#define DHTPIN            4       // DHT22 data pin
#define DHTTYPE           DHT22
#define LDR_PIN           13      // LDR module digital out (for light state)
#define DOOR_SENSOR_PIN   19      // Door sensor pin
#define CONFIG_SWITCH_PIN 25      // Pin for config switch
#define LED_PIN           2       // Built-in LED (for ESP32 DevKit V1)
#define STATUS_LED_PIN    16      // External status LED (optional)

DHT dht(DHTPIN, DHTTYPE);
Preferences preferences;
WebServer server(80);

/* ====== AWS API Gateway Configuration ====== */
String AWS_API_ENDPOINT = "https://your-api-id.execute-api.region.amazonaws.com/prod";
String AWS_API_KEY = ""; // Optional: Your API Key if required
String AWS_REGION = "us-east-1";

/* ====== System Status Constants ====== */
#define STATUS_STARTUP      0
#define STATUS_CONNECTING   1
#define STATUS_CONNECTED    2
#define STATUS_REGISTERED   3
#define STATUS_RETRYING     4
#define STATUS_ERROR        5
#define STATUS_CONFIG       6

int systemStatus = STATUS_STARTUP;

/* ====== Configuration Variables ====== */
String wifiSSID         = "DIGISOL";
String wifiPassword     = "admin@123";
String sensorID         = "";
String sensorName       = "ESP32 Sensor";
String sensorType       = "environmental";
String assetID          = "";
String zoneID           = "Zone1";
String vendorID         = "DigitalTwin_Corp";
bool useAWS             = true;

/* ====== Sensor States ====== */
struct SensorState {
  int doorState = -1;
  int lightState = -1;
  float temperature = -999.0;
  float humidity = -999.0;
  bool isOnline = false;
  unsigned long lastHeartbeat = 0;
};

SensorState currentState;
SensorState lastSentState;

/* ====== Timing Configuration ====== */
const unsigned long DHT_READ_INTERVAL = 2000;
const unsigned long HEARTBEAT_INTERVAL = 30000;
const unsigned long RECONNECT_INTERVAL = 5000;
unsigned long lastDHTReadTime = 0;
unsigned long lastHeartbeatTime = 0;
unsigned long lastReconnectAttempt = 0;

/* ====== Thresholds ====== */
const float TEMP_THRESHOLD = 0.2;
const float HUMI_THRESHOLD = 0.5;

void setup() {
  Serial.begin(115200);
  Serial.println("\n=== Digital Twin AWS API Sensor Starting ===");

  // Configure pins
  pinMode(DHTPIN, INPUT);
  pinMode(LDR_PIN, INPUT);
  pinMode(DOOR_SENSOR_PIN, INPUT_PULLUP);
  pinMode(CONFIG_SWITCH_PIN, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);
  pinMode(STATUS_LED_PIN, OUTPUT);
  
  // Initialize peripherals
  dht.begin();
  preferences.begin("digitwin", false);
  
  // Load configuration
  loadConfiguration();
  
  // Generate sensor ID if not set
  generateSensorID();
  
  // Set initial status
  setSystemStatus(STATUS_CONNECTING);
  
  // Connect to WiFi
  if (!connectToWiFi()) {
    Serial.println("Failed to connect to WiFi, entering config mode");
    startConfigPortal();
  } else {
    setSystemStatus(STATUS_CONNECTED);
    
    if (useAWS) {
      registerSensorWithAWS();
    }
  }
  
  Serial.println("=== Setup Complete ===");
}

void loop() {
  // Handle config switch
  handleConfigSwitch();
  
  // Maintain WiFi connection
  maintainWiFiConnection();
  
  // Read sensors
  readSensors();
  
  // Send updates if needed
  sendSensorUpdates();
  
  // Send heartbeat
  sendHeartbeat();
  
  // Update status indicators
  updateStatusIndicators();
  
  delay(100);
}

void registerSensorWithAWS() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  WiFiClientSecure client;
  client.setInsecure(); // For development only - use proper certificates in production
  
  HTTPClient http;
  http.begin(client, AWS_API_ENDPOINT + "/sensors");
  http.addHeader("Content-Type", "application/json");
  
  if (!AWS_API_KEY.isEmpty()) {
    http.addHeader("X-API-Key", AWS_API_KEY);
  }
  
  StaticJsonDocument<400> payload;
  payload["sensorId"] = sensorID;
  payload["name"] = sensorName;
  payload["type"] = sensorType;
  payload["zoneId"] = zoneID;
  payload["assetId"] = assetID;
  payload["vendorId"] = vendorID;
  payload["isOnline"] = true;
  payload["ipAddress"] = WiFi.localIP().toString();
  payload["macAddress"] = WiFi.macAddress();
  payload["timestamp"] = millis();
  
  String payloadStr;
  serializeJson(payload, payloadStr);
  
  Serial.println("Registering sensor with AWS: " + payloadStr);
  
  int httpResponseCode = http.POST(payloadStr);
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("AWS Registration response (" + String(httpResponseCode) + "): " + response);
    
    if (httpResponseCode == 200 || httpResponseCode == 201) {
      setSystemStatus(STATUS_REGISTERED);
    }
  } else {
    Serial.println("AWS Registration failed: " + String(httpResponseCode));
    setSystemStatus(STATUS_ERROR);
  }
  
  http.end();
}

void sendSensorData(String dataType, String data) {
  if (!useAWS || WiFi.status() != WL_CONNECTED) return;
  
  WiFiClientSecure client;
  client.setInsecure(); // For development only
  
  HTTPClient http;
  http.begin(client, AWS_API_ENDPOINT + "/sensor-data");
  http.addHeader("Content-Type", "application/json");
  
  if (!AWS_API_KEY.isEmpty()) {
    http.addHeader("X-API-Key", AWS_API_KEY);
  }
  
  StaticJsonDocument<400> payload;
  payload["sensorId"] = sensorID;
  payload["dataType"] = dataType;
  payload["timestamp"] = millis();
  payload["zoneId"] = zoneID;
  payload["assetId"] = assetID;
  
  if (dataType == "tempAndHumi") {
    StaticJsonDocument<100> tempHumiData;
    deserializeJson(tempHumiData, data);
    payload["data"] = tempHumiData;
  } else {
    StaticJsonDocument<50> stateData;
    stateData["state"] = (data == "true");
    payload["data"] = stateData;
  }
  
  String payloadStr;
  serializeJson(payload, payloadStr);
  
  Serial.println("Sending to AWS " + dataType + ": " + payloadStr);
  
  int httpResponseCode = http.POST(payloadStr);
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("AWS Response (" + String(httpResponseCode) + "): " + response);
  } else {
    Serial.println("AWS Error sending " + dataType + ": " + String(httpResponseCode));
    setSystemStatus(STATUS_ERROR);
  }
  
  http.end();
}

void sendHeartbeat() {
  if (millis() - lastHeartbeatTime < HEARTBEAT_INTERVAL) return;
  if (!useAWS || WiFi.status() != WL_CONNECTED) return;
  
  WiFiClientSecure client;
  client.setInsecure(); // For development only
  
  HTTPClient http;
  http.begin(client, AWS_API_ENDPOINT + "/sensors/" + sensorID + "/heartbeat");
  http.addHeader("Content-Type", "application/json");
  
  if (!AWS_API_KEY.isEmpty()) {
    http.addHeader("X-API-Key", AWS_API_KEY);
  }
  
  StaticJsonDocument<300> payload;
  payload["sensorId"] = sensorID;
  payload["timestamp"] = millis();
  payload["uptime"] = millis() / 1000;
  payload["freeHeap"] = ESP.getFreeHeap();
  payload["rssi"] = WiFi.RSSI();
  payload["temperature"] = currentState.temperature;
  payload["humidity"] = currentState.humidity;
  payload["doorState"] = currentState.doorState;
  payload["lightState"] = currentState.lightState;
  
  String payloadStr;
  serializeJson(payload, payloadStr);
  
  int httpResponseCode = http.POST(payloadStr);
  if (httpResponseCode > 0) {
    Serial.println("AWS Heartbeat sent successfully");
  } else {
    Serial.println("AWS Heartbeat failed: " + String(httpResponseCode));
  }
  
  http.end();
  lastHeartbeatTime = millis();
}

// Include all the other existing functions
void setSystemStatus(int status) {
  systemStatus = status;
  String statusName;
  switch (status) {
    case STATUS_STARTUP: statusName = "STARTUP"; break;
    case STATUS_CONNECTING: statusName = "CONNECTING"; break;
    case STATUS_CONNECTED: statusName = "CONNECTED"; break;
    case STATUS_REGISTERED: statusName = "REGISTERED"; break;
    case STATUS_RETRYING: statusName = "RETRYING"; break;
    case STATUS_ERROR: statusName = "ERROR"; break;
    case STATUS_CONFIG: statusName = "CONFIG"; break;
    default: statusName = "UNKNOWN"; break;
  }
  Serial.println("Status: " + statusName);
}

void updateStatusIndicators() {
  static unsigned long lastBlink = 0;
  static bool ledState = false;
  unsigned long interval;
  
  switch (systemStatus) {
    case STATUS_STARTUP:
    case STATUS_CONNECTING:
      interval = 500; break;
    case STATUS_CONNECTED:
      interval = 1000; break;
    case STATUS_REGISTERED:
      digitalWrite(LED_PIN, HIGH);
      digitalWrite(STATUS_LED_PIN, HIGH);
      return;
    case STATUS_RETRYING:
      interval = 250; break;
    case STATUS_ERROR:
      interval = 2000; break;
    case STATUS_CONFIG:
      interval = 100; break;
    default:
      interval = 1000; break;
  }
  
  if (millis() - lastBlink >= interval) {
    lastBlink = millis();
    ledState = !ledState;
    digitalWrite(LED_PIN, ledState);
    digitalWrite(STATUS_LED_PIN, ledState);
  }
}

void generateSensorID() {
  if (sensorID.isEmpty()) {
    String mac = WiFi.macAddress();
    mac.replace(":", "");
    sensorID = "ESP32_" + mac.substring(6);
    Serial.println("Generated Sensor ID: " + sensorID);
    saveConfiguration();
  }
}

void loadConfiguration() {
  wifiSSID = preferences.getString("wifiSSID", wifiSSID);
  wifiPassword = preferences.getString("wifiPassword", wifiPassword);
  sensorID = preferences.getString("sensorID", sensorID);
  sensorName = preferences.getString("sensorName", sensorName);
  sensorType = preferences.getString("sensorType", sensorType);
  assetID = preferences.getString("assetID", assetID);
  zoneID = preferences.getString("zoneID", zoneID);
  vendorID = preferences.getString("vendorID", vendorID);
  AWS_API_ENDPOINT = preferences.getString("awsEndpoint", AWS_API_ENDPOINT);
  AWS_API_KEY = preferences.getString("awsApiKey", AWS_API_KEY);
  AWS_REGION = preferences.getString("awsRegion", AWS_REGION);
  useAWS = preferences.getBool("useAWS", useAWS);
  
  Serial.println("Configuration loaded:");
  Serial.println("  Sensor ID: " + sensorID);
  Serial.println("  AWS Endpoint: " + AWS_API_ENDPOINT);
  Serial.println("  Use AWS: " + String(useAWS ? "Yes" : "No"));
}

void saveConfiguration() {
  preferences.putString("wifiSSID", wifiSSID);
  preferences.putString("wifiPassword", wifiPassword);
  preferences.putString("sensorID", sensorID);
  preferences.putString("sensorName", sensorName);
  preferences.putString("sensorType", sensorType);
  preferences.putString("assetID", assetID);
  preferences.putString("zoneID", zoneID);
  preferences.putString("vendorID", vendorID);
  preferences.putString("awsEndpoint", AWS_API_ENDPOINT);
  preferences.putString("awsApiKey", AWS_API_KEY);
  preferences.putString("awsRegion", AWS_REGION);
  preferences.putBool("useAWS", useAWS);
  Serial.println("Configuration saved");
}

bool connectToWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(wifiSSID.c_str(), wifiPassword.c_str());
  Serial.print("Connecting to Wi-Fi: " + wifiSSID);
  
  for (int i = 0; i < 20; i++) {
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("\nWiFi Connected!");
      Serial.println("IP Address: " + WiFi.localIP().toString());
      currentState.isOnline = true;
      return true;
    }
    Serial.print(".");
    delay(500);
  }
  
  Serial.println("\nWiFi connection failed");
  currentState.isOnline = false;
  return false;
}

void maintainWiFiConnection() {
  if (WiFi.status() != WL_CONNECTED && millis() - lastReconnectAttempt > RECONNECT_INTERVAL) {
    Serial.println("WiFi disconnected, attempting reconnection...");
    setSystemStatus(STATUS_CONNECTING);
    lastReconnectAttempt = millis();
    
    if (connectToWiFi()) {
      setSystemStatus(STATUS_CONNECTED);
      if (useAWS) {
        registerSensorWithAWS();
      }
    } else {
      setSystemStatus(STATUS_ERROR);
    }
  }
}

void readSensors() {
  currentState.doorState = digitalRead(DOOR_SENSOR_PIN) == LOW ? 1 : 0;
  currentState.lightState = digitalRead(LDR_PIN);
  
  if (millis() - lastDHTReadTime >= DHT_READ_INTERVAL) {
    float temp = dht.readTemperature();
    float humi = dht.readHumidity();
    
    if (!isnan(temp) && !isnan(humi)) {
      currentState.temperature = temp;
      currentState.humidity = humi;
    }
    
    lastDHTReadTime = millis();
  }
}

void sendSensorUpdates() {
  if (!currentState.isOnline || !useAWS) return;
  
  bool shouldSend = false;
  
  if (currentState.doorState != lastSentState.doorState) {
    sendSensorData("doorState", String(currentState.doorState == 1 ? "true" : "false"));
    shouldSend = true;
  }
  
  if (currentState.lightState != lastSentState.lightState) {
    sendSensorData("lightState", String(currentState.lightState == 1 ? "true" : "false"));
    shouldSend = true;
  }
  
  if (abs(currentState.temperature - lastSentState.temperature) >= TEMP_THRESHOLD ||
      abs(currentState.humidity - lastSentState.humidity) >= HUMI_THRESHOLD) {
    
    StaticJsonDocument<200> tempHumiData;
    tempHumiData["temperature"] = currentState.temperature;
    tempHumiData["humidity"] = currentState.humidity;
    
    String tempHumiStr;
    serializeJson(tempHumiData, tempHumiStr);
    sendSensorData("tempAndHumi", tempHumiStr);
    shouldSend = true;
  }
  
  if (shouldSend) {
    lastSentState = currentState;
  }
}

void handleConfigSwitch() {
  bool pressed = (digitalRead(CONFIG_SWITCH_PIN) == LOW);
  
  if (pressed) {
    static bool switchWasPressed = false;
    static unsigned long switchPressStart = 0;
    
    if (!switchWasPressed) {
      switchWasPressed = true;
      switchPressStart = millis();
      Serial.println("Config switch pressed...");
    } else {
      if (millis() - switchPressStart >= 3000) {
        Serial.println("Config switch held for 3 seconds - entering config mode");
        startConfigPortal();
        switchWasPressed = false;
      }
    }
  }
}

void startConfigPortal() {
  // Implementation similar to original but with AWS configuration options
  Serial.println("Starting AWS configuration portal...");
  // ... (rest of the config portal code)
}