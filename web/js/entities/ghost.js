import { DIRS, OPPOSITE_DIR } from "../data/maze.js";

export class Ghost {
    constructor(name, startX, startY, color, scatterTarget) {
        this.name = name;
        this.startX = startX;
        this.startY = startY;
        this.x = startX;
        this.y = startY;
        this.targetX = startX;
        this.targetY = startY;
        this.color = color;
        this.scatterTarget = scatterTarget; // {x, y}
        
        this.direction = "Left";
        this.speed = 3.0;
        this.isMoving = false;
        
        // Ghost state: 'CHASE' | 'SCATTER' | 'FRIGHTENED' | 'EATEN'
        this.mode = "SCATTER";
        this.lastMode = "SCATTER";
        this.path = []; // Cached path for visualization
        this.targetCell = { x: 0, y: 0 }; // Current calculated target
    }

    reset() {
        this.x = this.startX;
        this.y = this.startY;
        this.targetX = this.startX;
        this.targetY = this.startY;
        this.direction = "Left";
        this.mode = "SCATTER";
        this.lastMode = "SCATTER";
        this.path = [];
    }

    setSpeed(speed) {
        this.speed = speed;
    }

    // Determine target based on ghost personality
    calculateTarget(pacman, blinky, graph) {
        if (this.mode === "SCATTER") {
            return this.scatterTarget;
        }
        if (this.mode === "EATEN") {
            return { x: 9, y: 7 }; // Center/house spawn
        }

        // CHASE Modes
        switch (this.name) {
            case "Blinky":
                // Direct pursuit
                return { x: Math.round(pacman.x), y: Math.round(pacman.y) };

            case "Pinky":
                // Target 4 tiles ahead of Pacman
                const pDir = DIRS[pacman.currentDir];
                return {
                    x: Math.round(pacman.x + pDir.x * 4),
                    y: Math.round(pacman.y + pDir.y * 4)
                };

            case "Inky":
                // Flanking: Vector from Blinky to (Pacman + 2 tiles ahead), doubled
                const pDir2 = DIRS[pacman.currentDir];
                const targetPivot = {
                    x: Math.round(pacman.x + pDir2.x * 2),
                    y: Math.round(pacman.y + pDir2.y * 2)
                };
                return {
                    x: targetPivot.x * 2 - Math.round(blinky.x),
                    y: targetPivot.y * 2 - Math.round(blinky.y)
                };

            case "Clyde":
                // Distance check: Chase if distance > 8, else Scatter
                const dx = this.x - pacman.x;
                const dy = this.y - pacman.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 8) {
                    return { x: Math.round(pacman.x), y: Math.round(pacman.y) };
                } else {
                    return this.scatterTarget;
                }
            default:
                return { x: 9, y: 7 };
        }
    }

    update(dt, graph, state, pacman, blinky) {
        // Mode check from GameState frightened state
        const frightened = state.isFrightened();
        
        if (frightened && this.mode !== "EATEN" && this.mode !== "FRIGHTENED") {
            this.lastMode = this.mode;
            this.mode = "FRIGHTENED";
            // Reverse direction immediately on entering frightened mode
            this.direction = OPPOSITE_DIR[this.direction] || this.direction;
            const dir = DIRS[this.direction];
            this.targetX = Math.round(this.x + dir.x);
            this.targetY = Math.round(this.y + dir.y);
            if (!graph.walkable(this.targetX, this.targetY)) {
                this.targetX = Math.round(this.x);
                this.targetY = Math.round(this.y);
            }
        } else if (!frightened && this.mode === "FRIGHTENED") {
            this.mode = this.lastMode;
        }

        // Speed modifications
        let currentSpeed = this.speed;
        if (this.mode === "FRIGHTENED") {
            currentSpeed = this.speed * 0.5;
        } else if (this.mode === "EATEN") {
            currentSpeed = this.speed * 2.5; // fly back to base super fast
        }

        // Center check & intersection steering
        if (this.x === this.targetX && this.y === this.targetY) {
            // Re-spawn check
            if (this.mode === "EATEN" && this.x === 9 && this.y === 7) {
                this.mode = "CHASE";
                this.path = [];
            }

            // Calculate targets
            this.targetCell = this.calculateTarget(pacman, blinky, graph);

            // Fetch legal neighbors, prevent turning backward in CHASE/SCATTER/EATEN
            const neighbors = graph.neighbors(this.x, this.y);
            const legalMoves = neighbors.filter(node => {
                // Prevent going backward unless it is the only option
                const dx = node.x - this.x;
                const dy = node.y - this.y;
                let moveDir = "";
                for (const [key, val] of Object.entries(DIRS)) {
                    if (val.x === dx && val.y === dy) {
                        moveDir = key;
                        break;
                    }
                }
                return moveDir !== OPPOSITE_DIR[this.direction];
            });

            const choices = legalMoves.length > 0 ? legalMoves : neighbors;

            if (choices.length > 0) {
                let nextNode = choices[0];

                if (this.mode === "FRIGHTENED") {
                    // Choose randomly
                    nextNode = choices[Math.floor(Math.random() * choices.length)];
                    this.path = [nextNode];
                } else {
                    // Shortest path to calculated target
                    let bestDist = Infinity;
                    for (const node of choices) {
                        const dx = node.x - this.targetCell.x;
                        const dy = node.y - this.targetCell.y;
                        const d = dx * dx + dy * dy; // square distance to target
                        if (d < bestDist) {
                            bestDist = d;
                            nextNode = node;
                        }
                    }

                    // Store path vector list for DSA visualization
                    this.path = graph.shortestPath({ x: this.x, y: this.y }, this.targetCell);
                }

                // Convert nextNode choice to direction
                const dx = nextNode.x - this.x;
                const dy = nextNode.y - this.y;
                for (const [key, val] of Object.entries(DIRS)) {
                    if (val.x === dx && val.y === dy) {
                        this.direction = key;
                        break;
                    }
                }

                this.targetX = nextNode.x;
                this.targetY = nextNode.y;
                this.isMoving = true;
            } else {
                this.isMoving = false;
            }
        }

        if (this.isMoving) {
            const step = currentSpeed * dt;
            const dir = DIRS[this.direction];

            this.x += dir.x * step;
            this.y += dir.y * step;

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
