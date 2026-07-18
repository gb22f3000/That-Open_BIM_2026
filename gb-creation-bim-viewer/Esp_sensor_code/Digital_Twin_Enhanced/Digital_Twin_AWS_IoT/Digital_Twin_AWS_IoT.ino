#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClient.h>
#include <WebServer.h>
#include <Preferences.h>
#include <ArduinoJson.h>
#include "DHT.h"
#include <math.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include "time.h"

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

/* ====== AWS IoT Configuration ====== */
// TODO: Replace with your actual AWS IoT endpoint from AWS Console
const char* AWS_IOT_ENDPOINT = "a2o2rnz47gsekg-ats.iot.ap-south-1.amazonaws.com";
const int AWS_IOT_PORT = 8883;
// TODO: Replace with your actual Thing name from AWS IoT Console
const char* THING_NAME = "ESP32_DigitalTwin_Sensor";

// AWS IoT Core Certificate (you'll need to replace these)
const char AWS_CERT_CA[] PROGMEM = R"EOF(
-----BEGIN CERTIFICATE-----
MIIDQTCCAimgAwIBAgITBmyfz5m/jAo54vB4ikPmljZbyjANBgkqhkiG9w0BAQsF
ADA5MQswCQYDVQQGEwJVUzEPMA0GA1UEChMGQW1hem9uMRkwFwYDVQQDExBBbWF6
b24gUm9vdCBDQSAxMB4XDTE1MDUyNjAwMDAwMFoXDTM4MDExNzAwMDAwMFowOTEL
MAkGA1UEBhMCVVMxDzANBgNVBAoTBkFtYXpvbjEZMBcGA1UEAxMQQW1hem9uIFJv
b3QgQ0EgMTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALJ4gHHKeNXj
ca9HgFB0fW7Y14h29Jlo91ghYPl0hAEvrAIthtOgQ3pOsqTQNroBvo3bSMgHFzZM
9O6II8c+6zf1tRn4SWiw3te5djgdYZ6k/oI2peVKVuRF4fn9tBb6dNqcmzU5L/qw
IFAGbHrQgLKm+a/sRxmPUDgH3KKHOVj4utWp+UhnMJbulHheb4mjUcAwhmahRWa6
VOujw5H5SNz/0egwLX0tdHA114gk957EWW67c4cX8jJGKLhD+rcdqsq08p8kDi1L
93FcXmn/6pUCyziKrlA4b9v7LWIbxcceVOF34GfID5yHI9Y/QCB/IIDEgEw+OyQm
jgSubJrIqg0CAwEAAaNCMEAwDwYDVR0TAQH/BAUwAwEB/zAOBgNVHQ8BAf8EBAMC
AYYwHQYDVR0OBBYEFIQYzIU07LwMlJQuCFmcx7IQTgoIMA0GCSqGSIb3DQEBCwUA
A4IBAQCY8jdaQZChGsV2USggNiMOruYou6r4lK5IpDB/G/wkjUu0yKGX9rbxenDI
U5PMCCjjmCXPI6T53iHTfIUJrU6adTrCC2qJeHZERxhlbI1Bjjt/msv0tadQ1wUs
N+gDS63pYaACbvXy8MWy7Vu33PqUXHeeE6V/Uq2V8viTO96LXFvKWlJbYK8U90vv
o/ufQJVtMVT8QtPHRh8jrdkPSHCa2XV4cdFyQzR1bldZwgJcJmApzyMZFo6IQ6XU
5MsI+yMRQ+hDKXJioaldXgjUkK642M4UwtBV8ob2xJNDd2ZhwLnoQdeXeGADbkpy
rqXRfboQnoZsG4q5WTP468SQvvG5
-----END CERTIFICATE-----
)EOF";

const char AWS_CERT_CRT[] PROGMEM = R"EOF(
-----BEGIN CERTIFICATE-----
MIIDWTCCAkGgAwIBAgIUQThq/BJVlFAsN/344fAbdzWwP/YwDQYJKoZIhvcNAQEL
BQAwTTFLMEkGA1UECwxCQW1hem9uIFdlYiBTZXJ2aWNlcyBPPUFtYXpvbi5jb20g
SW5jLiBMPVNlYXR0bGUgU1Q9V2FzaGluZ3RvbiBDPVVTMB4XDTI1MDkyNjE3NTg1
NloXDTQ5MTIzMTIzNTk1OVowHjEcMBoGA1UEAwwTQVdTIElvVCBDZXJ0aWZpY2F0
ZTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBANHWxBuaiRVQqc/Dpqn1
oOIrZNSjCM5N1gKxtBPA1mlYN+apSvJ1bXDacRel5H9mXRVaSHRlv7TTR7375S/A
1ORYip7ty76X58tghLMFPVw8PqAFG8VBa54T7Fhc2yR59xD6Y1xCPU8ZPl8NJRtK
p19yTmeTUJhf4dhx3sqNk43kmJnFdQ7IzWfHxL+xFXg6i+2yi50BiBC0n4PPj8Ko
P4L/wNb8iHFQJ4d/B15TYePkw1iBZ3Zty0Hq19orySFiHXgnK1vZjauDJ3KhrdHh
G3Ju5DQL38TgxgisAc4RIQwQMqhhw6pMsFcibWSFicSNvx76vMIza/yAG2raXZOx
CFUCAwEAAaNgMF4wHwYDVR0jBBgwFoAUyI/o24KWZ+tkBq8AestlKtKwxN8wHQYD
VR0OBBYEFOlafuz+WxeMlf2RK6pyC5EdN1rPMAwGA1UdEwEB/wQCMAAwDgYDVR0P
AQH/BAQDAgeAMA0GCSqGSIb3DQEBCwUAA4IBAQAfQsX27yCk4Th0vJvWUnhaNcm2
aPlcpvkdpDtUaKXQPwMqnBfqBXrZshQA9WIJviLxQd+f3TXsETtFsvT3rv/xMmbB
R5Hh3SRuBpEcZzRSLxpk4sIDTUsIeDmtS/5mo8RMF3u0IY95DWFhFp9mwDlHYHmh
QMOphsweFICSWmmYrUh8SMBYiL6QJF9fe+3OCrFLPEHAEkyROxvkm1EDEYqFTtyn
I7uJgxITDUtdToWYDOdBND4uPvvrRNFhiUGKtfTGFtLDVroafIY1nr4YG6swttBe
fTPZZup6nU/nE8Ie3ANXGjKfHyxQh9qvzQsWM2Wl43fuH+P2vWhvpXlUGDyF
-----END CERTIFICATE-----
)EOF";

const char AWS_CERT_PRIVATE[] PROGMEM = R"EOF(
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA0dbEG5qJFVCpz8OmqfWg4itk1KMIzk3WArG0E8DWaVg35qlK
8nVtcNpxF6Xkf2ZdFVpIdGW/tNNHvfvlL8DU5FiKnu3Lvpfny2CEswU9XDw+oAUb
xUFrnhPsWFzbJHn3EPpjXEI9Txk+Xw0lG0qnX3JOZ5NQmF/h2HHeyo2TjeSYmcV1
DsjNZ8fEv7EVeDqL7bKLnQGIELSfg8+Pwqg/gv/A1vyIcVAnh38HXlNh4+TDWIFn
dm3LQerX2ivJIWIdeCcrW9mNq4MncqGt0eEbcm7kNAvfxODGCKwBzhEhDBAyqGHD
qkywVyJtZIWJxI2/Hvq8wjNr/IAbatpdk7EIVQIDAQABAoIBAAkk+tbZHTA4m63a
MOEnOyOgEHzTvgZ/jdwAMoDJ3o4osgbzSbjXNTW9zz/gktyacWQE0zN/W6Ndsbqt
x4cVODHbSe8zHbXomMlcI2xJxirG1VPT5Snrd+0joSEYqtQkHIg44SucF1/jEbzC
reNKlZCrQo9w9Aov43+zNqpNESkVwPLxw5zUbAEwqZleEleE7D3TVmtIveFxHf3j
sMOPgyCUZdXHyEaZQqfOanYIIKcgHPLVZ69WXDxUvZCJ8oedLKgBqbTViQ2L2Bzw
VtYLLGqrW5kN1qpBGZtsosKspnCAoGXdwMo7TDUnOK5ttWUIHP0z/1PY7WrPzxRn
dvHBIQECgYEA9uHeai5dt06d9JAL9Zkzld/nlH0JAdqWL0iCDAaYXeW+Tq+dKyYp
ivWwAG7ODMFeBmzkaoWWsZI7/JZD4CF52myxfSCCArjmwfObkH7oyIaWY3jYMdGw
8KjjiS3dYEopHGttPp5pyh7ydav2BaiFGhhSZOhnoRlxw/UdKDv/wd0CgYEA2Zas
XubedmboTu2z2dAIxnrT6DCJ/Q1VtHGmjddJXal9GzDogJNwW++mqr/2CHk5pP4L
6SeDmRYjkl3Dx9+qNaw84JAGs4ug6Kcj5NG22TW50s0AEw0F5XYrl4W5CAEXDQ0T
eZMMoVa2+V2iiOIsUV4Nw21+O9n7hyCJRykTRNkCgYBmNURbOS7bQNTr9ua8mtxc
ZAH/23PrLI+Yq7ALQn+5/+81rEapInd4bBadV0I+zZ8bkeFOqFem1B+5how7MiC8
aNtiLh8k+V+vVCdHPwMoYW/JZrI6jdFvELyCglZwEsPKXD8x+Wtank1KohKMbSQN
lZwm4oBklaAfvE6B5bUQkQKBgQCU4EQWNu7Vonmmr3tUN8QZUac2AigX7YzLhsuH
11rKbBI+jYs3linVrbais+86Qv+PBYfOwouHLh+uoNs5Ia8LREru93yuUoYJSXsE
r/zkx57aPguj/VAgfWc8KHG+qUhFVMITd+q3ZWaSXl+8OsxJ7AmMwpkRiIdSII/t
EYyumQKBgQDOi/4uyQav/XBSryg6ScPNB5Q1UStUUueL9ZoyzW1WTNP8KQ7ngovk
33pXwzEj6xj5LTcY8j1dBXp2E4YkJXkFCC/2O4qv+aogUFuWPNdDZotJ18nCsVVT
RWIGIkyujJfO5vSHUZYU/1pHLhuYl0qhpKI1cJDBhPRljH8FHQ2nqw==
-----END RSA PRIVATE KEY-----
)EOF";

/* ====== MQTT Topics ====== */
String MQTT_TOPIC_TELEMETRY;
String MQTT_TOPIC_STATUS;
String MQTT_TOPIC_COMMANDS;

WiFiClientSecure net = WiFiClientSecure();
PubSubClient client(net);

/* ====== System Status Constants ====== */
#define STATUS_STARTUP      0
#define STATUS_CONNECTING   1
#define STATUS_CONNECTED    2
#define STATUS_REGISTERED   3
#define STATUS_RETRYING     4
#define STATUS_ERROR        5
#define STATUS_CONFIG       6

int systemStatus = STATUS_STARTUP;

/* ====== Default AP (for config portal) ====== */
const char* defaultAPSSID = "ESP32_DigitalTwin";
const char* defaultAPPASS = "sensor123";

/* ====== Configuration Variables ====== */
String wifiSSID         = "DIGISOL";
String wifiPassword     = "admin@123";
String sensorID         = "Sensor01";
String sensorName       = "ESP32 Sensor";
String sensorType       = "environmental";
String assetID          = "";
String zoneID           = "Zone1";
String vendorID         = "DigitalTwin_Corp";
String awsRegion        = "us-east-1";
String awsEndpoint      = "";
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
const unsigned long DHT_READ_INTERVAL = 2000;   // 2 seconds for DHT22
const unsigned long HEARTBEAT_INTERVAL = 30000; // 30 seconds heartbeat
const unsigned long RECONNECT_INTERVAL = 5000;  // 5 seconds WiFi reconnect
unsigned long lastDHTReadTime = 0;
unsigned long lastHeartbeatTime = 0;
unsigned long lastReconnectAttempt = 0;

/* ====== Thresholds ====== */
const float TEMP_THRESHOLD = 0.2;
const float HUMI_THRESHOLD = 0.5;

/* ====== Config Switch Logic ====== */
const unsigned long CONFIG_PRESS_DURATION = 3000;
bool switchWasPressed = false;
unsigned long switchPressStart = 0;

/* ====== Time Configuration ====== */
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 19800;     // GMT+5:30 for India (19800 seconds)
const int daylightOffset_sec = 0;     // No daylight saving in India
bool timeInitialized = false;

void setup() {
  Serial.begin(115200);
  Serial.println("\n=== Digital Twin AWS IoT Sensor Starting ===");

  // Configure pins
  pinMode(DHTPIN, INPUT);
  pinMode(LDR_PIN, INPUT);
  pinMode(DOOR_SENSOR_PIN, INPUT_PULLUP);
  pinMode(CONFIG_SWITCH_PIN, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);
  pinMode(STATUS_LED_PIN, OUTPUT);
  
  // Initialize peripherals
  dht.begin();
  Serial.println("DHT22 sensor initialized on pin " + String(DHTPIN));
  
  // Wait a moment for DHT to stabilize
  delay(2000);
  
  // Test DHT reading
  float testTemp = dht.readTemperature();
  float testHumi = dht.readHumidity();
  if (!isnan(testTemp) && !isnan(testHumi)) {
    Serial.println("✓ DHT22 initial test successful: " + String(testTemp) + "°C, " + String(testHumi) + "%");
  } else {
    Serial.println("✗ DHT22 initial test failed - check wiring!");
  }
  
  preferences.begin("digitwin", false);
  
  // Load configuration
  loadConfiguration();
  
  // Generate sensor ID if not set
  generateSensorID();
  
  // Setup MQTT topics
  setupMQTTTopics();
  
  // Set initial status
  setSystemStatus(STATUS_CONNECTING);
  
  // Connect to WiFi
  if (!connectToWiFi()) {
    Serial.println("Failed to connect to WiFi, entering config mode");
    startConfigPortal();
  } else {
    setSystemStatus(STATUS_CONNECTED);
    
    // Initialize time synchronization
    initializeTime();
    
    if (useAWS) {
      connectToAWS();
    }
  }
  
  Serial.println("=== Setup Complete ===");
  
  // Initialize sensor reading timer
  lastDHTReadTime = millis();
  Serial.println("DHT reading timer initialized: " + String(lastDHTReadTime));
}

void loop() {
  // Handle config switch
  handleConfigSwitch();
  
  // Maintain WiFi connection
  maintainWiFiConnection();
  
  // Maintain AWS connection
  if (useAWS) {
    maintainAWSConnection();
  }
  
  // Read sensors
  readSensors();
  
  // Send updates if needed
  sendSensorUpdates();
  
  // Send heartbeat
  sendHeartbeat();
  
  // Update status indicators
  updateStatusIndicators();
  
  delay(500); // Increased delay to give DHT sensor more time
}

void setupMQTTTopics() {
  MQTT_TOPIC_TELEMETRY = "digitaltwin/sensors/" + sensorID + "/telemetry";
  MQTT_TOPIC_STATUS = "digitaltwin/sensors/" + sensorID + "/status";
  MQTT_TOPIC_COMMANDS = "digitaltwin/sensors/" + sensorID + "/commands";
}

void initializeTime() {
  Serial.println("Initializing time from NTP server...");
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  
  // Wait for time to be set
  int attempts = 0;
  while (!time(nullptr) && attempts < 10) {
    Serial.print(".");
    delay(1000);
    attempts++;
  }
  
  if (time(nullptr)) {
    timeInitialized = true;
    Serial.println("\n✓ Time synchronized with NTP server");
    
    // Print current time for verification
    time_t now = time(nullptr);
    Serial.println("Current time: " + String(ctime(&now)));
  } else {
    timeInitialized = false;
    Serial.println("\n✗ Failed to synchronize time with NTP server");
  }
}

String getCurrentTimestamp() {
  if (!timeInitialized) {
    // Fallback to millis() if time not initialized
    return String(millis());
  }
  
  time_t now = time(nullptr);
  return String(now);
}

String getCurrentISO8601() {
  if (!timeInitialized) {
    return "1970-01-01T00:00:00Z";
  }
  
  time_t now = time(nullptr);
  struct tm* timeinfo = gmtime(&now);
  
  char buffer[30];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", timeinfo);
  return String(buffer);
}

void connectToAWS() {
  // Configure WiFiClientSecure to use the AWS IoT device credentials
  net.setCACert(AWS_CERT_CA);
  net.setCertificate(AWS_CERT_CRT);
  net.setPrivateKey(AWS_CERT_PRIVATE);

  // Connect to the MQTT broker on the AWS endpoint
  client.setServer(AWS_IOT_ENDPOINT, AWS_IOT_PORT);
  client.setCallback(messageHandler);

  Serial.println("Connecting to AWS IoT Core...");
  Serial.println("Endpoint: " + String(AWS_IOT_ENDPOINT));
  Serial.println("Thing Name: " + String(THING_NAME));
  
  // Try to connect with timeout
  int attempts = 0;
  const int maxAttempts = 10;
  
  while (!client.connected() && attempts < maxAttempts) {
    Serial.print("Attempt " + String(attempts + 1) + "/" + String(maxAttempts) + ": ");
    
    if (client.connect(THING_NAME)) {
      Serial.println("✓ Connected to AWS IoT Core!");
      // Subscribe to command topic
      client.subscribe(MQTT_TOPIC_COMMANDS.c_str());
      Serial.println("✓ Subscribed to commands topic: " + MQTT_TOPIC_COMMANDS);
      setSystemStatus(STATUS_REGISTERED);
      return;
    } else {
      Serial.println("✗ Failed (State: " + String(client.state()) + ")");
      Serial.println("Error codes: -4=timeout, -3=lost, -2=failed, -1=disconnected, 1=bad protocol, 2=bad client ID, 3=unavailable, 4=bad credentials, 5=unauthorized");
      attempts++;
      delay(2000);
    }
  }
  
  Serial.println("✗ Failed to connect to AWS IoT after " + String(maxAttempts) + " attempts");
  Serial.println("Final client state: " + String(client.state()));
  setSystemStatus(STATUS_ERROR);
}

void maintainAWSConnection() {
  if (!client.connected()) {
    Serial.println("AWS connection lost, reconnecting...");
    connectToAWS();
  }
  client.loop();
}

void messageHandler(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived in topic: ");
  Serial.println(topic);
  Serial.print("Message: ");
  
  String message;
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println(message);
  
  // Handle commands from AWS
  StaticJsonDocument<200> doc;
  deserializeJson(doc, message);
  
  String command = doc["command"];
  if (command == "reboot") {
    Serial.println("Reboot command received");
    ESP.restart();
  } else if (command == "status") {
    sendStatusUpdate();
  }
}

void publishToAWS(String topic, String payload) {
  if (client.connected()) {
    client.publish(topic.c_str(), payload.c_str());
    Serial.println("Published to " + topic);
    Serial.println("Payload: " + payload);
    Serial.println("Current timestamp: " + getCurrentTimestamp() + " (" + getCurrentISO8601() + ")");
  } else {
    Serial.println("AWS not connected, cannot publish");
  }
}

void sendSensorData(String dataType, String data) {
  if (!useAWS) return;
  
  StaticJsonDocument<500> payload;
  payload["sensorID"] = sensorID;
  payload["dataType"] = dataType;
  payload["timestamp"] = getCurrentTimestamp();
  payload["timestampISO"] = getCurrentISO8601();
  payload["uptime"] = millis() / 1000;
  payload["zoneID"] = zoneID;
  payload["assetID"] = assetID;
  payload["sensorName"] = sensorName;
  
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
  
  publishToAWS(MQTT_TOPIC_TELEMETRY, payloadStr);
}

void sendHeartbeat() {
  if (millis() - lastHeartbeatTime < HEARTBEAT_INTERVAL) return;
  if (!useAWS) return;
  
  StaticJsonDocument<400> payload;
  payload["sensorID"] = sensorID;
  payload["timestamp"] = getCurrentTimestamp();
  payload["timestampISO"] = getCurrentISO8601();
  payload["uptime"] = millis() / 1000;
  payload["freeHeap"] = ESP.getFreeHeap();
  payload["rssi"] = WiFi.RSSI();
  payload["temperature"] = currentState.temperature;
  payload["humidity"] = currentState.humidity;
  payload["doorState"] = currentState.doorState;
  payload["lightState"] = currentState.lightState;
  payload["timeSync"] = timeInitialized;
  
  String payloadStr;
  serializeJson(payload, payloadStr);
  
  publishToAWS(MQTT_TOPIC_STATUS, payloadStr);
  lastHeartbeatTime = millis();
}

void sendStatusUpdate() {
  StaticJsonDocument<300> status;
  status["sensorID"] = sensorID;
  status["status"] = "online";
  status["timestamp"] = getCurrentTimestamp();
  status["timestampISO"] = getCurrentISO8601();
  status["uptime"] = millis() / 1000;
  status["version"] = "1.0.0";
  status["timeSync"] = timeInitialized;
  
  String statusStr;
  serializeJson(status, statusStr);
  
  publishToAWS(MQTT_TOPIC_STATUS, statusStr);
}

// Include all other existing functions (setSystemStatus, updateStatusIndicators, etc.)
// ... (keeping the rest of your existing code)

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
  awsRegion = preferences.getString("awsRegion", awsRegion);
  awsEndpoint = preferences.getString("awsEndpoint", awsEndpoint);
  useAWS = preferences.getBool("useAWS", useAWS);
  
  Serial.println("Configuration loaded:");
  Serial.println("  Sensor ID: " + sensorID);
  Serial.println("  AWS Region: " + awsRegion);
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
  preferences.putString("awsRegion", awsRegion);
  preferences.putString("awsEndpoint", awsEndpoint);
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
      
      // Re-synchronize time after WiFi reconnection
      initializeTime();
      
      if (useAWS) {
        connectToAWS();
      }
    } else {
      setSystemStatus(STATUS_ERROR);
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
    
    // Debug output
    Serial.print("DHT Reading - Temp: ");
    Serial.print(temp);
    Serial.print("°C, Humidity: ");
    Serial.print(humi);
    Serial.println("%");
    
    if (!isnan(temp) && !isnan(humi)) {
      currentState.temperature = temp;
      currentState.humidity = humi;
      Serial.println("✓ DHT values updated successfully");
    } else {
      Serial.println("✗ DHT reading failed - NaN values");
      // Try to reinitialize DHT if readings fail consistently
      static int failCount = 0;
      failCount++;
      if (failCount > 5) {
        Serial.println("Reinitializing DHT sensor...");
        dht.begin();
        failCount = 0;
      }
    }
    
    lastDHTReadTime = millis();
  }
}

void sendSensorUpdates() {
  if (!currentState.isOnline) return;
  
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
    if (!switchWasPressed) {
      switchWasPressed = true;
      switchPressStart = millis();
      Serial.println("Config switch pressed...");
    } else {
      if (millis() - switchPressStart >= CONFIG_PRESS_DURATION) {
        Serial.println("Config switch held for 3 seconds - entering config mode");
        startConfigPortal();
        switchWasPressed = false;
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
  setSystemStatus(STATUS_CONFIG);
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
    <title>Digital Twin AWS IoT Config</title>
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
        <h1>☁️ Digital Twin AWS IoT Configuration</h1>
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
                <h3>☁️ AWS IoT Settings</h3>
                <div class="form-group">
                    <label>
                        <input type='checkbox' name='useAWS' value='true'" + (useAWS ? " checked" : "") + R"(>
                        Use AWS IoT Core
                    </label>
                </div>
                <div class="form-group">
                    <label>AWS Region:</label>
                    <input type='text' name='awsRegion' value=')" + awsRegion + R"(' placeholder="us-east-1">
                </div>
                <div class="form-group">
                    <label>AWS IoT Endpoint:</label>
                    <input type='text' name='awsEndpoint' value=')" + awsEndpoint + R"(' placeholder="your-endpoint.iot.region.amazonaws.com">
                </div>
            </div>
            
            <div class="section">
                <h3>📡 Sensor Settings</h3>
                <div class="form-group">
                    <label>Sensor ID:</label>
                    <input type='text' name='sensorID' value=')" + sensorID + R"(' required>
                </div>
                <div class="form-group">
                    <label>Sensor Name:</label>
                    <input type='text' name='sensorName' value=')" + sensorName + R"(' required>
                </div>
                <div class="form-group">
                    <label>Zone ID:</label>
                    <input type='text' name='zoneID' value=')" + zoneID + R"('>
                </div>
                <div class="form-group">
                    <label>Asset ID:</label>
                    <input type='text' name='assetID' value=')" + assetID + R"('>
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
  zoneID = server.arg("zoneID");
  assetID = server.arg("assetID");
  awsRegion = server.arg("awsRegion");
  awsEndpoint = server.arg("awsEndpoint");
  useAWS = server.hasArg("useAWS");
  
  saveConfiguration();
  
  String html = R"(
    <html><body style='font-family: Arial; text-align: center; margin-top: 50px;'>
    <h2>✅ Configuration Saved!</h2>
    <p>AWS IoT settings have been saved successfully.</p>
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
    <p>Device is restarting with AWS IoT configuration.</p>
    <p>Please connect back to your WiFi network.</p>
    </body></html>
  )";
  
  server.send(200, "text/html", html);
  delay(2000);
  ESP.restart();
}