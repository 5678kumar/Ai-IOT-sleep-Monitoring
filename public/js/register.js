
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";
const app=initializeApp(firebaseConfig); const auth=getAuth(app);
const msg=document.getElementById("message");
function show(text){msg.textContent=text;msg.classList.add("show")}
document.getElementById("registerForm").addEventListener("submit",async e=>{
 e.preventDefault();
 if(password.value!==confirmPassword.value)return show("Passwords do not match.");
 try{const cred=await createUserWithEmailAndPassword(auth,email.value.trim(),password.value);await updateProfile(cred.user,{displayName:name.value.trim()});location.href="dashboard.html"}
 catch(err){console.error(err);show(err.message)}
});
