// ======================================================
// AI SLEEP MONITOR
// SLEEP ANALYSIS
// DAILY SUMMARY VERSION
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
    onValue
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

import {
    firebaseConfig
} from "./firebase-config.js";


// ======================================================
// FIREBASE
// ======================================================

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const database = getDatabase(app);


// ======================================================
// AUTHENTICATION
// ======================================================

onAuthStateChanged(
    auth,
    (user) => {

        if (user) {

            console.log(
                "Sleep Analysis user:",
                user.email
            );

            console.log(
                "Sleep Analysis UID:",
                user.uid
            );

            loadDailySummary(
                user.uid
            );

        } else {

            window.location.href =
                "index.html";
        }
    }
);


// ======================================================
// LOAD DAILY SUMMARY
// ======================================================

function loadDailySummary(uid) {

    const summaryRef =
        ref(
            database,
            "users/" +
            uid +
            "/daily_summaries"
        );


    onValue(
        summaryRef,

        (snapshot) => {

            const data =
                snapshot.val();


            console.log(
                "======================================"
            );

            console.log(
                "DAILY SUMMARY DATA"
            );

            console.log(
                data
            );

            console.log(
                "======================================"
            );


            if (!data) {

                console.log(
                    "No daily summary available."
                );

                // Fallback to raw sensor data
                loadRawSensorData(uid);

                return;
            }


            const summaries =
                Object.entries(data)
                    .map(
                        ([key, value]) => ({
                            ...value,
                            firebaseKey: key
                        })
                    );


            if (
                summaries.length === 0
            ) {

                loadRawSensorData(uid);

                return;
            }


            // Sort by generated time
            summaries.sort(
                (a, b) => {

                    const dateA =
                        getDateValue(a);

                    const dateB =
                        getDateValue(b);

                    return dateA - dateB;
                }
            );


            const latest =
                summaries[
                    summaries.length - 1
                ];


            console.log(
                "LATEST DAILY SUMMARY:",
                latest
            );


            displayDailySummary(
                latest
            );


            displayAnalysis(
                latest
            );

        },

        (error) => {

            console.error(
                "Daily summary Firebase error:",
                error
            );

            loadRawSensorData(uid);
        }
    );
}


// ======================================================
// FALLBACK RAW SENSOR DATA
// ======================================================

function loadRawSensorData(uid) {

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


            if (!data) {

                showNoData();

                return;
            }


            const records =
                Object.values(data);


            if (
                records.length === 0
            ) {

                showNoData();

                return;
            }


            // Find latest valid record
            records.sort(
                compareRecords
            );


            let latest = null;


            for (
                let i =
                    records.length - 1;
                i >= 0;
                i--
            ) {

                if (
                    isValidRecord(
                        records[i]
                    )
                ) {

                    latest =
                        records[i];

                    break;
                }
            }


            if (!latest) {

                latest =
                    records[
                        records.length - 1
                    ];
            }


            console.log(
                "Fallback latest sensor record:",
                latest
            );


            displayRawRecord(
                latest
            );


            setText(
                "predictionStatus",
                "Waiting for daily AI summary"
            );


            setText(
                "analysisText",
                "The system is collecting sensor data. Daily AI analysis will appear after enough valid records are collected."
            );


            updateRecommendations(
                "Not predicted"
            );
        },

        (error) => {

            console.error(
                "Raw sensor Firebase error:",
                error
            );

            showNoData();
        }
    );
}


// ======================================================
// SORT RECORDS
// ======================================================

function compareRecords(a, b) {

    const timeA =
        getRecordTime(a);

    const timeB =
        getRecordTime(b);

    return timeA - timeB;
}


// ======================================================
// GET RECORD TIME
// ======================================================

function getRecordTime(record) {

    if (
        record.timestamp
    ) {

        const time =
            new Date(
                record.timestamp
            ).getTime();


        if (
            Number.isFinite(time)
        ) {

            return time;
        }
    }


    return Number(
        record.device_millis || 0
    );
}


// ======================================================
// GET DAILY SUMMARY TIME
// ======================================================

function getDateValue(summary) {

    if (
        summary.generated_at
    ) {

        const time =
            new Date(
                summary.generated_at
            ).getTime();


        if (
            Number.isFinite(time)
        ) {

            return time;
        }
    }


    if (
        summary.date_key
    ) {

        const time =
            new Date(
                summary.date_key +
                "T00:00:00"
            ).getTime();


        if (
            Number.isFinite(time)
        ) {

            return time;
        }
    }


    return 0;
}


// ======================================================
// DISPLAY DAILY SUMMARY
// ======================================================

function displayDailySummary(
    summary
) {

    console.log(
        "Displaying daily summary:",
        summary
    );


    // --------------------------------------------------
    // HEART RATE
    // --------------------------------------------------

    const heartRate =
        getSummaryValue(
            summary,
            [
                "average_heart_rate",
                "heart_rate",
                "Heart_Rate"
            ]
        );


    updateMultipleIds(
        [
            "heartRate",
            "avgHeartRate"
        ],
        formatValue(
            heartRate,
            1
        )
    );


    // --------------------------------------------------
    // SPO2
    // --------------------------------------------------

    const spo2 =
        getSummaryValue(
            summary,
            [
                "average_spo2",
                "spo2",
                "SpO2"
            ]
        );


    updateMultipleIds(
        [
            "spo2",
            "avgSpo2"
        ],
        formatValue(
            spo2,
            1
        )
    );


    // --------------------------------------------------
    // TEMPERATURE
    // --------------------------------------------------

    const temperature =
        getSummaryValue(
            summary,
            [
                "average_temperature",
                "temperature",
                "temperature_c",
                "Temperature_C"
            ]
        );


    updateMultipleIds(
        [
            "temperature",
            "avgTemperature"
        ],
        formatValue(
            temperature,
            2
        )
    );


    // --------------------------------------------------
    // HUMIDITY
    // --------------------------------------------------

    const humidity =
        getSummaryValue(
            summary,
            [
                "average_humidity",
                "humidity",
                "humidity_percent",
                "Humidity_pct"
            ]
        );


    updateMultipleIds(
        [
            "humidity",
            "avgHumidity"
        ],
        formatValue(
            humidity,
            2
        )
    );


    // --------------------------------------------------
    // MOVEMENT
    // --------------------------------------------------

    const movement =
        getSummaryValue(
            summary,
            [
                "average_movement",
                "movement",
                "Movement"
            ]
        );


    updateMultipleIds(
        [
            "movement",
            "avgMovement"
        ],
        formatValue(
            movement,
            2
        )
    );


    // --------------------------------------------------
    // NOISE
    // --------------------------------------------------

    const noise =
        getSummaryValue(
            summary,
            [
                "average_noise",
                "noise",
                "noise_index",
                "Noise_dB"
            ]
        );


    updateMultipleIds(
        [
            "noise",
            "avgNoise"
        ],
        formatValue(
            noise,
            2
        )
    );


    // --------------------------------------------------
    // SLEEP DURATION
    // --------------------------------------------------

    const sleepDuration =
        getSummaryValue(
            summary,
            [
                "sleep_duration_hours",
                "sleepDuration",
                "Sleep_Duration_Hours"
            ]
        );


    updateMultipleIds(
        [
            "sleepDuration"
        ],
        formatValue(
            sleepDuration,
            2
        )
    );


    // --------------------------------------------------
    // AI QUALITY
    // --------------------------------------------------

    const quality =
        summary.sleep_quality ||
        summary.sleepQuality ||
        "Not predicted";


    setText(
        "sleepQuality",
        quality
    );


    // --------------------------------------------------
    // CONFIDENCE
    // --------------------------------------------------

    let confidence =
        summary.confidence;


    confidence =
        normalizeConfidence(
            confidence
        );


    if (
        confidence !== null
    ) {

        setText(
            "confidence",
            confidence.toFixed(2) +
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
        "Daily AI analysis available"
    );


    // --------------------------------------------------
    // ANALYSIS
    // --------------------------------------------------

    displayAnalysis(
        summary
    );
}


// ======================================================
// DISPLAY ANALYSIS
// ======================================================

function displayAnalysis(
    summary
) {

    const quality =
        summary.sleep_quality ||
        summary.sleepQuality ||
        "Not predicted";


    // If saved analysis exists
    if (
        summary.ai_analysis
    ) {

        setText(
            "analysisText",
            summary.ai_analysis
        );

    } else {

        generateAnalysis(
            quality
        );
    }


    updateRecommendations(
        quality
    );
}


// ======================================================
// DISPLAY RAW RECORD
// ======================================================

function displayRawRecord(
    record
) {

    if (!record) {

        showNoData();

        return;
    }


    updateMultipleIds(
        [
            "heartRate",
            "avgHeartRate"
        ],
        formatValue(
            record.heart_rate,
            1
        )
    );


    updateMultipleIds(
        [
            "spo2",
            "avgSpo2"
        ],
        formatValue(
            record.spo2,
            1
        )
    );


    updateMultipleIds(
        [
            "temperature",
            "avgTemperature"
        ],
        formatValue(
            record.temperature_c,
            2
        )
    );


    updateMultipleIds(
        [
            "humidity",
            "avgHumidity"
        ],
        formatValue(
            record.humidity_percent,
            2
        )
    );


    updateMultipleIds(
        [
            "movement",
            "avgMovement"
        ],
        formatValue(
            record.movement,
            2
        )
    );


    const noise =
        record.noise_index ??
        record.microphone_adc ??
        null;


    updateMultipleIds(
        [
            "noise",
            "avgNoise"
        ],
        formatValue(
            noise,
            2
        )
    );


    setText(
        "sleepDuration",
        formatValue(
            record.sleep_duration_hours,
            2
        )
    );


    setText(
        "sleepQuality",
        "Waiting..."
    );


    setText(
        "confidence",
        "--"
    );
}


// ======================================================
// GET SUMMARY VALUE
// ======================================================

function getSummaryValue(
    summary,
    fields
) {

    for (
        const field of fields
    ) {

        if (
            summary[field] !==
            undefined &&
            summary[field] !==
            null &&
            summary[field] !== ""
        ) {

            const value =
                Number(
                    summary[field]
                );


            if (
                Number.isFinite(value)
            ) {

                return value;
            }
        }
    }


    return null;
}


// ======================================================
// NORMALIZE CONFIDENCE
// ======================================================

function normalizeConfidence(
    value
) {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        return null;
    }


    let number =
        Number(value);


    if (
        !Number.isFinite(number)
    ) {

        return null;
    }


    if (
        number >= 0 &&
        number <= 1
    ) {

        number =
            number * 100;
    }


    return number;
}


// ======================================================
// FORMAT VALUE
// ======================================================

function formatValue(
    value,
    decimals
) {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        return "--";
    }


    const number =
        Number(value);


    if (
        !Number.isFinite(number)
    ) {

        return "--";
    }


    return number.toFixed(
        decimals
    );
}


// ======================================================
// VALID RECORD
// ======================================================

function isValidRecord(
    record
) {

    if (!record) {
        return false;
    }


    return (
        Number(record.heart_rate || 0) > 0 &&
        Number(record.spo2 || 0) > 0 &&
        Number(record.temperature_c || 0) > 0 &&
        Number(record.humidity_percent || 0) > 0
    );
}


// ======================================================
// UPDATE MULTIPLE IDs
// ======================================================

function updateMultipleIds(
    ids,
    value
) {

    ids.forEach(
        (id) => {

            setText(
                id,
                value
            );
        }
    );
}


// ======================================================
// SET TEXT
// ======================================================

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.textContent =
            value;
    }
}


// ======================================================
// GENERATE ANALYSIS
// ======================================================

function generateAnalysis(
    quality
) {

    if (
        quality ===
        "Excellent"
    ) {

        setText(
            "analysisText",
            "The AI model classified the monitored sleep session as Excellent. The aggregated sensor values indicate a favorable sleep pattern."
        );

    }

    else if (
        quality ===
        "Good"
    ) {

        setText(
            "analysisText",
            "The AI model classified the monitored sleep session as Good. The overall monitored conditions appear relatively favorable."
        );

    }

    else if (
        quality ===
        "Fair"
    ) {

        setText(
            "analysisText",
            "The AI model classified the monitored sleep session as Fair. Some monitored factors may be affecting the overall sleep quality."
        );

    }

    else if (
        quality ===
        "Poor"
    ) {

        setText(
            "analysisText",
            "The AI model classified the monitored sleep session as Poor. Environmental conditions or other monitored factors may be contributing to lower sleep quality."
        );

    }

    else if (
        quality ===
        "Very Poor"
    ) {

        setText(
            "analysisText",
            "The AI model classified the monitored sleep session as Very Poor. Several monitored factors may require attention."
        );

    }

    else {

        setText(
            "analysisText",
            "Waiting for the daily AI sleep analysis."
        );
    }
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

            "Keep a comfortable sleeping environment.",

            "Maintain a consistent bedtime and wake-up time."
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

            "Try maintaining a regular sleep schedule.",

            "Reduce unnecessary noise and disturbances.",

            "Keep the sleeping environment comfortable."
        ];
    }


    else if (
        quality ===
        "Poor"
    ) {

        recommendations = [

            "Try maintaining a consistent sleep schedule.",

            "Reduce environmental noise and disturbances.",

            "Review sleep duration and sleeping conditions."
        ];
    }


    else if (
        quality ===
        "Very Poor"
    ) {

        recommendations = [

            "Review sleep duration and sleep schedule.",

            "Reduce environmental noise and disturbances.",

            "Maintain a comfortable sleeping environment.",

            "Continue monitoring sleep patterns over multiple nights."
        ];
    }


    else {

        recommendations = [

            "Continue collecting sleep sensor data.",

            "Daily AI recommendations will appear after prediction."
        ];
    }


    recommendations.forEach(
        (text) => {

            const li =
                document.createElement(
                    "li"
                );


            li.textContent =
                text;


            element.appendChild(
                li
            );
        }
    );
}


// ======================================================
// NO DATA
// ======================================================

function showNoData() {

    updateMultipleIds(
        [
            "heartRate",
            "avgHeartRate",
            "spo2",
            "avgSpo2",
            "temperature",
            "avgTemperature",
            "humidity",
            "avgHumidity",
            "movement",
            "avgMovement",
            "noise",
            "avgNoise",
            "sleepDuration"
        ],
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


    updateRecommendations(
        "Not predicted"
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
// PAGE LOAD
// ======================================================

console.log(
    "Sleep Analysis JavaScript loaded successfully."
);