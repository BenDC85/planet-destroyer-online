// js/rendering/renderer.js

import { getState } from '../state/gameState.js';
import * as drawPlanet from './drawPlanet.js';
import * as drawDebris from './drawDebris.js';
import * as drawEffects from './drawEffects.js';
import * as drawUI from './drawUI.js';
import { renderShip } from './drawShip.js'; 
import { getMyPlayerId } from '../network.js';
import * as config from '../config.js'; // Import config for BREAKUP_DURATION_FRAMES

// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=rendererFileContent##

// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=rendererModuleState##
let ctx = null; 

// The camera's viewport height at a zoom level of 1.0.
// This is derived from your design: a zoom of 0.2 shows the full world height of 4030 units.
// Therefore, at zoom 1.0, the height is 4030 * 0.2 = 806.
const BASE_VIEWPORT_HEIGHT = 806; 
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=rendererModuleState##

// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=initializeRendererFunction##
export function initializeRenderer(canvasContext) {
    if (!canvasContext) { console.error("Context required for renderer."); return false; }
    ctx = canvasContext;
    return true;
}
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=initializeRendererFunction##

// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=drawGridFunction##
function drawGrid(ctx, startX, startY, endX, endY, gridSize, scale) {
    if (typeof startX === 'undefined' || typeof gridSize === 'undefined' || gridSize <= 0) return; 
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'; 
    const safeScale = Math.max(0.01, scale);
    ctx.lineWidth = 1 / safeScale; 
    let firstX = Math.ceil(startX / gridSize) * gridSize;
    for (let x = firstX; x <= endX; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, startY); ctx.lineTo(x, endY); ctx.stroke();
    }
    let firstY = Math.ceil(startY / gridSize) * gridSize;
    for (let y = firstY; y <= endY; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(endX, y); ctx.stroke();
    }
    ctx.restore();
}
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=drawGridFunction##

// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=renderGameFunction##
export function renderGame() {
    if (!ctx) return;
    const state = getState(); 
    if (!state || !state.settings) return; 
    const settings = state.settings;
    
    const canvasWidth = state.canvasWidth;
    const canvasHeight = state.canvasHeight;
    
    // Clear canvas with black
    ctx.fillStyle = '#000000'; 
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    ctx.save();

    // --- NEW: Adaptive Aspect Ratio Logic ---
    const safeZoom = Math.max(0.01, settings.cameraZoom);

    // 1. Define the camera's desired viewport dimensions in world units.
    const cameraViewHeight = BASE_VIEWPORT_HEIGHT / safeZoom;
    // **THE FIX**: Calculate width based on the authoritative world dimensions from the server.
    const cameraViewWidth = (BASE_VIEWPORT_HEIGHT * (settings.worldWidth / settings.worldHeight)) / safeZoom;

    // 2. Compare the aspect ratio of the canvas to the desired camera view.
    const canvasAspectRatio = canvasWidth / canvasHeight;
    const cameraAspectRatio = cameraViewWidth / cameraViewHeight;

    let scale = 1;
    if (canvasAspectRatio > cameraAspectRatio) {
        // Canvas is WIDER than the camera view, so the view is limited by its height.
        scale = canvasHeight / cameraViewHeight;
    } else {
        // Canvas is TALLER (or same ratio), so the view is limited by its width.
        scale = canvasWidth / cameraViewWidth;
    }
    
    // 3. Apply the transformations.
    ctx.translate(canvasWidth / 2, canvasHeight / 2);
    ctx.scale(scale, scale);
    ctx.translate(-settings.cameraOffsetX, -settings.cameraOffsetY);
    // --- End of New Rendering Logic ---


    // --- NEW: PRE-RENDERING (TEXTURE BAKING) LOOP ---
    // Before drawing anything, check if any planet textures need to be updated.
    state.planets.forEach(planet => {
        // Only re-bake if the flag is set and the canvas exists
        if (planet.textureNeedsUpdate && planet.textureCanvas) {
            const textureCtx = planet.textureCanvas.getContext('2d');
            
            // Clear the texture canvas before drawing
            textureCtx.clearRect(0, 0, planet.textureCanvas.width, planet.textureCanvas.height);

            // ##AI_MODIFICATION_START##
            // This is the fix. We create a new `planetForBaking` object.
            // It contains all the original planet's data, but we overwrite its
            // center and crater coordinates to be in the texture's local space.

            // 1. Translate crater world coordinates to local texture coordinates.
            const localCraters = planet.craters.map(crater => ({
                ...crater, // Copy other crater properties like radius
                x: crater.x - planet.x + planet.originalRadius,
                y: crater.y - planet.y + planet.originalRadius
            }));
            
            // 2. Create the object for the baking function.
            const planetForBaking = {
                ...planet,
                x: planet.originalRadius,        // Center the planet in the texture
                y: planet.originalRadius,
                craters: localCraters            // Use the translated craters
            };

            // Call the expensive drawing function ONCE on the off-screen context
            drawPlanet.drawStaticCrateredPlanetInternal(textureCtx, planetForBaking);
            // ##AI_MODIFICATION_END##

            // Mark the texture as up-to-date
            planet.textureNeedsUpdate = false;
        }
    });
    // --- END OF NEW PRE-RENDERING LOOP ---


    // ##AI_AUTOMATION::TARGET_ID_DEFINE_START=drawBackgroundElements##
    if (typeof settings.worldMinX !== 'undefined') {
        drawGrid(ctx, settings.worldMinX, settings.worldMinY, settings.worldMaxX, settings.worldMaxY, 100, scale);
        ctx.save(); ctx.strokeStyle = 'rgba(255,0,0,0.5)'; 
        ctx.lineWidth = 5 / scale; 
        ctx.strokeRect(settings.worldMinX, settings.worldMinY, settings.worldWidth, settings.worldHeight);
        ctx.restore();
    }
    // ##AI_AUTOMATION::TARGET_ID_DEFINE_END=drawBackgroundElements##

    // ##AI_AUTOMATION::TARGET_ID_DEFINE_START=renderPlanetsLoop##
    // --- THIS IS THE MODIFIED PLANET RENDERING LOOP ---
    state.planets.forEach(planet => {
        // Don't draw if destroyed (unless it's a black hole)
        if (planet.isDestroyed && !planet.isBlackHole) {
            return;
        }

        if (planet.isBlackHole) {
            // Black holes are simple, just draw a black circle.
            ctx.beginPath(); 
            ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2); 
            ctx.fillStyle = 'black'; 
            ctx.fill();
        } else if (planet.textureCanvas && (planet.massKg ?? 0) > 0 && !planet.isDestroying) {
            // STEP 1: Draw the pre-baked texture. This is extremely fast!
            ctx.drawImage(
                planet.textureCanvas,
                planet.x - planet.originalRadius, // Position it correctly in the world
                planet.y - planet.originalRadius
            );
        }

        // STEP 2: Draw overlays on top of the texture. These are cheap.
        if (planet.isBreakingUp) {
            const breakupProgress = Math.min(1, planet.breakupFrame / config.BREAKUP_DURATION_FRAMES);
            drawPlanet.drawShatterCracksInternal(ctx, planet, breakupProgress);
        }
        
        // STEP 3: Draw destruction effects. These were always separate and are fine.
        drawEffects.renderCoreEffects(ctx, planet, settings); 
        drawEffects.renderShockwaves(ctx, planet, settings);
    });
    // --- END OF MODIFIED PLANET RENDERING LOOP ---
    // ##AI_AUTOMATION::TARGET_ID_DEFINE_END=renderPlanetsLoop##

    // ##AI_AUTOMATION::TARGET_ID_DEFINE_START=renderGlobalDebris##
    drawDebris.renderDebris(ctx, state);
    // ##AI_AUTOMATION::TARGET_ID_DEFINE_END=renderGlobalDebris##

    // ##AI_AUTOMATION::TARGET_ID_DEFINE_START=renderPlayerShip##
    if (state.ship) { 
        ctx.save();
        ctx.translate(state.ship.x, state.ship.y);
        ctx.rotate(state.ship.angle);
        renderShip(ctx, state.ship); 
        ctx.restore();
    }

    if (state.remotePlayers) { 
        for (const playerIdFromState in state.remotePlayers) {
            const remoteShipInstance = state.remotePlayers[playerIdFromState];
            if (remoteShipInstance) { 
                ctx.save();
                ctx.translate(remoteShipInstance.x, remoteShipInstance.y);
                ctx.rotate(remoteShipInstance.angle);
                renderShip(ctx, remoteShipInstance); 
                ctx.restore();
            } else {
                console.warn(`[RENDERER] remoteShipInstance for playerId ${playerIdFromState} is null/undefined in state.remotePlayers.`);
            }
        }
    }
    // ##AI_AUTOMATION::TARGET_ID_DEFINE_END=renderPlayerShip##

    ctx.restore(); 
    // ##AI_AUTOMATION::TARGET_ID_DEFINE_START=renderOverlayUI##
    drawUI.renderOverlayUI(ctx, state);
    // ##AI_AUTOMATION::TARGET_ID_DEFINE_END=renderOverlayUI##
}
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=renderGameFunction##

// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=rendererFileContent##