// ======================================================
// AI SLEEP MONITOR
// PROFILE JAVASCRIPT
// ======================================================


// ======================================================
// FIREBASE IMPORTS
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
    firebaseConfig
} from "./firebase-config.js";


// ======================================================
// FIREBASE INITIALIZATION
// ======================================================

const app =
    initializeApp(firebaseConfig);


const auth =
    getAuth(app);


// ======================================================
// DOM ELEMENTS
// ======================================================

const profileEmail =
    document.getElementById(
        "profileEmail"
    );


const emailElement =
    document.getElementById(
        "email"
    );


const userIdElement =
    document.getElementById(
        "userId"
    );


const accountCreatedElement =
    document.getElementById(
        "accountCreated"
    );


const loginProviderElement =
    document.getElementById(
        "loginProvider"
    );


const accountStatus =
    document.getElementById(
        "accountStatus"
    );


// ======================================================
// AUTHENTICATION STATE
// ======================================================

onAuthStateChanged(
    auth,
    (user) => {

        if (user) {

            console.log(
                "Logged-in user:",
                user
            );


            loadProfile(
                user
            );

        }

        else {

            window.location.href =
                "index.html";

        }

    }
);


// ======================================================
// LOAD PROFILE
// ======================================================

function loadProfile(
    user
) {

    // ==================================================
    // EMAIL
    // ==================================================

    const userEmail =
        user.email ||
        "Email not available";


    profileEmail.textContent =
        userEmail;


    emailElement.textContent =
        userEmail;


    // ==================================================
    // USER ID
    // ==================================================

    userIdElement.textContent =
        user.uid;


    // ==================================================
    // ACCOUNT STATUS
    // ==================================================

    if (
        user.emailVerified
    ) {

        accountStatus.textContent =
            "✅ Email verified";

    }

    else {

        accountStatus.textContent =
            "⚠️ Email not verified";

    }


    // ==================================================
    // ACCOUNT CREATED
    // ==================================================

    if (
        user.metadata &&
        user.metadata.creationTime
    ) {

        const createdDate =
            new Date(
                user.metadata.creationTime
            );


        accountCreatedElement.textContent =
            createdDate.toLocaleString();

    }

    else {

        accountCreatedElement.textContent =
            "--";

    }


    // ==================================================
    // LOGIN PROVIDER
    // ==================================================

    if (
        user.providerData &&
        user.providerData.length > 0
    ) {

        const provider =
            user.providerData[0].providerId;


        if (
            provider ===
            "password"
        ) {

            loginProviderElement.textContent =
                "Email / Password";

        }

        else if (
            provider ===
            "google.com"
        ) {

            loginProviderElement.textContent =
                "Google";

        }

        else {

            loginProviderElement.textContent =
                provider;

        }

    }

    else {

        loginProviderElement.textContent =
            "Email / Password";

    }

}


// ======================================================
// LOGOUT FUNCTION
// ======================================================

async function logoutUser() {

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


        alert(
            "Logout failed. Please try again."
        );

    }

}


// ======================================================
// SIDEBAR LOGOUT
// ======================================================

const logoutBtn =
    document.getElementById(
        "logoutBtn"
    );


if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        logoutUser
    );

}


// ======================================================
// PROFILE LOGOUT
// ======================================================

const logoutProfileBtn =
    document.getElementById(
        "logoutProfileBtn"
    );


if (logoutProfileBtn) {

    logoutProfileBtn.addEventListener(
        "click",
        logoutUser
    );

}


// ======================================================
// REFRESH PROFILE
// ======================================================

const refreshProfileBtn =
    document.getElementById(
        "refreshProfileBtn"
    );


if (refreshProfileBtn) {

    refreshProfileBtn.addEventListener(
        "click",
        () => {

            window.location.reload();

        }
    );

}