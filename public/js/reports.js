// ======================================================
// AI SLEEP MONITOR
// REPORTS JAVASCRIPT
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
    update
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

import {
    firebaseConfig
} from "./firebase-config.js";

// ======================================================
// FIREBASE
// ======================================================

const app =
    initializeApp(firebaseConfig);

const auth =
    getAuth(app);

const database =
    getDatabase(app);

// ======================================================
// GLOBAL
// ======================================================

let latestRecord = null;

// ======================================================
// AUTHENTICATION
// ======================================================

onAuthStateChanged(
    auth,
    (user) => {

        if (user) {

            console.log(
                "Reports user:",
                user.email
            );

            loadReportData(
                user.uid
            );

        } else {

            window.location.href =
                "index.html";
        }
    }
);

// ======================================================
// LOAD FIREBASE DATA
// ======================================================

function loadReportData(uid) {

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
                "Reports Firebase data:",
                data
            );

            if (!data) {

                showNoData();

                return;
            }

            const records =
                Object.entries(data).map(
                    ([key, value]) => ({
                        ...value,
                        firebaseKey: key
                    })
                );

            if (records.length === 0) {

                showNoData();

                return;
            }

            // ==================================================
            // SORT
            // ==================================================

            records.sort(
                (a, b) => {

                    return (
                        Number(
                            a.device_millis || 0
                        ) -
                        Number(
                            b.device_millis || 0
                        )
                    );
                }
            );

            latestRecord =
                records[
                    records.length - 1
                ];

            // ==================================================
            // GENERATE REPORT
            // ==================================================

            generateReport(
                records
            );

            // ==================================================
            // AI
            // ==================================================

            getSleepQualityPrediction(
                uid,
                latestRecord
            );
        },

        (error) => {

            console.error(
                "Firebase report error:",
                error
            );

            showNoData();
        }
    );
}

// ======================================================
// GENERATE REPORT
// ======================================================

function generateReport(records) {

    setText(
        "totalRecords",
        records.length
    );

    // ==================================================
    // GET VALUES
    // ==================================================

    const heartRates =
        getNumbers(
            records,
            "heart_rate"
        );

    const spo2Values =
        getNumbers(
            records,
            "spo2"
        );

    const temperatures =
        getNumbers(
            records,
            "temperature_c"
        );

    const humidityValues =
        getNumbers(
            records,
            "humidity_percent"
        );

    const movements =
        getNumbers(
            records,
            "movement"
        );

    const noises =
        records
            .map(
                record =>
                    Number(
                        record.noise_index ??
                        record.microphone_adc
                    )
            )
            .filter(
                value =>
                    Number.isFinite(value)
            );

    const sleepDurations =
        getNumbers(
            records,
            "sleep_duration_hours"
        );

    // ==================================================
    // DISPLAY
    // ==================================================

    setText(
        "avgHeartRate",
        average(heartRates)
    );

    setText(
        "avgSpo2",
        average(spo2Values)
    );

    setText(
        "avgTemperature",
        average(temperatures)
    );

    setText(
        "avgHumidity",
        average(humidityValues)
    );

    setText(
        "avgMovement",
        average(movements)
    );

    setText(
        "avgNoise",
        average(noises)
    );

    setText(
        "sleepDuration",
        average(sleepDurations)
    );

    // ==================================================
    // REPORT DATE
    // ==================================================

    const now =
        new Date();

    setText(
        "reportDate",
        "Report generated: " +
        now.toLocaleString()
    );
}

// ======================================================
// GET NUMBERS
// ======================================================

function getNumbers(
    records,
    field
) {

    return records
        .map(
            record =>
                Number(
                    record[field]
                )
        )
        .filter(
            value =>
                Number.isFinite(value)
        );
}

// ======================================================
// AVERAGE
// ======================================================

function average(values) {

    if (values.length === 0) {
        return "--";
    }

    const total =
        values.reduce(
            (
                sum,
                value
            ) =>
                sum + value,
            0
        );

    return (
        total /
        values.length
    ).toFixed(2);
}

// ======================================================
// SET TEXT
// ======================================================

function setText(
    elementId,
    value
) {

    const element =
        document.getElementById(
            elementId
        );

    if (element) {

        element.textContent =
            value;
    }
}

// ======================================================
// AI PREDICTION
// ======================================================

async function getSleepQualityPrediction(
    uid,
    sensorData
) {

    // ==================================================
    // USE SAVED PREDICTION
    // ==================================================

    if (
        sensorData.sleep_quality &&
        sensorData.confidence !== undefined &&
        sensorData.confidence !== null
    ) {

        console.log(
            "Using saved report AI prediction:",
            sensorData.sleep_quality
        );

        displayPrediction(
            sensorData.sleep_quality,
            sensorData.confidence,
            sensorData.ai_analysis
        );

        return;
    }

    // ==================================================
    // GENERATE NEW PREDICTION
    // ==================================================

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
            "Generating AI prediction..."
        );

        const requestData = {

            Heart_Rate:
                Number(
                    sensorData.heart_rate ?? 0
                ),

            SpO2:
                Number(
                    sensorData.spo2 ?? 0
                ),

            Movement:
                Number(
                    sensorData.movement ?? 0
                ),

            Temperature_C:
                Number(
                    sensorData.temperature_c ?? 0
                ),

            Humidity_pct:
                Number(
                    sensorData.humidity_percent ?? 0
                ),

            Noise_dB:
                Number(
                    sensorData.noise_index ??
                    sensorData.microphone_adc ??
                    0
                ),

            Sleep_Duration_Hours:
                Number(
                    sensorData.sleep_duration_hours ?? 0
                )
        };

        console.log(
            "Report AI input:",
            requestData
        );

        const response =
            await fetch(
                "/api/predict",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            requestData
                        )
                }
            );

        if (!response.ok) {

            throw new Error(
                "AI API HTTP " +
                response.status
            );
        }

        const result =
            await response.json();

        console.log(
            "Report AI result:",
            result
        );

        if (
            result.status !==
            "success"
        ) {

            throw new Error(
                result.message ||
                "Prediction failed"
            );
        }

        const quality =
            result.sleep_quality;

        const confidence =
            Number(
                result.confidence ?? 0
            );

        const analysis =
            generateAnalysis(
                quality
            );

        // ==================================================
        // DISPLAY
        // ==================================================

        displayPrediction(
            quality,
            confidence,
            analysis
        );

        // ==================================================
        // SAVE TO FIREBASE
        // ==================================================

        if (sensorData.firebaseKey) {

            const recordRef =
                ref(
                    database,
                    "users/" +
                    uid +
                    "/sleep_data/" +
                    sensorData.firebaseKey
                );

            await update(
                recordRef,
                {
                    sleep_quality:
                        quality,

                    confidence:
                        confidence,

                    ai_analysis:
                        analysis,

                    ai_prediction_time:
                        new Date().toISOString()
                }
            );

            console.log(
                "Report AI prediction saved to Firebase."
            );
        }

    }

    catch (error) {

        console.error(
            "Report AI prediction error:",
            error
        );

        showPredictionError(
            "AI prediction unavailable"
        );
    }
}

// ======================================================
// DISPLAY PREDICTION
// ======================================================

function displayPrediction(
    quality,
    confidence,
    analysis
) {

    setText(
        "sleepQuality",
        quality || "Unavailable"
    );

    if (
        confidence !== undefined &&
        confidence !== null &&
        Number.isFinite(Number(confidence))
    ) {

        setText(
            "confidence",
            Number(confidence).toFixed(2) +
            "%"
        );

    } else {

        setText(
            "confidence",
            "--"
        );
    }

    setText(
        "predictionStatus",
        "Prediction generated by AI"
    );

    if (analysis) {

        setText(
            "analysisText",
            analysis
        );
    }

    updateRecommendations(
        quality
    );
}

// ======================================================
// AI ANALYSIS
// ======================================================

function generateAnalysis(
    quality
) {

    if (quality === "Excellent") {

        return (
            "The AI model classified the latest " +
            "sleep condition as Excellent. " +
            "The monitored values indicate a favorable " +
            "sleep pattern."
        );
    }

    if (quality === "Good") {

        return (
            "The AI model classified the latest " +
            "sleep condition as Good. " +
            "The monitored conditions appear relatively " +
            "favorable."
        );
    }

    if (quality === "Fair") {

        return (
            "The AI model classified the latest " +
            "sleep condition as Fair. Some monitored " +
            "factors may be affecting sleep quality."
        );
    }

    if (quality === "Poor") {

        return (
            "The AI model classified the latest " +
            "sleep condition as Poor. Environmental " +
            "or monitored factors may be contributing " +
            "to lower sleep quality."
        );
    }

    if (quality === "Very Poor") {

        return (
            "The AI model classified the latest " +
            "sleep condition as Very Poor. Several " +
            "monitored factors may require attention."
        );
    }

    return (
        "AI analysis completed for the latest " +
        "sleep record."
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

    element.innerHTML = "";

    let recommendations = [];

    if (quality === "Excellent") {

        recommendations = [
            "Maintain your current sleep routine.",
            "Continue maintaining a comfortable sleeping environment.",
            "Keep a consistent bedtime and wake-up time."
        ];
    }

    else if (quality === "Good") {

        recommendations = [
            "Maintain a regular sleep schedule.",
            "Keep the sleeping environment comfortable.",
            "Continue monitoring your sleep pattern."
        ];
    }

    else if (quality === "Fair") {

        recommendations = [
            "Try maintaining a consistent bedtime.",
            "Reduce unnecessary environmental noise.",
            "Keep the room comfortable for sleeping."
        ];
    }

    else if (quality === "Poor") {

        recommendations = [
            "Try to maintain a regular sleep schedule.",
            "Reduce environmental noise and disturbances.",
            "Review your sleep duration and sleeping conditions."
        ];
    }

    else if (quality === "Very Poor") {

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
        recommendation => {

            const li =
                document.createElement("li");

            li.textContent =
                recommendation;

            element.appendChild(li);
        }
    );
}

// ======================================================
// NO DATA
// ======================================================

function showNoData() {

    setText(
        "totalRecords",
        "0"
    );

    setText(
        "avgHeartRate",
        "--"
    );

    setText(
        "avgSpo2",
        "--"
    );

    setText(
        "avgTemperature",
        "--"
    );

    setText(
        "avgHumidity",
        "--"
    );

    setText(
        "avgMovement",
        "--"
    );

    setText(
        "avgNoise",
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
        "Waiting for sleep data from the ESP32."
    );
}

// ======================================================
// AI ERROR
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
        "The AI model could not analyze the latest sleep data."
    );
}

// ======================================================
// PRINT
// ======================================================

const printButton =
    document.getElementById(
        "printReportBtn"
    );

if (printButton) {

    printButton.addEventListener(
        "click",
        () => {

            window.print();
        }
    );
}

// ======================================================
// REFRESH
// ======================================================

const refreshButton =
    document.getElementById(
        "refreshReportBtn"
    );

if (refreshButton) {

    refreshButton.addEventListener(
        "click",
        () => {

            window.location.reload();
        }
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

                await signOut(auth);

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