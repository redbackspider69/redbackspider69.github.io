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
let currentUser = null;

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

    const uid = user.uid;
    const userRef = db.ref("users/" + uid);

    // Only create the user record if it doesn't exist
    userRef.once("value").then((snapshot) => {
      if (!snapshot.exists()) {
        userRef.set({
          name: user.displayName,
          email: user.email,
          score: 0,
          opponent: null,
          currentGameUrl: null
        });
      }
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
  const email = user.email;
  currentUser = user;
  userInfo.innerText = `Signed in as ${user.displayName}`;
  signInBtn.style.display = "none";

  if (email === "448705021@student.sbhs.nsw.edu.au") {
    document.getElementById("admin-panel").style.display = "block";
    loadReports();
  }

  loadLeaderboard();

  // Show current game
  const snap = await db.ref("users/" + uid).once("value");
  const userData = snap.val();
  if (userData && userData.currentGameUrl) {
    const gameLink = document.getElementById("game-link");
    gameLink.href = userData.currentGameUrl;
    gameLink.innerText = "Join Your Game";
    document.getElementById("game-panel").style.display = "block";
  }
}
});

function loadLeaderboard() {
db.ref("users").once("value").then(snapshot => {
  const users = snapshot.val();
  const leaderboard = Object.values(users).sort((a, b) => (b.score || 0) - (a.score || 0));

  const tbody = document.querySelector("#leaderboard tbody");
  tbody.innerHTML = "";
  leaderboard.forEach(user => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${user.name}</td><td>${user.score || 0}</td>`;
    tbody.appendChild(row);
  });
});
}

function checkResults() {
fetch("https://year8-chess-tournament-backend.glitch.me/check-results", { method: "POST" })
  .then(res => res.json())
  .then(data => alert(`Updated games: ${data.updatedGames.length}`));
}

function startRound() {
fetch("https://year8-chess-tournament-backend.glitch.me/start-round", { method: "POST" })
  .then(res => res.json())
  .then(data => alert(`Started new round with ${data.pairings} games.`));
}

function reportTroll() {
if (!currentUser) {
  alert("Please sign in first.");
  return;
}

fetch("https://year8-chess-tournament-backend.glitch.me/report-troll", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ reporterId: currentUser.uid })
})
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      alert("New game created. Use your new link.");
    } else {
      alert("Failed to create a new game.");
      console.error("Backend error:", data.error || data);
    }
  })
  .catch((err) => {
    alert("Failed to reach server.");
    console.error("Fetch error:", err);
  });
}

function loadReports() {
  db.ref("reports").once("value").then(snapshot => {
    const reports = snapshot.val();
    if (!reports) return;

    const reportList = document.getElementById("report-list");
    reportList.innerHTML = "";

    Object.values(reports).forEach(report => {
      const li = document.createElement("li");
      li.innerHTML = `
        Reporter: ${report.reporterId}<br>
        Opponent: ${report.opponentId}<br>
        <a href="${report.oldGameUrl}" target="_blank">Old Game</a> |
        <a href="${report.newGameUrl}" target="_blank">New Game</a>
        <hr>
      `;
      reportList.appendChild(li);
    });
  });
}