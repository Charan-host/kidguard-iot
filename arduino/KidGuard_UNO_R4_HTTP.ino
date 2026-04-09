#include <TinyGPS++.h>
#include <Wire.h>
#include <MPU6050.h>
#include <WiFiS3.h>

// ---------------- WIFI ----------------
const char* ssid = "YOUR_WIFI_NAME";
const char* password = "YOUR_WIFI_PASSWORD";

WiFiClient client;

// ---------------- DEVICE ----------------
const char deviceId[] = "KB-2024-0123";
const char childName[] = "Emma Wilson";

// ---------------- PINS ----------------
#define SOS_BUTTON 4
#define MOTOR_PIN 5
#define GPS_RX 16
#define GPS_TX 17

// ---------------- SERIAL ----------------
// Keep this section aligned with your board wiring.
HardwareSerial gpsSerial(2);

// ---------------- OBJECTS ----------------
TinyGPSPlus gps;
MPU6050 mpu;

// ---------------- SERVER ----------------
// Use the IP address or host name of the machine running server/server.js.
const char server[] = "192.168.1.100";
const int port = 3000;

const char geofencePath[] = "/getGeofence.php";
const char alertPath[] = "/getAlert.php";
const char updatePath[] = "/update.php";

// ---------------- MPU ----------------
int16_t ax, ay, az;
int16_t ax_offset = 0, ay_offset = 0, az_offset = 0;

// ---------------- MOTION ----------------
int shakeCount = 0;
unsigned long lastShake = 0;
const float shakeThreshold = 1.5 * 9.81;
const float fallThreshold = 3.0 * 9.81;

// ---------------- GEOFENCE ----------------
double safeLat = 0;
double safeLng = 0;
double radius = 100;

// ---------------- TIMING ----------------
bool emergencyMode = false;
unsigned long emergencyStart = 0;
unsigned long lastUpdate = 0;
unsigned long lastRemoteCheck = 0;

const unsigned long normalInterval = 30000;
const unsigned long emergencyInterval = 5000;
const unsigned long emergencyTimeout = 60000;
const unsigned long remoteCheckInterval = 60000;

// ---------------- SETUP ----------------
void setup() {
  Serial.begin(115200);

  pinMode(SOS_BUTTON, INPUT_PULLUP);
  pinMode(MOTOR_PIN, OUTPUT);

  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);

  Wire.begin();
  mpu.initialize();

  calibrateMPU();
  initWiFi();

  Serial.println("KidGuard UNO R4 bridge ready");
}

// ---------------- LOOP ----------------
void loop() {
  while (gpsSerial.available()) {
    gps.encode(gpsSerial.read());
  }

  checkSOS();
  detectMotion();
  checkGeofence();
  fetchGeofence();
  checkParentAlert();

  if (gps.location.isValid()) {
    updateLocation();
  }

  manageEmergency();
}

// ---------------- WIFI ----------------
void initWiFi() {
  Serial.print("Connecting to WiFi");
  while (WiFi.begin(ssid, password) != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi connected");
  Serial.print("Board IP: ");
  Serial.println(WiFi.localIP());
}

// ---------------- HTTP ----------------
bool httpGET(const String& path, String& response) {
  response = "";

  if (!client.connect(server, port)) {
    Serial.println("Connection failed");
    return false;
  }

  client.print("GET " + path + " HTTP/1.1\r\n");
  client.print("Host: " + String(server) + "\r\n");
  client.print("Connection: close\r\n\r\n");

  unsigned long timeoutStart = millis();
  while (client.connected() && millis() - timeoutStart < 8000) {
    while (client.available()) {
      response += (char)client.read();
      timeoutStart = millis();
    }
  }

  client.stop();

  int bodyIndex = response.indexOf("\r\n\r\n");
  if (bodyIndex != -1) {
    response = response.substring(bodyIndex + 4);
  }

  return true;
}

String encodeSpaces(const String& value) {
  String out = value;
  out.replace(" ", "%20");
  return out;
}

String baseCompatPath(const char* path) {
  return String(path) + "?deviceId=" + deviceId;
}

String readField(const String& text, const String& key) {
  int start = text.indexOf(key);
  if (start < 0) return "";

  start += key.length();
  int end = text.indexOf('\n', start);
  if (end < 0) end = text.length();

  String value = text.substring(start, end);
  value.trim();
  return value;
}

// ---------------- MPU CALIBRATION ----------------
void calibrateMPU() {
  long ax_sum = 0;
  long ay_sum = 0;
  long az_sum = 0;

  for (int i = 0; i < 100; i++) {
    mpu.getAcceleration(&ax, &ay, &az);
    ax_sum += ax;
    ay_sum += ay;
    az_sum += az;
    delay(10);
  }

  ax_offset = ax_sum / 100;
  ay_offset = ay_sum / 100;
  az_offset = (az_sum / 100) - 16384;
}

// ---------------- SOS ----------------
void checkSOS() {
  if (digitalRead(SOS_BUTTON) == LOW) {
    activateMotor();
    emergencyMode = true;
    emergencyStart = millis();
  }
}

// ---------------- MOTION ----------------
void detectMotion() {
  mpu.getAcceleration(&ax, &ay, &az);

  ax -= ax_offset;
  ay -= ay_offset;
  az -= az_offset;

  float mag = sqrt(ax * ax + ay * ay + az * az) / 16384.0 * 9.81;

  if (mag > shakeThreshold && millis() - lastShake > 300) {
    shakeCount++;
    lastShake = millis();
  }

  if (shakeCount >= 3 || mag > fallThreshold) {
    activateMotor();
    emergencyMode = true;
    emergencyStart = millis();
    shakeCount = 0;
  }
}

// ---------------- DISTANCE ----------------
double distanceMeters(double lat1, double lon1, double lat2, double lon2) {
  double R = 6371000;
  double dLat = radians(lat2 - lat1);
  double dLon = radians(lon2 - lon1);

  double a = sin(dLat / 2) * sin(dLat / 2) +
             cos(radians(lat1)) * cos(radians(lat2)) *
             sin(dLon / 2) * sin(dLon / 2);

  return R * 2 * atan2(sqrt(a), sqrt(1 - a));
}

// ---------------- GEOFENCE ----------------
void checkGeofence() {
  if (!gps.location.isValid()) return;
  if (safeLat == 0 && safeLng == 0) return;

  double d = distanceMeters(gps.location.lat(), gps.location.lng(), safeLat, safeLng);
  if (d > radius) {
    vibrateSingle();
    emergencyMode = true;
    emergencyStart = millis();
  }
}

void fetchGeofence() {
  if (millis() - lastRemoteCheck < remoteCheckInterval) return;
  lastRemoteCheck = millis();

  String resp;
  if (httpGET(baseCompatPath(geofencePath), resp)) {
    parseGeofence(resp);
  }
}

void parseGeofence(const String& resp) {
  String latValue = readField(resp, "LAT=");
  String lngValue = readField(resp, "LNG=");
  String radiusValue = readField(resp, "RADIUS=");

  if (latValue.length() > 0) safeLat = latValue.toFloat();
  if (lngValue.length() > 0) safeLng = lngValue.toFloat();
  if (radiusValue.length() > 0) radius = radiusValue.toFloat();
}

// ---------------- PARENT ALERT ----------------
void checkParentAlert() {
  String resp;
  if (!httpGET(baseCompatPath(alertPath), resp)) return;

  if (resp.indexOf("ALERT=1") >= 0) {
    vibrateAlert();
    emergencyMode = true;
    emergencyStart = millis();
  }
}

// ---------------- UPDATE ----------------
void updateLocation() {
  unsigned long interval = emergencyMode ? emergencyInterval : normalInterval;
  if (millis() - lastUpdate < interval) return;

  String lat = String(gps.location.lat(), 6);
  String lng = String(gps.location.lng(), 6);
  String event = emergencyMode ? "EMERGENCY" : "NORMAL";

  String path = String(updatePath) +
    "?deviceId=" + deviceId +
    "&childName=" + encodeSpaces(childName) +
    "&lat=" + lat +
    "&lng=" + lng +
    "&label=UNO%20R4%20Tracker" +
    "&event=" + event;

  String resp;
  httpGET(path, resp);

  lastUpdate = millis();
}

// ---------------- EMERGENCY RESET ----------------
void manageEmergency() {
  if (emergencyMode && millis() - emergencyStart > emergencyTimeout) {
    emergencyMode = false;
  }
}

// ---------------- MOTOR ----------------
void activateMotor() {
  digitalWrite(MOTOR_PIN, HIGH);
  delay(1000);
  digitalWrite(MOTOR_PIN, LOW);
}

void vibrateSingle() {
  digitalWrite(MOTOR_PIN, HIGH);
  delay(500);
  digitalWrite(MOTOR_PIN, LOW);
}

void vibrateAlert() {
  for (int i = 0; i < 3; i++) {
    digitalWrite(MOTOR_PIN, HIGH);
    delay(300);
    digitalWrite(MOTOR_PIN, LOW);
    delay(300);
  }
}
