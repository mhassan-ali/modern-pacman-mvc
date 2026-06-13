import { GameState } from "./engine/state.js";
import { AudioManager } from "./view/audio.js";
import { CanvasRenderer } from "./view/renderer.js";
import { UIManager } from "./view/ui.js";
import { Game } from "./engine/game.js";

document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("game-canvas");
    
    // Initialize components
    const state = new GameState();
    const audio = new AudioManager();
    const game = new Game(canvas, state, audio);
    const renderer = new CanvasRenderer(canvas);
    const ui = new UIManager(state, audio, game);

    // Wire dependencies
    game.setRenderer(renderer);
    game.setUIManager(ui);

    // Initial render
    game.resetEntities();
    ui.updateHUD();
    ui.showStartScreen();
    
    // Start central gameloop thread
    game.lastTime = performance.now();
    game.gameLoop(performance.now());
});
