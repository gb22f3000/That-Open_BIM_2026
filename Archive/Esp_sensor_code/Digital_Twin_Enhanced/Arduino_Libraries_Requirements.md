# Arduino Library Requirements for AWS Integration

## Required Libraries

### For AWS IoT Core (MQTT) Version:
1. **PubSubClient** by Nick O'Leary
   - Version: 2.8.0 or later
   - Install via: Arduino IDE Library Manager
   - Purpose: MQTT client for ESP32

2. **ArduinoJson** by Benoit Blanchon
   - Version: 6.19.0 or later
   - Install via: Arduino IDE Library Manager
   - Purpose: JSON parsing and creation

3. **WiFiClientSecure** (Built-in ESP32)
   - Purpose: Secure WiFi connections with SSL/TLS

4. **DHT sensor library** by Adafruit
   - Version: 1.4.0 or later
   - Install via: Arduino IDE Library Manager
   - Purpose: DHT22 temperature/humidity sensor

### For AWS API Gateway Version:
1. **HTTPClient** (Built-in ESP32)
   - Purpose: HTTP/HTTPS requests

2. **ArduinoJson** by Benoit Blanchon
   - Version: 6.19.0 or later
   - Purpose: JSON handling

3. **WiFiClientSecure** (Built-in ESP32)
   - Purpose: HTTPS connections

4. **DHT sensor library** by Adafruit
   - Version: 1.4.0 or later
   - Purpose: DHT22 sensor

## Installation Instructions

### Via Arduino IDE:
1. Open Arduino IDE
2. Go to Tools → Manage Libraries
3. Search for each library by name
4. Click "Install" for the latest version

### Via PlatformIO:
Add to `platformio.ini`:
```ini
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
lib_deps = 
    knolleary/PubSubClient@^2.8
    bblanchon/ArduinoJson@^6.19.0
    adafruit/DHT sensor library@^1.4.0
```

## Board Configuration

### ESP32 Board Settings:
- Board: "ESP32 Dev Module"
- Upload Speed: 921600
- CPU Frequency: 240MHz (WiFi/BT)
- Flash Frequency: 80MHz
- Flash Mode: QIO
- Flash Size: 4MB (32Mb)
- Partition Scheme: Default 4MB with spiffs
- Core Debug Level: None
- PSRAM: Disabled

## Memory Considerations

### For IoT Core Version:
- Certificates take ~3-4KB of program memory
- JSON buffers: ~2KB RAM
- MQTT client: ~1KB RAM
- Recommended: ESP32 with 4MB flash minimum

### For API Gateway Version:
- Lighter memory footprint
- No certificate storage needed
- JSON buffers: ~1KB RAM
- Works with smaller ESP32 variants

## Testing the Setup

### Compile Test:
```cpp
#include <WiFi.h>
#include <PubSubClient.h>  // For IoT Core
#include <HTTPClient.h>    // For API Gateway
#include <ArduinoJson.h>
#include <DHT.h>

void setup() {
  Serial.begin(115200);
  Serial.println("Libraries loaded successfully!");
}

void loop() {
  // Empty
}
```

If this compiles without errors, all libraries are properly installed.