export const TILE = 30;
export const HUD_HEIGHT = 100;
export const BOARD_BG = "#070817";
export const PANEL_BG = "rgba(16, 24, 39, 0.85)";

export const WALL = "#";
export const PELLET = ".";
export const POWER = "o";
export const EMPTY = " ";

export const MAZE = [
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
];

export const LEVELS = {
    "Easy": {
        time_limit: 120,
        player_speed: 4.5, // tiles per second
        ghost_speed: 2.8,
        chase_probability: 0.45,
        frightened_seconds: 8,
    },
    "Medium": {
        time_limit: 90,
        player_speed: 5.2,
        ghost_speed: 3.8,
        chase_probability: 0.70,
        frightened_seconds: 7,
    },
    "Hard": {
        time_limit: 60,
        player_speed: 6.0,
        ghost_speed: 4.8,
        chase_probability: 0.92,
        frightened_seconds: 5,
    },
};

export const DIRS = {
    "Up": { x: 0, y: -1 },
    "Down": { x: 0, y: 1 },
    "Left": { x: -1, y: 0 },
    "Right": { x: 1, y: 0 },
};

export const OPPOSITE_DIR = {
    "Up": "Down",
    "Down": "Up",
    "Left": "Right",
    "Right": "Left",
};

export const KEY_TO_DIR = {
    "ArrowUp": "Up",
    "ArrowDown": "Down",
    "ArrowLeft": "Left",
    "ArrowRight": "Right",
    "KeyW": "Up",
    "KeyS": "Down",
    "KeyA": "Left",
    "KeyD": "Right",
    "w": "Up",
    "s": "Down",
    "a": "Left",
    "d": "Right",
    "W": "Up",
    "S": "Down",
    "A": "Left",
    "D": "Right"
};
