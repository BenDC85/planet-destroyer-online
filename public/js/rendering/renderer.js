// js/rendering/renderer.js

import { getState } from '../state/gameState.js';
import * as drawPlanet from './drawPlanet.js';
import * as drawDebris from './drawDebris.js';
import * as drawEffects from './drawEffects.js';
import * as drawUI from './drawUI.js';
import { renderShip } from './drawShip.js'; 

let ctx = null; 

export function initializeRenderer(canvasContext) {
    if (!canvasContext) { console.error("Context required for renderer."); return false; }
    ctx = canvasContext;
    return true;
}

function drawGrid(ctx, startX, startY, endX, endY, gridSize, totalScale) {
    if (typeof startX === 'undefined' || typeof gridSize === 'undefined' || gridSize <= 0) return; 
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'; 
    // The line width must be adjusted by the *total* applied scale to appear as 1px.
    const safeTotalScale = Math.max(0.01, totalScale);
    ctx.lineWidth = 1 / safeTotalScale; 
    
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

export function renderGame() {
    if (!ctx) return;
    const state = getState(); 
    if (!state || !state.settings) return; 
    const { settings, canvasWidth, canvasHeight } = state;

    // --- 1. Clear and Prepare Canvas ---
    // Clear the entire canvas with a black background for letter/pillarboxing.
    ctx.fillStyle = '#000000'; 
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    ctx.save(); 

    // --- 2. Calculate Aspect-Ratio-Correct Transformations ---
    const worldWidth = settings.worldWidth;
    const worldHeight = settings.worldHeight;
    const worldRatio = worldWidth / worldHeight;
    const canvasRatio = canvasWidth / canvasHeight;

    let baseScale = 1;
    let offsetX = 0;
    let offsetY = 0;

    if (canvasRatio > worldRatio) { // Canvas is wider than world -> pillarbox (bars on sides)
        baseScale = canvasHeight / worldHeight;
        offsetX = (canvasWidth - worldWidth * baseScale) / 2;
    } else { // Canvas is taller or same ratio -> letterbox (bars on top/bottom)
        baseScale = canvasWidth / worldWidth;
        offsetY = (canvasHeight - worldHeight * baseScale) / 2;
    }
    
    const viewCenterX = settings.cameraOffsetX;
    const viewCenterY = settings.cameraOffsetY;
    const cameraZoom = Math.max(0.01, settings.cameraZoom);
    
    // --- 3. Apply Transformations ---
    // First, move to the top-left of the centered game area (handles letterboxing).
    ctx.translate(offsetX, offsetY);
    
    // The new "canvas" for the camera is `worldWidth * baseScale` by `worldHeight * baseScale`.
    const viewAreaWidth = worldWidth * baseScale;
    const viewAreaHeight = worldHeight * baseScale;

    // Move origin to the center of this new "canvas" to apply zoom correctly.
    ctx.translate(viewAreaWidth / 2, viewAreaHeight / 2);
    // Apply the player's desired zoom level.
    ctx.scale(cameraZoom, cameraZoom);
    // Pan the world so the camera's target is at the center of the viewport.
    ctx.translate(-viewCenterX, -viewCenterY);
    
    // The total scale applied to the world is the base scale times the camera zoom.
    const totalScale = baseScale * cameraZoom;

    // --- 4. Render Game Elements ---

    // Draw background grid and borders
    drawGrid(ctx, settings.worldMinX, settings.worldMinY, settings.worldMaxX, settings.worldMaxY, 100, totalScale);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,0,0,0.5)'; 
    ctx.lineWidth = 5 / totalScale;
    ctx.strokeRect(settings.worldMinX, settings.worldMinY, settings.worldWidth, settings.worldHeight);
    ctx.restore();

    // Render planets and their effects
    state.planets.forEach(planet => {
        drawPlanet.renderPlanetState(ctx, planet); 
        drawEffects.renderCoreEffects(ctx, planet, settings); 
        drawEffects.renderShockwaves(ctx, planet, settings);
    });

    // Render all debris (projectiles, chunks, particles)
    drawDebris.renderDebris(ctx, state);

    // Render player and remote ships
    if (state.ship) { 
        ctx.save();
        ctx.translate(state.ship.x, state.ship.y);
        ctx.rotate(state.ship.angle);
        renderShip(ctx, state.ship); 
        ctx.restore();
    }

    if (state.remotePlayers) {
        for (const playerId in state.remotePlayers) {
            const remoteShip = state.remotePlayers[playerId];
            if (remoteShip) { 
                // console.log(`[RENDERER] Drawing remote ship: ${remoteShip.name} (ID: ${playerId})`);
                ctx.save();
                ctx.translate(remoteShip.x, remoteShip.y);
                ctx.rotate(remoteShip.angle);
                renderShip(ctx, remoteShip); 
                ctx.restore();
            }
        }
    }
    
    // --- 5. Restore and Render UI ---
    ctx.restore(); // This undoes all the transformations, returning to normal canvas space.
    
    // The UI is drawn last, on top of everything, in standard canvas coordinates.
    drawUI.renderOverlayUI(ctx, state);
}