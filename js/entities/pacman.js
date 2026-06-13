import { DIRS, TILE } from "../data/maze.js";

export class Pacman {
    constructor(startX, startY, speed) {
        this.startX = startX;
        this.startY = startY;
        this.x = startX;
        this.y = startY;
        
        this.targetX = startX;
        this.targetY = startY;
        
        this.currentDir = "Left";
        this.nextDir = null;
        this.speed = speed;
        this.isMoving = false;
        
        // Mouth animation
        this.mouthAngle = 0;
        this.mouthOpening = true;
    }

    reset() {
        this.x = this.startX;
        this.y = this.startY;
        this.targetX = this.startX;
        this.targetY = this.startY;
        this.currentDir = "Left";
        this.nextDir = null;
        this.isMoving = false;
        this.mouthAngle = 0;
    }

    setSpeed(speed) {
        this.speed = speed;
    }

    canMove(dirName, graph) {
        const dir = DIRS[dirName];
        if (!dir) return false;
        
        let tx = this.x + dir.x;
        let ty = this.y + dir.y;
        
        // Wrap-around paths are walkable
        if (ty === 7 || ty === 8) {
            if (tx < 0 || tx >= graph.width) {
                return true;
            }
        }
        
        return graph.walkable(tx, ty);
    }

    update(dt, graph, state) {
        // Animate mouth
        if (this.isMoving) {
            const deltaMouth = 240 * dt; // speed of jaw wiggling
            if (this.mouthOpening) {
                this.mouthAngle += deltaMouth;
                if (this.mouthAngle >= 45) {
                    this.mouthAngle = 45;
                    this.mouthOpening = false;
                }
            } else {
                this.mouthAngle -= deltaMouth;
                if (this.mouthAngle <= 0) {
                    this.mouthAngle = 0;
                    this.mouthOpening = true;
                }
            }
        }

        // Check intersection and move
        if (this.x === this.targetX && this.y === this.targetY) {
            // Read direction buffer
            if (this.nextDir && this.canMove(this.nextDir, graph)) {
                this.currentDir = this.nextDir;
                this.nextDir = null;
                state.stats.efficientKeypresses++;
            }
            
            if (this.canMove(this.currentDir, graph)) {
                const dir = DIRS[this.currentDir];
                this.targetX = this.x + dir.x;
                this.targetY = this.y + dir.y;
                this.isMoving = true;
            } else {
                this.isMoving = false;
            }
        }

        if (this.isMoving) {
            const step = this.speed * dt;
            const dir = DIRS[this.currentDir];
            
            this.x += dir.x * step;
            this.y += dir.y * step;
            
            // Check if we passed the target
            const overshotX = (dir.x > 0 && this.x >= this.targetX) || (dir.x < 0 && this.x <= this.targetX) || dir.x === 0;
            const overshotY = (dir.y > 0 && this.y >= this.targetY) || (dir.y < 0 && this.y <= this.targetY) || dir.y === 0;
            
            if (overshotX && overshotY) {
                this.x = this.targetX;
                this.y = this.targetY;
                
                // Wrap wrap-around cells
                if (this.x < 0) {
                    this.x = graph.width - 1;
                    this.targetX = graph.width - 1;
                } else if (this.x >= graph.width) {
                    this.x = 0;
                    this.targetX = 0;
                }
            }
        }
    }
}
