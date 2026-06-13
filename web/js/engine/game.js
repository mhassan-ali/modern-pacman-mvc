import { MazeGraph } from "./graph.js";
import { Pacman } from "../entities/pacman.js";
import { Ghost } from "../entities/ghost.js";
import { MAZE, KEY_TO_DIR, PELLET, POWER, EMPTY, TILE, DIRS } from "../data/maze.js";

export class Game {
    constructor(canvas, state, audio) {
        this.canvas = canvas;
        this.state = state;
        this.audio = audio;
        
        // Initial setup
        this.graph = new MazeGraph(MAZE);
        this.grid = MAZE.map(row => row.split(""));
        
        this.pacman = new Pacman(9, 11, this.state.level.player_speed);
        
        this.ghosts = [
            new Ghost("Blinky", 9, 7, "#ff3b30", { x: 17, y: 1 }),   // top right
            new Ghost("Pinky", 8, 8, "#ff7bd5", { x: 1, y: 1 }),     // top left
            new Ghost("Inky", 10, 8, "#00d7ff", { x: 17, y: 15 }),  // bottom right
            new Ghost("Clyde", 9, 8, "#facc15", { x: 1, y: 15 }),   // bottom left
        ];

        // Autoplay parameters
        this.lastInputTime = Date.now();
        this.autoplayMode = false;
        
        this.lastTime = 0;
        this.animationId = null;

        this.initInput();
    }

    setRenderer(renderer) {
        this.renderer = renderer;
    }

    setUIManager(ui) {
        this.ui = ui;
    }

    initInput() {
        window.addEventListener("keydown", (e) => {
            // Wake up Audio Context on user interaction
            this.audio.init();
            
            // Log keypress
            this.state.stats.totalKeypresses++;
            this.lastInputTime = Date.now();

            if (this.autoplayMode) {
                this.disableAutoplay();
            }

            // SPACE starts the game from menu
            if (e.code === "Space") {
                if (this.state.mode === 'START_SCREEN') {
                    this.start();
                } else if (this.state.mode === 'PLAYING') {
                    this.pause();
                } else if (this.state.mode === 'PAUSED') {
                    this.resume();
                }
                e.preventDefault();
                return;
            }

            // Map direction keypresses
            const dir = KEY_TO_DIR[e.code] || KEY_TO_DIR[e.key];
            if (dir && (this.state.mode === 'PLAYING' || this.state.mode === 'READY')) {
                this.pacman.nextDir = dir;
                e.preventDefault();
            }
        });
    }

    resetEntities() {
        this.grid = MAZE.map(row => row.split(""));
        
        // Count pellets in loaded grid
        let pelletCount = 0;
        for (let y = 0; y < this.grid.length; y++) {
            for (let x = 0; x < this.grid[y].length; x++) {
                if (this.grid[y][x] === PELLET || this.grid[y][x] === POWER) {
                    pelletCount++;
                }
            }
        }
        
        this.state.stats.totalPellets = pelletCount;
        this.state.stats.pelletsEaten = 0;
        
        this.pacman.reset();
        this.pacman.setSpeed(this.state.level.player_speed);
        
        this.ghosts.forEach(ghost => {
            ghost.reset();
            ghost.setSpeed(this.state.level.ghost_speed);
        });

        this.autoplayMode = false;
    }

    start() {
        this.state.reset();
        this.resetEntities();
        
        this.state.mode = 'READY';
        this.state.message = "READY!";
        this.ui.hideStartScreen();
        this.ui.updateHUD();
        
        this.audio.playOscillator(523.25, 523.25, "sine", 0.3, 0.08); // Start siren

        // Wait 1.2 seconds before starting loop updates
        setTimeout(() => {
            if (this.state.mode === 'READY') {
                this.state.mode = 'PLAYING';
                this.state.message = "";
                this.lastTime = performance.now();
                this.audio.startBGM();
            }
        }, 1200);
    }

    pause() {
        this.state.mode = 'PAUSED';
        this.state.message = "PAUSED (Press SPACE to Resume)";
        this.audio.stopBGM();
    }

    resume() {
        this.state.mode = 'PLAYING';
        this.state.message = "";
        this.lastTime = performance.now();
        this.audio.startBGM();
    }

    enableAutoplay() {
        this.autoplayMode = true;
        this.start();
        // Override start's READY state delay for instant demo
        this.state.mode = 'PLAYING';
        this.state.message = "AI AUTOPLAY MODE ACTIVE";
        this.ui.hideStartScreen();
        this.audio.startBGM();
    }

    disableAutoplay() {
        this.autoplayMode = false;
        this.state.mode = 'START_SCREEN';
        this.state.message = "Choose difficulty, then press SPACE to start.";
        this.audio.stopBGM();
        this.ui.showStartScreen();
    }

    gameLoop(timestamp) {
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1); // cap dt at 100ms
        this.lastTime = timestamp;

        if (this.state.mode === 'PLAYING') {
            this.update(dt);
            this.renderer.draw(this.grid, this.pacman, this.ghosts, this.state);
            this.ui.updateHUD();
        } else {
            // In start screen or overlays, check for autoplay idle and keep drawing
            if (this.state.mode === 'START_SCREEN' && Date.now() - this.lastInputTime > 10000 && !this.autoplayMode) {
                this.enableAutoplay();
            }
            this.renderer.draw(this.grid, this.pacman, this.ghosts, this.state);
        }

        this.animationId = requestAnimationFrame((t) => this.gameLoop(t));
    }

    update(dt) {
        this.state.elapsedTime += dt;
        
        // Count countdown time
        const survivalSecs = Math.floor(this.state.elapsedTime);
        this.state.remainingTime = Math.max(0, this.state.level.time_limit - survivalSecs);
        
        if (this.state.remainingTime <= 0) {
            this.endGame(false, "Time is up!");
            return;
        }

        // BFS path planning for Autoplay Pacman
        if (this.autoplayMode) {
            const aiDir = this.getAutoplayDirection();
            if (aiDir) {
                this.pacman.nextDir = aiDir;
            }
        }

        // Update Pacman and check cell consumption
        this.pacman.update(dt, this.graph, this.state);
        this.eatCell();

        // Update ghosts
        const blinky = this.ghosts.find(g => g.name === "Blinky") || this.ghosts[0];
        
        // Chase/Scatter timing cycles: 7s Scatter, 20s Chase
        const cycle = Math.floor(this.state.elapsedTime) % 27;
        const targetMode = cycle < 7 ? "SCATTER" : "CHASE";

        this.ghosts.forEach(ghost => {
            if (ghost.mode !== "FRIGHTENED" && ghost.mode !== "EATEN") {
                ghost.mode = targetMode;
            }
            ghost.update(dt, this.graph, this.state, this.pacman, blinky);
        });

        // Handle Collisions
        this.checkCollisions();
        
        // Update particles & score effects
        this.renderer.update(dt);
    }

    eatCell() {
        const px = Math.round(this.pacman.x);
        const py = Math.round(this.pacman.y);
        
        // Out of bounds check
        if (py < 0 || py >= this.grid.length || px < 0 || px >= this.grid[0].length) return;

        const cell = this.grid[py][px];
        
        if (cell === PELLET) {
            this.grid[py][px] = EMPTY;
            this.state.addScore(10);
            this.state.stats.pelletsEaten++;
            
            // Audio chomp and particles
            this.audio.playWaka();
            this.renderer.addPelletParticles(px, py);
            
        } else if (cell === POWER) {
            this.grid[py][px] = EMPTY;
            this.state.addScore(50);
            this.state.stats.powerPelletsEaten++;
            this.state.triggerFrightened();
            
            // Special sound & color particles
            this.audio.playPowerEat();
            this.renderer.addPelletParticles(px, py, "#facc15");
            this.renderer.addScorePopup(px, py, "POWER", "#f59e0b");
        }

        // Win state check
        if (this.state.stats.pelletsEaten >= this.state.stats.totalPellets) {
            this.endGame(true, "Clear!");
        }
    }

    checkCollisions() {
        const frightened = this.state.isFrightened();
        
        for (const ghost of this.ghosts) {
            const dx = ghost.x - this.pacman.x;
            const dy = ghost.y - this.pacman.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 0.75) { // collision radius threshold
                if (ghost.mode === "FRIGHTENED") {
                    // Eat ghost!
                    ghost.mode = "EATEN";
                    this.state.stats.ghostsEaten++;
                    this.state.ghostCombo++;
                    
                    const scoreReward = 200 * Math.pow(2, this.state.ghostCombo - 1);
                    this.state.addScore(scoreReward);
                    
                    this.audio.playGhostEat();
                    this.renderer.addScorePopup(ghost.x, ghost.y, `+${scoreReward}`, ghost.color);
                    
                } else if (ghost.mode !== "EATEN") {
                    // Pacman dies!
                    this.handlePlayerDeath();
                    return;
                }
            }
        }
    }

    handlePlayerDeath() {
        this.state.lives--;
        this.audio.playDeath();
        
        if (this.state.lives <= 0) {
            this.endGame(false, "No lives left!");
        } else {
            // Respawn positions
            this.pacman.reset();
            this.ghosts.forEach(g => g.reset());
            this.state.mode = 'READY';
            this.state.message = "Caught! Ready...";
            this.ui.updateHUD();
            
            // Resume play after delay
            setTimeout(() => {
                if (this.state.mode === 'READY') {
                    this.state.mode = 'PLAYING';
                    this.state.message = "";
                    this.lastTime = performance.now();
                    this.audio.startBGM();
                }
            }, 1200);
        }
    }

    endGame(isWin, reason) {
        this.state.mode = isWin ? 'VICTORY' : 'GAME_OVER';
        this.state.message = isWin ? "VICTORY!" : "GAME OVER";
        
        this.audio.stopBGM();

        if (isWin) {
            this.audio.playWin();
        } else {
            this.audio.playDeath();
        }

        this.state.checkAchievements(isWin);
        
        // Show dashboard after 1.5s delay
        setTimeout(() => {
            this.ui.showStatsDashboard(isWin);
        }, 1500);
    }

    getAutoplayDirection() {
        // Find closest pellet in grid using simple math
        let closestPellet = null;
        let minDist = Infinity;
        
        for (let y = 0; y < this.grid.length; y++) {
            for (let x = 0; x < this.grid[y].length; x++) {
                if (this.grid[y][x] === PELLET || this.grid[y][x] === POWER) {
                    const dx = x - this.pacman.x;
                    const dy = y - this.pacman.y;
                    const d = dx * dx + dy * dy;
                    if (d < minDist) {
                        minDist = d;
                        closestPellet = { x, y };
                    }
                }
            }
        }

        if (closestPellet) {
            const start = { x: Math.round(this.pacman.x), y: Math.round(this.pacman.y) };
            const path = this.graph.shortestPath(start, closestPellet);
            
            if (path && path.length > 1) {
                const nextNode = path[1];
                const dx = nextNode.x - start.x;
                const dy = nextNode.y - start.y;
                for (const [key, val] of Object.entries(DIRS)) {
                    if (val.x === dx && val.y === dy) {
                        return key;
                    }
                }
            }
        }
        return null;
    }
}
