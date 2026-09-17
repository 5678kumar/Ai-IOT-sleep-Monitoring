// ============================================================
// SLEEPCARE AI - HISTORY PAGE
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

let historyData = [];


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

function numberValue(value) {

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
// FIND VALUE INCLUDING NESTED OBJECTS
// ============================================================

function findValue(object, keys) {

    if (
        !object ||
        typeof object !== "object"
    ) {
        return null;
    }


    // --------------------------------------------------------
    // FIRST CHECK DIRECT FIELDS
    // --------------------------------------------------------

    for (const key of keys) {

        if (
            object[key] !== undefined &&
            object[key] !== null &&
            object[key] !== ""
        ) {

            return object[key];

        }

    }


    // --------------------------------------------------------
    // THEN CHECK NESTED OBJECTS
    // --------------------------------------------------------

    for (const value of Object.values(object)) {

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
// GET QUALITY
// ============================================================

function getQuality(summary) {

    const value =
        findValue(
            summary,
            [
                "sleep_quality",
                "Sleep_Quality",
                "quality",
                "prediction",
                "predicted_quality",
                "ai_quality",
                "result",
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


    // If prediction happens to be an object
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
// GET CONFIDENCE
// ============================================================

function getConfidence(summary) {

    const value =
        findValue(
            summary,
            [
                "confidence",
                "Confidence",
                "ai_confidence",
                "AI_confidence",
                "prediction_confidence",
                "model_confidence",
                "confidence_score",
                "aiConfidence",
                "predictionConfidence"
            ]
        );


    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return 0;

    }


    const n =
        Number(value);


    if (
        !Number.isFinite(n)
    ) {

        return 0;

    }


    // ML confidence may be stored as 0.51
    // or 51.0
    if (n <= 1) {

        return n * 100;

    }


    return n;

}


// ============================================================
// GET NUMBER FROM MANY POSSIBLE FIELD NAMES
// ============================================================

function getNumber(summary, keys) {

    const value =
        findValue(
            summary,
            keys
        );


    return numberValue(value);

}


// ============================================================
// QUALITY SCORE
// ============================================================

function qualityScore(quality) {

    const q =
        String(quality || "")
            .toLowerCase()
            .trim();


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
// DATE CHECK
// ============================================================

function isDateKey(key) {

    return /^\d{4}-\d{2}-\d{2}$/.test(
        String(key)
    );

}


// ============================================================
// SESSION CHECK
// ============================================================

function isSessionKey(key) {

    return String(key)
        .toUpperCase()
        .startsWith("SESSION_");

}


// ============================================================
// DETECT SUMMARY OBJECT
// ============================================================

function isSummaryObject(object) {

    if (
        !object ||
        typeof object !== "object"
    ) {

        return false;

    }


    const keys =
        Object.keys(object);


    return (

        keys.includes("average_heart_rate") ||

        keys.includes("average_spo2") ||

        keys.includes("average_humidity") ||

        keys.includes("average_movement") ||

        keys.includes("average_temperature") ||

        keys.includes("sleep_quality") ||

        keys.includes("confidence") ||

        keys.includes("ai_analysis")

    );

}


// ============================================================
// EXTRACT DAILY SUMMARIES
// ============================================================

function extractSummaries(
    object,
    currentDate = "",
    currentSession = "",
    results = []
) {

    if (
        !object ||
        typeof object !== "object"
    ) {

        return results;

    }


    // --------------------------------------------------------
    // IF THIS IS THE ACTUAL SUMMARY
    // --------------------------------------------------------

    if (
        isSummaryObject(object)
    ) {

        results.push({

            ...object,

            date_key:
                object.date_key ||
                object.date ||
                currentDate,

            session_id:
                object.session_id ||
                currentSession

        });


        return results;

    }


    // --------------------------------------------------------
    // SEARCH CHILDREN
    // --------------------------------------------------------

    Object.entries(object)
        .forEach(
            ([key, value]) => {

                if (
                    !value ||
                    typeof value !== "object"
                ) {

                    return;

                }


                let date =
                    currentDate;


                let session =
                    currentSession;


                if (
                    isDateKey(key)
                ) {

                    date = key;

                }


                if (
                    isSessionKey(key)
                ) {

                    session = key;

                }


                extractSummaries(
                    value,
                    date,
                    session,
                    results
                );

            }
        );


    return results;

}


// ============================================================
// AUTHENTICATION
// ============================================================

onAuthStateChanged(
    auth,
    user => {

        console.log(
            "================================"
        );

        console.log(
            "HISTORY PAGE"
        );

        console.log(
            "User:",
            user
                ? user.email
                : "No user"
        );

        console.log(
            "================================"
        );


        if (!user) {

            window.location.href =
                "index.html";

            return;

        }


        // ----------------------------------------------------
        // EMAIL
        // ----------------------------------------------------

        setText(
            "userEmail",
            user.email ||
            "Authenticated"
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

                };

        }


        // ----------------------------------------------------
        // LOAD FIREBASE HISTORY
        // ----------------------------------------------------

        loadHistory(
            user.uid
        );

    }
);


// ============================================================
// LOAD HISTORY
// ============================================================

function loadHistory(uid) {

    const databasePath =
        `users/${uid}/daily_summaries`;


    console.log(
        "Reading Firebase:",
        databasePath
    );


    const summaryRef =
        ref(
            database,
            databasePath
        );


    onValue(

        summaryRef,

        snapshot => {

            const firebaseData =
                snapshot.val();


            console.log(
                "========== FIREBASE DATA =========="
            );

            console.log(
                firebaseData
            );

            console.log(
                "==================================="
            );


            if (
                !firebaseData
            ) {

                historyData = [];

                renderHistory();

                return;

            }


            // ------------------------------------------------
            // EXTRACT
            // ------------------------------------------------

            const summaries =
                extractSummaries(
                    firebaseData
                );


            console.log(
                "Extracted summaries:",
                summaries
            );


            // ------------------------------------------------
            // REMOVE DUPLICATES
            // ------------------------------------------------

            const unique = [];

            const used =
                new Set();


            summaries.forEach(
                summary => {

                    const date =
                        summary.date_key ||
                        "--";


                    const session =
                        summary.session_id ||
                        "--";


                    const key =
                        `${date}_${session}`;


                    if (
                        !used.has(key)
                    ) {

                        used.add(key);

                        unique.push(
                            summary
                        );

                    }

                }
            );


            // ------------------------------------------------
            // SORT NEWEST FIRST
            // ------------------------------------------------

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


            historyData =
                unique;


            console.log(
                "FINAL HISTORY DATA:",
                historyData
            );


            renderHistory();

        },

        error => {

            console.error(
                "Firebase History Error:",
                error
            );

        }

    );

}


// ============================================================
// RENDER HISTORY
// ============================================================

function renderHistory() {

    console.log(
        "Rendering",
        historyData.length,
        "history records"
    );


    // ========================================================
    // DAYS TRACKED
    // ========================================================

    const dates =
        new Set();


    historyData.forEach(
        item => {

            if (
                item.date_key &&
                item.date_key !== "--"
            ) {

                dates.add(
                    item.date_key
                );

            }

        }
    );


    const daysTracked =
        dates.size ||
        historyData.length;


    setText(
        "daysTracked",
        daysTracked
    );


    // ========================================================
    // QUALITY SCORES
    // ========================================================

    const scores =
        historyData
            .map(
                item =>
                    qualityScore(
                        getQuality(item)
                    )
            )
            .filter(
                value => value > 0
            );


    let averageScore =
        0;


    if (
        scores.length > 0
    ) {

        averageScore =
            scores.reduce(
                (a, b) => a + b,
                0
            )
            /
            scores.length;

    }


    setText(
        "averageScore",
        averageScore
            ? averageScore.toFixed(0)
            : "--"
    );


    // ========================================================
    // BEST QUALITY
    // ========================================================

    let bestQuality =
        "--";


    let bestScore =
        -1;


    historyData.forEach(
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

                bestQuality =
                    quality;

            }

        }
    );


    setText(
        "bestQuality",
        bestQuality
    );


    // ========================================================
    // LATEST QUALITY
    // ========================================================

    if (
        historyData.length > 0
    ) {

        const latest =
            historyData[0];


        setText(
            "latestQuality",
            getQuality(latest)
        );


        setText(
            "latestDate",
            latest.date_key ||
            "--"
        );

    }
    else {

        setText(
            "latestQuality",
            "--"
        );

        setText(
            "latestDate",
            "--"
        );

    }


    // ========================================================
    // LATEST CONFIDENCE
    // ========================================================

    let latestConfidence =
        0;


    if (
        historyData.length > 0
    ) {

        latestConfidence =
            getConfidence(
                historyData[0]
            );

    }


    // Support both possible IDs
    setText(
        "latestConfidence",
        latestConfidence
            ? latestConfidence.toFixed(1) + "%"
            : "--"
    );


    setText(
        "reportLatestConfidence",
        latestConfidence
            ? latestConfidence.toFixed(1) + "%"
            : "--"
    );


    // ========================================================
    // AVERAGE DURATION
    // ========================================================

    let durationTotal =
        0;


    let durationCount =
        0;


    historyData.forEach(
        item => {

            const duration =
                getNumber(
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
                );


            if (
                duration > 0
            ) {

                durationTotal +=
                    duration;

                durationCount++;

            }

        }
    );


    const averageDuration =
        durationCount
            ? durationTotal /
              durationCount
            : 0;


    setText(
        "avgDuration",
        averageDuration
            ? averageDuration.toFixed(2)
            : "--"
    );


    // ========================================================
    // TABLE
    // ========================================================

    renderTable();

}


// ============================================================
// RENDER TABLE
// ============================================================

function renderTable() {

    const tableBody =
        document.getElementById(
            "historyTableBody"
        );


    if (!tableBody) {

        console.error(
            "historyTableBody not found."
        );

        return;

    }


    if (
        historyData.length === 0
    ) {

        tableBody.innerHTML = `

            <tr>

                <td
                    colspan="8"
                    style="
                        text-align:center;
                        padding:40px;
                    "
                >

                    No daily summaries available.

                </td>

            </tr>

        `;

        return;

    }


    tableBody.innerHTML =
        historyData
            .map(
                (item, index) => {

                    // ----------------------------------------
                    // VALUES
                    // ----------------------------------------

                    const duration =
                        getNumber(
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
                        );


                    const heartRate =
                        getNumber(
                            item,
                            [
                                "average_heart_rate",
                                "average_hr",
                                "heart_rate",
                                "Heart_Rate"
                            ]
                        );


                    const spo2 =
                        getNumber(
                            item,
                            [
                                "average_spo2",
                                "average_SpO2",
                                "spo2",
                                "SpO2"
                            ]
                        );


                    const temperature =
                        getNumber(
                            item,
                            [
                                "average_temperature",
                                "average_temperature_c",
                                "temperature_c",
                                "Temperature_C",
                                "temperature"
                            ]
                        );


                    const humidity =
                        getNumber(
                            item,
                            [
                                "average_humidity",
                                "average_humidity_percent",
                                "humidity_percent",
                                "Humidity_pct",
                                "humidity"
                            ]
                        );


                    const quality =
                        getQuality(
                            item
                        );


                    const confidence =
                        getConfidence(
                            item
                        );


                    // ----------------------------------------
                    // DAY NUMBER
                    // ----------------------------------------

                    const dayNumber =
                        historyData.length -
                        index;


                    // ----------------------------------------
                    // TABLE ROW
                    // ----------------------------------------

                    return `

                        <tr
                            class="history-row"
                            data-index="${index}"
                            style="cursor:pointer"
                        >

                            <td>

                                <strong>
                                    Day ${dayNumber}
                                </strong>

                            </td>


                            <td>
                                ${
                                    item.date_key ||
                                    "--"
                                }
                            </td>


                            <td>

                                ${
                                    duration
                                        ? duration.toFixed(2)
                                        : "--"
                                }

                                h

                            </td>


                            <td>

                                ${
                                    heartRate
                                        ? heartRate.toFixed(1)
                                        : "--"
                                }

                                BPM

                            </td>


                            <td>

                                ${
                                    spo2
                                        ? spo2.toFixed(1)
                                        : "--"
                                }%

                            </td>


                            <td>

                                ${
                                    temperature
                                        ? temperature.toFixed(1)
                                        : "--"
                                }

                                °C /

                                ${
                                    humidity
                                        ? humidity.toFixed(0)
                                        : "--"
                                }%

                            </td>


                            <td>

                                <span class="badge">

                                    ${
                                        quality === "--"
                                            ? "--"
                                            : quality
                                    }

                                </span>

                            </td>


                            <td>

                                ${
                                    confidence
                                        ? confidence.toFixed(1) + "%"
                                        : "--"
                                }

                            </td>

                        </tr>

                    `;

                }
            )
            .join("");


    // ========================================================
    // ROW CLICK
    // ========================================================

    document
        .querySelectorAll(
            ".history-row"
        )
        .forEach(
            row => {

                row.addEventListener(
                    "click",
                    () => {

                        const index =
                            Number(
                                row.dataset.index
                            );


                        if (
                            historyData[index]
                        ) {

                            showDetails(
                                historyData[index]
                            );

                        }

                    }
                );

            }
        );


    applyFilter();

}


// ============================================================
// FILTER
// ============================================================

const qualityFilter =
    document.getElementById(
        "qualityFilter"
    );


if (qualityFilter) {

    qualityFilter.addEventListener(
        "change",
        applyFilter
    );

}


function applyFilter() {

    if (!qualityFilter) {
        return;
    }


    const filter =
        String(
            qualityFilter.value
        )
            .toLowerCase();


    document
        .querySelectorAll(
            ".history-row"
        )
        .forEach(
            row => {

                const index =
                    Number(
                        row.dataset.index
                    );


                const quality =
                    getQuality(
                        historyData[index]
                    )
                        .toLowerCase();


                if (
                    filter === "all" ||
                    quality === filter
                ) {

                    row.style.display =
                        "";

                }
                else {

                    row.style.display =
                        "none";

                }

            }
        );

}


// ============================================================
// DETAILS PANEL
// ============================================================

function showDetails(summary) {

    const panel =
        document.getElementById(
            "selectedDayPanel"
        );


    if (!panel) {
        return;
    }


    panel.style.display =
        "block";


    const quality =
        getQuality(
            summary
        );


    const confidence =
        getConfidence(
            summary
        );


    const score =
        qualityScore(
            quality
        );


    setText(
        "selectedDayTitle",
        summary.date_key ||
        "Sleep Details"
    );


    setText(
        "detailQuality",
        quality
    );


    setText(
        "detailScore",
        score
            ? score.toFixed(0)
            : "--"
    );


    setText(
        "detailConfidence",
        confidence
            ? confidence.toFixed(1) + "%"
            : "--"
    );


    setText(
        "detailDuration",
        getNumber(
            summary,
            [
                "sleep_duration_hours",
                "Sleep_Duration_Hours",
                "Sleep_Duration_hr",
                "average_sleep_duration_hours",
                "average_duration",
                "duration"
            ]
        ).toFixed(2)
    );


    setText(
        "detailHeartRate",
        getNumber(
            summary,
            [
                "average_heart_rate",
                "average_hr",
                "heart_rate",
                "Heart_Rate"
            ]
        ).toFixed(1)
    );


    setText(
        "detailSpO2",
        getNumber(
            summary,
            [
                "average_spo2",
                "average_SpO2",
                "spo2",
                "SpO2"
            ]
        ).toFixed(1)
    );


    setText(
        "detailTemperature",
        getNumber(
            summary,
            [
                "average_temperature",
                "average_temperature_c",
                "temperature_c",
                "Temperature_C",
                "temperature"
            ]
        ).toFixed(1)
    );


    setText(
        "detailHumidity",
        getNumber(
            summary,
            [
                "average_humidity",
                "average_humidity_percent",
                "humidity_percent",
                "Humidity_pct",
                "humidity"
            ]
        ).toFixed(1)
    );


    setText(
        "detailMessage",
        findValue(
            summary,
            [
                "ai_analysis",
                "AI_analysis",
                "analysis",
                "message"
            ]
        ) ||
        "AI analysis information is not available."
    );

}


// ============================================================
// CLOSE DETAILS
// ============================================================

const closeDetails =
    document.getElementById(
        "closeDetailsBtn"
    );


if (closeDetails) {

    closeDetails.addEventListener(
        "click",
        () => {

            const panel =
                document.getElementById(
                    "selectedDayPanel"
                );


            if (panel) {

                panel.style.display =
                    "none";

            }

        }
    );

}


// ============================================================
// PAGE LOADED
// ============================================================

console.log(
    "SleepCare AI History loaded successfully."
);