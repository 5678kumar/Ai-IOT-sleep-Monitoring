// ======================================================
// AI SLEEP MONITOR
// HISTORY PAGE
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

const app =
    initializeApp(
        firebaseConfig
    );

const auth =
    getAuth(app);

const database =
    getDatabase(app);


// ======================================================
// AUTHENTICATION
// ======================================================

onAuthStateChanged(
    auth,
    (user) => {

        if (user) {

            console.log(
                "History user:",
                user.email
            );

            console.log(
                "History UID:",
                user.uid
            );

            loadHistory(
                user.uid
            );

        } else {

            window.location.href =
                "index.html";
        }
    }
);


// ======================================================
// LOAD HISTORY
// ======================================================

function loadHistory(uid) {

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
                "HISTORY DAILY SUMMARIES"
            );

            console.log(
                data
            );

            console.log(
                "======================================"
            );


            if (!data) {

                console.log(
                    "No daily summaries found."
                );


                // Fallback to raw sensor data
                loadRawHistory(
                    uid
                );

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

                loadRawHistory(
                    uid
                );

                return;
            }


            // Sort newest first
            summaries.sort(
                (a, b) => {

                    return (
                        getDateValue(b) -
                        getDateValue(a)
                    );
                }
            );


            console.log(
                "History summaries:",
                summaries
            );


            displayHistory(
                summaries
            );
        },

        (error) => {

            console.error(
                "History Firebase error:",
                error
            );


            loadRawHistory(
                uid
            );
        }
    );
}


// ======================================================
// FALLBACK RAW HISTORY
// ======================================================

function loadRawHistory(uid) {

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

                showNoHistory();

                return;
            }


            const records =
                Object.values(data);


            if (
                records.length === 0
            ) {

                showNoHistory();

                return;
            }


            console.log(
                "Using raw sensor history."
            );


            const summaries =
                createRawDailySummaries(
                    records
                );


            displayHistory(
                summaries
            );
        },

        (error) => {

            console.error(
                "Raw history error:",
                error
            );


            showError();
        }
    );
}


// ======================================================
// CREATE RAW DAILY SUMMARIES
// ======================================================

function createRawDailySummaries(
    records
) {

    const groups = {};


    records.forEach(
        (record) => {

            const date =
                record.date_key ||
                getDateKey(
                    record
                );


            if (!date) {
                return;
            }


            if (!groups[date]) {

                groups[date] = [];
            }


            groups[date].push(
                record
            );
        }
    );


    const summaries =
        Object.keys(groups)
            .map(
                (dateKey) => {

                    const list =
                        groups[dateKey];


                    const valid =
                        list.filter(
                            isValidRecord
                        );


                    const source =
                        valid.length > 0
                            ? valid
                            : list;


                    return {

                        date_key:
                            dateKey,

                        dateDisplay:
                            formatDate(
                                dateKey
                            ),

                        records_used:
                            source.length,

                        average_heart_rate:
                            average(
                                source,
                                "heart_rate"
                            ),

                        average_spo2:
                            average(
                                source,
                                "spo2"
                            ),

                        average_temperature:
                            average(
                                source,
                                "temperature_c"
                            ),

                        average_humidity:
                            average(
                                source,
                                "humidity_percent"
                            ),

                        average_movement:
                            average(
                                source,
                                "movement"
                            ),

                        average_noise:
                            averageNoise(
                                source
                            ),

                        sleep_duration_hours:
                            getLatestSleepDuration(
                                source
                            ),

                        sleep_quality:
                            "Not predicted",

                        confidence:
                            null
                    };
                }
            );


    summaries.sort(
        (a, b) => {

            return (
                getDateValue(b) -
                getDateValue(a)
            );
        }
    );


    return summaries;
}


// ======================================================
// DISPLAY HISTORY
// ======================================================

function displayHistory(
    summaries
) {

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


    tableBody.innerHTML =
        "";


    if (
        !summaries ||
        summaries.length === 0
    ) {

        showNoHistory();

        return;
    }


    summaries.forEach(
        (summary, index) => {

            const row =
                document.createElement(
                    "tr"
                );


            const day =
                "Day " +
                (
                    summaries.length -
                    index
                );


            const date =
                summary.dateDisplay ||
                formatDate(
                    summary.date_key
                );


            const sleepDuration =
                getNumber(
                    summary.sleep_duration_hours,
                    null
                );


            const quality =
                summary.sleep_quality ||
                "Not predicted";


            let confidence =
                normalizeConfidence(
                    summary.confidence
                );


            const confidenceText =
                confidence !== null
                    ? confidence.toFixed(2) +
                      "%"
                    : "--";


            row.innerHTML = `

                <td>
                    <strong>
                        ${escapeHTML(day)}
                    </strong>
                </td>

                <td>
                    ${escapeHTML(date)}
                </td>

                <td>
                    ${
                        sleepDuration !== null
                            ? sleepDuration.toFixed(2) +
                              " hrs"
                            : "--"
                    }
                </td>

                <td>
                    <strong>
                        ${escapeHTML(quality)}
                    </strong>
                </td>

                <td>
                    ${escapeHTML(confidenceText)}
                </td>

            `;


            tableBody.appendChild(
                row
            );
        }
    );


    updateTableHeader();


    console.log(
        "History table updated:",
        summaries.length,
        "days"
    );
}


// ======================================================
// UPDATE TABLE HEADER
// ======================================================

function updateTableHeader() {

    const table =
        document.querySelector(
            "table"
        );


    if (!table) {
        return;
    }


    const headers =
        table.querySelectorAll(
            "thead th"
        );


    const names = [

        "Day",

        "Date",

        "Sleep Duration",

        "AI Sleep Quality",

        "AI Confidence"

    ];


    names.forEach(
        (name, index) => {

            if (
                headers[index]
            ) {

                headers[index]
                    .textContent =
                    name;
            }
        }
    );


    // Hide extra old columns

    for (
        let i = names.length;
        i < headers.length;
        i++
    ) {

        headers[i].style.display =
            "none";
    }
}


// ======================================================
// GET DATE VALUE
// ======================================================

function getDateValue(
    summary
) {

    if (
        summary.generated_at
    ) {

        const value =
            new Date(
                summary.generated_at
            ).getTime();


        if (
            Number.isFinite(value)
        ) {

            return value;
        }
    }


    if (
        summary.date_key
    ) {

        const value =
            new Date(
                summary.date_key +
                "T00:00:00"
            ).getTime();


        if (
            Number.isFinite(value)
        ) {

            return value;
        }
    }


    return 0;
}


// ======================================================
// GET DATE KEY
// ======================================================

function getDateKey(
    record
) {

    if (
        record.date_key
    ) {

        return record.date_key;
    }


    if (
        record.timestamp
    ) {

        const date =
            new Date(
                record.timestamp
            );


        if (
            !isNaN(
                date.getTime()
            )
        ) {

            return (
                date.getFullYear() +
                "-" +
                String(
                    date.getMonth() + 1
                ).padStart(2, "0") +
                "-" +
                String(
                    date.getDate()
                ).padStart(2, "0")
            );
        }
    }


    return null;
}


// ======================================================
// FORMAT DATE
// ======================================================

function formatDate(
    dateKey
) {

    if (!dateKey) {

        return "--";
    }


    const date =
        new Date(
            dateKey +
            "T00:00:00"
        );


    if (
        isNaN(
            date.getTime()
        )
    ) {

        return dateKey;
    }


    return date.toLocaleDateString(
        undefined,
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


// ======================================================
// AVERAGE
// ======================================================

function average(
    records,
    field
) {

    const values =
        records
            .map(
                record =>
                    Number(
                        record[field]
                    )
            )
            .filter(
                value =>
                    Number.isFinite(
                        value
                    )
            );


    if (
        values.length === 0
    ) {

        return null;
    }


    const total =
        values.reduce(
            (sum, value) =>
                sum + value,
            0
        );


    return (
        total /
        values.length
    );
}


// ======================================================
// AVERAGE NOISE
// ======================================================

function averageNoise(
    records
) {

    const values =
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
                    Number.isFinite(
                        value
                    )
            );


    if (
        values.length === 0
    ) {

        return null;
    }


    return (
        values.reduce(
            (sum, value) =>
                sum + value,
            0
        ) /
        values.length
    );
}


// ======================================================
// LATEST SLEEP DURATION
// ======================================================

function getLatestSleepDuration(
    records
) {

    const values =
        records
            .map(
                record =>
                    Number(
                        record.sleep_duration_hours
                    )
            )
            .filter(
                value =>
                    Number.isFinite(
                        value
                    )
            );


    if (
        values.length === 0
    ) {

        return null;
    }


    return values[
        values.length - 1
    ];
}


// ======================================================
// VALID SENSOR RECORD
// ======================================================

function isValidRecord(
    record
) {

    return (

        Number(
            record.heart_rate || 0
        ) > 0 &&

        Number(
            record.spo2 || 0
        ) > 0 &&

        Number(
            record.temperature_c || 0
        ) > 0 &&

        Number(
            record.humidity_percent || 0
        ) > 0
    );
}


// ======================================================
// NUMBER
// ======================================================

function getNumber(
    value,
    defaultValue
) {

    const number =
        Number(value);


    if (
        !Number.isFinite(
            number
        )
    ) {

        return defaultValue;
    }


    return number;
}


// ======================================================
// CONFIDENCE
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
        !Number.isFinite(
            number
        )
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
// ESCAPE HTML
// ======================================================

function escapeHTML(
    value
) {

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


// ======================================================
// NO HISTORY
// ======================================================

function showNoHistory() {

    const tableBody =
        document.getElementById(
            "historyTableBody"
        );


    if (!tableBody) {
        return;
    }


    tableBody.innerHTML = `

        <tr>

            <td
                colspan="5"
                style="text-align:center;"
            >

                No sleep history available.

            </td>

        </tr>

    `;
}


// ======================================================
// ERROR
// ======================================================

function showError() {

    const tableBody =
        document.getElementById(
            "historyTableBody"
        );


    if (!tableBody) {
        return;
    }


    tableBody.innerHTML = `

        <tr>

            <td
                colspan="5"
                style="text-align:center;"
            >

                Unable to load sleep history.

            </td>

        </tr>

    `;
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
    "History JavaScript loaded successfully."
);