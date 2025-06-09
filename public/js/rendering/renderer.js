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
// Obsolete: canvasWidth and canvasHeight are now managed in gameState
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=rendererModuleState##

// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=initializeRendererFunction##
export function initializeRenderer(canvasContext) {
    if (!canvasContext) { console.error("Context required for renderer."); return false; }
    ctx = canvasContext;
    return true;
}
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=initializeRendererFunction##

// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=drawGridFunction##
function drawGrid(ctx, startX, startY, endX, endY, gridSize, scale) { // Use scale instead of zoom
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
    
    // Clear canvas with black for letterboxing/pillarboxing
    ctx.fillStyle = '#000000'; 
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    ctx.save();

    // --- NEW: Aspect-Ratio Correct Rendering Logic ---
    const worldWidth = settings.worldWidth;
    const worldHeight = settings.worldHeight;
    const worldAspectRatio = worldWidth / worldHeight;
    const canvasAspectRatio = canvasWidth / canvasHeight;

    let scale = 1;
    let renderX = 0;
    let renderY = 0;
    
    if (canvasAspectRatio > worldAspectRatio) {
        // Canvas is wider than the world (letterbox)
        scale = canvasHeight / worldHeight;
        renderX = (canvasWidth - worldWidth * scale) / 2;
        renderY = 0;
    } else {
        // Canvas is taller than the world (pillarbox)
        scale = canvasWidth / worldWidth;
        renderX = 0;
        renderY = (canvasHeight - worldHeight * scale) / 2;
    }

    // Apply the letterboxing/pillarboxing translation and scale
    ctx.translate(renderX, renderY);
    ctx.scale(scale, scale);
    
    // Now apply the camera zoom and offset relative to the scaled world
    const viewCenterX = settings.cameraOffsetX; 
    const viewCenterY = settings.cameraOffsetY;
    const safeZoom = Math.max(0.01, settings.cameraZoom);
    
    // Translate to the center of the viewport (which is now the scaled world size)
    ctx.translate(worldWidth / 2, worldHeight / 2);
    // Apply camera zoom
    ctx.scale(safeZoom, safeZoom);
    // Translate by the camera's offset
    ctx.translate(-viewCenterX, -viewCenterY);
    
    // --- End of New Rendering Logic ---

    // ##AI_AUTOMATION::TARGET_ID_DEFINE_START=drawBackgroundElements##
    if (typeof settings.worldMinX !== 'undefined') {
        drawGrid(ctx, settings.worldMinX, settings.worldMinY, settings.worldMaxX, settings.worldMaxY, 100, scale * safeZoom);
        ctx.save(); ctx.strokeStyle = 'rgba(255,0,0,0.5)'; 
        ctx.lineWidth = 5 / (scale * safeZoom); 
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