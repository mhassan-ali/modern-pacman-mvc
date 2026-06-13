import { WALL, DIRS } from "../data/maze.js";

/**
 * Grid-backed graph for walkable maze cells.
 * Uses string representation "x,y" for node sets and pathfinding collections.
 */
export class MazeGraph {
    constructor(rows) {
        this.rows = rows;
        this.height = rows.length;
        this.width = rows[0].length;
        this.nodes = new Set();

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (rows[y][x] !== WALL) {
                    this.nodes.add(this.toKey(x, y));
                }
            }
        }
    }

    toKey(x, y) {
        return `${x},${y}`;
    }

    fromKey(key) {
        const [x, y] = key.split(",").map(Number);
        return { x, y };
    }

    walkable(x, y) {
        // Support wrap-around horizontally for Pacman if we want wrap behavior
        // But for wall collisions, let's keep within grid
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
        return this.nodes.has(this.toKey(x, y));
    }

    neighbors(x, y) {
        const result = [];
        for (const dir of Object.values(DIRS)) {
            const nx = x + dir.x;
            const ny = y + dir.y;
            if (this.walkable(nx, ny)) {
                result.push({ x: nx, y: ny });
            }
        }
        return result;
    }

    /**
     * Finds shortest path using Breadth-First Search (BFS).
     * Returns an array of node objects [{x, y}, ...] from start to goal.
     */
    shortestPath(start, goal) {
        const startKey = this.toKey(start.x, start.y);
        const goalKey = this.toKey(goal.x, goal.y);

        if (startKey === goalKey) {
            return [start];
        }

        const queue = [startKey];
        const visited = new Set([startKey]);
        const parent = {}; // childKey -> parentKey

        let found = false;

        while (queue.length > 0) {
            const currentKey = queue.shift();
            const current = this.fromKey(currentKey);

            const neighbors = this.neighbors(current.x, current.y);
            for (const nxt of neighbors) {
                const nxtKey = this.toKey(nxt.x, nxt.y);
                if (visited.has(nxtKey)) continue;

                parent[nxtKey] = currentKey;

                if (nxtKey === goalKey) {
                    found = true;
                    break;
                }

                visited.add(nxtKey);
                queue.push(nxtKey);
            }

            if (found) break;
        }

        if (!found) {
            return [start]; // Path not found, return start node
        }

        // Reconstruct path
        const path = [];
        let currKey = goalKey;
        while (currKey !== startKey) {
            path.push(this.fromKey(currKey));
            currKey = parent[currKey];
        }
        path.push(start);
        path.reverse();

        return path;
    }
}
