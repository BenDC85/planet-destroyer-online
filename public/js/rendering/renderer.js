// js/rendering/renderer.js

import { getState } from '../state/gameState.js';
import * as drawPlanet from './drawPlanet.js';
import * as drawDebris from './drawDebris.js';
import * as drawEffects from './drawEffects.js';
import * as drawUI from './drawUI.js';
import { renderShip } from './drawShip.js'; 
import { getMyPlayerId } from '../network.js';

// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=rendererFileContent##

// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=rendererModuleState##
let ctx = null; 
// This is a reference value. At a camera zoom of 1.0, the viewport will be this many world-pixels tall.
const REFERENCE_VIEW_HEIGHT = 2160; 
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
    const safeScale = Math.max(0.0001, scale);
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
    
    // Clear the entire canvas with black
    ctx.fillStyle = '#000000'; 
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    ctx.save();

    // --- NEW: Field-of-View Based Rendering (No Distortion) ---

    // 1. Determine the scale based on the desired vertical field of view and the canvas height.
    // A larger cameraZoom value from the user means we see a smaller vertical portion of the world, hence we are "zoomed in".
    const verticalViewHeight = REFERENCE_VIEW_HEIGHT / settings.cameraZoom;
    const scale = canvasHeight / verticalViewHeight;

    // 2. Apply transformations.
    // First, move the origin to the center of the canvas.
    ctx.translate(canvasWidth / 2, canvasHeight / 2);
    // Second, apply the calculated uniform scale.
    ctx.scale(scale, scale);
    // Third, move the view to center on the camera's world coordinates.
    ctx.translate(-settings.cameraOffsetX, -settings.cameraOffsetY);
    
    // --- End of New Rendering Logic ---

    // ##AI_AUTOMATION::TARGET_ID_DEFINE_START=drawBackgroundElements##
    if (typeof settings.worldMinX !== 'undefined') {
        // Pass the final calculated scale to the grid and border functions for correct line width.
        drawGrid(ctx, settings.worldMinX, settings.worldMinY, settings.worldMaxX, settings.worldMaxY, 100, scale);
        ctx.save(); 
        ctx.strokeStyle = 'rgba(255,0,0,0.5)'; 
        ctx.lineWidth = 5 / scale; 
        ctx.strokeRect(settings.worldMinX, settings.worldMinY, settings.worldWidth, settings.worldHeight);
        ctx.restore();
    }
    // ##AI_AUTOMATION::TARGET_ID_DEFINE_END=drawBackgroundElements##

    // ##AI_AUTOMATION::TARGET_ID_DEFINE_START=renderPlanetsLoop##
    state.planets.forEach(planet => {
        drawPlanet.renderPlanetState(ctx, planet); 
        drawEffects.renderCoreEffects(ctx, planet, settings); 
        drawEffects.renderShockwaves(ctx, planet, settings);
    });
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
                // console.log(`[RENDERER] Drawing remote ship: ${remoteShipInstance.name} (ID: ${playerIdFromState}) at X:${remoteShipInstance.x.toFixed(0)}, Y:${remoteShipInstance.y.toFixed(0)}`);
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