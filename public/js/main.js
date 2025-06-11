// js/main.js - Adapted for multiplayer

import { getState, initializeState, updateRemotePlayerShips } from './state/gameState.js';
import { setCanvasDimensions } from './state/stateModifiers.js';
import * as inputHandler from './input/inputHandler.js';
import * as physicsUpdater from './physics/physicsUpdater.js';
import * as renderer from './rendering/renderer.js';
import * as hudManager from './hud/hudManager.js';


// --- Global Scope Variables ---\nlet canvas = null;
let ctx = null;
let lastTimestamp = 0;
let isGameLoopRunning = false;
let animationFrameId = null;


// --- Resize Handling ---\nfunction handleResize() {
    const canvasContainer = document.getElementById('canvas-container');
    if (!canvas || !canvasContainer) {
        return;
    }

    // Get the dimensions of the container div
    const newWidth = canvasContainer.clientWidth;
    const newHeight = canvasContainer.clientHeight;
    
    // Set the canvas drawing buffer size
    canvas.width = newWidth;
    canvas.height = newHeight;

    // Update the game state with the new dimensions
    setCanvasDimensions(newWidth, newHeight);

    // console.log(`[Main] Canvas resized to: ${newWidth}x${newHeight}`);
}


// --- Initialization Function (Called by network.js after successful join) ---\nexport function initializeGame(initialWorldData = {}, authoritativeLocalPlayerData = null) {

    if (isGameLoopRunning) {
        console.warn("initializeGame called while game loop already running. Resetting...");
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        isGameLoopRunning = false;
    }
    console.log("--- Main.js: Starting Game Initialization (called by network.js) ---");


    canvas = document.getElementById('gameCanvas');
    if (!canvas) { console.error("FATAL: Canvas element not found!"); return; }
    ctx = canvas.getContext('2d');
    if (!ctx) { console.error("FATAL: Failed to get 2D context!"); return; }

    // Set initial size and set up the resize listener
    handleResize(); // Set initial size correctly
    window.addEventListener('resize', handleResize);


    // --- Initialize Modules (Order Matters!) ---\n    // 1. Initialize State: Pass authoritative data from server.
    initializeState(canvas.width, canvas.height, {}, initialWorldData, authoritativeLocalPlayerData);
    console.log("   Client Game State Initialized.");


    // 2. Initialize Renderer
    if (!renderer.initializeRenderer(ctx)) {
        console.error("FATAL: Renderer initialization failed."); return;
    }
    console.log("   Renderer Initialized.");


    // 3. Initialize HUD
    if (!hudManager.initializeHUD()) {
        console.warn("HUD Manager initialization. Failed.");
    } else {
        console.log("   HUD Initialized.");
    }


    // 4. Initialize Input Handlers
    inputHandler.setupInputListeners(canvas);
    console.log("   Input Listeners Set Up.");


    console.log("--- Main.js: Initialization Complete, Starting Game Loop ---");
    lastTimestamp = performance.now();
    isGameLoopRunning = true;
    
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(gameLoop);
}


// --- Main Game Loop ---\nfunction gameLoop(timestamp) {
    if (!isGameLoopRunning || !ctx) {
        if (isGameLoopRunning && animationFrameId) cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        return;
    }


    const deltaTime = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;
    
    // --- THE FIX: Handle browser tab pausing ---
    // If deltaTime is huge (e.g., >250ms), the tab was likely inactive.
    // Skip this frame's physics update to prevent entities from "teleporting".
    // Just render the last known state and continue.
    const MAX_DELTA_TIME_SECONDS = 0.25; 
    if (deltaTime > MAX_DELTA_TIME_SECONDS) {
        console.warn(`Large delta detected (${deltaTime.toFixed(3)}s), skipping physics update for one frame to prevent jump.`);
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
    }
    // --- END OF FIX ---


    const state = getState();
    if (!state || !state.settings) {
        console.error("Game loop: State or settings unavailable.");
        isGameLoopRunning = false; 
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        return;
    }

    updateRemotePlayerShips(); 
    inputHandler.processHeldKeys(); 
    physicsUpdater.updatePhysics(deltaTime); 
    renderer.renderGame(); 
    hudManager.updateHUD(state);


    animationFrameId = requestAnimationFrame(gameLoop);
}


// --- Stop Game Function ---\nexport function stopGameLoop() {
    if (isGameLoopRunning) {
        console.log("--- Main.js: Stopping Game Loop ---");
        isGameLoopRunning = false;
        window.removeEventListener('resize', handleResize); // Clean up listener
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    }
}

console.log("Main.js loaded. Waiting for network to initialize and call initializeGame().");