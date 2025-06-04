// js/main.js - Adapted for multiplayer


import { getState, initializeState, updateRemotePlayerShips } from './state/gameState.js';
import * as inputHandler from './input/inputHandler.js';
import * as physicsUpdater from './physics/physicsUpdater.js';
import * as renderer from './rendering/renderer.js';
import * as hudManager from './hud/hudManager.js';
// getMyPlayerId, getClientSidePlayers, getMyPlayerData, sendShipUpdate are used by other modules, not directly here usually.


// --- Global Scope Variables ---
let canvas = null;
let ctx = null;
let lastTimestamp = 0;
let isGameLoopRunning = false;
let animationFrameId = null;


// --- Initialization Function (Called by network.js after successful join) ---
// Now accepts initialWorldData and authoritative localPlayerData from network.js
export function initializeGame(initialWorldData = null, authoritativeLocalPlayerData = null) { // **** MODIFIED ****
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


    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;


    // --- Initialize Modules (Order Matters!) ---
    // 1. Initialize State: Pass canvas dimensions, initialWorldData (planets), and authoritativeLocalPlayerData
    // initialSettings from HUD/defaults will be handled within initializeState itself.
    initializeState(canvas.width, canvas.height, {}, initialWorldData, authoritativeLocalPlayerData); // **** MODIFIED ****
    console.log("   Client Game State Initialized.");


    // 2. Initialize Renderer
    if (!renderer.initializeRenderer(ctx)) {
        console.error("FATAL: Renderer initialization failed."); return;
    }
    console.log("   Renderer Initialized.");


    // 3. Initialize HUD
    if (!hudManager.initializeHUD()) {
        console.warn("HUD Manager initialization failed.");
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


// --- Main Game Loop ---
function gameLoop(timestamp) {
    if (!isGameLoopRunning || !ctx) {
        if (isGameLoopRunning && animationFrameId) cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        return;
    }


    const deltaTime = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;
    const dtClamped = Math.min(deltaTime, 1 / 30); 


    const state = getState();
    if (!state || !state.settings) {
        console.error("Game loop: State or settings unavailable.");
        isGameLoopRunning = false; 
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
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
        console.log("--- Main.js: Stopping Game Loop ---");
        isGameLoopRunning = false;
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    }
}


console.log("Main.js loaded. Waiting for network to initialize and call initializeGame().");
