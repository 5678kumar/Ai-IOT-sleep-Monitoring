// ======================================================
// AI SLEEP MONITOR
// DASHBOARD JAVASCRIPT
// CORRECTED FIREBASE DATA READING
// DAILY / SESSION AI PREDICTION
// ======================================================

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
    getAuth,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
    getDatabase,
    ref,
    onValue,
    set
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

import {
    firebaseConfig
} from "./firebase-config.js";


// ======================================================
// FIREBASE INITIALIZATION
// ======================================================

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const database = getDatabase(app);


// ======================================================
// CHART VARIABLES
// ======================================================

let heartRateChart = null;
let temperatureChart = null;
let humidityChart = null;
let movementChart = null;
let noiseChart = null;


// ======================================================
// AI PREDICTION CONTROL
// ======================================================

let lastPredictionSignature = "";

let predictionInProgress = false;


// ======================================================
// CONSTANTS
// ======================================================

// Minimum records before sending data to AI
const MIN_VALID_RECORDS = 10;


// ======================================================
// SAFE TEXT UPDATE
// ======================================================

function setText(id, value) {

    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}


// ======================================================
// NUMBER CONVERSION
// ======================================================

function toNumber(value, defaultValue = 0) {

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return defaultValue;
    }

    return number;
}


// ======================================================
// NUMBER DISPLAY
// ======================================================

function displayNumber(value, decimals = 2) {

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "--";
    }

    return number.toFixed(decimals);
}


// ======================================================
// CHECK VALID SENSOR DATA
// ======================================================

function isValidSensorRecord(record) {

    if (!record) {
        return false;
    }

    const heartRate =
        toNumber(record.heart_rate);

    const spo2 =
        toNumber(record.spo2);

    const temperature =
        toNumber(record.temperature_c);

    const humidity =
        toNumber(record.humidity_percent);

    // HR, SpO2, temperature and humidity
    // must contain real/simulated sensor values.
    //
    // Movement can legitimately be 0.
    // Noise can legitimately be 0.

    return (
        heartRate > 0 &&
        spo2 > 0 &&
        temperature > 0 &&
        humidity > 0
    );
}


// ======================================================
// CREATE CHARTS
// ======================================================

function createCharts() {

    // --------------------------------------------------
    // HEART RATE
    // --------------------------------------------------

    const heartCanvas =
        document.getElementById("heartRateChart");

    if (heartCanvas) {

        heartRateChart = new Chart(
            heartCanvas,
            {
                type: "line",

                data: {
                    labels: [],

                    datasets: [
                        {
                            label: "Heart Rate (BPM)",
                            data: [],
                            tension: 0.3
                        }
                    ]
                },

                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            }
        );
    }


    // --------------------------------------------------
    // TEMPERATURE
    // --------------------------------------------------

    const temperatureCanvas =
        document.getElementById("temperatureChart");

    if (temperatureCanvas) {

        temperatureChart = new Chart(
            temperatureCanvas,
            {
                type: "line",

                data: {
                    labels: [],

                    datasets: [
                        {
                            label: "Temperature (°C)",
                            data: [],
                            tension: 0.3
                        }
                    ]
                },

                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            }
        );
    }


    // --------------------------------------------------
    // HUMIDITY
    // --------------------------------------------------

    const humidityCanvas =
        document.getElementById("humidityChart");

    if (humidityCanvas) {

        humidityChart = new Chart(
            humidityCanvas,
            {
                type: "line",

                data: {
                    labels: [],

                    datasets: [
                        {
                            label: "Humidity (%)",
                            data: [],
                            tension: 0.3
                        }
                    ]
                },

                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            }
        );
    }


    // --------------------------------------------------
    // MOVEMENT
    // --------------------------------------------------

    const movementCanvas =
        document.getElementById("movementChart");

    if (movementCanvas) {

        movementChart = new Chart(
            movementCanvas,
            {
                type: "line",

                data: {
                    labels: [],

                    datasets: [
                        {
                            label: "Movement",
                            data: [],
                            tension: 0.3
                        }
                    ]
                },

                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            }
        );
    }


    // --------------------------------------------------
    // NOISE
    // --------------------------------------------------

    const noiseCanvas =
        document.getElementById("noiseChart");

    if (noiseCanvas) {

        noiseChart = new Chart(
            noiseCanvas,
            {
                type: "line",

                data: {
                    labels: [],

                    datasets: [
                        {
                            label: "Noise Index",
                            data: [],
                            tension: 0.3
                        }
                    ]
                },

                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            }
        );
    }

    console.log("Dashboard charts created.");
}


// ======================================================
// AUTHENTICATION
// ======================================================

onAuthStateChanged(
    auth,
    (user) => {

        if (user) {

            console.log(
                "Logged-in user:",
                user.email
            );

            console.log(
                "User UID:",
                user.uid
            );

            createCharts();

            loadSleepData(user.uid);

        } else {

            console.log(
                "No user logged in."
            );

            window.location.href =
                "index.html";
        }
    }
);


// ======================================================
// LOAD FIREBASE SLEEP DATA
// ======================================================

function loadSleepData(uid) {

    const sleepDataRef =
        ref(
            database,
            "users/" +
            uid +
            "/sleep_data"
        );


    onValue(
        sleepDataRef,

        (snapshot) => {

            const data =
                snapshot.val();


            console.log(
                "========================================"
            );

            console.log(
                "FIREBASE SLEEP DATA"
            );

            console.log(
                data
            );

            console.log(
                "========================================"
            );


            // --------------------------------------------------
            // NO DATA
            // --------------------------------------------------

            if (!data) {

                updateEmptyDashboard();

                return;
            }


            // --------------------------------------------------
            // CONVERT FIREBASE OBJECT TO ARRAY
            // --------------------------------------------------

            const records =
                Object.entries(data)
                    .map(
                        ([key, value]) => ({
                            ...value,
                            firebaseKey: key
                        })
                    );


            if (records.length === 0) {

                updateEmptyDashboard();

                return;
            }


            console.log(
                "Total Firebase records:",
                records.length
            );


            // --------------------------------------------------
            // SORT DATA CORRECTLY
            // --------------------------------------------------

            records.sort(
                compareRecords
            );


            // --------------------------------------------------
            // FIND LATEST RECORD
            // --------------------------------------------------

            const latestRecord =
                findLatestRecord(records);


            console.log(
                "LATEST RECORD SELECTED:"
            );

            console.log(
                latestRecord
            );


            // --------------------------------------------------
            // UPDATE DASHBOARD CARDS
            // --------------------------------------------------

            updateDashboard(
                latestRecord
            );


            // --------------------------------------------------
            // UPDATE CHARTS
            // --------------------------------------------------

            updateCharts(
                records
            );


            // --------------------------------------------------
            // DAILY AI PREDICTION
            // --------------------------------------------------

            getDailySleepQualityPrediction(
                uid,
                records
            );
        },


        (error) => {

            console.error(
                "Firebase dashboard error:",
                error
            );

            setText(
                "predictionStatus",
                "Firebase data error"
            );
        }
    );
}


// ======================================================
// COMPARE FIREBASE RECORDS
// ======================================================
//
// Priority:
// 1. timestamp
// 2. device_millis
// 3. firebase key
//
// This prevents the ESP32 restart problem where
// device_millis becomes small again.
//

function compareRecords(a, b) {

    const timestampA =
        a.timestamp
            ? new Date(a.timestamp).getTime()
            : 0;

    const timestampB =
        b.timestamp
            ? new Date(b.timestamp).getTime()
            : 0;


    if (
        Number.isFinite(timestampA) &&
        Number.isFinite(timestampB) &&
        timestampA !== timestampB
    ) {

        return timestampA - timestampB;
    }


    const millisA =
        toNumber(
            a.device_millis
        );


    const millisB =
        toNumber(
            b.device_millis
        );


    if (millisA !== millisB) {

        return millisA - millisB;
    }


    return String(
        a.firebaseKey || ""
    ).localeCompare(
        String(
            b.firebaseKey || ""
        )
    );
}


// ======================================================
// FIND LATEST RECORD
// ======================================================

function findLatestRecord(records) {

    if (!records || records.length === 0) {
        return null;
    }


    // Start from newest and find a valid sensor record.

    for (
        let i = records.length - 1;
        i >= 0;
        i--
    ) {

        if (
            isValidSensorRecord(
                records[i]
            )
        ) {

            console.log(
                "Latest VALID sensor record:",
                records[i]
            );

            return records[i];
        }
    }


    // If no valid record exists,
    // return the newest record anyway.

    console.log(
        "No fully valid sensor record found."
    );

    return records[
        records.length - 1
    ];
}


// ======================================================
// UPDATE SENSOR CARDS
// ======================================================

function updateDashboard(record) {

    if (!record) {

        updateEmptyDashboard();

        return;
    }


    console.log(
        "Updating dashboard from record:",
        record
    );


    // --------------------------------------------------
    // HEART RATE
    // --------------------------------------------------

    const heartRate =
        toNumber(
            record.heart_rate
        );


    setText(
        "heartRate",
        heartRate > 0
            ? displayNumber(
                heartRate,
                1
            )
            : "--"
    );


    // --------------------------------------------------
    // SPO2
    // --------------------------------------------------

    const spo2 =
        toNumber(
            record.spo2
        );


    setText(
        "spo2",
        spo2 > 0
            ? displayNumber(
                spo2,
                1
            )
            : "--"
    );


    // --------------------------------------------------
    // TEMPERATURE
    // --------------------------------------------------

    const temperature =
        toNumber(
            record.temperature_c
        );


    setText(
        "temperature",
        temperature > 0
            ? displayNumber(
                temperature,
                2
            )
            : "--"
    );


    // --------------------------------------------------
    // HUMIDITY
    // --------------------------------------------------

    const humidity =
        toNumber(
            record.humidity_percent
        );


    setText(
        "humidity",
        humidity > 0
            ? displayNumber(
                humidity,
                2
            )
            : "--"
    );


    // --------------------------------------------------
    // MOVEMENT
    // --------------------------------------------------

    const movement =
        toNumber(
            record.movement
        );


    setText(
        "movement",
        displayNumber(
            movement,
            2
        )
    );


    // --------------------------------------------------
    // NOISE
    // --------------------------------------------------

    const noise =
        record.noise_index !== undefined &&
        record.noise_index !== null
            ? toNumber(
                record.noise_index
            )
            : toNumber(
                record.microphone_adc
            );


    setText(
        "noise",
        displayNumber(
            noise,
            2
        )
    );


    // --------------------------------------------------
    // SLEEP DURATION
    // --------------------------------------------------

    const sleepDuration =
        toNumber(
            record.sleep_duration_hours
        );


    setText(
        "sleepDuration",
        displayNumber(
            sleepDuration,
            2
        )
    );


    console.log(
        "DISPLAYED VALUES:",
        {
            heartRate,
            spo2,
            temperature,
            humidity,
            movement,
            noise,
            sleepDuration
        }
    );
}


// ======================================================
// UPDATE CHARTS
// ======================================================

function updateCharts(records) {

    if (!records || records.length === 0) {
        return;
    }


    // Show only the latest 50 records.

    const chartRecords =
        records.slice(-50);


    const labels = [];

    const heartRates = [];

    const temperatures = [];

    const humidities = [];

    const movements = [];

    const noises = [];


    chartRecords.forEach(
        (record, index) => {

            labels.push(
                index + 1
            );


            heartRates.push(
                toNumber(
                    record.heart_rate
                )
            );


            temperatures.push(
                toNumber(
                    record.temperature_c
                )
            );


            humidities.push(
                toNumber(
                    record.humidity_percent
                )
            );


            movements.push(
                toNumber(
                    record.movement
                )
            );


            const noise =
                record.noise_index !== undefined &&
                record.noise_index !== null
                    ? toNumber(
                        record.noise_index
                    )
                    : toNumber(
                        record.microphone_adc
                    );


            noises.push(
                noise
            );
        }
    );


    updateChart(
        heartRateChart,
        labels,
        heartRates
    );


    updateChart(
        temperatureChart,
        labels,
        temperatures
    );


    updateChart(
        humidityChart,
        labels,
        humidities
    );


    updateChart(
        movementChart,
        labels,
        movements
    );


    updateChart(
        noiseChart,
        labels,
        noises
    );
}


// ======================================================
// UPDATE SINGLE CHART
// ======================================================

function updateChart(
    chart,
    labels,
    values
) {

    if (!chart) {
        return;
    }


    chart.data.labels =
        labels;


    chart.data.datasets[0].data =
        values;


    chart.update();
}


// ======================================================
// GET LATEST SESSION RECORDS
// ======================================================

function getLatestSessionRecords(records) {

    if (
        !records ||
        records.length === 0
    ) {

        return {
            sessionId: "unknown_session",
            dateKey: "",
            records: []
        };
    }


    const latestRecord =
        records[
            records.length - 1
        ];


    // --------------------------------------------------
    // SESSION ID AVAILABLE
    // --------------------------------------------------

    if (
        latestRecord.session_id
    ) {

        const sessionId =
            latestRecord.session_id;


        const sessionRecords =
            records.filter(
                (record) =>
                    record.session_id ===
                    sessionId
            );


        return {
            sessionId:
                sessionId,

            dateKey:
                latestRecord.date_key ||
                "",

            records:
                sessionRecords
        };
    }


    // --------------------------------------------------
    // OLD DATA WITHOUT SESSION ID
    // --------------------------------------------------

    return {

        sessionId:
            "legacy_session",

        dateKey:
            latestRecord.date_key ||
            "",

        records:
            records
    };
}


// ======================================================
// GET VALID SESSION RECORDS
// ======================================================

function getValidSessionRecords(records) {

    return records.filter(
        isValidSensorRecord
    );
}


// ======================================================
// DAILY AI SLEEP QUALITY PREDICTION
// ======================================================

async function getDailySleepQualityPrediction(
    uid,
    allRecords
) {

    // --------------------------------------------------
    // GET LATEST SESSION
    // --------------------------------------------------

    const session =
        getLatestSessionRecords(
            allRecords
        );


    const sessionId =
        session.sessionId;


    const dateKey =
        session.dateKey;


    const sessionRecords =
        session.records;


    if (
        sessionRecords.length === 0
    ) {

        return;
    }


    // --------------------------------------------------
    // REMOVE INVALID SENSOR RECORDS
    // --------------------------------------------------

    const validRecords =
        getValidSessionRecords(
            sessionRecords
        );


    console.log(
        "Session records:",
        sessionRecords.length
    );


    console.log(
        "Valid records:",
        validRecords.length
    );


    // --------------------------------------------------
    // NOT ENOUGH DATA
    // --------------------------------------------------

    if (
        validRecords.length <
        MIN_VALID_RECORDS
    ) {

        setText(
            "sleepQuality",
            "Waiting..."
        );


        setText(
            "confidence",
            "--"
        );


        setText(
            "predictionStatus",
            "Collecting sensor data..."
        );


        setText(
            "analysisText",
            "Waiting for enough valid sensor data for AI analysis."
        );


        console.log(
            "Not enough valid records for AI prediction."
        );


        return;
    }


    // --------------------------------------------------
    // LATEST VALID RECORD
    // --------------------------------------------------

    const latestRecord =
        validRecords[
            validRecords.length - 1
        ];


    const latestMillis =
        toNumber(
            latestRecord.device_millis
        );


    // --------------------------------------------------
    // CREATE REQUEST SIGNATURE
    // --------------------------------------------------

    const predictionSignature =
        sessionId +
        "_" +
        validRecords.length +
        "_" +
        latestMillis;


    // --------------------------------------------------
    // AVOID DUPLICATE REQUEST
    // --------------------------------------------------

    if (
        predictionSignature ===
        lastPredictionSignature
    ) {

        console.log(
            "Daily prediction already processed."
        );

        return;
    }


    // --------------------------------------------------
    // PREVENT SIMULTANEOUS REQUESTS
    // --------------------------------------------------

    if (
        predictionInProgress
    ) {

        console.log(
            "Daily prediction already running."
        );

        return;
    }


    predictionInProgress =
        true;


    try {

        setText(
            "sleepQuality",
            "Analyzing..."
        );


        setText(
            "confidence",
            "--"
        );


        setText(
            "predictionStatus",
            "AI analyzing sensor data..."
        );


        console.log(
            "===================================="
        );


        console.log(
            "DAILY AI PREDICTION"
        );


        console.log(
            "Session ID:",
            sessionId
        );


        console.log(
            "Date:",
            dateKey
        );


        console.log(
            "Valid records:",
            validRecords.length
        );


        console.log(
            "===================================="
        );


        // --------------------------------------------------
        // CALL NODE.JS DAILY API
        // --------------------------------------------------

        const response =
            await fetch(
                "/api/predict-daily",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            {
                                session_id:
                                    sessionId,

                                date_key:
                                    dateKey,

                                records:
                                    validRecords
                            }
                        )
                }
            );


        if (!response.ok) {

            throw new Error(
                "Daily AI API returned HTTP " +
                response.status
            );
        }


        const result =
            await response.json();


        console.log(
            "Daily AI result:",
            result
        );


        // --------------------------------------------------
        // CHECK RESULT
        // --------------------------------------------------

        if (
            result.status !==
            "success"
        ) {

            throw new Error(
                result.message ||
                "Daily prediction failed"
            );
        }


        const quality =
            result.sleep_quality ||
            "Unavailable";


        let confidence =
            Number(
                result.confidence
            );


        // --------------------------------------------------
        // CONFIDENCE FIX
        // --------------------------------------------------
        //
        // If Flask returns 0.87,
        // convert it to 87%.
        //
        // If Flask already returns 87,
        // keep 87%.
        //

        if (
            Number.isFinite(
                confidence
            )
        ) {

            if (
                confidence >= 0 &&
                confidence <= 1
            ) {

                confidence =
                    confidence * 100;
            }
        }


        const recordsUsed =
            Number(
                result.records_used ??
                validRecords.length
            );


        // --------------------------------------------------
        // ANALYSIS
        // --------------------------------------------------

        const analysis =
            generateAnalysis(
                quality
            );


        // --------------------------------------------------
        // DISPLAY
        // --------------------------------------------------

        displayPrediction(
            quality,
            confidence,
            analysis,
            recordsUsed
        );


        // --------------------------------------------------
        // SAVE DAILY SUMMARY
        // --------------------------------------------------

        await saveDailySummary(
            uid,
            sessionId,
            dateKey,
            result,
            analysis,
            confidence
        );


        // --------------------------------------------------
        // MARK AS PROCESSED
        // --------------------------------------------------

        lastPredictionSignature =
            predictionSignature;


        console.log(
            "Daily prediction saved successfully."
        );

    }

    catch (error) {

        console.error(
            "Daily AI prediction error:",
            error
        );


        showPredictionError(
            "AI prediction unavailable"
        );
    }

    finally {

        predictionInProgress =
            false;
    }
}


// ======================================================
// SAVE DAILY SUMMARY TO FIREBASE
// ======================================================

async function saveDailySummary(
    uid,
    sessionId,
    dateKey,
    result,
    analysis,
    confidence
) {

    const summary =
        result.daily_summary ||
        {};


    // --------------------------------------------------
    // FIREBASE PATH
    // --------------------------------------------------

    const summaryRef =
        ref(
            database,
            "users/" +
            uid +
            "/daily_summaries/" +
            sessionId
        );


    // --------------------------------------------------
    // DATA TO SAVE
    // --------------------------------------------------

    const dataToSave = {

        session_id:
            sessionId,


        date_key:
            dateKey,


        records_used:
            Number(
                result.records_used ??
                0
            ),


        average_heart_rate:
            Number(
                summary.average_heart_rate ??
                summary.Heart_Rate ??
                0
            ),


        average_spo2:
            Number(
                summary.average_spo2 ??
                summary.SpO2 ??
                0
            ),


        average_movement:
            Number(
                summary.average_movement ??
                summary.Movement ??
                0
            ),


        average_temperature:
            Number(
                summary.average_temperature ??
                summary.Temperature_C ??
                0
            ),


        average_humidity:
            Number(
                summary.average_humidity ??
                summary.Humidity_pct ??
                0
            ),


        average_noise:
            Number(
                summary.average_noise ??
                summary.Noise_dB ??
                0
            ),


        sleep_duration_hours:
            Number(
                summary.sleep_duration_hours ??
                summary.Sleep_Duration_Hours ??
                0
            ),


        sleep_quality:
            result.sleep_quality ||
            "",


        confidence:
            Number(
                confidence || 0
            ),


        ai_analysis:
            analysis ||
            "",


        generated_at:
            new Date().toISOString()
    };


    console.log(
        "Saving daily summary:",
        dataToSave
    );


    await set(
        summaryRef,
        dataToSave
    );
}


// ======================================================
// DISPLAY AI RESULT
// ======================================================

function displayPrediction(
    quality,
    confidence,
    analysis,
    recordsUsed
) {

    setText(
        "sleepQuality",
        quality ||
        "Unavailable"
    );


    // --------------------------------------------------
    // CONFIDENCE
    // --------------------------------------------------

    if (
        Number.isFinite(
            Number(confidence)
        )
    ) {

        setText(
            "confidence",
            Number(confidence)
                .toFixed(2) +
            "%"
        );

    } else {

        setText(
            "confidence",
            "--"
        );
    }


    // --------------------------------------------------
    // STATUS
    // --------------------------------------------------

    setText(
        "predictionStatus",
        "Daily AI prediction generated"
    );


    // --------------------------------------------------
    // ANALYSIS
    // --------------------------------------------------

    if (analysis) {

        setText(
            "analysisText",
            analysis
        );
    }


    // --------------------------------------------------
    // RECOMMENDATIONS
    // --------------------------------------------------

    updateRecommendations(
        quality
    );


    console.log(
        "Records used for AI:",
        recordsUsed
    );
}


// ======================================================
// GENERATE AI ANALYSIS
// ======================================================

function generateAnalysis(
    quality
) {

    if (
        quality ===
        "Excellent"
    ) {

        return (
            "The AI model classified the " +
            "monitored sleep session as Excellent. " +
            "The aggregated sensor values indicate " +
            "a favorable sleep pattern."
        );
    }


    if (
        quality ===
        "Good"
    ) {

        return (
            "The AI model classified the " +
            "monitored sleep session as Good. " +
            "The aggregated monitored conditions " +
            "appear relatively favorable."
        );
    }


    if (
        quality ===
        "Fair"
    ) {

        return (
            "The AI model classified the " +
            "monitored sleep session as Fair. " +
            "Some monitored factors may be affecting " +
            "overall sleep quality."
        );
    }


    if (
        quality ===
        "Poor"
    ) {

        return (
            "The AI model classified the " +
            "monitored sleep session as Poor. " +
            "Environmental conditions or other monitored " +
            "factors may be contributing to lower sleep quality."
        );
    }


    if (
        quality ===
        "Very Poor"
    ) {

        return (
            "The AI model classified the " +
            "monitored sleep session as Very Poor. " +
            "Several monitored factors may require attention."
        );
    }


    return (
        "AI analysis completed for the " +
        "monitored sleep session."
    );
}


// ======================================================
// RECOMMENDATIONS
// ======================================================

function updateRecommendations(
    quality
) {

    const element =
        document.getElementById(
            "recommendations"
        );


    if (!element) {
        return;
    }


    element.innerHTML =
        "";


    let recommendations =
        [];


    if (
        quality ===
        "Excellent"
    ) {

        recommendations = [

            "Maintain your current sleep routine.",

            "Continue maintaining a comfortable sleeping environment.",

            "Keep a consistent bedtime and wake-up time."
        ];
    }


    else if (
        quality ===
        "Good"
    ) {

        recommendations = [

            "Maintain a regular sleep schedule.",

            "Keep the sleeping environment comfortable.",

            "Continue monitoring your sleep pattern."
        ];
    }


    else if (
        quality ===
        "Fair"
    ) {

        recommendations = [

            "Try maintaining a consistent bedtime.",

            "Reduce unnecessary environmental noise.",

            "Keep the room comfortable for sleeping."
        ];
    }


    else if (
        quality ===
        "Poor"
    ) {

        recommendations = [

            "Try to maintain a regular sleep schedule.",

            "Reduce environmental noise and disturbances.",

            "Review your sleep duration and sleeping conditions."
        ];
    }


    else if (
        quality ===
        "Very Poor"
    ) {

        recommendations = [

            "Review your sleep duration and sleep schedule.",

            "Reduce noise and environmental disturbances.",

            "Maintain a comfortable sleeping environment.",

            "Continue monitoring sleep patterns over multiple nights."
        ];
    }


    else {

        recommendations = [

            "Continue collecting sleep sensor data."
        ];
    }


    recommendations.forEach(
        (recommendation) => {

            const li =
                document.createElement(
                    "li"
                );


            li.textContent =
                recommendation;


            element.appendChild(
                li
            );
        }
    );
}


// ======================================================
// EMPTY DASHBOARD
// ======================================================

function updateEmptyDashboard() {

    setText(
        "heartRate",
        "--"
    );


    setText(
        "spo2",
        "--"
    );


    setText(
        "temperature",
        "--"
    );


    setText(
        "humidity",
        "--"
    );


    setText(
        "movement",
        "--"
    );


    setText(
        "noise",
        "--"
    );


    setText(
        "sleepDuration",
        "--"
    );


    setText(
        "sleepQuality",
        "Waiting..."
    );


    setText(
        "confidence",
        "--"
    );


    setText(
        "predictionStatus",
        "No sleep data available"
    );


    setText(
        "analysisText",
        "Waiting for sleep data..."
    );


    updateRecommendations(
        null
    );
}


// ======================================================
// PREDICTION ERROR
// ======================================================

function showPredictionError(
    message
) {

    setText(
        "sleepQuality",
        "Unavailable"
    );


    setText(
        "confidence",
        "--"
    );


    setText(
        "predictionStatus",
        message
    );


    setText(
        "analysisText",
        "The AI model could not analyze the monitored sleep session."
    );
}


// ======================================================
// LOGOUT
// ======================================================

const logoutButton =
    document.getElementById(
        "logoutBtn"
    );


if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        async () => {

            try {

                await signOut(
                    auth
                );


                window.location.href =
                    "index.html";

            }

            catch (error) {

                console.error(
                    "Logout error:",
                    error
                );
            }
        }
    );
}


// ======================================================
// END
// ======================================================

console.log(
    "AI Sleep Monitor dashboard.js loaded successfully."
);