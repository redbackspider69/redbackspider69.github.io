// app.js

// Replace these config values with your Firebase project settings
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
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
  
        if (!email.endsWith("@myschool.nsw.edu.au")) {
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
  