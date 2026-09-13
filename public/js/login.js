
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";
const app=initializeApp(firebaseConfig); const auth=getAuth(app);
const msg=document.getElementById("message");
function show(text){msg.textContent=text;msg.classList.add("show")}
onAuthStateChanged(auth,user=>{if(user) location.href="dashboard.html"});
document.getElementById("loginForm").addEventListener("submit",async e=>{
 e.preventDefault();
 try{await signInWithEmailAndPassword(auth,email.value.trim(),password.value);location.href="dashboard.html"}
 catch(err){console.error(err);show(err.code==="auth/invalid-credential"?"Email or password is incorrect.":err.message)}
});
