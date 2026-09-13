import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

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

import { firebaseConfig } from "./firebase-config.js";


/* =========================================
   FIREBASE INITIALIZATION
========================================= */

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const database = getDatabase(app);


/* =========================================
   PAGE NAME
========================================= */

const page = document.body.dataset.page || "";


/* =========================================
   ACTIVE NAVIGATION
========================================= */

document.querySelectorAll("[data-nav]").forEach(a => {

    if (a.dataset.nav === page) {
        a.classList.add("active");
    }

});


/* =========================================
   TEXT HELPER
========================================= */

export function setText(id, value) {

    const el = document.getElementById(id);

    if (el) {
        el.textContent = value;
    }

}


/* =========================================
   NUMBER HELPER
========================================= */

export function num(value, decimals = 2) {

    const n = Number(value);

    if (!Number.isFinite(n)) {
        return "--";
    }

    return n.toFixed(decimals);

}


/* =========================================
   SNAPSHOT → ARRAY
========================================= */

export function recordsFromSnapshot(snapshot) {

    const data = snapshot.val();

    if (!data || typeof data !== "object") {
        return [];
    }

    return Object.entries(data).map(
        ([firebaseKey, value]) => ({
            ...(value || {}),
            firebaseKey
        })
    );

}


/* =========================================
   DATE
========================================= */

export function getRecordDate(record) {

    if (record.date_key) {
        return String(record.date_key);
    }

    if (record.timestamp) {

        const d = new Date(record.timestamp);

        if (!Number.isNaN(d.getTime())) {
            return d.toISOString().slice(0, 10);
        }

    }

    return "";

}


/* =========================================
   RECORD TIME
========================================= */

export function recordTime(record) {

    if (record.timestamp) {

        const t = Date.parse(record.timestamp);

        if (Number.isFinite(t)) {
            return t;
        }

    }

    return Number(record.device_millis || 0);

}


/* =========================================
   SORT RECORDS
========================================= */

export function sortRecords(records) {

    return [...records].sort(
        (a, b) => recordTime(a) - recordTime(b)
    );

}


/* =========================================
   LATEST RECORD
========================================= */

export function latestRecord(records) {

    const sorted = sortRecords(records);

    return sorted.length
        ? sorted[sorted.length - 1]
        : null;

}


/* =========================================
   LATEST SESSION
========================================= */

export function latestSession(records) {

    if (!records.length) {
        return [];
    }

    const sorted = sortRecords(records);

    const latest = sorted[sorted.length - 1];

    if (!latest.session_id) {
        return sorted;
    }

    return sorted.filter(
        r => r.session_id === latest.session_id
    );

}


/* =========================================
   AVERAGE
========================================= */

export function average(records, keys) {

    const values = records
        .map(record => {

            for (const key of keys) {

                const value = Number(record[key]);

                if (
                    Number.isFinite(value) &&
                    value !== 0
                ) {
                    return value;
                }

            }

            return null;

        })
        .filter(value => value !== null);

    if (!values.length) {
        return 0;
    }

    return values.reduce(
        (a, b) => a + b,
        0
    ) / values.length;

}


/* =========================================
   MAX VALUE
========================================= */

export function maxValue(records, keys) {

    let max = 0;

    for (const record of records) {

        for (const key of keys) {

            const value = Number(record[key]);

            if (Number.isFinite(value)) {
                max = Math.max(max, value);
            }

        }

    }

    return max;

}


/* =========================================
   CONFIDENCE
========================================= */

export function confidenceText(value) {

    const n = Number(value);

    if (!Number.isFinite(n)) {
        return "--";
    }

    return (
        n <= 1
            ? n * 100
            : n
    ).toFixed(1) + "%";

}


/* =========================================
   QUALITY CLASS
========================================= */

export function qualityClass(q) {

    const x = String(q || "").toLowerCase();

    if (
        x.includes("excellent") ||
        x.includes("good")
    ) {
        return "badge";
    }

    if (x.includes("fair")) {
        return "badge warn";
    }

    return "badge bad";

}


/* =========================================
   DAILY DATA FROM RAW RECORDS
========================================= */

export function dailyFromRecords(records) {

    const groups = {};

    records.forEach(record => {

        const date = getRecordDate(record);

        if (!date) {
            return;
        }

        if (!groups[date]) {
            groups[date] = [];
        }

        groups[date].push(record);

    });


    return Object.keys(groups)
        .sort()
        .map(date => {

            const rs = sortRecords(groups[date]);

            const last =
                rs[rs.length - 1];


            return {

                date_key: date,

                session_id:
                    last.session_id || "",

                records_used:
                    rs.length,

                heart_rate:
                    average(
                        rs,
                        [
                            "heart_rate",
                            "Heart_Rate"
                        ]
                    ),

                spo2:
                    average(
                        rs,
                        [
                            "spo2",
                            "SpO2"
                        ]
                    ),

                movement:
                    average(
                        rs,
                        [
                            "movement",
                            "Movement"
                        ]
                    ),

                temperature_c:
                    average(
                        rs,
                        [
                            "temperature_c",
                            "Temperature_C",
                            "temperature"
                        ]
                    ),

                humidity_percent:
                    average(
                        rs,
                        [
                            "humidity_percent",
                            "Humidity_pct",
                            "Humidity",
                            "humidity"
                        ]
                    ),

                noise_index:
                    average(
                        rs,
                        [
                            "noise_index",
                            "Noise_dB",
                            "Noise"
                        ]
                    ),

                sleep_duration_hours:
                    maxValue(
                        rs,
                        [
                            "sleep_duration_hours",
                            "Sleep_Duration_Hours",
                            "Sleep_Duration_hr"
                        ]
                    ),

                last_record: last

            };

        });

}


/* =========================================
   RECOMMENDATIONS
========================================= */

export function showRecommendations(summary) {

    const box =
        document.getElementById("recommendations") ||
        document.getElementById("reportRecommendations");

    if (!box) {
        return;
    }


    const items = [];


    if (
        summary.sleep_duration_hours > 0 &&
        summary.sleep_duration_hours < 7
    ) {

        items.push([
            "◷",
            "Review your sleep schedule",
            "The recorded session duration is below 7 hours."
        ]);

    }


    if (summary.noise_index >= 50) {

        items.push([
            "⌁",
            "Reduce nighttime sound",
            "The digital noise index shows sound detections during the session."
        ]);

    }


    if (summary.movement >= 1) {

        items.push([
            "↗",
            "Keep the sleep environment stable",
            "Higher movement may indicate a less settled session."
        ]);

    }


    if (summary.humidity_percent >= 70) {

        items.push([
            "◌",
            "Check room humidity",
            "The measured environment is relatively humid."
        ]);

    }


    if (!items.length) {

        items.push([
            "☾",
            "Maintain your routine",
            "The available session signals do not trigger a specific demo recommendation."
        ]);

    }


    box.innerHTML = items
        .map(
            ([icon, title, text]) => `
                <div class="recommendation">
                    <div class="rec-icon">${icon}</div>

                    <div>
                        <strong>${title}</strong>

                        <p
                            class="muted"
                            style="font-size:13px"
                        >
                            ${text}
                        </p>
                    </div>
                </div>
            `
        )
        .join("");

}


/* =========================================
   AUTHENTICATION
========================================= */

onAuthStateChanged(auth, user => {

    console.log(
        "Firebase Auth:",
        user
            ? "Logged in"
            : "Not logged in"
    );


    if (user) {

        console.log(
            "Logged-in UID:",
            user.uid
        );

        console.log(
            "Firebase sleep data path:",
            `users/${user.uid}/sleep_data`
        );


        const email =
            document.getElementById("userEmail");

        if (email) {
            email.textContent =
                user.email || "Authenticated";
        }


        const logouts = [

            document.getElementById("topLogout"),

            document.getElementById("logoutBtn"),

            document.getElementById("logoutBtnBottom")

        ].filter(Boolean);


        logouts.forEach(button => {

            button.onclick = async () => {

                try {

                    await signOut(auth);

                    window.location.href =
                        "index.html";

                } catch (error) {

                    console.error(
                        "Logout error:",
                        error
                    );

                }

            };

        });


        window.__sleepUser = user;


        window.dispatchEvent(
            new CustomEvent(
                "sleepcare-auth-ready",
                {
                    detail: user
                }
            )
        );


    } else {

        const protectedPage =
            !["", "login", "register"]
                .includes(page);

        if (protectedPage) {

            window.location.href =
                "index.html";

        }

    }

});


/* =========================================
   WATCH RAW SLEEP DATA
========================================= */

export function watchSleepData(callback) {

    onAuthStateChanged(auth, user => {

        if (!user) {

            console.log(
                "watchSleepData: user not logged in"
            );

            return;
        }


        const path =
            `users/${user.uid}/sleep_data`;


        console.log(
            "Reading Firebase:",
            path
        );


        const sleepRef =
            ref(database, path);


        onValue(
            sleepRef,

            snapshot => {

                const records =
                    recordsFromSnapshot(snapshot);


                console.log(
                    "Firebase sleep_data records:",
                    records.length
                );


                console.log(
                    "Firebase sleep_data:",
                    records
                );


                callback(
                    records,
                    user
                );

            },

            error => {

                console.error(
                    "Firebase sleep_data error:",
                    error
                );

            }
        );

    });

}


/* =========================================
   WATCH DAILY SUMMARIES
========================================= */

export function watchDailySummaries(callback) {

    onAuthStateChanged(auth, user => {

        if (!user) {
            return;
        }


        const path =
            `users/${user.uid}/daily_summaries`;


        console.log(
            "Reading daily summaries:",
            path
        );


        const summaryRef =
            ref(database, path);


        onValue(
            summaryRef,

            snapshot => {

                const data =
                    snapshot.val() || {};


                console.log(
                    "Daily summaries:",
                    data
                );


                callback(
                    data,
                    user
                );

            },

            error => {

                console.error(
                    "Firebase daily_summaries error:",
                    error
                );

            }
        );

    });

}


/* =========================================
   FIREBASE EXPORTS
========================================= */

export {
    ref,
    onValue
};