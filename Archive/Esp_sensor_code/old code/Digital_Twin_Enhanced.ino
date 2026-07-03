#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClient.h>
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

/* ====== System Status Constants ====== */
#define STATUS_STARTUP_VAL      0
#define STATUS_CONNECTING_VAL   1
#define STATUS_CONNECTED_VAL    2
#define STATUS_REGISTERED_VAL   3
#define STATUS_RETRYING_VAL     4
#define STATUS_ERROR_VAL        5
#define STATUS_CONFIG_VAL       6

int systemStatus = STATUS_STARTUP_VAL;

/* ====== Default AP (for config portal) ====== */
const char* defaultAPSSID = "ESP32_DigitalTwin";
const char* defaultAPPASS = "sensor123";

/* ====== Configuration Variables (stored in Preferences) ====== */
String wifiSSID         = "DIGISOL";
String wifiPassword     = "admin@123";

// Enhanced sensor configuration with pairing
String sensorID         = "";               // Unique sensor identifier (auto-generated)
String sensorName       = "ESP32 Sensor";   // Human readable name
String sensorType       = "environmental";   // Type: environmental, security, hvac, etc.
String assetID          = "";               // BIM Asset ID (assigned via dashboard)
String zoneID           = "Zone1";          // Zone identifier
String vendorID         = "DigitalTwin_Corp"; // Vendor identifier
String pairingCode      = "";               // Pairing code for secure registration
bool isPaired           = false;            // Pairing status

// Server configuration
String serverHost       = "192.168.2.15";  // Server IP
String serverPort       = "3000";          // Server port
bool useHTTPS           = false;            // HTTP or HTTPS

/* ====== API Endpoints ====== */
String getBaseURL() {
  String protocol = useHTTPS ? "https" : "http";
  return protocol + "://" + serverHost + ":" + serverPort;
}

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
const unsigned long DHT_READ_INTERVAL = 2000;   // 2 seconds for DHT22
const unsigned long HEARTBEAT_INTERVAL = 30000; // 30 seconds heartbeat
const unsigned long RECONNECT_INTERVAL = 5000;  // 5 seconds WiFi reconnect
unsigned long lastDHTReadTime = 0;
unsigned long lastHeartbeatTime = 0;
unsigned long lastReconnectAttempt = 0;

/* ====== Thresholds ====== */
const float TEMP_THRESHOLD = 0.2;  // Send update if ΔT >= 0.2°C
const float HUMI_THRESHOLD = 0.5;  // Send update if ΔH >= 0.5%

/* ====== Config Switch Logic ====== */
const unsigned long CONFIG_PRESS_DURATION = 3000; // 3 seconds
bool switchWasPressed = false;
unsigned long switchPressStart = 0;

/* ====== Status Indicators ====== */
enum SystemStatus {
  STATUS_STARTING,
  STATUS_CONNECTING_ENUM,
  STATUS_CONNECTED_ENUM,
  STATUS_ERROR_ENUM,
  STATUS_CONFIG_MODE
};
SystemStatus currentStatus = STATUS_STARTING;

/* ====== Function Declarations ====== */
void setSystemStatus(SystemStatus status);
void updateStatusIndicators();
bool connectToWiFi();
void maintainWiFiConnection();
void readSensors();
void sendSensorUpdates();
void sendHeartbeat();
void handleConfigSwitch();
void startConfigPortal();
void registerSensor();
void loadConfiguration();
void saveConfiguration();

void setup() {
  Serial.begin(115200);
  Serial.println("\n=== Digital Twin Sensor Starting ===");

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
  setSystemStatus(STATUS_CONNECTING_VAL);
  
  // Connect to WiFi
  if (!connectToWiFi()) {
    Serial.println("Failed to connect to WiFi, entering config mode");
    startConfigPortal();
  } else {
    setSystemStatus(STATUS_CONNECTED_VAL);
    
    // Check if sensor is paired
    if (!isPaired || pairingCode.isEmpty()) {
      Serial.println("Sensor not paired. Starting configuration portal...");
      startConfigPortal();
    } else {
      Serial.println("Sensor is paired. Starting registration with retry...");
      registerSensorWithRetry();
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
  
  delay(100); // Small delay to prevent overwhelming the system
}

void setSystemStatus(int status) {
  systemStatus = status;
  String statusName;
  switch (status) {
    case STATUS_STARTUP_VAL: statusName = "STARTUP"; break;
    case STATUS_CONNECTING_VAL: statusName = "CONNECTING"; break;
    case STATUS_CONNECTED_VAL: statusName = "CONNECTED"; break;
    case STATUS_REGISTERED_VAL: statusName = "REGISTERED"; break;
    case STATUS_RETRYING_VAL: statusName = "RETRYING"; break;
    case STATUS_ERROR_VAL: statusName = "ERROR"; break;
    case STATUS_CONFIG_VAL: statusName = "CONFIG"; break;
    default: statusName = "UNKNOWN"; break;
  }
  Serial.println("Status: " + statusName);
}

void updateStatusIndicators() {
  static unsigned long lastBlink = 0;
  static bool ledState = false;
  unsigned long interval;
  
  // Set blink pattern based on system status
  switch (systemStatus) {
    case STATUS_STARTUP_VAL:
    case STATUS_CONNECTING_VAL:
      interval = 500; // Fast blink
      break;
    case STATUS_CONNECTED_VAL:
      interval = 1000; // Medium blink
      break;
    case STATUS_REGISTERED_VAL:
      digitalWrite(LED_PIN, HIGH); // Solid on
      digitalWrite(STATUS_LED_PIN, HIGH);
      return;
    case STATUS_RETRYING_VAL:
      interval = 250; // Very fast blink
      break;
    case STATUS_ERROR_VAL:
      interval = 2000; // Slow blink
      break;
    case STATUS_CONFIG_VAL:
      interval = 100; // Ultra fast blink
      break;
    default:
      interval = 1000;
      break;
  }
  
  // Blink LEDs
  if (millis() - lastBlink >= interval) {
    lastBlink = millis();
    ledState = !ledState;
    digitalWrite(LED_PIN, ledState);
    digitalWrite(STATUS_LED_PIN, ledState);
  }
}

void generateSensorID() {
  if (sensorID.isEmpty()) {
    // Generate unique sensor ID using MAC address
    String mac = WiFi.macAddress();
    mac.replace(":", "");
    sensorID = "ESP32_" + mac.substring(6); // Use last 6 chars of MAC
    Serial.println("Generated Sensor ID: " + sensorID);
    saveConfiguration(); // Save immediately
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
  pairingCode = preferences.getString("pairingCode", pairingCode);
  isPaired = preferences.getBool("isPaired", isPaired);
  serverHost = preferences.getString("serverHost", serverHost);
  serverPort = preferences.getString("serverPort", serverPort);
  useHTTPS = preferences.getBool("useHTTPS", useHTTPS);
  
  Serial.println("Configuration loaded:");
  Serial.println("  Sensor ID: " + sensorID);
  Serial.println("  Sensor Name: " + sensorName);
  Serial.println("  Zone ID: " + zoneID);
  Serial.println("  Pairing Status: " + String(isPaired ? "Paired" : "Not Paired"));
  Serial.println("  Server: " + getBaseURL());
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
  preferences.putString("pairingCode", pairingCode);
  preferences.putBool("isPaired", isPaired);
  preferences.putString("serverHost", serverHost);
  preferences.putString("serverPort", serverPort);
  preferences.putBool("useHTTPS", useHTTPS);
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
    setSystemStatus(STATUS_CONNECTING_VAL);
    lastReconnectAttempt = millis();
    
    if (connectToWiFi()) {
      setSystemStatus(STATUS_CONNECTED_VAL);
      registerSensor();
    } else {
      setSystemStatus(STATUS_ERROR_VAL);
    }
  }
}

void readSensors() {
  // Read digital sensors every loop
  currentState.doorState = digitalRead(DOOR_SENSOR_PIN) == LOW ? 1 : 0; // Inverted logic
  currentState.lightState = digitalRead(LDR_PIN);
  
  // Read DHT22 with interval
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
  if (!currentState.isOnline) return;
  
  // Check for significant changes
  bool shouldSend = false;
  
  // Check door state change
  if (currentState.doorState != lastSentState.doorState) {
    sendSensorData("doorState", String(currentState.doorState == 1 ? "true" : "false"));
    shouldSend = true;
  }
  
  // Check light state change
  if (currentState.lightState != lastSentState.lightState) {
    sendSensorData("lightState", String(currentState.lightState == 1 ? "true" : "false"));
    shouldSend = true;
  }
  
  // Check temperature/humidity changes
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

void sendSensorData(String dataType, String data) {
  if (WiFi.status() != WL_CONNECTED) return;
  
  HTTPClient http;
  http.begin(getBaseURL() + "/api/sensor-data");
  http.addHeader("Content-Type", "application/json");
  
  StaticJsonDocument<400> payload;
  payload["sensorID"] = sensorID;
  payload["dataType"] = dataType;
  payload["timestamp"] = millis();
  payload["zoneID"] = zoneID;
  payload["assetID"] = assetID;
  
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
  
  Serial.println("Sending " + dataType + ": " + payloadStr);
  
  int httpResponseCode = http.POST(payloadStr);
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("Response (" + String(httpResponseCode) + "): " + response);
  } else {
    Serial.println("Error sending " + dataType + ": " + String(httpResponseCode));
    setSystemStatus(STATUS_ERROR_VAL);
  }
  
  http.end();
}

void registerSensor() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  HTTPClient http;
  http.begin(getBaseURL() + "/api/sensors");
  http.addHeader("Content-Type", "application/json");
  
  StaticJsonDocument<300> payload;
  payload["id"] = sensorID;
  payload["name"] = sensorName;
  payload["type"] = sensorType;
  payload["zoneID"] = zoneID;
  payload["assetID"] = assetID;
  payload["vendorID"] = vendorID;
  payload["isOnline"] = true;
  payload["ipAddress"] = WiFi.localIP().toString();
  payload["macAddress"] = WiFi.macAddress();
  
  String payloadStr;
  serializeJson(payload, payloadStr);
  
  Serial.println("Registering sensor: " + payloadStr);
  
  int httpResponseCode = http.POST(payloadStr);
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("Registration response (" + String(httpResponseCode) + "): " + response);
  } else {
    Serial.println("Registration failed: " + String(httpResponseCode));
  }
  
  http.end();
}

// Auto-retry registration with exponential back-off
void registerSensorWithRetry() {
  const int maxRetries = 10;
  const unsigned long baseDelay = 5000; // Start with 5 seconds
  const unsigned long maxDelay = 300000; // Max 5 minutes
  
  for (int attempt = 1; attempt <= maxRetries; attempt++) {
    Serial.println("Registration attempt " + String(attempt) + "/" + String(maxRetries));
    
    if (attemptPairedRegistration()) {
      Serial.println("✓ Sensor successfully registered!");
      setSystemStatus(STATUS_REGISTERED_VAL);
      return;
    }
    
    if (attempt < maxRetries) {
      // Calculate exponential back-off delay
      unsigned long delayMs = baseDelay * pow(2, attempt - 1);
      if (delayMs > maxDelay) delayMs = maxDelay;
      
      Serial.println("Registration failed. Retrying in " + String(delayMs/1000) + " seconds...");
      setSystemStatus(STATUS_RETRYING_VAL);
      
      // Wait with periodic status updates
      unsigned long startTime = millis();
      while (millis() - startTime < delayMs) {
        updateStatusIndicators();
        delay(1000);
        
        // Check for config switch during wait
        if (digitalRead(CONFIG_SWITCH_PIN) == LOW) {
          Serial.println("Config switch pressed. Entering configuration mode...");
          startConfigPortal();
          return;
        }
      }
    }
  }
  
  Serial.println("✗ Registration failed after " + String(maxRetries) + " attempts");
  setSystemStatus(STATUS_ERROR_VAL);
}

// Attempt registration with pairing code
bool attemptPairedRegistration() {
  if (WiFi.status() != WL_CONNECTED) return false;
  
  HTTPClient http;
  http.begin(getBaseURL() + "/api/sensors/pair");
  http.addHeader("Content-Type", "application/json");
  
  StaticJsonDocument<400> payload;
  payload["sensorID"] = sensorID;
  payload["pairingCode"] = pairingCode;
  payload["name"] = sensorName;
  payload["type"] = sensorType;
  payload["zoneID"] = zoneID;
  payload["assetID"] = assetID;
  payload["vendorID"] = vendorID;
  payload["isOnline"] = true;
  payload["ipAddress"] = WiFi.localIP().toString();
  payload["macAddress"] = WiFi.macAddress();
  
  String payloadStr;
  serializeJson(payload, payloadStr);
  
  Serial.println("Attempting paired registration...");
  
  int httpResponseCode = http.POST(payloadStr);
  http.end();
  
  if (httpResponseCode == 200) {
    Serial.println("✓ Paired registration successful");
    return true;
  } else if (httpResponseCode == 400) {
    Serial.println("✗ Invalid pairing code or sensor already paired");
    return false;
  } else if (httpResponseCode == 404) {
    Serial.println("✗ Sensor not found in dashboard. Please add sensor first.");
    return false;
  } else {
    Serial.println("✗ Registration failed: HTTP " + String(httpResponseCode));
    return false;
  }
}

void sendHeartbeat() {
  if (millis() - lastHeartbeatTime < HEARTBEAT_INTERVAL) return;
  if (WiFi.status() != WL_CONNECTED) return;
  
  HTTPClient http;
  http.begin(getBaseURL() + "/api/sensors/" + sensorID + "/heartbeat");
  http.addHeader("Content-Type", "application/json");
  
  StaticJsonDocument<200> payload;
  payload["timestamp"] = millis();
  payload["uptime"] = millis() / 1000;
  payload["freeHeap"] = ESP.getFreeHeap();
  payload["rssi"] = WiFi.RSSI();
  
  String payloadStr;
  serializeJson(payload, payloadStr);
  
  int httpResponseCode = http.POST(payloadStr);
  if (httpResponseCode > 0) {
    Serial.println("Heartbeat sent successfully");
  } else {
    Serial.println("Heartbeat failed: " + String(httpResponseCode));
  }
  
  http.end();
  lastHeartbeatTime = millis();
}

void handleConfigSwitch() {
  bool pressed = (digitalRead(CONFIG_SWITCH_PIN) == LOW);
  
  if (pressed) {
    if (!switchWasPressed) {
      switchWasPressed = true;
      switchPressStart = millis();
      Serial.println("Config switch pressed...");
    } else {
      if (millis() - switchPressStart >= CONFIG_PRESS_DURATION) {
        Serial.println("Config switch held for 3 seconds - entering config mode");
        startConfigPortal();
        switchWasPressed = false; // Reset to prevent repeated triggers
      }
    }
  } else {
    if (switchWasPressed) {
      Serial.println("Config switch released");
      switchWasPressed = false;
    }
  }
}

void startConfigPortal() {
  setSystemStatus(STATUS_CONFIG_VAL);
  Serial.println("\n=== ENTERING CONFIG MODE ===");
  
  WiFi.disconnect(true);
  WiFi.mode(WIFI_AP);
  WiFi.softAP(defaultAPSSID, defaultAPPASS);
  
  Serial.println("Access Point started:");
  Serial.println("  SSID: " + String(defaultAPSSID));
  Serial.println("  Password: " + String(defaultAPPASS));
  Serial.println("  IP: " + WiFi.softAPIP().toString());
  
  server.on("/", HTTP_GET, handleConfigRoot);
  server.on("/save", HTTP_POST, handleConfigSave);
  server.on("/restart", HTTP_POST, handleRestart);
  server.begin();
  
  while (true) {
    server.handleClient();
    updateStatusIndicators();
    delay(10);
  }
}

void handleConfigRoot() {
  String html = R"(
<!DOCTYPE html>
<html>
<head>
    <title>Digital Twin Sensor Config</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; text-align: center; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; color: #555; }
        input, select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 16px; }
        button { background: #007bff; color: white; padding: 12px 24px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; }
        button:hover { background: #0056b3; }
        .section { border: 1px solid #eee; padding: 20px; margin: 20px 0; border-radius: 5px; }
        .section h3 { margin-top: 0; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏗️ Digital Twin Sensor Configuration</h1>
        <form action='/save' method='POST'>
            <div class="section">
                <h3>📶 WiFi Settings</h3>
                <div class="form-group">
                    <label>WiFi SSID:</label>
                    <input type='text' name='wifiSSID' value=')" + wifiSSID + R"(' required>
                </div>
                <div class="form-group">
                    <label>WiFi Password:</label>
                    <input type='password' name='wifiPassword' value=')" + wifiPassword + R"('>
                </div>
            </div>
            
            <div class="section">
                <h3>📡 Sensor Identity</h3>
                <div class="form-group">
                    <label>Sensor ID (Unique):</label>
                    <input type='text' name='sensorID' value=')" + sensorID + R"(' required>
                </div>
                <div class="form-group">
                    <label>Sensor Name:</label>
                    <input type='text' name='sensorName' value=')" + sensorName + R"(' required>
                </div>
                <div class="form-group">
                    <label>Sensor Type:</label>
                    <select name='sensorType'>
                        <option value='environmental'" + (sensorType == "environmental" ? " selected" : "") + R"(>Environmental</option>
                        <option value='security'" + (sensorType == "security" ? " selected" : "") + R"(>Security</option>
                        <option value='hvac'" + (sensorType == "hvac" ? " selected" : "") + R"(>HVAC</option>
                        <option value='structural'" + (sensorType == "structural" ? " selected" : "") + R"(>Structural</option>
                        <option value='other'" + (sensorType == "other" ? " selected" : "") + R"(>Other</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Zone ID:</label>
                    <input type='text' name='zoneID' value=')" + zoneID + R"('>
                </div>
                <div class="form-group">
                    <label>Asset ID (BIM Object - leave empty if not assigned):</label>
                    <input type='text' name='assetID' value=')" + assetID + R"('>
                </div>
            </div>
            
            <div class="section">
                <h3>🔐 Secure Pairing</h3>
                <div class="form-group">
                    <label>Pairing Code (from Dashboard):</label>
                    <input type='text' name='pairingCode' value=')" + pairingCode + R"(' placeholder="Enter pairing code from dashboard">
                    <small style="color: #666; font-size: 12px;">Get this code from the Digital Twin dashboard when adding a new sensor</small>
                </div>
                <div class="form-group">
                    <label>Pairing Status:</label>
                    <input type='text' value=')" + String(isPaired ? "✓ Paired" : "✗ Not Paired") + R"(' readonly style="background: #f8f9fa;">
                </div>
            </div>
            
            <div class="section">
                <h3>🌐 Server Settings</h3>
                <div class="form-group">
                    <label>Server Host/IP:</label>
                    <input type='text' name='serverHost' value=')" + serverHost + R"(' required>
                </div>
                <div class="form-group">
                    <label>Server Port:</label>
                    <input type='text' name='serverPort' value=')" + serverPort + R"(' required>
                </div>
                <div class="form-group">
                    <label>
                        <input type='checkbox' name='useHTTPS' value='true'" + (useHTTPS ? " checked" : "") + R"(>
                        Use HTTPS
                    </label>
                </div>
            </div>
            
            <button type='submit'>💾 Save Configuration</button>
        </form>
        
        <form action='/restart' method='POST' style='margin-top: 20px;'>
            <button type='submit' style='background: #28a745;'>🔄 Save & Restart</button>
        </form>
    </div>
</body>
</html>
  )";
  
  server.send(200, "text/html", html);
}

void handleConfigSave() {
  wifiSSID = server.arg("wifiSSID");
  wifiPassword = server.arg("wifiPassword");  
  sensorID = server.arg("sensorID");
  sensorName = server.arg("sensorName");
  sensorType = server.arg("sensorType");
  zoneID = server.arg("zoneID");
  assetID = server.arg("assetID");
  
  // Handle pairing code
  String newPairingCode = server.arg("pairingCode");
  if (newPairingCode != pairingCode) {
    pairingCode = newPairingCode;
    isPaired = false; // Reset pairing status when code changes
    Serial.println("New pairing code set: " + pairingCode);
  }
  
  serverHost = server.arg("serverHost");
  serverPort = server.arg("serverPort");
  useHTTPS = server.hasArg("useHTTPS");
  
  saveConfiguration();
  
  String html = R"(
    <html><body style='font-family: Arial; text-align: center; margin-top: 50px;'>
    <h2>✅ Configuration Saved!</h2>
    <p>Your settings have been saved successfully.</p>
    <p><a href='/'>← Back to Configuration</a></p>
    <p><strong>Restart the device to apply changes</strong></p>
    </body></html>
  )";
  
  server.send(200, "text/html", html);
}

void handleRestart() {
  String html = R"(
    <html><body style='font-family: Arial; text-align: center; margin-top: 50px;'>
    <h2>🔄 Restarting...</h2>
    <p>Device is restarting with new configuration.</p>
    <p>Please connect back to your WiFi network.</p>
    </body></html>
  )";
  
  server.send(200, "text/html", html);
  delay(2000);
  ESP.restart();
}

// Status functions removed - using the ones defined earlier