// ============================================================
// AI & IoT SLEEP MONITOR
// SLEEP ANALYSIS PAGE
// ============================================================
//
// Firebase structure supported:
//
// users
//   └── UID
//       ├── sleep_data
//       │    └── sensor records
//       │
//       └── daily_summaries
//            └── 2026-09-13
//                 └── SESSION_xxxxx
//                      ├── ai_analysis
//                      ├── average_heart_rate
//                      ├── average_spo2
//                      ├── average_movement
//                      ├── average_temperature
//                      ├── average_humidity
//                      ├── average_noise
//                      ├── sleep_duration_hours
//                      ├── sleep_quality
//                      ├── confidence
//                      └── records_used
//
// ============================================================


// ============================================================
// IMPORT FIREBASE FROM app.js
// IMPORTANT: DO NOT initialize Firebase again here.
// ============================================================

import {
    auth,
    database
} from "./app.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
    ref,
    onValue
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";


// ============================================================
// GLOBAL VARIABLES
// ============================================================

let dailySummaryLoaded = false;


// ============================================================
// BASIC HTML HELPER
// ============================================================

function setText(id, value) {

    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }

}


// ============================================================
// NUMBER HELPER
// ============================================================

function getNumber(object, keys) {

    if (!object) {
        return 0;
    }

    for (const key of keys) {

        const value = object[key];

        if (
            value !== undefined &&
            value !== null &&
            value !== ""
        ) {

            const number = Number(value);

            if (Number.isFinite(number)) {
                return number;
            }

        }

    }

    return 0;
}


// ============================================================
// AVERAGE
// ============================================================

function average(records, keys) {

    if (!Array.isArray(records) || records.length === 0) {
        return 0;
    }

    const values = [];

    records.forEach(record => {

        const value =
            getNumber(record, keys);

        if (
            Number.isFinite(value) &&
            value !== 0
        ) {

            values.push(value);

        }

    });


    if (values.length === 0) {
        return 0;
    }


    const total =
        values.reduce(
            (sum, value) => sum + value,
            0
        );


    return total / values.length;
}


// ============================================================
// MAXIMUM
// Used for sleep duration because duration increases
// throughout a monitoring session.
// ============================================================

function maximum(records, keys) {

    if (!Array.isArray(records) || records.length === 0) {
        return 0;
    }

    let max = 0;

    records.forEach(record => {

        const value =
            getNumber(record, keys);

        if (Number.isFinite(value)) {

            max =
                Math.max(
                    max,
                    value
                );

        }

    });

    return max;
}


// ============================================================
// CONFIDENCE FORMAT
// ============================================================

function confidenceText(value) {

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "--";
    }


    // Firebase may store 0.51
    // or 51

    if (number <= 1) {

        return (
            number * 100
        ).toFixed(1) + "%";

    }


    return number.toFixed(1) + "%";
}


// ============================================================
// AUTHENTICATION
// ============================================================

onAuthStateChanged(
    auth,
    user => {

        console.log(
            "======================================"
        );

        console.log(
            "SLEEP ANALYSIS AUTH CHECK"
        );

        console.log(
            "======================================"
        );


        if (!user) {

            console.log(
                "No authenticated user."
            );

            window.location.href =
                "index.html";

            return;

        }


        console.log(
            "Authenticated user:",
            user.email
        );

        console.log(
            "Firebase UID:",
            user.uid
        );


        // ----------------------------------------------------
        // DISPLAY USER EMAIL
        // ----------------------------------------------------

        setText(
            "userEmail",
            user.email || "Authenticated"
        );


        // ----------------------------------------------------
        // LOGOUT
        // ----------------------------------------------------

        const logoutButton =
            document.getElementById(
                "topLogout"
            );


        if (logoutButton) {

            logoutButton.onclick =
                async function () {

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

                };

        }


        // ----------------------------------------------------
        // LOAD DATA
        // ----------------------------------------------------

        loadDailySummaries(
            user.uid
        );

        loadRawSleepData(
            user.uid
        );

    }
);


// ============================================================
// LOAD DAILY AI SUMMARIES
// ============================================================

function loadDailySummaries(uid) {

    const dailySummaryRef =
        ref(
            database,
            `users/${uid}/daily_summaries`
        );


    console.log(
        "======================================"
    );

    console.log(
        "READING DAILY AI SUMMARIES"
    );

    console.log(
        `users/${uid}/daily_summaries`
    );

    console.log(
        "======================================"
    );


    onValue(

        dailySummaryRef,

        snapshot => {

            const data =
                snapshot.val();


            console.log(
                "Firebase daily_summaries:"
            );

            console.log(
                data
            );


            if (!data) {

                console.log(
                    "No daily_summaries data found."
                );

                return;

            }


            const summaries = [];


            // ==================================================
            // RECURSIVELY SEARCH FIREBASE DATA
            //
            // This supports:
            //
            // daily_summaries
            //   -> date
            //      -> session
            //
            // AND
            //
            // daily_summaries
            //   -> session
            //
            // ==================================================

            function searchSummary(
                object,
                currentDate = "",
                currentSession = ""
            ) {

                if (
                    !object ||
                    typeof object !== "object"
                ) {

                    return;

                }


                // ------------------------------------------------
                // CHECK WHETHER THIS OBJECT IS A DAILY SUMMARY
                // ------------------------------------------------

                const isSummary =
                    object.average_heart_rate !== undefined ||
                    object.average_spo2 !== undefined ||
                    object.average_movement !== undefined ||
                    object.average_temperature !== undefined ||
                    object.average_humidity !== undefined ||
                    object.average_noise !== undefined ||
                    object.sleep_quality !== undefined ||
                    object.confidence !== undefined ||
                    object.ai_analysis !== undefined;


                if (isSummary) {

                    summaries.push({

                        ...object,

                        date_key:
                            object.date_key ||
                            currentDate ||
                            object.date ||
                            "--",

                        session_id:
                            object.session_id ||
                            currentSession ||
                            "--"

                    });


                    return;

                }


                // ------------------------------------------------
                // SEARCH CHILD OBJECTS
                // ------------------------------------------------

                Object.entries(
                    object
                ).forEach(
                    ([key, value]) => {

                        if (
                            !value ||
                            typeof value !== "object"
                        ) {

                            return;

                        }


                        let nextDate =
                            currentDate;

                        let nextSession =
                            currentSession;


                        // ------------------------------------------------
                        // DATE KEY
                        // Example: 2026-09-13
                        // ------------------------------------------------

                        if (
                            /^\d{4}-\d{2}-\d{2}$/
                                .test(key)
                        ) {

                            nextDate =
                                key;

                        }


                        // ------------------------------------------------
                        // SESSION KEY
                        // Example: SESSION_c96be0a6_1128
                        // ------------------------------------------------

                        if (
                            key
                                .toUpperCase()
                                .startsWith(
                                    "SESSION_"
                                )
                        ) {

                            nextSession =
                                key;

                        }


                        searchSummary(
                            value,
                            nextDate,
                            nextSession
                        );

                    }
                );

            }


            // Start recursive search

            searchSummary(data);


            console.log(
                "Number of AI summaries found:",
                summaries.length
            );

            console.log(
                "AI summaries:",
                summaries
            );


            if (
                summaries.length === 0
            ) {

                console.log(
                    "No saved AI summary found."
                );

                return;

            }


            // ==================================================
            // SORT SUMMARIES
            // ==================================================

            summaries.sort(
                (a, b) => {

                    const dateA =
                        String(
                            a.date_key || ""
                        );

                    const dateB =
                        String(
                            b.date_key || ""
                        );


                    if (
                        dateA !== dateB
                    ) {

                        return dateA.localeCompare(
                            dateB
                        );

                    }


                    return String(
                        a.session_id || ""
                    ).localeCompare(
                        String(
                            b.session_id || ""
                        )
                    );

                }
            );


            // ==================================================
            // GET LATEST SUMMARY
            // ==================================================

            const latest =
                summaries[
                    summaries.length - 1
                ];


            console.log(
                "======================================"
            );

            console.log(
                "LATEST SAVED AI SUMMARY"
            );

            console.log(
                latest
            );

            console.log(
                "======================================"
            );


            // ==================================================
            // DISPLAY SUMMARY
            // ==================================================

            dailySummaryLoaded =
                true;


            displaySummary(
                latest
            );

        },

        error => {

            console.error(
                "Firebase daily_summaries error:"
            );

            console.error(
                error
            );

        }

    );

}


// ============================================================
// DISPLAY DAILY AI SUMMARY
// ============================================================

function displaySummary(summary) {

    if (!summary) {
        return;
    }


    console.log(
        "Displaying AI summary:"
    );

    console.log(
        summary
    );


    // ========================================================
    // HEART RATE
    // ========================================================

    const heartRate =
        getNumber(
            summary,
            [
                "average_heart_rate",
                "avg_heart_rate",
                "heart_rate",
                "Heart_Rate"
            ]
        );


    // ========================================================
    // SPO2
    // ========================================================

    const spo2 =
        getNumber(
            summary,
            [
                "average_spo2",
                "avg_spo2",
                "spo2",
                "SpO2"
            ]
        );


    // ========================================================
    // TEMPERATURE
    // ========================================================

    const temperature =
        getNumber(
            summary,
            [
                "average_temperature",
                "avg_temperature",
                "average_temperature_c",
                "temperature_c",
                "Temperature_C",
                "temperature"
            ]
        );


    // ========================================================
    // HUMIDITY
    // ========================================================

    const humidity =
        getNumber(
            summary,
            [
                "average_humidity",
                "avg_humidity",
                "average_humidity_percent",
                "humidity_percent",
                "Humidity_pct",
                "humidity"
            ]
        );


    // ========================================================
    // MOVEMENT
    // ========================================================

    const movement =
        getNumber(
            summary,
            [
                "average_movement",
                "avg_movement",
                "movement",
                "Movement"
            ]
        );


    // ========================================================
    // NOISE
    // ========================================================

    const noise =
        getNumber(
            summary,
            [
                "average_noise",
                "avg_noise",
                "average_noise_index",
                "noise_index",
                "Noise_dB",
                "Noise"
            ]
        );


    // ========================================================
    // SLEEP DURATION
    // ========================================================

    const duration =
        getNumber(
            summary,
            [
                "sleep_duration_hours",
                "average_sleep_duration_hours",
                "Sleep_Duration_Hours",
                "Sleep_Duration_hr"
            ]
        );


    // ========================================================
    // SLEEP QUALITY
    // ========================================================

    const quality =
        summary.sleep_quality ||
        summary.Sleep_Quality ||
        summary.quality ||
        summary.prediction ||
        summary.predicted_quality ||
        summary.result ||
        "Waiting...";


    // ========================================================
    // CONFIDENCE
    // ========================================================

    const confidence =
        summary.confidence ??
        summary.Confidence ??
        summary.prediction_confidence ??
        summary.model_confidence;


    // ========================================================
    // DATE
    // ========================================================

    const date =
        summary.date_key ||
        summary.date ||
        "--";


    // ========================================================
    // RECORD COUNT
    // ========================================================

    const recordsUsed =
        summary.records_used ??
        summary.record_count ??
        summary.recordsUsed;


    // ========================================================
    // AI ANALYSIS
    // ========================================================

    const aiAnalysis =
        summary.ai_analysis ||
        summary.analysis ||
        summary.message ||
        "";


    // ========================================================
    // CONSOLE DEBUG
    // ========================================================

    console.log(
        "--------------------------------------"
    );

    console.log(
        "FINAL DISPLAY VALUES"
    );

    console.log(
        "Heart Rate:",
        heartRate
    );

    console.log(
        "SpO2:",
        spo2
    );

    console.log(
        "Temperature:",
        temperature
    );

    console.log(
        "Humidity:",
        humidity
    );

    console.log(
        "Movement:",
        movement
    );

    console.log(
        "Noise:",
        noise
    );

    console.log(
        "Sleep Duration:",
        duration
    );

    console.log(
        "Sleep Quality:",
        quality
    );

    console.log(
        "Confidence:",
        confidence
    );

    console.log(
        "Date:",
        date
    );

    console.log(
        "Records Used:",
        recordsUsed
    );

    console.log(
        "AI Analysis:",
        aiAnalysis
    );

    console.log(
        "--------------------------------------"
    );


    // ========================================================
    // DISPLAY QUALITY
    // ========================================================

    setText(
        "quality",
        quality
    );


    // ========================================================
    // DISPLAY CONFIDENCE
    // ========================================================

    setText(
        "confidence",
        confidenceText(
            confidence
        )
    );


    // ========================================================
    // DISPLAY DATE
    // ========================================================

    setText(
        "analysisDate",
        date
    );


    // ========================================================
    // DISPLAY SENSOR VALUES
    // ========================================================

    setText(
        "hrAvg",
        heartRate > 0
            ? heartRate.toFixed(1)
            : "--"
    );


    setText(
        "spo2Avg",
        spo2 > 0
            ? spo2.toFixed(1)
            : "--"
    );


    setText(
        "tempAvg",
        temperature !== 0
            ? temperature.toFixed(1)
            : "--"
    );


    setText(
        "humidityAvg",
        humidity !== 0
            ? humidity.toFixed(1)
            : "--"
    );


    setText(
        "movementAvg",
        Number.isFinite(movement)
            ? movement.toFixed(2)
            : "--"
    );


    setText(
        "noiseAvg",
        Number.isFinite(noise)
            ? noise.toFixed(0)
            : "--"
    );


    setText(
        "duration",
        duration > 0
            ? duration.toFixed(2)
            : "--"
    );


    // ========================================================
    // QUALITY NOTE
    // ========================================================

    if (aiAnalysis) {

        setText(
            "qualityNote",
            aiAnalysis
        );

    }
    else if (
        recordsUsed !== undefined &&
        recordsUsed !== null
    ) {

        setText(
            "qualityNote",
            `${recordsUsed} records used for the saved daily prediction.`
        );

    }
    else {

        setText(
            "qualityNote",
            "Daily AI summary loaded."
        );

    }


    // ========================================================
    // BADGES
    // ========================================================

    setText(
        "hrBadge",
        heartRate > 0
            ? "Average"
            : "--"
    );


    setText(
        "spo2Badge",
        spo2 > 0
            ? "Average"
            : "--"
    );


    // ========================================================
    // HEART RATE PROGRESS
    // ========================================================

    const hrProgress =
        document.getElementById(
            "hrProgress"
        );


    if (hrProgress) {

        const width =
            Math.min(
                100,
                Math.max(
                    0,
                    heartRate / 1.4
                )
            );


        hrProgress.style.width =
            width + "%";

    }


    // ========================================================
    // SPO2 PROGRESS
    // ========================================================

    const spo2Progress =
        document.getElementById(
            "spo2Progress"
        );


    if (spo2Progress) {

        const width =
            Math.min(
                100,
                Math.max(
                    0,
                    spo2
                )
            );


        spo2Progress.style.width =
            width + "%";

    }


    // ========================================================
    // SLEEP DURATION PROGRESS
    // ========================================================

    const durationProgress =
        document.getElementById(
            "durationProgress"
        );


    if (durationProgress) {

        const width =
            Math.min(
                100,
                Math.max(
                    0,
                    (duration / 8) * 100
                )
            );


        durationProgress.style.width =
            width + "%";

    }


    // ========================================================
    // RECOMMENDATIONS
    // ========================================================

    displayRecommendations(
        duration,
        noise,
        movement,
        humidity
    );

}


// ============================================================
// RAW SENSOR DATA
//
// This is only a FALLBACK.
// If the daily AI summary exists, the raw data will not
// overwrite the AI result.
// ============================================================

function loadRawSleepData(uid) {

    const sleepDataRef =
        ref(
            database,
            `users/${uid}/sleep_data`
        );


    console.log(
        "======================================"
    );

    console.log(
        "READING RAW SENSOR DATA"
    );

    console.log(
        `users/${uid}/sleep_data`
    );

    console.log(
        "======================================"
    );


    onValue(

        sleepDataRef,

        snapshot => {

            const data =
                snapshot.val();


            console.log(
                "Raw sleep_data:"
            );

            console.log(
                data
            );


            if (!data) {

                console.log(
                    "No raw sleep data."
                );

                return;

            }


            const records =
                Object.values(data);


            if (
                records.length === 0
            ) {

                return;

            }


            // --------------------------------------------------
            // IF DAILY AI SUMMARY ALREADY EXISTS,
            // DO NOT REPLACE IT.
            // --------------------------------------------------

            if (dailySummaryLoaded) {

                console.log(
                    "Daily AI summary already loaded."
                );

                console.log(
                    "Raw data will not overwrite it."
                );

                return;

            }


            console.log(
                "Using raw sensor data as fallback."
            );


            // ==================================================
            // CALCULATE VALUES
            // ==================================================

            const heartRate =
                average(
                    records,
                    [
                        "heart_rate",
                        "Heart_Rate"
                    ]
                );


            const spo2 =
                average(
                    records,
                    [
                        "spo2",
                        "SpO2"
                    ]
                );


            const temperature =
                average(
                    records,
                    [
                        "temperature_c",
                        "Temperature_C",
                        "temperature"
                    ]
                );


            const humidity =
                average(
                    records,
                    [
                        "humidity_percent",
                        "Humidity_pct",
                        "Humidity",
                        "humidity"
                    ]
                );


            const movement =
                average(
                    records,
                    [
                        "movement",
                        "Movement"
                    ]
                );


            const noise =
                average(
                    records,
                    [
                        "noise_index",
                        "Noise_dB",
                        "Noise",
                        "microphone_adc"
                    ]
                );


            const duration =
                maximum(
                    records,
                    [
                        "sleep_duration_hours",
                        "Sleep_Duration_Hours",
                        "Sleep_Duration_hr"
                    ]
                );


            // ==================================================
            // DISPLAY RAW VALUES
            // ==================================================

            setText(
                "hrAvg",
                heartRate > 0
                    ? heartRate.toFixed(1)
                    : "--"
            );


            setText(
                "spo2Avg",
                spo2 > 0
                    ? spo2.toFixed(1)
                    : "--"
            );


            setText(
                "tempAvg",
                temperature !== 0
                    ? temperature.toFixed(1)
                    : "--"
            );


            setText(
                "humidityAvg",
                humidity !== 0
                    ? humidity.toFixed(1)
                    : "--"
            );


            setText(
                "movementAvg",
                movement.toFixed(2)
            );


            setText(
                "noiseAvg",
                noise.toFixed(0)
            );


            setText(
                "duration",
                duration > 0
                    ? duration.toFixed(2)
                    : "--"
            );


            setText(
                "quality",
                "Waiting..."
            );


            setText(
                "confidence",
                "--"
            );


            setText(
                "analysisDate",
                "--"
            );


            setText(
                "qualityNote",
                "Sensor data loaded. Waiting for the saved AI prediction."
            );


            // ==================================================
            // PROGRESS BARS
            // ==================================================

            const hrProgress =
                document.getElementById(
                    "hrProgress"
                );


            if (hrProgress) {

                hrProgress.style.width =
                    Math.min(
                        100,
                        Math.max(
                            0,
                            heartRate / 1.4
                        )
                    ) + "%";

            }


            const spo2Progress =
                document.getElementById(
                    "spo2Progress"
                );


            if (spo2Progress) {

                spo2Progress.style.width =
                    Math.min(
                        100,
                        Math.max(
                            0,
                            spo2
                        )
                    ) + "%";

            }


            const durationProgress =
                document.getElementById(
                    "durationProgress"
                );


            if (durationProgress) {

                durationProgress.style.width =
                    Math.min(
                        100,
                        Math.max(
                            0,
                            (duration / 8) * 100
                        )
                    ) + "%";

            }


            setText(
                "hrBadge",
                heartRate > 0
                    ? "Average"
                    : "--"
            );


            setText(
                "spo2Badge",
                spo2 > 0
                    ? "Average"
                    : "--"
            );


            displayRecommendations(
                duration,
                noise,
                movement,
                humidity
            );

        },

        error => {

            console.error(
                "Firebase sleep_data error:"
            );

            console.error(
                error
            );

        }

    );

}


// ============================================================
// RECOMMENDATIONS
// ============================================================

function displayRecommendations(
    duration,
    noise,
    movement,
    humidity
) {

    const box =
        document.getElementById(
            "recommendations"
        );


    if (!box) {
        return;
    }


    const recommendations = [];


    // --------------------------------------------------------
    // SLEEP DURATION
    // --------------------------------------------------------

    if (
        duration > 0 &&
        duration < 7
    ) {

        recommendations.push(
            {
                icon: "◷",
                title: "Review your sleep schedule",
                text:
                    "The recorded monitoring session is below 7 hours."
            }
        );

    }


    // --------------------------------------------------------
    // NOISE
    // --------------------------------------------------------

    if (
        noise >= 50
    ) {

        recommendations.push(
            {
                icon: "⌁",
                title: "Reduce nighttime sound",
                text:
                    "The digital noise index shows sound detections during the session."
            }
        );

    }


    // --------------------------------------------------------
    // MOVEMENT
    // --------------------------------------------------------

    if (
        movement >= 1
    ) {

        recommendations.push(
            {
                icon: "↗",
                title: "Keep the sleep environment stable",
                text:
                    "Higher movement was detected during the session."
            }
        );

    }


    // --------------------------------------------------------
    // HUMIDITY
    // --------------------------------------------------------

    if (
        humidity >= 70
    ) {

        recommendations.push(
            {
                icon: "◌",
                title: "Check room humidity",
                text:
                    "The measured room humidity is relatively high."
            }
        );

    }


    // --------------------------------------------------------
    // DEFAULT
    // --------------------------------------------------------

    if (
        recommendations.length === 0
    ) {

        recommendations.push(
            {
                icon: "☾",
                title: "Maintain your routine",
                text:
                    "The available session signals do not trigger a specific demo recommendation."
            }
        );

    }


    // ========================================================
    // CREATE HTML
    // ========================================================

    box.innerHTML =
        recommendations
            .map(
                item => {

                    return `
                        <div class="recommendation">

                            <div class="rec-icon">
                                ${item.icon}
                            </div>

                            <div>

                                <strong>
                                    ${item.title}
                                </strong>

                                <p
                                    class="muted"
                                    style="font-size:13px"
                                >
                                    ${item.text}
                                </p>

                            </div>

                        </div>
                    `;

                }
            )
            .join("");

}


// ============================================================
// PAGE LOADED MESSAGE
// ============================================================

console.log(
    "Sleep Analysis JavaScript loaded successfully."
);

console.log(
    "Firebase will load the user's daily AI summary."
);