
import { auth } from "./app.js";
import { onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
onAuthStateChanged(auth,user=>{
 if(!user)return;
 const name=user.displayName||"SleepCare User";
 document.getElementById("profileName").textContent=name;
 document.getElementById("profileEmail").textContent=user.email||"--";
 document.getElementById("avatar").textContent=name.trim().charAt(0).toUpperCase()||"S";
 document.getElementById("nameField").value=name;
 document.getElementById("emailField").value=user.email||"";
 document.getElementById("uidField").value=user.uid;
});
