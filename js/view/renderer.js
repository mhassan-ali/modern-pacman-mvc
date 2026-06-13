import { TILE, WALL, PELLET, POWER, DIRS } from "../data/maze.js";

export class CanvasRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.width = canvas.width;
        this.height = canvas.height;
        this.particles = [];
        this.popups = [];
        this.showDsaOverlay = false;
    }

    setDsaOverlay(show) {
        this.showDsaOverlay = show;
    }

    addPelletParticles(x, y, color = "#facc15") {
        const px = x * TILE + TILE / 2;
        const py = y * TILE + TILE / 2;
        for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 30 + Math.random() * 50;
            this.particles.push({
                x: px,
                y: py,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                alpha: 1.0,
                color: color,
                decay: 2.0 + Math.random() * 2.0
            });
        }
    }

    addScorePopup(x, y, text, color = "#cbd5e1") {
        const px = x * TILE + TILE / 2;
        const py = y * TILE;
        this.popups.push({
            x: px,
            y: py,
            text: text,
            color: color,
            alpha: 1.0,
            life: 1.0 // seconds
        });
    }

    update(dt) {
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.alpha -= p.decay * dt;
            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // Update score popups
        for (let i = this.popups.length - 1; i >= 0; i--) {
            const popup = this.popups[i];
            popup.y -= 25 * dt; // float upwards
            popup.alpha -= dt / popup.life;
            if (popup.alpha <= 0) {
                this.popups.splice(i, 1);
            }
        }
    }

    clear() {
        this.ctx.fillStyle = "#070817";
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Cyber grid scanlines background
        this.ctx.save();
        this.ctx.strokeStyle = "rgba(56, 189, 248, 0.03)";
        this.ctx.lineWidth = 1;
        for (let i = 0; i < this.height; i += 15) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, i);
            this.ctx.lineTo(this.width, i);
            this.ctx.stroke();
        }
        this.ctx.restore();
    }

    draw(grid, pacman, ghosts, state) {
        this.clear();
        this.drawMaze(grid);
        this.drawPacman(pacman);
        
        const frightened = state.isFrightened();
        const flash = frightened && state.frightenedTimeRemaining() < 2.0 && Math.floor(Date.now() / 200) % 2 === 0;
        
        for (const ghost of ghosts) {
            this.drawGhost(ghost, frightened, flash);
        }

        if (this.showDsaOverlay) {
            this.drawDsaVectors(ghosts);
        }

        this.drawParticles();
        this.drawPopups();
    }

    drawMaze(grid) {
        const pulse = 1 + 0.15 * Math.sin(Date.now() / 150);
        this.ctx.save();
        
        for (let y = 0; y < grid.length; y++) {
            for (let x = 0; x < grid[y].length; x++) {
                const cell = grid[y][x];
                const x0 = x * TILE;
                const y0 = y * TILE;

                if (cell === WALL) {
                    // Modern Neon Walls with Shadows
                    this.ctx.shadowBlur = 6;
                    this.ctx.shadowColor = "#1d4ed8";
                    
                    this.ctx.fillStyle = "#1e3a8a"; // deep blue base
                    this.ctx.fillRect(x0 + 2, y0 + 2, TILE - 4, TILE - 4);
                    
                    this.ctx.strokeStyle = "#3b82f6"; // neon blue border
                    this.ctx.lineWidth = 1.5;
                    this.ctx.strokeRect(x0 + 2, y0 + 2, TILE - 4, TILE - 4);
                } else if (cell === PELLET) {
                    this.ctx.shadowBlur = 0;
                    this.ctx.fillStyle = "#f8fafc";
                    this.ctx.beginPath();
                    this.ctx.arc(x0 + TILE / 2, y0 + TILE / 2, 2.5, 0, Math.PI * 2);
                    this.ctx.fill();
                } else if (cell === POWER) {
                    // Pulsating golden power pellets
                    this.ctx.shadowBlur = 12;
                    this.ctx.shadowColor = "#facc15";
                    
                    this.ctx.fillStyle = "#fbbf24";
                    this.ctx.beginPath();
                    this.ctx.arc(x0 + TILE / 2, y0 + TILE / 2, 5 * pulse, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        }
        this.ctx.restore();
    }

    drawPacman(pacman) {
        const px = pacman.x * TILE + TILE / 2;
        const py = pacman.y * TILE + TILE / 2;
        const radius = TILE / 2 - 3;
        
        let startAngle = 0;
        let endAngle = Math.PI * 2;

        const dirAngles = {
            "Right": 0,
            "Down": Math.PI / 2,
            "Left": Math.PI,
            "Up": 3 * Math.PI / 2
        };

        const angleOffset = dirAngles[pacman.currentDir] || 0;
        const mouthRads = (pacman.mouthAngle * Math.PI) / 180;

        this.ctx.save();
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = "#facc15";
        
        // Body shadow arc
        this.ctx.fillStyle = "#b45309";
        this.ctx.beginPath();
        this.ctx.arc(px + 1, py + 1, radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Animated chomping mouth
        this.ctx.fillStyle = "#facc15";
        this.ctx.beginPath();
        this.ctx.moveTo(px, py);
        this.ctx.arc(
            px,
            py,
            radius,
            angleOffset + mouthRads,
            angleOffset + Math.PI * 2 - mouthRads,
            false
        );
        this.ctx.lineTo(px, py);
        this.ctx.fill();

        // Eye
        let eyeOffset = { x: 0, y: 0 };
        if (pacman.currentDir === "Right") eyeOffset = { x: 2, y: -5 };
        else if (pacman.currentDir === "Left") eyeOffset = { x: -2, y: -5 };
        else if (pacman.currentDir === "Up") eyeOffset = { x: -5, y: -2 };
        else if (pacman.currentDir === "Down") eyeOffset = { x: 5, y: 2 };
        
        this.ctx.fillStyle = "#0f172a";
        this.ctx.beginPath();
        this.ctx.arc(px + eyeOffset.x, py + eyeOffset.y, 2, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }

    drawGhost(ghost, frightened, flash) {
        const gx = ghost.x * TILE + TILE / 2;
        const gy = ghost.y * TILE + TILE / 2;
        const r = TILE / 2 - 3;
        
        this.ctx.save();

        if (ghost.mode === "EATEN") {
            // Draw only eyes heading back
            this.drawGhostEyes(gx, gy, ghost.direction);
            this.ctx.restore();
            return;
        }

        // Set Neon Glow
        this.ctx.shadowBlur = 8;
        let color = ghost.color;
        
        if (frightened) {
            color = flash ? "#ef4444" : "#1e1b4b"; // flashing red/indigo
            this.ctx.shadowColor = flash ? "#f87171" : "#818cf8";
        } else {
            this.ctx.shadowColor = ghost.color;
        }

        // Draw Ghost Skirt Body
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(gx, gy - 2, r, Math.PI, 0, false); // Top dome
        
        // Body sides down
        this.ctx.lineTo(gx + r, gy + r - 3);
        
        // Bottom wiggling wave skirt
        const waveCount = 3;
        const waveWidth = (r * 2) / waveCount;
        const waveHeight = 3;
        const phase = Math.floor(Date.now() / 150) % 2 === 0 ? waveHeight : -waveHeight;
        
        for (let i = 0; i < waveCount; i++) {
            const xOffset = gx + r - i * waveWidth;
            this.ctx.quadraticCurveTo(
                xOffset - waveWidth / 2,
                gy + r + (i % 2 === 0 ? phase : -phase),
                xOffset - waveWidth,
                gy + r - 3
            );
        }
        
        this.ctx.lineTo(gx - r, gy - 2);
        this.ctx.closePath();
        this.ctx.fill();

        // Eyes
        this.drawGhostEyes(gx, gy, ghost.direction, frightened, flash);
        
        this.ctx.restore();
    }

    drawGhostEyes(gx, gy, direction, frightened, flash) {
        const dirVectors = DIRS[direction] || { x: 0, y: 0 };
        
        this.ctx.fillStyle = frightened ? (flash ? "white" : "#fb7185") : "white";
        
        // Left Eye oval
        this.ctx.beginPath();
        this.ctx.ellipse(gx - 4 + dirVectors.x * 2, gy - 3 + dirVectors.y * 2, 3.5, 4.5, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Right Eye oval
        this.ctx.beginPath();
        this.ctx.ellipse(gx + 4 + dirVectors.x * 2, gy - 3 + dirVectors.y * 2, 3.5, 4.5, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Pupils
        this.ctx.fillStyle = frightened ? (flash ? "#0f172a" : "white") : "#2563eb";
        
        if (frightened) {
            // Little dot eyes
            this.ctx.beginPath();
            this.ctx.arc(gx - 4, gy - 2, 1.5, 0, Math.PI * 2);
            this.ctx.arc(gx + 4, gy - 2, 1.5, 0, Math.PI * 2);
            this.ctx.fill();
        } else {
            // Looking pupils
            this.ctx.beginPath();
            this.ctx.arc(gx - 4 + dirVectors.x * 3, gy - 3 + dirVectors.y * 3, 2, 0, Math.PI * 2);
            this.ctx.arc(gx + 4 + dirVectors.x * 3, gy - 3 + dirVectors.y * 3, 2, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawDsaVectors(ghosts) {
        this.ctx.save();
        for (const ghost of ghosts) {
            if (ghost.mode === "FRIGHTENED" || !ghost.path || ghost.path.length <= 1) continue;

            this.ctx.strokeStyle = ghost.color;
            this.ctx.lineWidth = 1.5;
            this.ctx.globalAlpha = 0.45;
            this.ctx.setLineDash([4, 4]); // Dashed paths

            // Draw line through BFS path steps
            this.ctx.beginPath();
            this.ctx.moveTo(ghost.x * TILE + TILE / 2, ghost.y * TILE + TILE / 2);
            for (let i = 1; i < ghost.path.length; i++) {
                const node = ghost.path[i];
                this.ctx.lineTo(node.x * TILE + TILE / 2, node.y * TILE + TILE / 2);
            }
            this.ctx.stroke();

            // Draw target node indicator circle
            this.ctx.fillStyle = ghost.color;
            this.ctx.globalAlpha = 0.7;
            this.ctx.beginPath();
            const tx = ghost.targetCell.x * TILE + TILE / 2;
            const ty = ghost.targetCell.y * TILE + TILE / 2;
            this.ctx.arc(tx, ty, 5, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw a box around target
            this.ctx.strokeStyle = ghost.color;
            this.ctx.strokeRect(ghost.targetCell.x * TILE + 2, ghost.targetCell.y * TILE + 2, TILE - 4, TILE - 4);
        }
        this.ctx.restore();
    }

    drawParticles() {
        this.ctx.save();
        for (const p of this.particles) {
            this.ctx.globalAlpha = p.alpha;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.restore();
    }

    drawPopups() {
        this.ctx.save();
        this.ctx.font = "bold 9px 'Courier New', monospace";
        this.ctx.textAlign = "center";
        for (const popup of this.popups) {
            this.ctx.globalAlpha = popup.alpha;
            this.ctx.fillStyle = popup.color;
            this.ctx.fillText(popup.text, popup.x, popup.y);
        }
        this.ctx.restore();
    }
}
