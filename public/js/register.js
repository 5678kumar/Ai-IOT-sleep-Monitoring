import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
    getAuth,
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
    getDatabase,
    ref,
    set
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

import {
    firebaseConfig
} from "./firebase-config.js";


const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const database = getDatabase(app);


const registerForm =
    document.getElementById("registerForm");

const message =
    document.getElementById("message");


registerForm.addEventListener("submit", async (event) => {

    event.preventDefault();


    const email =
        document.getElementById("email").value;

    const password =
        document.getElementById("password").value;

    const confirmPassword =
        document.getElementById("confirmPassword").value;


    if (password !== confirmPassword) {

        message.textContent =
            "Passwords do not match.";

        return;
    }


    message.textContent =
        "Creating account...";


    try {

        const userCredential =
            await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );


        const user =
            userCredential.user;


        // Create user's profile in Realtime Database

        await set(
            ref(database, "users/" + user.uid + "/profile"),
            {
                email: user.email,
                createdAt: new Date().toISOString()
            }
        );


        message.textContent =
            "Account created successfully!";


        console.log("User UID:", user.uid);


        setTimeout(() => {

            window.location.href = "dashboard.html";

        }, 1500);


    } catch (error) {

        console.error(error);

        message.textContent =
            "Registration failed: " + error.message;
    }

});