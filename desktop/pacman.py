import random
import time
import tkinter as tk
from collections import deque
from dataclasses import dataclass


TILE = 30
HUD_HEIGHT = 124
BOARD_BG = "#070817"
PANEL_BG = "#101827"
TEXT = "#f8fafc"
MUTED = "#9ca3af"
ACCENT = "#facc15"

WALL = "#"
PELLET = "."
POWER = "o"
EMPTY = " "

MAZE = [
    "###################",
    "#........#........#",
    "#.###.##.#.##.###.#",
    "#o#.....   .....#o#",
    "#.###.#.###.#.###.#",
    "#.....#..#..#.....#",
    "#####.## # ##.#####",
    "    #.#     #.#    ",
    "#####.# ##  #.#####",
    "#.........#.......#",
    "#.###.###.#.###.###",
    "#o..#..... .....#o#",
    "###.#.#.###.#.#.###",
    "#.....#..#..#.....#",
    "#.#######.#######.#",
    "#.................#",
    "###################",
]

LEVELS = {
    "Easy": {
        "time_limit": 120,
        "player_delay": 125,
        "ghost_delay": 430,
        "chase_probability": 0.45,
        "frightened_seconds": 8,
    },
    "Medium": {
        "time_limit": 90,
        "player_delay": 110,
        "ghost_delay": 320,
        "chase_probability": 0.70,
        "frightened_seconds": 7,
    },
    "Hard": {
        "time_limit": 60,
        "player_delay": 95,
        "ghost_delay": 230,
        "chase_probability": 0.92,
        "frightened_seconds": 5,
    },
}

DIRS = {
    "Up": (0, -1),
    "Down": (0, 1),
    "Left": (-1, 0),
    "Right": (1, 0),
}

KEY_TO_DIR = {
    "Up": "Up",
    "Down": "Down",
    "Left": "Left",
    "Right": "Right",
    "w": "Up",
    "s": "Down",
    "a": "Left",
    "d": "Right",
    "W": "Up",
    "S": "Down",
    "A": "Left",
    "D": "Right",
}


@dataclass
class Ghost:
    name: str
    start: tuple[int, int]
    color: str
    pos: tuple[int, int]
    direction: str = "Left"


class MazeGraph:
    """Grid-backed graph with BFS pathfinding over walkable cells."""

    def __init__(self, rows: list[str]):
        self.rows = rows
        self.height = len(rows)
        self.width = len(rows[0])
        self.nodes = {
            (x, y)
            for y, row in enumerate(rows)
            for x, cell in enumerate(row)
            if cell != WALL
        }

    def walkable(self, pos: tuple[int, int]) -> bool:
        return pos in self.nodes

    def neighbors(self, pos: tuple[int, int]) -> list[tuple[int, int]]:
        x, y = pos
        result = []
        for dx, dy in DIRS.values():
            nxt = (x + dx, y + dy)
            if self.walkable(nxt):
                result.append(nxt)
        return result

    def shortest_path(self, start: tuple[int, int], goal: tuple[int, int]) -> list[tuple[int, int]]:
        if start == goal:
            return [start]

        queue = deque([start])
        visited = {start}
        parent: dict[tuple[int, int], tuple[int, int]] = {}

        while queue:
            current = queue.popleft()
            for nxt in self.neighbors(current):
                if nxt in visited:
                    continue
                parent[nxt] = current
                if nxt == goal:
                    return self._reconstruct_path(parent, start, goal)
                visited.add(nxt)
                queue.append(nxt)

        return [start]

    @staticmethod
    def _reconstruct_path(
        parent: dict[tuple[int, int], tuple[int, int]],
        start: tuple[int, int],
        goal: tuple[int, int],
    ) -> list[tuple[int, int]]:
        path = [goal]
        current = goal
        while current != start:
            current = parent[current]
            path.append(current)
        path.reverse()
        return path


class PacManGame:
    def __init__(self) -> None:
        self.root = tk.Tk()
        self.root.title("Python Pac-Man - DSA Edition")
        self.graph = MazeGraph(MAZE)
        self.canvas = tk.Canvas(
            self.root,
            width=self.graph.width * TILE,
            height=self.graph.height * TILE + HUD_HEIGHT,
            bg=BOARD_BG,
            highlightthickness=0,
        )
        self.canvas.pack()
        self.root.resizable(False, False)
        self.root.bind("<KeyPress>", self.on_key)

        self.level_name = "Easy"
        self.level = LEVELS[self.level_name]
        self.after_ids: list[str] = []
        self.running = False
        self.game_over = False
        self.message = "Choose a level, then press Space to start."

        self.reset_state()
        self.draw()

    def reset_state(self) -> None:
        self.cancel_timers()
        self.grid = [list(row) for row in MAZE]
        self.pacman = (9, 11)
        self.direction = "Left"
        self.next_direction = "Left"
        self.score = 0
        self.lives = 3
        self.start_time = time.monotonic()
        self.remaining_time = self.level["time_limit"]
        self.frightened_until = 0.0
        self.ghosts = [
            Ghost("Blinky", (9, 7), "#ff3b30", (9, 7), "Left"),
            Ghost("Pinky", (8, 8), "#ff7bd5", (8, 8), "Right"),
            Ghost("Inky", (10, 8), "#00d7ff", (10, 8), "Left"),
        ]
        self.pellet_count = sum(row.count(PELLET) + row.count(POWER) for row in self.grid)
        self.running = False
        self.game_over = False

    def cancel_timers(self) -> None:
        for after_id in getattr(self, "after_ids", []):
            try:
                self.root.after_cancel(after_id)
            except tk.TclError:
                pass
        self.after_ids = []

    def start(self) -> None:
        if self.running:
            return
        if self.game_over:
            self.reset_state()
        self.running = True
        self.game_over = False
        self.start_time = time.monotonic()
        self.message = ""
        self.schedule_player()
        self.schedule_ghosts()
        self.schedule_timer()
        self.draw()

    def set_level(self, name: str) -> None:
        self.level_name = name
        self.level = LEVELS[name]
        self.message = f"{name} selected. Press Space to start."
        self.reset_state()
        self.draw()

    def on_key(self, event: tk.Event) -> None:
        key = event.keysym if event.keysym in KEY_TO_DIR else event.char
        if key in KEY_TO_DIR:
            self.next_direction = KEY_TO_DIR[key]
        elif event.char == "1":
            self.set_level("Easy")
        elif event.char == "2":
            self.set_level("Medium")
        elif event.char == "3":
            self.set_level("Hard")
        elif event.keysym == "space":
            self.start()
        elif event.char in {"r", "R"}:
            self.message = f"{self.level_name} restarted. Press Space to start."
            self.reset_state()
            self.draw()

    def schedule_player(self) -> None:
        self.after_ids.append(self.root.after(self.level["player_delay"], self.move_player))

    def schedule_ghosts(self) -> None:
        self.after_ids.append(self.root.after(self.level["ghost_delay"], self.move_ghosts))

    def schedule_timer(self) -> None:
        self.after_ids.append(self.root.after(250, self.update_timer))

    def move_player(self) -> None:
        if not self.running:
            return

        if self.can_move(self.pacman, self.next_direction):
            self.direction = self.next_direction
        if self.can_move(self.pacman, self.direction):
            self.pacman = self.next_pos(self.pacman, self.direction)

        self.eat_current_cell()
        self.check_collisions()
        self.draw()

        if self.running:
            self.schedule_player()

    def move_ghosts(self) -> None:
        if not self.running:
            return

        for ghost in self.ghosts:
            ghost.pos = self.choose_ghost_move(ghost)
        self.check_collisions()
        self.draw()

        if self.running:
            self.schedule_ghosts()

    def choose_ghost_move(self, ghost: Ghost) -> tuple[int, int]:
        neighbors = self.graph.neighbors(ghost.pos)
        if not neighbors:
            return ghost.pos

        frightened = time.monotonic() < self.frightened_until
        chase = random.random() < self.level["chase_probability"]

        if frightened:
            return max(neighbors, key=lambda pos: self.manhattan(pos, self.pacman))

        if chase:
            path = self.graph.shortest_path(ghost.pos, self.pacman)
            if len(path) > 1:
                return path[1]

        return random.choice(neighbors)

    def update_timer(self) -> None:
        if not self.running:
            return

        elapsed = int(time.monotonic() - self.start_time)
        self.remaining_time = max(0, self.level["time_limit"] - elapsed)
        if self.remaining_time <= 0:
            self.end_game(False, "Time is up!")
            return

        self.draw()
        self.schedule_timer()

    def eat_current_cell(self) -> None:
        x, y = self.pacman
        cell = self.grid[y][x]
        if cell == PELLET:
            self.grid[y][x] = EMPTY
            self.score += 10
            self.pellet_count -= 1
        elif cell == POWER:
            self.grid[y][x] = EMPTY
            self.score += 50
            self.pellet_count -= 1
            self.frightened_until = time.monotonic() + self.level["frightened_seconds"]

        if self.pellet_count == 0:
            self.end_game(True, "You cleared the maze!")

    def check_collisions(self) -> None:
        if not self.running:
            return

        frightened = time.monotonic() < self.frightened_until
        for ghost in self.ghosts:
            if ghost.pos != self.pacman:
                continue
            if frightened:
                self.score += 200
                ghost.pos = ghost.start
            else:
                self.lives -= 1
                if self.lives <= 0:
                    self.end_game(False, "No lives left!")
                else:
                    self.pacman = (9, 11)
                    for item in self.ghosts:
                        item.pos = item.start
                    self.message = "Caught! Keep going."
                return

    def end_game(self, won: bool, reason: str) -> None:
        self.running = False
        self.game_over = True
        self.cancel_timers()
        status = "You win" if won else "Game over"
        self.message = f"{status}: {reason} Press R to restart."
        self.draw()

    def can_move(self, pos: tuple[int, int], direction: str) -> bool:
        return self.graph.walkable(self.next_pos(pos, direction))

    @staticmethod
    def next_pos(pos: tuple[int, int], direction: str) -> tuple[int, int]:
        dx, dy = DIRS[direction]
        return pos[0] + dx, pos[1] + dy

    @staticmethod
    def manhattan(a: tuple[int, int], b: tuple[int, int]) -> int:
        return abs(a[0] - b[0]) + abs(a[1] - b[1])

    def draw(self) -> None:
        self.canvas.delete("all")
        self.draw_background()
        self.draw_hud()
        self.draw_maze()
        self.draw_actors()
        if self.message:
            self.draw_message()

    def draw_background(self) -> None:
        width = self.graph.width * TILE
        height = self.graph.height * TILE + HUD_HEIGHT
        self.canvas.create_rectangle(0, 0, width, height, fill=BOARD_BG, outline="")
        for i in range(0, height, 18):
            shade = "#080a1c" if (i // 18) % 2 == 0 else "#070817"
            self.canvas.create_rectangle(0, i, width, i + 18, fill=shade, outline="")

    def draw_hud(self) -> None:
        width = self.graph.width * TILE
        self.canvas.create_rectangle(0, 0, width, HUD_HEIGHT, fill=PANEL_BG, outline="")
        self.canvas.create_line(0, HUD_HEIGHT - 1, width, HUD_HEIGHT - 1, fill="#23314d", width=2)
        self.canvas.create_text(
            18,
            18,
            text="PAC-MAN",
            fill=ACCENT,
            anchor="w",
            font=("Segoe UI Black", 21, "bold"),
        )
        self.canvas.create_text(
            160,
            23,
            text="DSA Edition",
            fill="#38bdf8",
            anchor="w",
            font=("Segoe UI", 11, "bold"),
        )
        self.draw_stat_card(18, 52, 118, "SCORE", str(self.score), "#38bdf8")
        self.draw_stat_card(148, 52, 106, "LIVES", "x" + str(self.lives), "#fb7185")
        self.draw_stat_card(266, 52, 106, "TIME", f"{self.remaining_time}s", ACCENT)
        self.draw_stat_card(384, 52, 166, "LEVEL", self.level_name.upper(), "#34d399")
        self.draw_timer_bar(18, 105, width - 36)
        self.draw_level_badges(width - 220, 18)

    def draw_stat_card(self, x: int, y: int, width: int, label: str, value: str, color: str) -> None:
        self.canvas.create_rectangle(x, y, x + width, y + 38, fill="#172033", outline="#263852", width=1)
        self.canvas.create_text(x + 10, y + 10, text=label, fill=MUTED, anchor="w", font=("Segoe UI", 8, "bold"))
        self.canvas.create_text(x + 10, y + 26, text=value, fill=color, anchor="w", font=("Segoe UI", 12, "bold"))

    def draw_timer_bar(self, x: int, y: int, width: int) -> None:
        pct = self.remaining_time / self.level["time_limit"]
        fill_width = max(0, int(width * pct))
        color = "#22c55e" if pct > 0.45 else "#f97316" if pct > 0.2 else "#ef4444"
        self.canvas.create_rectangle(x, y, x + width, y + 9, fill="#1f2937", outline="")
        self.canvas.create_rectangle(x, y, x + fill_width, y + 9, fill=color, outline="")

    def draw_level_badges(self, x: int, y: int) -> None:
        for i, name in enumerate(("Easy", "Medium", "Hard")):
            x0 = x + i * 72
            active = name == self.level_name
            fill = "#facc15" if active else "#1f2937"
            text = "#111827" if active else "#cbd5e1"
            self.canvas.create_rectangle(x0, y, x0 + 62, y + 24, fill=fill, outline="#334155")
            self.canvas.create_text(x0 + 31, y + 12, text=name, fill=text, font=("Segoe UI", 8, "bold"))

    def draw_maze(self) -> None:
        for y, row in enumerate(self.grid):
            for x, cell in enumerate(row):
                x0 = x * TILE
                y0 = y * TILE + HUD_HEIGHT
                x1 = x0 + TILE
                y1 = y0 + TILE
                if MAZE[y][x] == WALL:
                    self.canvas.create_rectangle(x0, y0, x1, y1, fill="#172554", outline="#1d4ed8")
                    self.canvas.create_rectangle(x0 + 4, y0 + 4, x1 - 4, y1 - 4, fill="#1e40af", outline="#2563eb")
                elif cell == PELLET:
                    self.canvas.create_oval(
                        x0 + 12,
                        y0 + 12,
                        x1 - 12,
                        y1 - 12,
                        fill="#e5e7eb",
                        outline="",
                    )
                elif cell == POWER:
                    self.canvas.create_oval(x0 + 5, y0 + 5, x1 - 5, y1 - 5, fill="#78350f", outline="")
                    self.canvas.create_oval(
                        x0 + 8,
                        y0 + 8,
                        x1 - 8,
                        y1 - 8,
                        fill="#fde68a",
                        outline="",
                    )

    def draw_actors(self) -> None:
        self.draw_pacman()
        frightened = time.monotonic() < self.frightened_until
        for ghost in self.ghosts:
            self.draw_ghost(ghost, frightened)

    def draw_pacman(self) -> None:
        x, y = self.pacman
        x0 = x * TILE + 4
        y0 = y * TILE + HUD_HEIGHT + 4
        x1 = x0 + TILE - 8
        y1 = y0 + TILE - 8
        start_angles = {"Right": 35, "Up": 125, "Left": 215, "Down": 305}
        self.canvas.create_oval(x0 + 2, y0 + 3, x1 + 2, y1 + 3, fill="#3f3100", outline="")
        self.canvas.create_arc(
            x0,
            y0,
            x1,
            y1,
            start=start_angles[self.direction],
            extent=290,
            fill="#facc15",
            outline="#facc15",
        )
        self.canvas.create_oval(x0 + 12, y0 + 6, x0 + 16, y0 + 10, fill="#111827", outline="")

    def draw_ghost(self, ghost: Ghost, frightened: bool) -> None:
        x, y = ghost.pos
        x0 = x * TILE + 4
        y0 = y * TILE + HUD_HEIGHT + 5
        x1 = x0 + TILE - 8
        y1 = y0 + TILE - 8
        color = "#312e81" if frightened else ghost.color
        self.canvas.create_oval(x0 + 2, y1 - 3, x1 + 2, y1 + 6, fill="#020617", outline="")
        self.canvas.create_arc(x0, y0, x1, y1 + 10, start=0, extent=180, fill=color, outline=color)
        self.canvas.create_rectangle(x0, y0 + (TILE // 2) - 2, x1, y1, fill=color, outline=color)
        for i in range(3):
            wx = x0 + 2 + i * 7
            self.canvas.create_polygon(wx, y1, wx + 4, y1 - 5, wx + 8, y1, fill="#05050b", outline="")
        self.canvas.create_oval(x0 + 5, y0 + 7, x0 + 10, y0 + 12, fill="white", outline="")
        self.canvas.create_oval(x1 - 10, y0 + 7, x1 - 5, y0 + 12, fill="white", outline="")

    def draw_message(self) -> None:
        width = self.graph.width * TILE
        y = HUD_HEIGHT + self.graph.height * TILE // 2
        self.canvas.create_rectangle(34, y - 76, width - 34, y + 78, fill="#020617", outline="#facc15", width=2)
        self.canvas.create_text(
            width // 2,
            y - 42,
            text="READY?",
            fill=ACCENT,
            font=("Segoe UI Black", 22, "bold"),
        )
        self.canvas.create_text(
            width // 2,
            y - 6,
            text=self.message,
            fill=TEXT,
            font=("Segoe UI", 12, "bold"),
            width=width - 90,
        )
        self.canvas.create_text(
            width // 2,
            y + 34,
            text="Arrow keys/WASD move   1 Easy   2 Medium   3 Hard   R Restart",
            fill=MUTED,
            font=("Segoe UI", 9),
            width=width - 90,
        )

    def run(self) -> None:
        self.root.mainloop()


if __name__ == "__main__":
    PacManGame().run()
