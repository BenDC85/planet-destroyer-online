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
let canvasWidth = 0;
let canvasHeight = 0;
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=rendererModuleState##

// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=initializeRendererFunction##
export function initializeRenderer(canvasContext) {
    if (!canvasContext) { console.error("Context required for renderer."); return false; }
    ctx = canvasContext;
    canvasWidth = ctx.canvas.width;
    canvasHeight = ctx.canvas.height;
    return true;
}
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=initializeRendererFunction##

// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=drawGridFunction##
function drawGrid(ctx, startX, startY, endX, endY, gridSize, zoom) {
    if (typeof startX === 'undefined' || typeof gridSize === 'undefined' || gridSize <= 0) return; 
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'; 
    const safeZoom = Math.max(0.01, zoom);
    ctx.lineWidth = 1 / safeZoom; 
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

    // Update canvas dimensions if they have changed
    if (ctx.canvas.width !== canvasWidth || ctx.canvas.height !== canvasHeight) {
        canvasWidth = ctx.canvas.width;
        canvasHeight = ctx.canvas.height;
    }

    // --- BEGIN RENDER ---
    // Clear the entire canvas with a black background (for letterboxing)
    ctx.fillStyle = '#000000'; 
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    ctx.save(); 

    // --- BEGIN ASPECT RATIO CORRECTION (LETTERBOXING/PILLARBOXING) ---
    const worldWidth = settings.worldWidth;
    const worldHeight = settings.worldHeight;
    const worldAspectRatio = worldWidth / worldHeight;
    const canvasAspectRatio = canvasWidth / canvasHeight;
    
    let scale;
    let offsetX = 0;
    let offsetY = 0;

    if (canvasAspectRatio > worldAspectRatio) {
        // Canvas is wider than the world (pillarbox)
        scale = canvasHeight / worldHeight;
        offsetX = (canvasWidth - worldWidth * scale) / 2;
    } else {
        // Canvas is taller than or same aspect as the world (letterbox)
        scale = canvasWidth / worldWidth;
        offsetY = (canvasHeight - worldHeight * scale) / 2;
    }
    
    // Apply the master transform to center and scale the world view
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // Now that the world is scaled, fill the visible world area with the game background color
    ctx.fillStyle = '#28282B';
    ctx.fillRect(settings.worldMinX, settings.worldMinY, worldWidth, worldHeight);
    // --- END ASPECT RATIO CORRECTION ---
    
    // The camera view is now relative to the entire world, not the canvas center
    const viewCenterX = settings.cameraOffsetX; 
    const viewCenterY = settings.cameraOffsetY;
    const safeZoom = Math.max(0.01, settings.cameraZoom);

    // Apply zoom and pan. NOTE: We are already scaled, so we don't scale again.
    // Instead, we translate to the center of the world, scale for zoom, then pan.
    ctx.translate(worldWidth / 2, worldHeight / 2);
    ctx.scale(safeZoom, safeZoom);
    ctx.translate(-viewCenterX, -viewCenterY);

    // ##AI_AUTOMATION::TARGET_ID_DEFINE_START=drawBackgroundElements##
    if (typeof settings.worldMinX !== 'undefined') {
        drawGrid(ctx, settings.worldMinX, settings.worldMinY, settings.worldMaxX, settings.worldMaxY, 100, safeZoom);
        ctx.save(); ctx.strokeStyle = 'rgba(255,0,0,0.5)'; 
        ctx.lineWidth = 5 / safeZoom; 
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
                ctx.save();
                ctx.translate(remoteShipInstance.x, remoteShipInstance.y);
                ctx.rotate(remoteShipInstance.angle);
                renderShip(ctx, remoteShipInstance); 
                ctx.restore();
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