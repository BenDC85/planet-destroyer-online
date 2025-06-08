// js/main.js - Adapted for multiplayer

import { getState, initializeState, updateRemotePlayerShips } from './state/gameState.js';
import * as inputHandler from './input/inputHandler.js';
import * as physicsUpdater from './physics/physicsUpdater.js';
import * as renderer from './rendering/renderer.js';
import * as hudManager from './hud/hudManager.js';
import { setCanvasDimensions } from './state/stateModifiers.js';

// --- Global Scope Variables ---
let canvas = null;
let ctx = null;
let lastTimestamp = 0;
let isGameLoopRunning = false;
let animationFrameId = null;
let resizeObserver = null;


// --- Resizing Logic ---
function updateCanvasSize() {
    if (!canvas) return;

    // Get the container for the canvas, which is managed by the flexbox layout
    const canvasContainer = document.getElementById('canvas-container');
    if (!canvasContainer) {
        console.error("canvas-container not found for sizing!");
        return;
    }
    const { width, height } = canvasContainer.getBoundingClientRect();

    // Update the canvas resolution
    canvas.width = width;
    canvas.height = height;

    // Update the dimensions in the game state so other modules can access them
    setCanvasDimensions(width, height);
}


// --- Initialization Function (Called by network.js after successful join) ---
export function initializeGame(initialWorldData = {}, authoritativeLocalPlayerData = null) {

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

    // --- Initialize Modules (Order Matters!) ---
    // 1. Initialize State: Pass initial (temporary) canvas dimensions. The resize observer will correct it immediately.
    initializeState(window.innerWidth, window.innerHeight, {}, initialWorldData, authoritativeLocalPlayerData);
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

    // 5. Setup Resize Observer
    if (resizeObserver) resizeObserver.disconnect();
    const gameContent = document.getElementById('game-content');
    if(gameContent) {
        resizeObserver = new ResizeObserver(entries => {
            // We are observing the container, so we don't need to loop through entries
            updateCanvasSize();
        });
        resizeObserver.observe(gameContent);
        // Initial size update
        updateCanvasSize();
        console.log("   ResizeObserver Initialized.");
    } else {
        console.error("Could not find #game-content to setup ResizeObserver.");
        // Fallback to old method if container not found
        window.addEventListener('resize', updateCanvasSize);
        updateCanvasSize();
    }


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
        if (resizeObserver) {
            resizeObserver.disconnect();
            resizeObserver = null;
        }
    }
}

console.log("Main.js loaded. Waiting for network to initialize and call initializeGame().");