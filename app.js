// app.js

const firebaseConfig = {
    apiKey: "AIzaSyDcXSHxWWCCwIypr62CG4OM69O4J9NLBNI",
    authDomain: "sbhs-year-8-chess-tournament.firebaseapp.com",
    databaseURL: "https://sbhs-year-8-chess-tournament-default-rtdb.firebaseio.com",
    projectId: "sbhs-year-8-chess-tournament",
    storageBucket: "sbhs-year-8-chess-tournament.firebasestorage.app",
    messagingSenderId: "632119283742",
    appId: "1:632119283742:web:ea2e5b59f5d80df1cede0f",
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

const signInBtn = document.getElementById("googleSignInBtn");
const userInfo = document.getElementById("user-info");

signInBtn.addEventListener("click", () => {
const provider = new firebase.auth.GoogleAuthProvider();
auth.signInWithPopup(provider)
    .then((result) => {
    const user = result.user;
    const email = user.email;
    console.log(email);
    if (!email.endsWith("@student.sbhs.nsw.edu.au")) {
        alert("Please use your school Google account.");
        auth.signOut();
        return;
    }

    // Add user to database
    const uid = user.uid;
    db.ref("users/" + uid).set({
        name: user.displayName,
        email: user.email,
        score: 0
    });

    userInfo.innerText = `Signed in as ${user.displayName}`;
    signInBtn.style.display = "none";
    })
    .catch((error) => {
    console.error("Sign-in error:", error);
    alert("Sign-in failed.");
    });
});

auth.onAuthStateChanged(async (user) => {
    if (user) {
      const uid = user.uid;
      const snapshot = await db.ref("users/" + uid).once("value");
      const userData = snapshot.val();
  
      if (userData && userData.currentGameUrl) {
        const link = document.createElement('a');
        link.href = userData.currentGameUrl;
        link.textContent = `Join your match as ${userData.lichessColor}`;
        link.target = "_blank";
        document.body.appendChild(link);
      }
    }
});
  