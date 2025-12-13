<script type="module">

// ------------------------------
// 1) IMPORT FIREBASE LIBRARIES
// ------------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } 
        from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";


// ------------------------------
// 2) FIREBASE CONFIG
// ------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyDKtUqHx51otAWeUPrlbwtnqDA5yPaR77o",
  authDomain: "kidzee-backup.firebaseapp.com",
  projectId: "kidzee-backup",
  storageBucket: "kidzee-backup.firebasestorage.app",
  messagingSenderId: "453145856154",
  appId: "1:453145856154:web:0c3e2b54fb70fc913bb723"
};


// ------------------------------
// 3) INITIALIZE
// ------------------------------
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// ------------------------------
// 4) ALLOWED EMAILS
// ------------------------------
const allowedEmails = [
  "surajit.chakdaha@gmail.com",
  "debjoydeb123@gmail.com",
  "triptideb25@gmail.com",
  "sampurnar41@gmail.com"
];


// ------------------------------
// 5) GOOGLE LOGIN FUNCTION
// ------------------------------
document.getElementById("loginBtn").addEventListener("click", () => {
  const provider = new GoogleAuthProvider();
  signInWithPopup(auth, provider)
    .then(result => {
      const user = result.user;

      if (!allowedEmails.includes(user.email)) {
        alert("❌ আপনার ইমেল এই Backup সিস্টেম ব্যবহারের অনুমতি নেই।");
        signOut(auth);
        return;
      }

      // Success
      document.getElementById("loginArea").style.display = "none";
      document.getElementById("backupArea").style.display = "block";

      document.getElementById("loggedUser").innerText = user.email;

    })
    .catch(error => {
      alert("Login Failed: " + error.message);
    });
});


// ------------------------------
// 6) AUTO LOGIN CHECK
// ------------------------------
onAuthStateChanged(auth, user => {
  if (user && allowedEmails.includes(user.email)) {
    document.getElementById("loginArea").style.display = "none";
    document.getElementById("backupArea").style.display = "block";
    document.getElementById("loggedUser").innerText = user.email;
  }
});


// ------------------------------
// 7) LOGOUT
// ------------------------------
document.getElementById("logoutBtn").addEventListener("click", () => {
  signOut(auth).then(() => {
    document.getElementById("loginArea").style.display = "block";
    document.getElementById("backupArea").style.display = "none";
  });
});

</script>
