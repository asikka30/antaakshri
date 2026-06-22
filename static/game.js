// ── Speech Recognition ──────────────────────────────────────────────────────
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let micActive = false;

if (SR) {
    recognition = new SR();
    recognition.lang = 'en-IN';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (e) => {
        const transcript = Array.from(e.results)
            .map(r => r[0].transcript).join('');
        document.getElementById('songInput').value = transcript;
    };

    recognition.onend = () => {
        micActive = false;
        const btn = document.getElementById('micBtn');
        if (btn) { btn.classList.remove('mic-on'); btn.title = 'Speak song name'; }
    };

    recognition.onerror = (e) => {
        micActive = false;
        const btn = document.getElementById('micBtn');
        if (btn) btn.classList.remove('mic-on');
        if (e.error !== 'no-speech') alert('Mic error: ' + e.error);
    };
}

function toggleMic() {
    if (!recognition) { alert('Speech recognition is not supported in this browser. Use Chrome or Edge.'); return; }
    const btn = document.getElementById('micBtn');
    if (micActive) {
        recognition.stop();
    } else {
        document.getElementById('songInput').value = '';
        recognition.start();
        micActive = true;
        btn.classList.add('mic-on');
        btn.title = 'Listening... click to stop';
    }
}

// ── State ──────────────────────────────────────────────────────────────────
const G = {
    players: [],
    idx: 0,
    syllable: '',
    lastSong: '',
    pointsToWin: 10,
    timer: { on: false, duration: 30, left: 0, interval: null }
};

// ── Utilities ───────────────────────────────────────────────────────────────
function show(id) {
    ['screen-setup', 'screen-game', 'screen-winner'].forEach(s => {
        document.getElementById(s).classList.toggle('hidden', s !== id);
    });
}

// Extracts the last syllable from a song title (consonant + vowel before trailing consonants)
// e.g. "Naina" → "na", "Dil" → "di", "Tum Hi Ho" → "ho"
function extractSyllable(song) {
    const words = song.trim().split(/\s+/);
    const last = words[words.length - 1].toLowerCase().replace(/[^a-z]/g, '');
    if (!last) return '';
    const vowels = 'aeiou';
    let vi = -1;
    for (let i = last.length - 1; i >= 0; i--) {
        if (vowels.includes(last[i])) { vi = i; break; }
    }
    if (vi === -1) return last;                        // no vowel (e.g. "rth") — use whole word
    const ci = vi > 0 ? vi - 1 : 0;
    return last.slice(ci, vi + 1);
}

// ── Setup Screen ────────────────────────────────────────────────────────────
function addPlayer() {
    const input = document.getElementById('playerInput');
    const name = input.value.trim();
    if (!name) return;
    if (G.players.find(p => p.name.toLowerCase() === name.toLowerCase())) {
        input.value = ''; return;
    }
    G.players.push({ name, score: 0 });
    input.value = '';
    renderPlayerList();
}

function removePlayer(i) {
    G.players.splice(i, 1);
    renderPlayerList();
}

function renderPlayerList() {
    document.getElementById('playerList').innerHTML = G.players.map((p, i) =>
        `<span class="player-tag">${p.name} <span class="x" onclick="removePlayer(${i})">&#10007;</span></span>`
    ).join('');
}

function toggleTimerSettings() {
    const on = document.getElementById('timerToggle').checked;
    document.getElementById('timerSettings').classList.toggle('hidden', !on);
}

function startGame() {
    if (G.players.length < 2) { alert('Add at least 2 players!'); return; }
    G.idx = 0;
    G.syllable = '';
    G.lastSong = '';
    G.players.forEach(p => p.score = 0);
    G.pointsToWin = parseInt(document.getElementById('pointsToWin').value) || 10;
    G.timer.on = document.getElementById('timerToggle').checked;
    G.timer.duration = parseInt(document.getElementById('timerDuration').value) || 30;
    show('screen-game');
    renderGame();
}

// ── Game Screen ─────────────────────────────────────────────────────────────
function renderGame() {
    const p = G.players[G.idx];
    document.getElementById('turn-label').textContent = p.name + "'s turn";
    document.getElementById('syllable-text').textContent =
        G.syllable ? G.syllable.toUpperCase() : '— sing any song to start —';
    document.getElementById('last-song-label').textContent =
        G.lastSong ? 'Previous: ' + G.lastSong : '';
    document.getElementById('songInput').value = '';
    document.getElementById('hint-panel').classList.add('hidden');
    document.getElementById('syllable-edit').classList.add('hidden');
    document.getElementById('syllable-text').classList.remove('hidden');
    renderScores();
    if (G.timer.on) startTimer(); else stopTimer();
}

function renderScores() {
    document.getElementById('scoreboard').innerHTML = G.players.map((p, i) =>
        `<div class="score-chip ${i === G.idx ? 'active' : ''}">
            ${p.name}<span class="pts">${p.score}</span>
        </div>`
    ).join('');
}

function submitSong() {
    const song = document.getElementById('songInput').value.trim();
    if (!song) return;

    // Validate syllable match if one is required
    if (G.syllable) {
        const starts = song.slice(0, G.syllable.length).toLowerCase();
        if (starts !== G.syllable.toLowerCase()) {
            if (!confirm(`"${song}" doesn't seem to start with "${G.syllable.toUpperCase()}". Accept anyway?`)) return;
        }
    }

    stopTimer();
    G.players[G.idx].score++;
    G.lastSong = song;
    G.syllable = extractSyllable(song);

    const winner = G.players.find(p => p.score >= G.pointsToWin);
    if (winner) { showWinner(winner); return; }

    G.idx = (G.idx + 1) % G.players.length;
    renderGame();
}

function skipTurn() {
    stopTimer();
    G.idx = (G.idx + 1) % G.players.length;
    renderGame();
}

// Syllable edit
function toggleSyllableEdit() {
    const txt = document.getElementById('syllable-text');
    const inp = document.getElementById('syllable-edit');
    const btn = document.getElementById('syllable-btn');
    if (inp.classList.contains('hidden')) {
        inp.value = G.syllable;
        txt.classList.add('hidden');
        inp.classList.remove('hidden');
        inp.focus();
        btn.textContent = '✓ save';
    } else {
        const val = inp.value.trim().toLowerCase();
        if (val) G.syllable = val;
        txt.textContent = G.syllable ? G.syllable.toUpperCase() : '— sing any song to start —';
        inp.classList.add('hidden');
        txt.classList.remove('hidden');
        btn.textContent = '✎ edit';
    }
}

// ── Hints ───────────────────────────────────────────────────────────────────
async function showHints() {
    const panel = document.getElementById('hint-panel');
    panel.classList.remove('hidden');

    if (!G.syllable) {
        panel.innerHTML = '<em>No syllable yet — start the game first!</em>';
        return;
    }

    panel.innerHTML = '<em>Loading...</em>';
    try {
        const res = await fetch('/api/songs?s=' + encodeURIComponent(G.syllable));
        const list = await res.json();
        panel.innerHTML = list.length
            ? `<strong>Songs starting with "${G.syllable.toUpperCase()}":</strong>
               <ul>${list.map(s => `<li>${s}</li>`).join('')}</ul>`
            : `<em>No hints found for "${G.syllable.toUpperCase()}" — try editing the syllable.</em>`;
    } catch {
        panel.innerHTML = '<em>Could not load hints.</em>';
    }
}

// ── Timer ───────────────────────────────────────────────────────────────────
function startTimer() {
    stopTimer();
    G.timer.left = G.timer.duration;
    updateTimerDisplay();
    G.timer.interval = setInterval(() => {
        G.timer.left--;
        updateTimerDisplay();
        if (G.timer.left <= 0) {
            stopTimer();
            alert(G.players[G.idx].name + ' ran out of time! Skipping turn.');
            skipTurn();
        }
    }, 1000);
}

function stopTimer() {
    clearInterval(G.timer.interval);
    G.timer.interval = null;
}

function updateTimerDisplay() {
    const el = document.getElementById('timer-display');
    if (!G.timer.on) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    el.textContent = G.timer.left + 's';
    el.classList.toggle('warn', G.timer.left <= 10);
}

// ── Winner Screen ────────────────────────────────────────────────────────────
function showWinner(winner) {
    stopTimer();
    document.getElementById('winner-name').textContent = winner.name + ' wins!';
    const sorted = [...G.players].sort((a, b) => b.score - a.score);
    document.getElementById('final-scores').innerHTML =
        sorted.map(p =>
            `<div class="final-row"><span>${p.name}</span><span>${p.score} pts</span></div>`
        ).join('');
    show('screen-winner');
}

function playAgain() {
    G.players.forEach(p => p.score = 0);
    G.idx = 0;
    G.syllable = '';
    G.lastSong = '';
    show('screen-game');
    renderGame();
}

function newGame() {
    stopTimer();
    show('screen-setup');
}
