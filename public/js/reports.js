// ============================================================
// SLEEPCARE AI - REPORTS
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
// GLOBAL
// ============================================================

let allReports = [];


// ============================================================
// SET TEXT
// ============================================================

function setText(id, value) {

    const el = document.getElementById(id);

    if (el) {
        el.textContent = value;
    }

}


// ============================================================
// NUMBER
// ============================================================

function num(value) {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {
        return 0;
    }

    const n = Number(value);

    return Number.isFinite(n) ? n : 0;

}


// ============================================================
// FIND VALUE
// ============================================================

function findValue(obj, keys) {

    if (
        !obj ||
        typeof obj !== "object"
    ) {
        return null;
    }


    // Direct fields
    for (const key of keys) {

        if (
            obj[key] !== undefined &&
            obj[key] !== null &&
            obj[key] !== ""
        ) {

            return obj[key];

        }

    }


    // Nested fields
    for (const value of Object.values(obj)) {

        if (
            value &&
            typeof value === "object"
        ) {

            const result =
                findValue(
                    value,
                    keys
                );

            if (
                result !== null &&
                result !== undefined
            ) {

                return result;

            }

        }

    }


    return null;

}


// ============================================================
// QUALITY
// ============================================================

function getQuality(item) {

    const value =
        findValue(
            item,
            [
                "sleep_quality",
                "Sleep_Quality",
                "quality",
                "predicted_quality",
                "ai_quality",
                "classification"
            ]
        );


    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return "--";

    }


    if (
        typeof value === "object"
    ) {

        return (
            value.sleep_quality ||
            value.quality ||
            value.result ||
            "--"
        );

    }


    return String(value);

}


// ============================================================
// CONFIDENCE
// ============================================================

function getConfidence(item) {

    const value =
        findValue(
            item,
            [
                "confidence",
                "Confidence",
                "ai_confidence",
                "prediction_confidence",
                "model_confidence",
                "confidence_score",
                "aiConfidence",
                "predictionConfidence"
            ]
        );


    const n =
        num(value);


    if (
        !n
    ) {

        return 0;

    }


    return n <= 1
        ? n * 100
        : n;

}


// ============================================================
// DURATION
// ============================================================

function getDuration(item) {

    return num(
        findValue(
            item,
            [
                "sleep_duration_hours",
                "Sleep_Duration_Hours",
                "Sleep_Duration_hr",
                "average_sleep_duration_hours",
                "average_duration",
                "duration",
                "sleep_duration"
            ]
        )
    );

}


// ============================================================
// HEART RATE
// ============================================================

function getHeartRate(item) {

    return num(
        findValue(
            item,
            [
                "average_heart_rate",
                "average_hr",
                "heart_rate",
                "Heart_Rate"
            ]
        )
    );

}


// ============================================================
// SPO2
// ============================================================

function getSpO2(item) {

    return num(
        findValue(
            item,
            [
                "average_spo2",
                "average_SpO2",
                "spo2",
                "SpO2"
            ]
        )
    );

}


// ============================================================
// TEMPERATURE
// ============================================================

function getTemperature(item) {

    return num(
        findValue(
            item,
            [
                "average_temperature",
                "average_temperature_c",
                "temperature_c",
                "Temperature_C",
                "temperature"
            ]
        )
    );

}


// ============================================================
// HUMIDITY
// ============================================================

function getHumidity(item) {

    return num(
        findValue(
            item,
            [
                "average_humidity",
                "average_humidity_percent",
                "humidity_percent",
                "Humidity_pct",
                "humidity"
            ]
        )
    );

}


// ============================================================
// MOVEMENT
// ============================================================

function getMovement(item) {

    return num(
        findValue(
            item,
            [
                "average_movement",
                "movement",
                "Movement"
            ]
        )
    );

}


// ============================================================
// NOISE
// ============================================================

function getNoise(item) {

    return num(
        findValue(
            item,
            [
                "average_noise",
                "average_noise_index",
                "noise_index",
                "Noise_dB",
                "Noise"
            ]
        )
    );

}


// ============================================================
// QUALITY SCORE
// ============================================================

function qualityScore(quality) {

    const q =
        String(quality || "")
            .toLowerCase();


    if (
        q.includes("excellent")
    ) {
        return 90;
    }

    if (
        q.includes("good")
    ) {
        return 75;
    }

    if (
        q.includes("fair")
    ) {
        return 60;
    }

    if (
        q.includes("very poor")
    ) {
        return 20;
    }

    if (
        q.includes("poor")
    ) {
        return 40;
    }

    return 0;

}


// ============================================================
// CHECK SUMMARY
// ============================================================

function isSummaryObject(obj) {

    if (
        !obj ||
        typeof obj !== "object"
    ) {

        return false;

    }


    const keys =
        Object.keys(obj);


    return (

        keys.includes("ai_analysis") ||

        keys.includes("average_heart_rate") ||

        keys.includes("average_spo2") ||

        keys.includes("average_humidity") ||

        keys.includes("average_movement") ||

        keys.includes("sleep_quality") ||

        keys.includes("confidence")

    );

}


// ============================================================
// EXTRACT FIREBASE SUMMARIES
// ============================================================

function extractSummaries(
    obj,
    dateKey = "",
    sessionKey = "",
    result = []
) {

    if (
        !obj ||
        typeof obj !== "object"
    ) {

        return result;

    }


    // Actual session summary
    if (
        isSummaryObject(obj)
    ) {

        result.push({

            ...obj,

            date_key:
                obj.date_key ||
                obj.date ||
                dateKey,

            session_id:
                obj.session_id ||
                sessionKey

        });


        return result;

    }


    Object.entries(obj)
        .forEach(
            ([key, value]) => {

                if (
                    !value ||
                    typeof value !== "object"
                ) {

                    return;

                }


                let newDate =
                    dateKey;

                let newSession =
                    sessionKey;


                // Example:
                // 2026-09-17
                if (
                    /^\d{4}-\d{2}-\d{2}$/
                        .test(key)
                ) {

                    newDate =
                        key;

                }


                // Example:
                // SESSION_c96be0a6_1128
                if (
                    key
                        .toUpperCase()
                        .startsWith("SESSION_")
                ) {

                    newSession =
                        key;

                }


                extractSummaries(
                    value,
                    newDate,
                    newSession,
                    result
                );

            }
        );


    return result;

}


// ============================================================
// LOAD REPORTS
// ============================================================

function loadReports(uid) {

    const path =
        `users/${uid}/daily_summaries`;


    console.log(
        "Loading Reports from:",
        path
    );


    const summaryRef =
        ref(
            database,
            path
        );


    onValue(

        summaryRef,

        snapshot => {

            const data =
                snapshot.val();


            console.log(
                "========== REPORT FIREBASE DATA =========="
            );

            console.log(
                data
            );

            console.log(
                "=========================================="
            );


            if (
                !data
            ) {

                allReports = [];

                renderReports();

                return;

            }


            allReports =
                extractSummaries(data);


            console.log(
                "Extracted report summaries:",
                allReports
            );


            // Remove duplicate sessions
            const unique =
                [];

            const used =
                new Set();


            allReports.forEach(
                item => {

                    const key =
                        `${
                            item.date_key || ""
                        }_${
                            item.session_id || ""
                        }`;


                    if (
                        !used.has(key)
                    ) {

                        used.add(key);

                        unique.push(
                            item
                        );

                    }

                }
            );


            // Newest first
            unique.sort(
                (a, b) =>
                    String(
                        b.date_key || ""
                    ).localeCompare(
                        String(
                            a.date_key || ""
                        )
                    )
            );


            allReports =
                unique;


            renderReports();

        },

        error => {

            console.error(
                "Reports Firebase error:",
                error
            );

        }

    );

}


// ============================================================
// RENDER REPORTS
// ============================================================

function renderReports() {

    console.log(
        "Rendering reports:",
        allReports
    );


    // ========================================================
    // DAYS
    // ========================================================

    const dates =
        new Set(
            allReports
                .map(
                    x => x.date_key
                )
                .filter(Boolean)
        );


    setText(
        "reportDays",
        dates.size || allReports.length
    );


    // ========================================================
    // AVERAGE SCORE
    // ========================================================

    const scores =
        allReports
            .map(
                item =>
                    qualityScore(
                        getQuality(item)
                    )
            )
            .filter(
                x => x > 0
            );


    const averageScore =
        scores.length
            ? scores.reduce(
                (a, b) => a + b,
                0
            ) / scores.length
            : 0;


    setText(
        "reportAverageScore",
        averageScore
            ? averageScore.toFixed(0)
            : "--"
    );


    // ========================================================
    // AVERAGE DURATION
    // ========================================================

    const durations =
        allReports
            .map(
                item =>
                    getDuration(item)
            )
            .filter(
                x => x > 0
            );


    const averageDuration =
        durations.length
            ? durations.reduce(
                (a, b) => a + b,
                0
            ) / durations.length
            : 0;


    setText(
        "rDuration",
        averageDuration
            ? averageDuration.toFixed(2)
            : "--"
    );


    // ========================================================
    // BEST QUALITY
    // ========================================================

    let best =
        "--";

    let bestScore =
        -1;


    allReports.forEach(
        item => {

            const quality =
                getQuality(item);

            const score =
                qualityScore(
                    quality
                );


            if (
                score > bestScore
            ) {

                bestScore =
                    score;

                best =
                    quality;

            }

        }
    );


    setText(
        "reportBestQuality",
        best
    );


    // ========================================================
    // LATEST CONFIDENCE
    // ========================================================

    let latestConfidence =
        0;


    if (
        allReports.length
    ) {

        latestConfidence =
            getConfidence(
                allReports[0]
            );

    }


    setText(
        "rConfidence",
        latestConfidence
            ? latestConfidence.toFixed(1) + "%"
            : "--"
    );


    const latestReport =
        allReports[0] ||
        {};


    setText(
        "reportQuality",
        getQuality(latestReport)
    );


    setText(
        "reportDate",
        latestReport.date_key || "--"
    );


    const latestRecords =
        num(
            findValue(
                latestReport,
                [
                    "records_used",
                    "record_count",
                    "records_count",
                    "total_records",
                    "recordCount",
                    "recordsUsed"
                ]
            )
        );


    setText(
        "reportRecords",
        latestRecords
            ? latestRecords + " records"
            : "-- records"
    );


    setText(
        "rHR",
        getHeartRate(latestReport)
            ? getHeartRate(latestReport).toFixed(1)
            : "--"
    );


    setText(
        "rSpO2",
        getSpO2(latestReport)
            ? getSpO2(latestReport).toFixed(1)
            : "--"
    );


    setText(
        "rTemp",
        getTemperature(latestReport)
            ? getTemperature(latestReport).toFixed(1)
            : "--"
    );


    setText(
        "rHumidity",
        getHumidity(latestReport)
            ? getHumidity(latestReport).toFixed(1)
            : "--"
    );


    setText(
        "rMovement",
        getMovement(latestReport)
            ? getMovement(latestReport).toFixed(2)
            : "--"
    );


    setText(
        "rNoise",
        getNoise(latestReport)
            ? getNoise(latestReport).toFixed(1)
            : "--"
    );


    setText(
        "rRecords2",
        latestRecords || "--"
    );


    // Some HTML versions use this ID
    setText(
        "latestConfidence",
        latestConfidence
            ? latestConfidence.toFixed(1) + "%"
            : "--"
    );


    // ========================================================
    // QUALITY DISTRIBUTION
    // ========================================================

    let excellent =
        0;

    let good =
        0;

    let fair =
        0;

    let poor =
        0;

    let veryPoor =
        0;


    allReports.forEach(
        item => {

            const q =
                getQuality(item)
                    .toLowerCase();


            if (
                q.includes("excellent")
            ) {

                excellent++;

            }
            else if (
                q === "good"
            ) {

                good++;

            }
            else if (
                q.includes("fair")
            ) {

                fair++;

            }
            else if (
                q.includes("very poor")
            ) {

                veryPoor++;

            }
            else if (
                q.includes("poor")
            ) {

                poor++;

            }

        }
    );


    setText(
        "excellentCount",
        excellent
    );

    setText(
        "goodCount",
        good
    );

    setText(
        "fairCount",
        fair
    );

    setText(
        "poorCount",
        poor
    );

    setText(
        "veryPoorCount",
        veryPoor
    );


    // ========================================================
    // PROGRESS BARS
    // ========================================================

    const total =
        Math.max(
            allReports.length,
            1
        );


    setBar(
        "excellentBar",
        excellent / total * 100
    );

    setBar(
        "goodBar",
        good / total * 100
    );

    setBar(
        "fairBar",
        fair / total * 100
    );

    setBar(
        "poorBar",
        poor / total * 100
    );

    setBar(
        "veryPoorBar",
        veryPoor / total * 100
    );


    // ========================================================
    // OVERALL ASSESSMENT
    // ========================================================

    let assessment =
        "No completed AI predictions are available yet.";


    if (
        allReports.length > 0 &&
        scores.length > 0
    ) {

        if (
            averageScore >= 80
        ) {

            assessment =
                "The available daily summaries show generally positive sleep-quality classifications.";

        }
        else if (
            averageScore >= 60
        ) {

            assessment =
                "The available daily summaries show mixed sleep-quality classifications.";

        }
        else {

            assessment =
                "The available daily summaries contain lower sleep-quality classifications.";

        }

    }


    setText(
        "overallAssessment",
        assessment
    );


    setText(
        "reportSubtitle",
        assessment
    );


    setText(
        "reportRecommendations",
        assessment
    );


    // ========================================================
    // PERFORMANCE LIST
    // ========================================================

    renderPerformance();

}


// ============================================================
// PROGRESS BAR
// ============================================================

function setBar(id, percentage) {

    const el =
        document.getElementById(id);


    if (el) {

        el.style.width =
            Math.min(
                100,
                Math.max(
                    0,
                    percentage
                )
            ) + "%";

    }

}


// ============================================================
// PERFORMANCE
// ============================================================

function renderPerformance() {

    const box =
        document.getElementById(
            "performanceList"
        );


    if (!box) {
        return;
    }


    if (
        allReports.length === 0
    ) {

        box.innerHTML =
            "<p>No daily reports available.</p>";

        return;

    }


    box.innerHTML =
        allReports
            .map(
                (item, index) => {

                    const quality =
                        getQuality(item);

                    const score =
                        qualityScore(
                            quality
                        );

                    const confidence =
                        getConfidence(item);

                    const duration =
                        getDuration(item);


                    return `

                        <div class="performance-item">

                            <div>

                                <strong>
                                    Day ${allReports.length - index}
                                </strong>

                                <p class="muted">

                                    ${
                                        item.date_key ||
                                        "--"
                                    }

                                </p>

                            </div>


                            <div>

                                <strong>
                                    ${
                                        quality
                                    }
                                </strong>

                            </div>


                            <div>

                                <span>
                                    Score:
                                    ${
                                        score
                                            ? score
                                            : "--"
                                    }
                                </span>

                            </div>


                            <div>

                                <span>
                                    Duration:
                                    ${
                                        duration
                                            ? duration.toFixed(2)
                                            : "--"
                                    }
                                    h
                                </span>

                            </div>


                            <div>

                                <span>
                                    Confidence:
                                    ${
                                        confidence
                                            ? confidence.toFixed(1) + "%"
                                            : "--"
                                    }
                                </span>

                            </div>

                        </div>

                    `;

                }
            )
            .join("");

}


// ============================================================
// PERIOD FILTER
// ============================================================

const reportPeriod =
    document.getElementById(
        "reportPeriod"
    );


if (reportPeriod) {

    reportPeriod.addEventListener(
        "change",
        () => {

            const period =
                reportPeriod.value;


            if (
                period === "all"
            ) {

                renderReports();

                return;

            }


            const days =
                Number(period);


            if (
                !Number.isFinite(days)
            ) {

                renderReports();

                return;

            }


            const filtered =
                allReports.slice(
                    0,
                    days
                );


            const backup =
                allReports;


            allReports =
                filtered;


            renderReports();


            allReports =
                backup;

        }
    );

}


// ============================================================
// REFRESH
// ============================================================

const refreshButton =
    document.getElementById(
        "refreshReportBtn"
    );


if (refreshButton) {

    refreshButton.addEventListener(
        "click",
        () => {

            const user =
                auth.currentUser;


            if (user) {

                loadReports(
                    user.uid
                );

            }

        }
    );

}


// ============================================================
// AUTH
// ============================================================

onAuthStateChanged(
    auth,
    user => {

        if (!user) {

            window.location.href =
                "index.html";

            return;

        }


        setText(
            "userEmail",
            user.email ||
            "Authenticated"
        );


        const logout =
            document.getElementById(
                "topLogout"
            );


        if (logout) {

            logout.onclick =
                async () => {

                    await signOut(
                        auth
                    );

                    window.location.href =
                        "index.html";

                };

        }


        loadReports(
            user.uid
        );

    }
);


console.log(
    "SleepCare AI Reports loaded."
);