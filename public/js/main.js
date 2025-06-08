// js/main.js - Adapted for multiplayer

import { getState, initializeState, updateRemotePlayerShips } from './state/gameState.js';
import * as inputHandler from './input/inputHandler.js';
import * as physicsUpdater from './physics/physicsUpdater.js';
import * as renderer from './rendering/renderer.js';
import * as hudManager from './hud/hudManager.js';

// --- Global Scope Variables ---
let canvas = null;
let ctx = null;
let lastTimestamp = 0;
let isGameLoopRunning = false;
let animationFrameId = null;
let resizeObserver = null;


// --- Initialization Function (Called by network.js after successful join) ---
export function initializeGame(initialWorldData = {}, authoritativeLocalPlayerData = null) {

    if (isGameLoopRunning) {
        console.warn("initializeGame called while game loop already running. Resetting...");
        stopGameLoop(); // Use the cleanup function
    }
    console.log("--- Main.js: Starting Game Initialization (called by network.js) ---");


    canvas = document.getElementById('gameCanvas');
    if (!canvas) { console.error("FATAL: Canvas element not found!"); return; }
    
    // --- BEGIN MODIFICATION: Canvas Sizing and Resize Handling ---
    const canvasContainer = document.getElementById('canvas-container');
    if (!canvasContainer) { console.error("FATAL: #canvas-container element not found!"); return; }

    // Initial size setting
    canvas.width = canvasContainer.clientWidth;
    canvas.height = canvasContainer.clientHeight;
    
    // Create a ResizeObserver to handle canvas resizing dynamically
    resizeObserver = new ResizeObserver(entries => {
        // We are only observing one element, so we can access the first entry.
        if (entries[0]) {
            const { width, height } = entries[0].contentRect;
            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
                console.log(`Canvas resized to: ${width}x${height}`);
            }
        }
    });
    resizeObserver.observe(canvasContainer);
    // --- END MODIFICATION ---

    ctx = canvas.getContext('2d');
    if (!ctx) { console.error("FATAL: Failed to get 2D context!"); return; }


    // --- Initialize Modules (Order Matters!) ---
    initializeState(canvas.width, canvas.height, {}, initialWorldData, authoritativeLocalPlayerData);
    console.log("   Client Game State Initialized.");

    if (!renderer.initializeRenderer(ctx)) {
        console.error("FATAL: Renderer initialization failed."); return;
    }
    console.log("   Renderer Initialized.");

    if (!hudManager.initializeHUD()) {
        console.warn("HUD Manager initialization failed.");
    } else {
        console.log("   HUD Initialized.");
    }

    inputHandler.setupInputListeners(canvas);
    console.log("   Input Listeners Set Up.");


    console.log("--- Main.js: Initialization Complete, Starting Game Loop ---");
    lastTimestamp = performance.now();
    isGameLoopRunning = true;
    
    animationFrameId = requestAnimationFrame(gameLoop);
}


// --- Main Game Loop ---
function gameLoop(timestamp) {
    if (!isGameLoopRunning || !ctx) {
        stopGameLoop();
        return;
    }


    const deltaTime = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;
    const dtClamped = Math.min(deltaTime, 1 / 30); 


    const state = getState();
    if (!state || !state.settings) {
        console.error("Game loop: State or settings unavailable.");
        stopGameLoop();
        return;
    }

    updateRemotePlayerShips(); 
    inputHandler.processHeldKeys(); 
    physicsUpdater.updatePhysics(dtClamped); 
    renderer.renderGame(); 
    hudManager.updateHUD(state);


    animationFrameId = requestAnimationFrame(gameLoop);
}


// --- Stop Game Function ---
export function stopGameLoop() {
    if (isGameLoopRunning) {
        console.log("--- Main.js: Stopping Game Loop and Cleaning Up ---");
    }
    isGameLoopRunning = false;
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    // Disconnect the resize observer to prevent memory leaks
    if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
    }
}

console.log("Main.js loaded. Waiting for network to initialize and call initializeGame().");