# GB Creation Digital Twin BIM Viewer — Architecture & User Guide

> **GB Creation** — Digital Twin BIM Viewer by Gautam Bhardwaj  
> A comprehensive 3D BIM model visualizer with real-time IoT sensor integration for the Sahibabad station digital twin.

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Login Guide (Administrator & User)](#login-guide-administrator--user)
4. [System Architecture](#system-architecture)
5. [Frontend Architecture](#frontend-architecture)
6. [Database & Data Storage](#database--data-storage)
7. [Sensor & IoT Integration](#sensor--iot-integration)
8. [Mock Server API Reference](#mock-server-api-reference)
9. [AWS Production Architecture](#aws-production-architecture)
10. [ESP32 Hardware Sensors](#esp32-hardware-sensors)
11. [3D BIM Viewer](#3d-bim-viewer)
12. [Environment Variables](#environment-variables)
13. [Project Structure](#project-structure)
14. [Deployment](#deployment)
15. [Troubleshooting](#troubleshooting)

---

## Overview

This application is a **Digital Twin dashboard** that combines:

- **3D BIM visualization** — That Open Components + Three.js + Fragments (IFC models)
- **Real-time sensor monitoring** — Temperature, humidity, door, and light sensors
- **Role-based access control** — Admin, Control Room, Maintenance, Safety, and Viewer roles
- **Alarm management** — Predictive alerts with Server-Sent Events (SSE)
- **Asset linking** — Sensors mapped to 3D BIM assets in the Sahibabad station model

The default development setup uses a **local Express mock server** for sensor data. Production deployments can connect to **AWS IoT Core + DynamoDB** via optional integration services.

---

## Quick Start

### Prerequisites

- **Node.js** 18+ and **npm**
- Modern browser (Chrome, Edge, Firefox)

### Install & Run

```bash
cd gb-creation-bim-viewer
npm install
npm run dev:full
```

| Service        | URL                          | Port |
|----------------|------------------------------|------|
| Frontend (Vite)| http://localhost:3000        | 3000 |
| Mock Sensor API| http://localhost:4000/api    | 4000 |

### Available npm Scripts

| Command              | Description                                      |
|----------------------|--------------------------------------------------|
| `npm run dev`        | Start Vite frontend only                         |
| `npm run mock-server`| Start Express mock sensor API only               |
| `npm run dev:full`   | Start both frontend and mock server (recommended)|
| `npm run build`      | Production build → `dist/`                       |
| `npm run preview`    | Preview production build                         |

### Verify the App Is Running

```bash
# Mock API health check
curl http://localhost:4000/api/health

# List sensors
curl http://localhost:4000/api/sensors

# Frontend (should return HTTP 200)
curl -I http://localhost:3000
```

Open **http://localhost:3000** in your browser and log in using the credentials below.

---

## Login Guide (Administrator & User)

Authentication is **client-side mock auth** for development and demo purposes. There is no backend login API — credentials are validated in `src/services/authService.js` and sessions are stored in browser `localStorage`.

### Administrator Login

| Field    | Value                    |
|----------|--------------------------|
| Email    | `admin@gbcreation.in`    |
| Password | `admin123`               |

**Administrator capabilities:**
- Full admin panel (user management, audit logs, system settings)
- Sensor management (CRUD, asset linking, threshold configuration)
- Control room dashboard access
- 3D BIM viewer with sensor overlays
- Emergency controls and report generation

**How to log in as Administrator:**

1. Open http://localhost:3000
2. Enter `admin@gbcreation.in` / `admin123` in the login form, **or**
3. Click the **Admin** demo button on the login page for one-click login

**Admin dashboard tabs:** Admin Panel · Control Room · Sensor Management · 3D Viewer · Settings

---

### User Login (Viewer / Standard User)

| Field    | Value                    |
|----------|--------------------------|
| Email    | `viewer@gbcreation.in`   |
| Password | `viewer123`              |

**Viewer (standard user) capabilities:**
- Read-only real-time sensor dashboard
- 3D BIM viewer (no admin controls)
- Split view (dashboard + 3D side by side)
- No user management, no sensor configuration, no audit logs

**How to log in as User:**

1. Open http://localhost:3000
2. Enter `viewer@gbcreation.in` / `viewer123`, **or**
3. Click the **Viewer** demo button on the login page

**User dashboard views:** Dashboard · 3D Viewer · Split View

---

### All Demo Accounts

| Role           | Email                      | Password     | Access Level                          |
|----------------|----------------------------|--------------|---------------------------------------|
| **Admin**      | `admin@gbcreation.in`      | `admin123`   | Full system access                    |
| **Control Room** | `control@gbcreation.in`  | `control123` | Alerts, work orders, reports        |
| **Maintenance**| `maintenance@gbcreation.in`| `maint123`   | Work order execution, field tasks     |
| **Safety**     | `safety@gbcreation.in`     | `safety123`  | Incident management, safety protocols |
| **Viewer**     | `viewer@gbcreation.in`     | `viewer123`  | Read-only dashboard + 3D            |

### Session Management

- **Session duration:** 8 hours
- **Storage key:** `localStorage` → `gb_creation_session`
- **Audit logs key:** `localStorage` → `gb_creation_audit_logs`
- **Force fresh login:** append `?forceLogin=true` or `?clearSession=true` to the URL
- **Auto-login (dev):** append `?autoLogin=admin` (or `viewer`, `control`, etc.)

> **Security note:** Passwords are stored in plaintext in source code for demo purposes only. Do not use these credentials in production.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         GB Creation Digital Twin                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐    ┌──────────────────┐    ┌───────────────────────┐  │
│  │  React UI    │    │  3D BIM Viewer   │    │  Auth Service         │  │
│  │  (Vite:3000) │◄──►│  (That Open +    │    │  (localStorage)       │  │
│  │              │    │   Three.js)      │    │                       │  │
│  └──────┬───────┘    └──────────────────┘    └───────────────────────┘  │
│         │                                                               │
│         ▼                                                               │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    Sensor Data Manager                           │   │
│  │         (polls every 15s, fans out to dashboards)                │   │
│  └──────────┬───────────────────────────────┬───────────────────────┘   │
│             │                               │                           │
│             ▼                               ▼                           │
│  ┌─────────────────────┐       ┌─────────────────────────┐             │
│  │  sensorService.js   │       │  alarmService.js        │             │
│  │  (REST polling)     │       │  (SSE alarm stream)     │             │
│  └──────────┬──────────┘       └────────────┬────────────┘             │
│             │                               │                           │
└─────────────┼───────────────────────────────┼───────────────────────────┘
              │                               │
              ▼                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              Mock Server (Express :4000) — LOCAL DEV                    │
│   In-memory sensors · history · alarms · SSE stream                     │
└─────────────────────────────────────────────────────────────────────────┘

              │ (Production path — optional)
              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  ESP32 Sensors → AWS IoT Core (MQTT) → DynamoDB → API Gateway → UI    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Boot Sequence

1. `index.html` loads `src/main.jsx`
2. `main.jsx` renders `DigitalTwinApp` (`src/App.jsx`)
3. `main.jsx` imports `main.js` → initializes That Open 3D world → exposes `window.viewer3D`
4. `App.jsx` checks `authService.isAuthenticated()` → shows `Login` or role-specific dashboard
5. `sensorDataManager.initialize()` starts REST polling + alarm SSE subscription

### Role-Based Routing (`src/App.jsx`)

| Role                          | Layout                                      |
|-------------------------------|---------------------------------------------|
| `admin`, `control_room`       | Sidebar layout with dedicated admin tabs    |
| `maintenance`, `safety`, `viewer` | Top navigation: Dashboard / 3D / Split  |

### Key Components

| Component               | File                                      | Purpose                          |
|-------------------------|-------------------------------------------|----------------------------------|
| `Login`                 | `src/components/Login.jsx`                | Authentication UI                |
| `AdminDashboard`        | `src/components/AdminDashboard.jsx`       | Admin panel, users, audit        |
| `ControlRoomDashboard`  | `src/components/ControlRoomDashboard.jsx` | Alerts and work orders           |
| `RealTimeDashboard`     | `src/components/RealTimeDashboard.jsx`    | Live sensor cards and charts     |
| `SensorManagement`      | `src/components/SensorManagement.jsx`     | Sensor CRUD and asset linking    |
| `Viewer3D`              | `src/components/Viewer3D.jsx`             | React wrapper for 3D viewer        |
| `SensorOverlayRenderer` | `src/components/SensorOverlayRenderer.js` | 3D sensor markers on BIM model   |

### Key Services

| Service                    | File                                   | Mechanism                    |
|----------------------------|----------------------------------------|------------------------------|
| `authService`              | `src/services/authService.js`          | Client-side auth + sessions  |
| `sensorService`            | `src/services/sensorService.js`        | REST client → mock-server    |
| `alarmService`             | `src/services/alarmService.js`         | SSE to `/api/alarms/stream`  |
| `sensorDataManager`        | `src/services/sensorDataManager.js`    | Aggregator + 15s polling     |
| `awsIotClient`             | `src/services/awsIotClient.js`         | MQTT over WSS (optional)     |
| `realAWSIntegrationService`| `src/services/realAWSIntegrationService.js` | AWS API Gateway (optional) |

---

## Database & Data Storage

### Local Development — No SQL Database

The local dev stack does **not** use PostgreSQL, MongoDB, or similar. Data lives in:

| Data            | Storage                          | Location / Key                    |
|-----------------|----------------------------------|-----------------------------------|
| Users           | In-memory JavaScript object      | `src/services/authService.js`     |
| Session         | Browser localStorage             | `gb_creation_session`             |
| Audit logs      | Browser localStorage             | `gb_creation_audit_logs`          |
| Sensors         | In-memory Map                    | `mock-server/server.js`           |
| Sensor history  | In-memory Map (max 500 entries)  | `mock-server/server.js`           |
| Alarms          | In-memory Array (max 200)        | `mock-server/server.js`           |

### Mock Server Data Schema

**Sensor object:**

```json
{
  "sensorID": "ESP32_ZONE1",
  "sensorName": "Zone 1 - Environmental Sensor",
  "sensorType": "environmental",
  "zoneID": "Zone1",
  "assetID": "NCRTC-DM009-AYE-SAHI-STN-M3-AR-00121",
  "stationID": "Sahibabad",
  "isOnline": true,
  "lastSeen": "2026-07-18T18:47:30.061Z",
  "batteryLevel": 66,
  "signalStrength": -51,
  "currentData": {
    "temperature": 28.6,
    "humidity": 48,
    "doorState": "CLOSED",
    "lightState": "ON"
  },
  "settings": {
    "reportingInterval": 30000,
    "alertsEnabled": true,
    "thresholds": {
      "temperature": { "warning": 30, "critical": 35 },
      "humidity": { "warning": 75, "critical": 85 }
    }
  }
}
```

**Alarm object:**

```json
{
  "id": "uuid",
  "sensorID": "ESP32_ZONE1",
  "severity": "warning",
  "message": "Temperature threshold exceeded",
  "type": "threshold",
  "acknowledged": false,
  "timestamp": "2026-07-18T18:47:30.061Z"
}
```

**History entry:**

```json
{
  "timestamp": "2026-07-18T18:47:30.061Z",
  "payload": { "temperature": 28.6, "humidity": 48 },
  "source": "mock-generator"
}
```

### AWS Production — DynamoDB

When connected to AWS (see [AWS Production Architecture](#aws-production-architecture)):

| Table               | Partition Key | Sort Key    | Purpose                    |
|---------------------|---------------|-------------|----------------------------|
| `dt-sensors`        | `sensorID`    | —           | Sensor configuration       |
| `dt-sensor-data`    | `sensorID`    | `timestamp` | Time-series telemetry      |
| `IoTSensorStatus`   | `sensorID`    | —           | Latest status snapshots    |
| `IoTSensorData`     | `sensorID`    | `timestamp` | Telemetry records          |

Lambda functions in `lambda-functions/` provide REST endpoints backed by these tables.

---

## Sensor & IoT Integration

### Active Path (Local Development)

```
mock-server (:4000)
    ├── REST GET /api/sensors          ← sensorService (poll every 15s)
    ├── REST GET /api/alarms           ← alarmService (initial load)
    └── SSE  GET /api/alarms/stream    ← alarmService (real-time push)
              │
              ▼
       sensorDataManager
              │
              ▼
    RealTimeDashboard / AdminDashboard / ControlRoomDashboard
```

**Pre-seeded sensors (Sahibabad station):**

| Sensor ID              | Type          | Zone  | Linked BIM Asset                    |
|------------------------|---------------|-------|-------------------------------------|
| `ESP32_ZONE1`          | environmental | Zone1 | NCRTC-DM009-AYE-SAHI-STN-M3-AR-00121 |
| `ESP32_ZONE1_SECURITY` | security      | Zone1 | NCRTC-DM009-AYE-SAHI-STN-M3-PI-00121 |
| `ESP32_ZONE2`          | environmental | Zone2 | NCRTC-DM009-AYE-SAHI-STN-M3-ST-00121 |

The mock server auto-generates sensor readings every **15 seconds** and alarms every **45 seconds**.

### Optional Integrations (Not Active by Default)

| Integration              | File                                      | Protocol   | Status        |
|--------------------------|-------------------------------------------|------------|---------------|
| AWS IoT MQTT             | `src/services/awsIotClient.js`          | MQTT/WSS   | Not wired to UI |
| WebSocket sensor stream  | `src/services/realTimeSensorService.js`   | WebSocket  | Not wired to UI |
| AWS REST API             | `src/services/realAWSIntegrationService.js` | HTTPS    | Disabled (`VITE_USE_REAL_AWS=false`) |

Enable AWS integration by setting `VITE_USE_REAL_AWS=true` and configuring the AWS environment variables (see below).

### Static Sensor Config

`public/sensors-config.json` provides fallback sensor definitions when the API is unavailable.

---

## Mock Server API Reference

**Base URL:** `http://localhost:4000/api`

| Endpoint                        | Method | Description                          |
|---------------------------------|--------|--------------------------------------|
| `/health`                       | GET    | Health check                         |
| `/sensors`                      | GET    | List all sensors with current data   |
| `/sensors/:id`                  | GET    | Single sensor details                |
| `/sensors/:id/history`          | GET    | Sensor telemetry history             |
| `/sensors/:id/data`             | POST   | Push telemetry from external source  |
| `/sensors/:id`                  | PATCH  | Update sensor config / asset link    |
| `/status`                       | GET    | System statistics                    |
| `/alarms`                       | GET    | List all alarms                      |
| `/alarms/stream`                | GET    | SSE real-time alarm/status stream    |
| `/alarms/:id/acknowledge`       | POST   | Acknowledge an alarm                 |
| `/predictive-alarms`            | POST   | Create a predictive alarm            |
| `/asset-sensor-links`           | GET    | Asset ↔ sensor mapping               |
| `/log`                          | POST   | Client debug logging                 |

---

## AWS Production Architecture

```
ESP32 Sensors
      │  MQTT (TLS)
      ▼
AWS IoT Core  ──IoT Rules──►  DynamoDB (IoTSensorData, IoTSensorStatus)
      │                              │
      │                              ▼
      │                        Lambda Functions
      │                              │
      ▼                              ▼
MQTT over WSS                  API Gateway (REST)
(awsIotClient.js)                    │
                                       ▼
                              React Dashboard (VITE_USE_REAL_AWS=true)
```

**AWS services used:**
- **AWS IoT Core** — MQTT broker for real-time sensor telemetry
- **DynamoDB** — NoSQL storage for sensor config and time-series data
- **Lambda** — Data processing and REST API handlers (`lambda-functions/`)
- **API Gateway** — REST endpoints for the dashboard

**MQTT topics:**
- `digitaltwin/sensors/+/telemetry` — Sensor readings
- `digitaltwin/sensors/+/status` — Online/offline status
- `digitaltwin/sensors/+/commands` — Remote commands to sensors

**Deploy scripts:** `deploy-aws.ps1`, `deploy-aws.sh`

See `AWS_INTEGRATION.md` and `Esp_sensor_code/Digital_Twin_Enhanced/AWS_Integration_Guide.md` for full setup instructions.

---

## ESP32 Hardware Sensors

Physical sensor firmware is located in `Esp_sensor_code/Digital_Twin_Enhanced/`.

### Hardware Connections

| ESP32 Pin | Component        |
|-----------|------------------|
| GPIO 4    | DHT22 (temp/humidity) |
| GPIO 13   | LDR (light level)     |
| GPIO 19   | Door sensor           |
| GPIO 25   | Config switch         |
| GPIO 2    | Built-in status LED   |

### Initial Device Setup

1. Flash `Digital_Twin_AWS_IoT.ino` to the ESP32
2. Device creates WiFi AP: **`ESP32_DigitalTwin`** (password: **`sensor123`**)
3. Connect to the AP and configure WiFi + AWS credentials via the web portal
4. Sensor publishes to MQTT topic: `digitaltwin/sensors/Sensor01/telemetry`

### Status LED Patterns

| Pattern              | Status                        |
|----------------------|-------------------------------|
| Fast blink (500ms)   | Connecting to WiFi            |
| Medium blink (1s)    | Connected, not paired         |
| Solid ON             | Successfully registered       |
| Very fast (250ms)    | Retrying registration         |
| Slow blink (2s)      | Error state                   |

See `Esp_sensor_code/Digital_Twin_Enhanced/README.md` for complete hardware and AWS setup documentation.

---

## 3D BIM Viewer

The 3D viewer is powered by **That Open Components** (`@thatopen/components`, `@thatopen/fragments`) and **Three.js**.

- **Entry point:** `main.js` (~1300 lines) — initializes the 3D world, loads IFC fragment models, camera controls
- **React bridge:** `src/components/Viewer3D.jsx` attaches `window.viewer3D` to DOM containers
- **Sensor overlays:** `SensorOverlayRenderer.js` renders live sensor markers on the BIM model
- **Models:** `public/models/Sahibabad/` — Sahibabad station fragment files (`.frag`)
- **Manifest:** `public/models/Sahibabad/models-manifest.json`

The viewer supports:
- Fragment model loading and navigation
- Sensor position overlays linked to BIM assets
- Split view (dashboard + 3D side by side)
- Voice control panel (optional)

---

## Environment Variables

Create a `.env` file in the project root (optional — defaults work for local dev):

```env
# Sensor API (local mock server)
VITE_SENSOR_API_BASE_URL=http://localhost:4000/api
VITE_API_BASE_URL=http://localhost:4000/api

# AWS integration (disabled by default)
VITE_USE_REAL_AWS=false
VITE_AWS_REGION=ap-south-1
VITE_AWS_API_BASE_URL=https://your-api-gateway-url.amazonaws.com/prod
VITE_AWS_API_KEY=
VITE_IOT_SENSOR_DATA_TABLE=IoTSensorData
VITE_IOT_SENSOR_STATUS_TABLE=IoTSensorStatus

# WebSocket (optional, not active)
VITE_SENSOR_WEBSOCKET_URL=ws://localhost:8080/sensors

# Mock server port (Node.js, not Vite)
MOCK_SERVER_PORT=4000
```

> **Note:** The codebase uses `VITE_*` prefix (Vite convention). Some older docs reference `REACT_APP_*` — use `VITE_*` instead.

---

## Project Structure

```
gb-creation-bim-viewer/
├── index.html                  # HTML shell
├── main.js                     # 3D BIM viewer (That Open + Three.js)
├── vite.config.js              # Vite config (port 3000)
├── package.json
├── guide.md                    # This file
├── AWS_INTEGRATION.md          # AWS setup guide
│
├── src/
│   ├── main.jsx                # React entry point
│   ├── App.jsx                 # Root app + role routing
│   ├── components/             # React UI components
│   │   ├── Login.jsx
│   │   ├── AdminDashboard.jsx
│   │   ├── ControlRoomDashboard.jsx
│   │   ├── RealTimeDashboard.jsx
│   │   ├── SensorManagement.jsx
│   │   ├── Viewer3D.jsx
│   │   └── SensorOverlayRenderer.js
│   └── services/               # Business logic & API clients
│       ├── authService.js
│       ├── sensorService.js
│       ├── sensorDataManager.js
│       ├── alarmService.js
│       ├── awsIotClient.js
│       └── realAWSIntegrationService.js
│
├── mock-server/
│   └── server.js               # Express mock sensor API (:4000)
│
├── lambda-functions/           # AWS Lambda handlers
│   ├── getLatestSensorStatus.js
│   ├── getRecentTelemetry.js
│   ├── getSensorHistory.js
│   └── updateSensorConfig.js
│
├── Esp_sensor_code/              # ESP32 Arduino firmware
│   └── Digital_Twin_Enhanced/
│       ├── Digital_Twin_AWS_IoT.ino
│       └── README.md
│
└── public/
    ├── sensors-config.json     # Fallback sensor definitions
    └── models/Sahibabad/       # BIM fragment models
```

---

## Deployment

### Production Build

```bash
npm run build
# Output in dist/ — serve with any static file server
npm run preview   # or: npx serve dist
```

### AWS Deployment

```powershell
# Windows
.\deploy-aws.ps1

# Linux/macOS
./deploy-aws.sh
```

Then set `VITE_USE_REAL_AWS=true` and point `VITE_AWS_API_BASE_URL` to your API Gateway endpoint.

---

## Troubleshooting

| Issue                          | Solution                                                    |
|--------------------------------|-------------------------------------------------------------|
| Login page not showing         | Add `?forceLogin=true` to URL to clear cached session       |
| No sensor data on dashboard    | Ensure mock server is running: `npm run mock-server`        |
| Port 3000 or 4000 in use       | Kill existing process or set `MOCK_SERVER_PORT=4001`        |
| 3D model not loading           | Check browser console; verify `public/models/Sahibabad/` exists |
| AWS sensors not appearing      | Set `VITE_USE_REAL_AWS=true` and verify API Gateway URL   |
| ESP32 not connecting to AWS    | See `Esp_sensor_code/Digital_Twin_Enhanced/AUTHORIZATION_FAILED_Fix.md` |

### Useful Debug URLs

```
http://localhost:3000/?forceLogin=true          # Force login screen
http://localhost:3000/?autoLogin=admin          # Auto-login as admin
http://localhost:4000/api/health                # API health check
http://localhost:4000/api/sensors               # Raw sensor JSON
http://localhost:4000/api/status                # System stats
```

---

*GB Creation Digital Twin BIM Viewer — © Gautam Bhardwaj*
