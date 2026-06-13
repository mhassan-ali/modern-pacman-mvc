import { LEVELS } from "../data/maze.js";

export class GameState {
    constructor() {
        this.levelName = "Easy";
        this.level = LEVELS[this.levelName];
        
        this.score = 0;
        this.highScore = Number(localStorage.getItem("pacman_highScore")) || 0;
        this.lives = 3;
        this.remainingTime = this.level.time_limit;
        this.elapsedTime = 0;
        this.frightenedUntil = 0; // timestamp
        this.ghostCombo = 0; // count of eaten ghosts in this power window
        
        // Game states: 'START_SCREEN' | 'READY' | 'PLAYING' | 'PAUSED' | 'GAME_OVER' | 'VICTORY' | 'STATS_SCREEN'
        this.mode = 'START_SCREEN';
        this.message = "Choose difficulty, then press SPACE to start.";

        // Stats track
        this.stats = {
            totalPellets: 0,
            pelletsEaten: 0,
            powerPelletsEaten: 0,
            ghostsEaten: 0,
            totalKeypresses: 0,
            efficientKeypresses: 0, // direction changes that actually moved Pacman
            startTime: 0,
            survivalTime: 0
        };

        this.achievements = [];
    }

    reset(levelName = this.levelName) {
        this.levelName = levelName;
        this.level = LEVELS[levelName];
        this.score = 0;
        this.lives = 3;
        this.remainingTime = this.level.time_limit;
        this.elapsedTime = 0;
        this.frightenedUntil = 0;
        this.ghostCombo = 0;
        this.message = "";
        
        this.stats = {
            totalPellets: 0,
            pelletsEaten: 0,
            powerPelletsEaten: 0,
            ghostsEaten: 0,
            totalKeypresses: 0,
            efficientKeypresses: 0,
            startTime: Date.now(),
            survivalTime: 0
        };
    }

    triggerFrightened() {
        this.frightenedUntil = Date.now() + this.level.frightened_seconds * 1000;
        this.ghostCombo = 0;
    }

    isFrightened() {
        return Date.now() < this.frightenedUntil;
    }

    frightenedTimeRemaining() {
        return Math.max(0, (this.frightenedUntil - Date.now()) / 1000);
    }

    addScore(points) {
        this.score += points;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem("pacman_highScore", this.highScore);
        }
    }

    checkAchievements(isWin) {
        const list = [];
        // Achievement: Speed Runner
        const secondsSpent = (Date.now() - this.stats.startTime) / 1000;
        if (isWin && secondsSpent < 45) {
            list.push({ id: "speed_runner", name: "Speed Runner", desc: "Clear level in < 45 seconds" });
        }
        // Achievement: Ghost Hunter
        if (this.stats.ghostsEaten >= 4) {
            list.push({ id: "ghost_hunter", name: "Ghost Hunter", desc: "Defeat 4+ ghosts in a run" });
        }
        // Achievement: Immortal
        if (isWin && this.lives === 3) {
            list.push({ id: "immortal", name: "Immortal Run", desc: "Win without losing a single life" });
        }
        
        // Save new achievements to LocalStorage
        let unlocked = JSON.parse(localStorage.getItem("pacman_achievements")) || [];
        for (const ach of list) {
            if (!unlocked.some(u => u.id === ach.id)) {
                unlocked.push(ach);
            }
        }
        localStorage.setItem("pacman_achievements", JSON.stringify(unlocked));
        this.achievements = list;
    }
}
