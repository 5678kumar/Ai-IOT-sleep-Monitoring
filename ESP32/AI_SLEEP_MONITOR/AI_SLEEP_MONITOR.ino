/************************************************************
   AI AND IoT BASED SLEEP QUALITY MONITORING SYSTEM

   ESP32
   DHT11          -> GPIO 4
   Microphone DO  -> GPIO 18
   MAX30102       -> SIMULATED
   MPU6050        -> SIMULATED

   Firebase Realtime Database
   Email/Password Authentication

************************************************************/

#include <WiFi.h>
#include <Wire.h>
#include <DHT.h>
#include <Firebase_ESP_Client.h>
#include <time.h>
#include <FS.h>
#include <SPIFFS.h>

/* Firebase helper libraries */
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

/************************************************************
   1. WIFI CONFIGURATION
************************************************************/

#define WIFI_SSID       "Arul"
#define WIFI_PASSWORD   "ARK@00007"

/************************************************************
   2. FIREBASE CONFIGURATION
************************************************************/

#define API_KEY         ""

#define DATABASE_URL    "https://ai-sleep-monitor-default-rtdb.asia-southeast1.firebasedatabase.app"

/*
   Firebase test account
*/
#define USER_EMAIL      "arulrajakumar592004@gmail.com"
#define USER_PASSWORD   "ARK@007"

/************************************************************
   3. SENSOR PINS
************************************************************/

#define DHT_PIN         4
#define DHT_TYPE        DHT11

#define MICROPHONE_PIN  18

#define I2C_SDA         21
#define I2C_SCL         22

/************************************************************
   4. SIMULATION MODE
************************************************************/

#define SIMULATION_MODE true

/************************************************************
   5. OBJECTS
************************************************************/

DHT dht(4, DHT11);

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

/************************************************************
   6. GLOBAL VARIABLES
************************************************************/

String userUID = "";
String sessionID = "";
String dateKey = "";

String databasePath = "";

bool firebaseReady = false;
bool wifiConnected = false;

unsigned long monitoringStartMillis = 0;

unsigned long lastDHTRead = 0;
unsigned long lastSimulatedRead = 0;
unsigned long lastMicrophoneRead = 0;
unsigned long lastFirebaseUpload = 0;
unsigned long lastWiFiCheck = 0;
unsigned long lastSerialPrint = 0;

/************************************************************
   INTERVALS
************************************************************/

const unsigned long DHT_INTERVAL = 2000;
const unsigned long SENSOR_INTERVAL = 1000;
const unsigned long FIREBASE_INTERVAL = 10000;
const unsigned long WIFI_CHECK_INTERVAL = 5000;

/************************************************************
   SENSOR VALUES
************************************************************/

/* DHT11 real values */
float temperatureC = 0.0;
float humidityPercent = 0.0;

/* Simulated MAX30102 */
float heartRate = 70.0;
float spo2 = 98.0;

/* Simulated MPU6050 */
float movement = 0.0;

/* Real microphone DOUT */
int microphoneDigital = 0;
int microphoneADC = 0;

/*
   NOTE:
   This is NOT real dB.
   It is a digital noise index:
   0   = no sound detected
   100 = sound detected
*/
int noiseIndex = 0;

/* Session duration */
float sleepDurationHours = 0.0;

/************************************************************
   TEMPORARY VALUES
************************************************************/

float simulatedHeartRate = 70.0;
float simulatedSpO2 = 98.0;
float simulatedMovement = 0.0;

/************************************************************
   FUNCTION DECLARATIONS
************************************************************/

void connectWiFi();
void initializeFirebase();
void initializeTime();
void createSessionID();
void updateDateKey();

void readDHT11();
void simulateMAX30102();
void simulateMPU6050();
void readMicrophone();

void calculateSleepDuration();

void uploadToFirebase();
void saveOfflineData();

void printSensorValues();
void checkWiFi();

String getTimestamp();
String getDateKey();

float randomFloat(float minValue, float maxValue);

/************************************************************
   SETUP
************************************************************/

void setup()
{
    Serial.begin(115200);

    delay(1000);

    Serial.println();
    Serial.println("========================================");
    Serial.println(" AI AND IoT SLEEP MONITOR");
    Serial.println(" ESP32 SENSOR SYSTEM");
    Serial.println("========================================");

    /******************************************************
       GPIO SETUP
    ******************************************************/

    pinMode(MICROPHONE_PIN, INPUT);

    /******************************************************
       I2C SETUP
    ******************************************************/

    Wire.begin(I2C_SDA, I2C_SCL);

    Serial.println("[OK] I2C initialized");
    Serial.println("SDA = GPIO 21");
    Serial.println("SCL = GPIO 22");

    /******************************************************
       DHT11 SETUP
    ******************************************************/

    dht.begin();

    Serial.println("[OK] DHT11 initialized");

    /******************************************************
       SPIFFS SETUP
    ******************************************************/

    if (SPIFFS.begin(true))
    {
        Serial.println("[OK] SPIFFS initialized");
    }
    else
    {
        Serial.println("[ERROR] SPIFFS initialization failed");
    }

    /******************************************************
       SESSION
    ******************************************************/

    monitoringStartMillis = millis();

    createSessionID();

    /******************************************************
       WIFI
    ******************************************************/

    connectWiFi();

    /******************************************************
       TIME
    ******************************************************/

    initializeTime();

    updateDateKey();

    /******************************************************
       FIREBASE
    ******************************************************/

    initializeFirebase();

    Serial.println();
    Serial.println("========================================");
    Serial.println(" SYSTEM READY");
    Serial.println("========================================");

    Serial.println();
    Serial.println("Sensor configuration:");
    Serial.println("DHT11          : REAL");
    Serial.println("Microphone DO  : REAL");
    Serial.println("MAX30102       : SIMULATED");
    Serial.println("MPU6050        : SIMULATED");
    Serial.println("Firebase       : REAL");
    Serial.println();

    Serial.println("Session ID:");
    Serial.println(sessionID);

    Serial.println();
}

/************************************************************
   MAIN LOOP
************************************************************/

void loop()
{
    unsigned long currentMillis = millis();

    /******************************************************
       WIFI CHECK
    ******************************************************/

    if (currentMillis - lastWiFiCheck >= WIFI_CHECK_INTERVAL)
    {
        lastWiFiCheck = currentMillis;

        checkWiFi();
    }

    /******************************************************
       DHT11
    ******************************************************/

    if (currentMillis - lastDHTRead >= DHT_INTERVAL)
    {
        lastDHTRead = currentMillis;

        readDHT11();
    }

    /******************************************************
       SIMULATED MAX30102 + MPU6050
    ******************************************************/

    if (currentMillis - lastSimulatedRead >= SENSOR_INTERVAL)
    {
        lastSimulatedRead = currentMillis;

        simulateMAX30102();

        simulateMPU6050();
    }

    /******************************************************
       MICROPHONE
    ******************************************************/

    if (currentMillis - lastMicrophoneRead >= SENSOR_INTERVAL)
    {
        lastMicrophoneRead = currentMillis;

        readMicrophone();
    }

    /******************************************************
       SESSION DURATION
    ******************************************************/

    calculateSleepDuration();

    /******************************************************
       FIREBASE
    ******************************************************/

    if (currentMillis - lastFirebaseUpload >= FIREBASE_INTERVAL)
    {
        lastFirebaseUpload = currentMillis;

        uploadToFirebase();
    }

    /******************************************************
       SERIAL MONITOR
    ******************************************************/

    if (currentMillis - lastSerialPrint >= 5000)
    {
        lastSerialPrint = currentMillis;

        printSensorValues();
    }
}

/************************************************************
   WIFI CONNECTION
************************************************************/

void connectWiFi()
{
    Serial.println();
    Serial.println("[WIFI] Connecting...");

    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    int attempts = 0;

    while (WiFi.status() != WL_CONNECTED && attempts < 30)
    {
        delay(500);

        Serial.print(".");

        attempts++;
    }

    Serial.println();

    if (WiFi.status() == WL_CONNECTED)
    {
        wifiConnected = true;

        Serial.println("[WIFI] Connected");

        Serial.print("[WIFI] IP Address: ");
        Serial.println(WiFi.localIP());

        Serial.print("[WIFI] RSSI: ");
        Serial.println(WiFi.RSSI());
    }
    else
    {
        wifiConnected = false;

        Serial.println("[WIFI] Connection failed");

        Serial.println("[WIFI] Offline mode enabled");
    }
}

/************************************************************
   WIFI CHECK
************************************************************/

void checkWiFi()
{
    if (WiFi.status() == WL_CONNECTED)
    {
        if (!wifiConnected)
        {
            wifiConnected = true;

            Serial.println("[WIFI] Connection restored");
        }
    }
    else
    {
        if (wifiConnected)
        {
            wifiConnected = false;

            Serial.println("[WIFI] Connection lost");
        }
    }
}

/************************************************************
   FIREBASE INITIALIZATION
************************************************************/

void initializeFirebase()
{
    Serial.println();
    Serial.println("[FIREBASE] Initializing...");

    config.api_key = API_KEY;

    config.database_url = DATABASE_URL;

    /*
       Firebase authentication
    */

    auth.user.email = USER_EMAIL;
    auth.user.password = USER_PASSWORD;

    /*
       Token status callback
    */

    config.token_status_callback = tokenStatusCallback;

    Firebase.begin(&config, &auth);

    Firebase.reconnectWiFi(true);

    Serial.println("[FIREBASE] Waiting for authentication...");

    unsigned long startTime = millis();

    while (!Firebase.ready() && millis() - startTime < 15000)
    {
        delay(500);

        Serial.print(".");
    }

    Serial.println();

    if (Firebase.ready())
    {
        firebaseReady = true;

        /*
           IMPORTANT FIX

           auth.token.uid is MB_String.
           Convert it to Arduino String.
        */

        userUID = String(auth.token.uid.c_str());

        Serial.println("[FIREBASE] Authentication successful");

        Serial.print("[FIREBASE] UID: ");
        Serial.println(userUID);

        databasePath = "/users/" + userUID + "/sleep_data";

        Serial.print("[FIREBASE] Database path: ");
        Serial.println(databasePath);
    }
    else
    {
        firebaseReady = false;

        Serial.println("[FIREBASE] Authentication failed or timeout");
    }
}

/************************************************************
   NTP TIME
************************************************************/

void initializeTime()
{
    Serial.println();
    Serial.println("[TIME] Synchronizing time...");

    /*
       India Standard Time
       UTC +5:30 = 19800 seconds
    */

    configTime(
        19800,
        0,
        "pool.ntp.org",
        "time.nist.gov",
        "time.google.com"
    );

    struct tm timeinfo;

    if (getLocalTime(&timeinfo, 10000))
    {
        Serial.println("[TIME] Time synchronized");

        Serial.printf(
            "[TIME] %04d-%02d-%02d %02d:%02d:%02d\n",
            timeinfo.tm_year + 1900,
            timeinfo.tm_mon + 1,
            timeinfo.tm_mday,
            timeinfo.tm_hour,
            timeinfo.tm_min,
            timeinfo.tm_sec
        );
    }
    else
    {
        Serial.println("[TIME] Time synchronization failed");
    }
}

/************************************************************
   TIMESTAMP
************************************************************/

String getTimestamp()
{
    struct tm timeinfo;

    if (!getLocalTime(&timeinfo, 1000))
    {
        return "";
    }

    char buffer[30];

    strftime(
        buffer,
        sizeof(buffer),
        "%Y-%m-%d %H:%M:%S",
        &timeinfo
    );

    return String(buffer);
}

/************************************************************
   DATE KEY
************************************************************/

String getDateKey()
{
    struct tm timeinfo;

    if (!getLocalTime(&timeinfo, 1000))
    {
        return "unknown_date";
    }

    char buffer[20];

    strftime(
        buffer,
        sizeof(buffer),
        "%Y-%m-%d",
        &timeinfo
    );

    return String(buffer);
}

/************************************************************
   UPDATE DATE
************************************************************/

void updateDateKey()
{
    dateKey = getDateKey();

    Serial.print("[SESSION] Date: ");
    Serial.println(dateKey);
}

/************************************************************
   CREATE SESSION ID
************************************************************/

void createSessionID()
{
    unsigned long randomNumber = esp_random();

    sessionID =
        "SESSION_" +
        String(randomNumber, HEX) +
        "_" +
        String(millis());

    Serial.print("[SESSION] Created: ");
    Serial.println(sessionID);
}

/************************************************************
   DHT11 READING
************************************************************/

void readDHT11()
{
    float h = dht.readHumidity();

    float t = dht.readTemperature();

    if (isnan(h) || isnan(t))
    {
        Serial.println("[DHT11] Reading failed");

        return;
    }

    humidityPercent = h;

    temperatureC = t;

    Serial.print("[DHT11] Temperature: ");
    Serial.print(temperatureC, 2);

    Serial.print(" °C | Humidity: ");
    Serial.print(humidityPercent, 2);

    Serial.println(" %");
}

/************************************************************
   SIMULATE MAX30102
************************************************************/

void simulateMAX30102()
{
    if (!SIMULATION_MODE)
    {
        return;
    }

    /*
       Heart rate:
       Normal demonstration range approximately
       60 - 85 BPM
    */

    float heartChange =
        randomFloat(-2.0, 2.0);

    simulatedHeartRate += heartChange;

    if (simulatedHeartRate < 60)
    {
        simulatedHeartRate = 60;
    }

    if (simulatedHeartRate > 85)
    {
        simulatedHeartRate = 85;
    }

    heartRate = simulatedHeartRate;

    /*
       SpO2:
       Demonstration range 96 - 100
    */

    float spo2Change =
        randomFloat(-0.5, 0.5);

    simulatedSpO2 += spo2Change;

    if (simulatedSpO2 < 96)
    {
        simulatedSpO2 = 96;
    }

    if (simulatedSpO2 > 100)
    {
        simulatedSpO2 = 100;
    }

    spo2 = simulatedSpO2;
}

/************************************************************
   SIMULATE MPU6050
************************************************************/

void simulateMPU6050()
{
    if (!SIMULATION_MODE)
    {
        return;
    }

    /*
       Mostly low movement during sleep,
       occasionally higher movement.
    */

    int movementEvent = random(0, 100);

    if (movementEvent < 80)
    {
        movement =
            randomFloat(0.0, 0.3);
    }
    else if (movementEvent < 95)
    {
        movement =
            randomFloat(0.3, 1.0);
    }
    else
    {
        movement =
            randomFloat(1.0, 2.0);
    }
}

/************************************************************
   MICROPHONE
************************************************************/

void readMicrophone()
{
    microphoneDigital =
        digitalRead(MICROPHONE_PIN);

    /*
       DOUT sensor:

       LOW  -> no sound
       HIGH -> sound detected

       This is NOT actual dB.
    */

    if (microphoneDigital == HIGH)
    {
        microphoneADC = 1;

        noiseIndex = 100;
    }
    else
    {
        microphoneADC = 0;

        noiseIndex = 0;
    }
}

/************************************************************
   SLEEP DURATION
************************************************************/

void calculateSleepDuration()
{
    unsigned long elapsedMillis =
        millis() - monitoringStartMillis;

    sleepDurationHours =
        (float)elapsedMillis / 3600000.0;

    /*
       Round to 2 decimal places
    */

    sleepDurationHours =
        round(sleepDurationHours * 100.0) / 100.0;
}

/************************************************************
   RANDOM FLOAT
************************************************************/

float randomFloat(float minValue, float maxValue)
{
    long randomValue =
        random(
            (long)(minValue * 1000),
            (long)(maxValue * 1000) + 1
        );

    return randomValue / 1000.0;
}

/************************************************************
   FIREBASE UPLOAD
************************************************************/

void uploadToFirebase()
{
    /*
       If Wi-Fi unavailable
    */

    if (WiFi.status() != WL_CONNECTED)
    {
        Serial.println(
            "[FIREBASE] WiFi unavailable - saving offline"
        );

        saveOfflineData();

        return;
    }

    /*
       Check Firebase
    */

    if (!Firebase.ready())
    {
        Serial.println(
            "[FIREBASE] Firebase not ready"
        );

        /*
           Refresh UID if necessary

           IMPORTANT FIX:
           MB_String -> Arduino String
        */

        if (auth.token.uid.length() > 0)
        {
            userUID =
                String(auth.token.uid.c_str());

            databasePath =
                "/users/" +
                userUID +
                "/sleep_data";
        }

        return;
    }

    firebaseReady = true;

    /*
       Refresh UID

       IMPORTANT FIX:
       Do NOT use:

       userUID = auth.token.uid;

       Use:
    */

    if (auth.token.uid.length() > 0)
    {
        userUID =
            String(auth.token.uid.c_str());

        databasePath =
            "/users/" +
            userUID +
            "/sleep_data";
    }

    /******************************************************
       CREATE FIREBASE JSON
    ******************************************************/

    FirebaseJson json;

    String timestamp =
        getTimestamp();

    /*
       Session information
    */

    json.set(
        "session_id",
        sessionID
    );

    json.set(
        "date_key",
        dateKey
    );

    json.set(
        "timestamp",
        timestamp
    );

    /*
       MAX30102 simulated data
    */

    json.set(
        "heart_rate",
        heartRate
    );

    json.set(
        "spo2",
        spo2
    );

    /*
       MPU6050 simulated data
    */

    json.set(
        "movement",
        movement
    );

    /*
       DHT11 real data
    */

    json.set(
        "temperature_c",
        temperatureC
    );

    json.set(
        "humidity_percent",
        humidityPercent
    );

    /*
       Microphone
    */

    json.set(
        "microphone_adc",
        microphoneADC
    );

    json.set(
        "noise_index",
        noiseIndex
    );

    /*
       Session duration
    */

    json.set(
        "sleep_duration_hours",
        sleepDurationHours
    );

    /*
       ESP32 information
    */

    json.set(
        "device_millis",
        (int)millis()
    );

    json.set(
        "session_elapsed_seconds",
        (int)((millis() - monitoringStartMillis) / 1000)
    );

    json.set(
        "wifi_connected",
        wifiConnected
    );

    /*
       Simulation flag
    */

    json.set(
        "simulation_mode",
        SIMULATION_MODE
    );

    /******************************************************
       UPLOAD
    ******************************************************/

    Serial.println();
    Serial.println("[FIREBASE] Uploading...");

    if (Firebase.RTDB.pushJSON(
            &fbdo,
            databasePath.c_str(),
            &json))
    {
        Serial.println(
            "[FIREBASE] Upload successful"
        );

        Serial.print(
            "[FIREBASE] Path: "
        );

        Serial.println(
            fbdo.dataPath()
        );
    }
    else
    {
        Serial.println(
            "[FIREBASE] Upload failed"
        );

        Serial.print(
            "[FIREBASE] Error: "
        );

        Serial.println(
            fbdo.errorReason()
        );

        /*
           Save locally if Firebase fails
        */

        saveOfflineData();
    }
}

/************************************************************
   OFFLINE DATA
************************************************************/

void saveOfflineData()
{
    File file =
        SPIFFS.open(
            "/offline.txt",
            FILE_APPEND
        );

    if (!file)
    {
        Serial.println(
            "[OFFLINE] Unable to open file"
        );

        return;
    }

    String line = "";

    line += sessionID;
    line += ",";

    line += dateKey;
    line += ",";

    line += getTimestamp();
    line += ",";

    line += String(heartRate, 2);
    line += ",";

    line += String(spo2, 2);
    line += ",";

    line += String(movement, 2);
    line += ",";

    line += String(temperatureC, 2);
    line += ",";

    line += String(humidityPercent, 2);
    line += ",";

    line += String(microphoneADC);
    line += ",";

    line += String(noiseIndex);
    line += ",";

    line += String(sleepDurationHours, 2);

    file.println(line);

    file.close();

    Serial.println(
        "[OFFLINE] Data saved to SPIFFS"
    );
}

/************************************************************
   SERIAL MONITOR
************************************************************/

void printSensorValues()
{
    Serial.println();
    Serial.println("----------------------------------------");
    Serial.println("       CURRENT SENSOR DATA");
    Serial.println("----------------------------------------");

    Serial.print("Heart Rate       : ");
    Serial.print(heartRate, 2);
    Serial.println(" BPM [SIMULATED]");

    Serial.print("SpO2             : ");
    Serial.print(spo2, 2);
    Serial.println(" % [SIMULATED]");

    Serial.print("Movement         : ");
    Serial.print(movement, 2);
    Serial.println(" [SIMULATED]");

    Serial.print("Temperature      : ");
    Serial.print(temperatureC, 2);
    Serial.println(" °C [REAL DHT11]");

    Serial.print("Humidity         : ");
    Serial.print(humidityPercent, 2);
    Serial.println(" % [REAL DHT11]");

    Serial.print("Microphone DOUT  : ");
    Serial.println(microphoneDigital);

    Serial.print("Noise Index      : ");
    Serial.print(noiseIndex);
    Serial.println(" [NOT dB]");

    Serial.print("Session Duration : ");
    Serial.print(sleepDurationHours, 2);
    Serial.println(" hours");

    Serial.print("WiFi             : ");

    if (wifiConnected)
    {
        Serial.println("CONNECTED");
    }
    else
    {
        Serial.println("DISCONNECTED");
    }

    Serial.print("Firebase         : ");

    if (Firebase.ready())
    {
        Serial.println("READY");
    }
    else
    {
        Serial.println("NOT READY");
    }

    Serial.print("Session ID       : ");
    Serial.println(sessionID);

    Serial.println("----------------------------------------");
}