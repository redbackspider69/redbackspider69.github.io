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
let currentUserUid = null;

function isNumeric(str) {
  if (typeof str != "string") return false // we only process strings!  
  return !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
         !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
} // from https://stackoverflow.com/a/175787

signInBtn.addEventListener("click", () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .then((result) => {
      const testing = true;

      const user = result.user;
      const email = user.email;

      console.log(email);
      if (testing === false) {
        if (!email.endsWith("@student.sbhs.nsw.edu.au") || !isNumeric(email[0])) {
          alert("Please use your [studentID]@student.sbhs.nsw.edu.au account to help prevent double accounts.");
          auth.signOut();
          return;
        }
      }

      // Only create the user record if it doesn't exist
      const uid = user.uid;
      const userRef = db.ref("users/" + uid);
      
      userRef.once("value").then((snapshot) => {
        if (!snapshot.exists()) {
          userRef.set({
            name: user.displayName,
            email: user.email,
            score: 0,
            opponent: null,
            currentGameUrl: null
          }).then(() => {
            loadLeaderboard(); // Only call it after user is added
          });
        } else {
          loadLeaderboard(); // Call immediately if already exists
        }
      });

      userInfo.innerText = `Signed in as ${user.displayName}`;
      signInBtn.style.display = "none";
      afterSignIn(user)
    })
    .catch((error) => {
      console.error("Sign-in error:", error);
      alert("Sign-in failed.");
    });
});

auth.onAuthStateChanged((user) => {
  if (user) {
    afterSignIn(user);
  }
});

async function afterSignIn(user) {
  if (user) {
    const uid = user.uid;
    const email = user.email;
    currentUser = user;
    currentUserUid = uid;
    userInfo.innerText = `Signed in as ${user.displayName}`;
    signInBtn.style.display = "none";

    // Only shows admin panel to me
    if (email === "448705021@student.sbhs.nsw.edu.au") {
      document.getElementById("admin-panel").style.display = "block";
      loadReports();
    }

    // Show current game
    const snap = await db.ref("users/" + uid).once("value");
    const userData = snap.val();
    if (userData && userData.currentGameUrl) {
      const gameLink = document.getElementById("game-link");
      gameLink.href = userData.currentGameUrl;
      gameLink.innerText = "Join Your Game";
      document.getElementById("game-panel").style.display = "block";
      const url = new URL(userData.currentGameUrl)
      const gameId = url.pathname.slice(1);
      document.getElementById("userGame").src = `https://lichess.org/embed/${gameId}#9999?theme=dark&bg=auto`;

      if (!checkIfFirstMove(gameId)) {
      document.getElementById("reportButton").style.display = "block";
      } // display report button only if match hasn't started
    }
    
    loadLeaderboard();
    loadMatches();
  }
}

function hideIframeLoader(iframe) {
  const wrapper = iframe.parentElement;
  wrapper.querySelector('.iframe-loader').style.display = 'none';
  iframe.style.visibility = 'visible';
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

async function checkIfFirstMove(gameId) {
  const res = await fetch(`https://year8-chess-tournament-backend.glitch.me/check-if-first-move?gameId=${gameId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  
  const data = await res.json();

  return data.gameStarted;
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
        afterSignIn(currentUser);
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
    reportList.style.display = "block";
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

function minMaxReports() {
  const reportList = document.getElementById("report-list");
  const button = document.getElementById("min-max");
  if (reportList.style.display == "block") {
    reportList.style.display = "none";
    button.innerHTML = 'Maximise Reports';
  } else {
    reportList.style.display = "block";
    button.innerHTML = 'Minimise Reports';
  }
}

async function loadMatches() {
  const roundSnap = await db.ref('tournament/currentRound').once('value');
  const roundNumber = roundSnap.val();
  if (!roundNumber) return;

  const [gamesSnap, usersSnap] = await Promise.all([
    db.ref(`rounds/${roundNumber}/games`).once('value'),
    db.ref('users').once('value')
  ]);

  const games = gamesSnap.val();
  const users = usersSnap.val();
  if (!games || !users) return;

  const getName = uid => (users[uid]?.name || "Unknown");

  const liveContainer = document.getElementById('live-matches');
  const finishedContainer = document.getElementById('finished-matches');
  liveContainer.innerHTML = '';
  finishedContainer.innerHTML = '';

  const total = Object.values(games).length;
  let loaded = 0;
  let loadedLive = 0;
  let loadedFinished = 0;

  for (const game of Object.values(games)) {
    const { lichessGameId, white, black, status } = game;
    if (!lichessGameId) continue;
    if (status != 'completed' && status != 'pending') continue;
    const hasStarted = await checkIfFirstMove(lichessGameId);
    if (!hasStarted) continue;

    const card = document.createElement('div');
    card.className = 'match-card';

    const title = document.createElement('div');
    title.className = 'match-title';
    title.innerText = `${getName(white)} (White) vs. ${getName(black)} (Black)`;
    card.appendChild(title);

    const iframe = document.createElement('iframe');
    iframe.src = `https://lichess.org/embed/${lichessGameId}#9999?theme=dark&bg=auto`;
    iframe.width = '240';
    iframe.height = '240';
    iframe.style.borderRadius = '4px';
    card.appendChild(iframe);

    const viewBtn = document.createElement('a');
    viewBtn.href = `https://lichess.org/${lichessGameId}`;
    viewBtn.target = '_blank';
    viewBtn.innerText = 'View Game';
    viewBtn.style.display = 'block';
    viewBtn.style.marginTop = '0.5rem';
    card.appendChild(viewBtn);

    if (status === 'pending') {
      liveContainer.appendChild(card);
      loadedLive++;
    } else {
      finishedContainer.appendChild(card);
      loadedFinished++;
    }

    loaded++;
    const percent = Math.round((loaded / total) * 100);
    document.getElementById('games-loading-bar').style.width = `${percent}%`;
  }

  if (loadedLive === 0) {
    document.getElementById("noLiveGames").style.display = "block";
  }
  if (loadedFinished === 0) {
    document.getElementById("noFinishedGames").style.display = "block";
  }

  document.getElementById('games-loading-bar-container').style.display = 'none';
}

let leaderboardData = [];
let currentVisibleCount = 5;

function loadLeaderboard() {
  document.getElementById('leaderboard-loader').style.width = '100%';

  db.ref("users").once("value").then(snapshot => {
    const users = snapshot.val();
    leaderboardData = Object.entries(users)
      .map(([uid, data]) => ({
        uid,
        name: data.name,
        score: data.score || 0
      }))
      .sort((a, b) => b.score - a.score);

    renderLeaderboard();

    setTimeout(() => {
      document.getElementById('leaderboard-loader').style.width = '0%';
    }, 300);
  });
}

function renderLeaderboard() {
  const tbody = document.querySelector("#leaderboard tbody");
  tbody.innerHTML = "";

  let placing = 1;
  let shown = 0;
  let userIsShown = false;
  let lastScore = null;
  let actualPlacing = 1;

  for (let i = 0; i < leaderboardData.length; i++) {
    const user = leaderboardData[i];
    const isCurrentUser = user.uid === currentUserUid;
    const withinVisible = shown < currentVisibleCount;

    if (withinVisible || (isCurrentUser && !userIsShown)) {
      // Only increment placing if score is lower
      if (lastScore !== null && user.score < lastScore) {
        placing = actualPlacing;
      }

      const row = document.createElement("tr");
      row.innerHTML = `<td>${placing}</td><td>${user.name}</td><td>${user.score}</td>`;
      if (isCurrentUser) {
        row.style.fontWeight = 'bold';
        row.classList.add("highlighted-user");
        userIsShown = true;
      }

      tbody.appendChild(row);

      if (!isCurrentUser) shown++;

      lastScore = user.score;
    }

    actualPlacing++;
  }

  document.getElementById('show-more-btn').style.display =
    shown < leaderboardData.length ? 'inline-block' : 'none';

  document.getElementById('minimise-btn').style.display =
    currentVisibleCount > 5 ? 'inline-block' : 'none';
}

// Button event listeners

document.getElementById('show-more-btn').addEventListener('click', () => {
  currentVisibleCount += 20;
  renderLeaderboard();
});

document.getElementById('minimise-btn').addEventListener('click', () => {
  currentVisibleCount = 5;
  renderLeaderboard();
});

document.getElementById("info-btn").addEventListener("click", () => {
  document.getElementById("info-popup").style.display = "block";
});

document.getElementById("popup-close").addEventListener("click", () => {
  document.getElementById("info-popup").style.display = "none";
});

window.addEventListener("click", (e) => {
  if (e.target.id === "info-popup") {
    document.getElementById("info-popup").style.display = "none";
  }
});

/*
// Reload matches every 30 seconds
setInterval(() => {
  loadMatches();
}, 30000);

// Reload leaderboard every 30 seconds
setInterval(() => {
  loadLeaderboard();
}, 30000);
*/

alert("nobody asked you to be here, i'm not finished as i was abandoned in march of 2025, but i might be finished eventually, we'll see... if you're curious, my original intent was to host a chess tournament for all of year 8 including noobs, but my owner decided they are too lazy to participate in such an activity and it'd be too bothersome to try to convince them to...");