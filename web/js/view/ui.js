export class UIManager {
    constructor(state, audio, game) {
        this.state = state;
        this.audio = audio;
        this.game = game;

        // Bind DOM elements
        this.startScreen = document.getElementById("start-screen");
        this.statsScreen = document.getElementById("stats-screen");
        this.gameHud = document.getElementById("hud");
        
        this.scoreVal = document.getElementById("score-val");
        this.highScoreVal = document.getElementById("highscore-val");
        this.livesContainer = document.getElementById("lives-container");
        this.timerVal = document.getElementById("timer-val");
        this.levelVal = document.getElementById("level-val");
        this.frightenedBar = document.getElementById("frightened-bar");
        this.frightenedFill = document.getElementById("frightened-fill");

        // Menu buttons
        this.muteBtn = document.getElementById("mute-btn");
        this.dsaToggle = document.getElementById("dsa-toggle");
        this.creditsBtn = document.getElementById("credits-btn");
        this.creditsPanel = document.getElementById("credits-panel");
        this.closeCredits = document.getElementById("close-credits");

        // Stat widgets
        this.statScore = document.getElementById("stat-score");
        this.statTime = document.getElementById("stat-time");
        this.statPellets = document.getElementById("stat-pellets");
        this.statGhosts = document.getElementById("stat-ghosts");
        this.statAccuracy = document.getElementById("stat-accuracy");
        this.badgeContainer = document.getElementById("badge-container");

        // Leaderboard widgets
        this.leaderboardBody = document.getElementById("leaderboard-body");
        this.playerNameInput = document.getElementById("player-name-input");
        this.saveScoreBtn = document.getElementById("save-score-btn");

        this.initListeners();
        this.updateLeaderboardTable();
    }

    initListeners() {
        // Difficulty listeners
        document.querySelectorAll(".diff-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const diff = e.target.getAttribute("data-diff");
                this.state.reset(diff);
                this.game.resetEntities();
                this.updateHUD();
                
                // Toggle active styling
                document.querySelectorAll(".diff-btn").forEach(b => b.classList.remove("active"));
                e.target.classList.add("active");
                
                this.audio.playOscillator(400, 600, "sine", 0.1, 0.05);
            });
        });

        // Start btn
        document.getElementById("start-game-btn").addEventListener("click", () => {
            this.game.start();
        });

        // Mute btn
        this.muteBtn.addEventListener("click", () => {
            const isMuted = this.audio.toggleMute();
            this.muteBtn.innerHTML = isMuted ? "🔇" : "🔊";
            this.muteBtn.classList.toggle("muted", isMuted);
        });

        // DSA toggle
        this.dsaToggle.addEventListener("change", (e) => {
            this.game.renderer.setDsaOverlay(e.target.checked);
        });

        // Credits Panel
        this.creditsBtn.addEventListener("click", () => {
            this.creditsPanel.classList.add("open");
        });

        this.closeCredits.addEventListener("click", () => {
            this.creditsPanel.classList.remove("open");
        });

        // Stats restart buttons
        document.getElementById("restart-btn").addEventListener("click", () => {
            this.statsScreen.classList.add("hidden");
            this.startScreen.classList.remove("hidden");
            this.state.mode = 'START_SCREEN';
        });

        // Save highscore listener
        this.saveScoreBtn.addEventListener("click", () => {
            const name = this.playerNameInput.value.trim() || "Pac-Player";
            this.saveLeaderboard(name, this.state.score, this.state.levelName);
            this.playerNameInput.disabled = true;
            this.saveScoreBtn.disabled = true;
            this.saveScoreBtn.innerText = "Saved!";
            this.updateLeaderboardTable();
        });
    }

    showStartScreen() {
        this.statsScreen.classList.add("hidden");
        this.startScreen.classList.remove("hidden");
        this.gameHud.classList.add("blurred");
    }

    hideStartScreen() {
        this.startScreen.classList.add("hidden");
        this.gameHud.classList.remove("blurred");
    }

    showStatsDashboard(isWin) {
        this.statsScreen.classList.remove("hidden");
        this.gameHud.classList.add("blurred");
        
        // Populate stats
        this.statScore.innerText = this.state.score;
        this.statTime.innerText = `${Math.floor((Date.now() - this.state.stats.startTime) / 1000)}s`;
        
        const pelletPct = this.state.stats.totalPellets > 0 
            ? ((this.state.stats.pelletsEaten / this.state.stats.totalPellets) * 100).toFixed(0) 
            : 0;
        this.statPellets.innerText = `${this.state.stats.pelletsEaten}/${this.state.stats.totalPellets} (${pelletPct}%)`;
        
        this.statGhosts.innerText = this.state.stats.ghostsEaten;
        
        const accuracyPct = this.state.stats.totalKeypresses > 0 
            ? ((this.state.stats.efficientKeypresses / this.state.stats.totalKeypresses) * 100).toFixed(0) 
            : 0;
        this.statAccuracy.innerText = `${accuracyPct}%`;

        // Render achievements
        this.badgeContainer.innerHTML = "";
        if (this.state.achievements.length > 0) {
            this.state.achievements.forEach(ach => {
                const badge = document.createElement("div");
                badge.className = "achievement-badge";
                badge.innerHTML = `
                    <div class="badge-icon">🏆</div>
                    <div class="badge-title">${ach.name}</div>
                    <div class="badge-desc">${ach.desc}</div>
                `;
                this.badgeContainer.appendChild(badge);
            });
        } else {
            this.badgeContainer.innerHTML = `<div class="text-gray-400 text-sm">No new badges unlocked this run.</div>`;
        }

        // Reset inputs
        this.playerNameInput.disabled = false;
        this.playerNameInput.value = "";
        this.saveScoreBtn.disabled = false;
        this.saveScoreBtn.innerText = "Save Score";
        
        // Show status header
        const title = document.getElementById("stats-title");
        title.innerText = isWin ? "VICTORY UNLOCKED!" : "GAME OVER";
        title.style.color = isWin ? "#34d399" : "#ef4444";
    }

    updateHUD() {
        this.scoreVal.innerText = this.state.score;
        this.highScoreVal.innerText = this.state.highScore;
        this.timerVal.innerText = `${this.state.remainingTime}s`;
        this.levelVal.innerText = this.state.levelName.toUpperCase();

        // Draw lives Pacman emojis or SVG divs
        this.livesContainer.innerHTML = "";
        for (let i = 0; i < this.state.lives; i++) {
            this.livesContainer.innerHTML += `<div class="hud-life-icon">💛</div>`;
        }

        // Frightened timer bar
        if (this.state.isFrightened()) {
            this.frightenedBar.classList.remove("hidden");
            const pct = (this.state.frightenedTimeRemaining() / this.state.level.frightened_seconds) * 100;
            this.frightenedFill.style.width = `${pct}%`;
        } else {
            this.frightenedBar.classList.add("hidden");
        }
    }

    saveLeaderboard(name, score, level) {
        const board = JSON.parse(localStorage.getItem("pacman_leaderboard")) || [];
        board.push({ name, score, level, date: new Date().toLocaleDateString() });
        board.sort((a, b) => b.score - a.score);
        // keep top 8
        localStorage.setItem("pacman_leaderboard", JSON.stringify(board.slice(0, 8)));
    }

    updateLeaderboardTable() {
        const board = JSON.parse(localStorage.getItem("pacman_leaderboard")) || [];
        this.leaderboardBody.innerHTML = "";
        if (board.length === 0) {
            this.leaderboardBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-gray-500">No records yet. Be the first!</td></tr>`;
            return;
        }

        board.forEach((row, index) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td class="font-bold text-yellow-400">${row.name}</td>
                <td>${row.level}</td>
                <td class="text-right text-cyan-400 font-bold">${row.score}</td>
            `;
            this.leaderboardBody.appendChild(tr);
        });
    }
}
