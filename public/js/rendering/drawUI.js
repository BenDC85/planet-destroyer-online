// js/rendering/drawUI.js

import * as stateModifiers from '../state/stateModifiers.js'; // For worldToScreen

// UI style constants
const TARGETING_LINE_COLOR = 'rgba(255, 0, 0, 0.7)';
const TARGETING_LINE_WIDTH = 2; // Screen pixels
const TARGETING_LINE_DASH = [5, 5]; // Dash pattern [on, off]

const DAMAGE_RADIUS_COLOR = 'rgba(0, 150, 255, 0.3)'; // Semi-transparent blue
const DAMAGE_RADIUS_BORDER_COLOR = 'rgba(150, 200, 255, 0.7)';

// Draws UI elements directly on the canvas (targeting line, damage radius)
// This runs AFTER the context is restored (i.e., in screen space, using pixel coordinates)
export function renderOverlayUI(ctx, state) {
    if (!state || !state.settings) return;

    // --- Draw Targeting Line ---
    if (state.clickState === 'waitingForSecondClick' && state.firstClickCoords && state.currentMousePos) {
        const firstScreenClick = stateModifiers.worldToScreen(state.firstClickCoords, state);
        const currentScreenMouse = state.currentMousePos; 

        if (firstScreenClick && currentScreenMouse) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(firstScreenClick.x, firstScreenClick.y);
            ctx.lineTo(currentScreenMouse.x, currentScreenMouse.y);
            
            ctx.strokeStyle = TARGETING_LINE_COLOR; 
            ctx.lineWidth = TARGETING_LINE_WIDTH;
            ctx.setLineDash(TARGETING_LINE_DASH);
            
            ctx.stroke();
            ctx.setLineDash([]); // Reset line dash
            ctx.restore();
        }
    }

    // --- Draw Click Damage Radius Indicator ---
    const radius = state.settings.baseDamageRadius;
    const mousePos = state.currentMousePos;

    // Safeguard to prevent the "glint" bug.
    // Only draw if we have a valid, positive radius and a mouse position.
    if (radius && radius > 0 && mousePos) {
        // We need to calculate the on-screen pixel radius from the world-unit radius.
        // This requires knowing the current view scale, which we can derive.
        const safeZoom = Math.max(0.01, state.settings.cameraZoom);
        
        // This logic must mirror the scale calculation in renderer.js
        const BASE_VIEWPORT_HEIGHT = 806; // Must match renderer.js
        const cameraViewHeight = BASE_VIEWPORT_HEIGHT / safeZoom;
        const scale = state.canvasHeight / cameraViewHeight;
        
        const pixelRadius = radius * scale;

        // Draw the filled circle
        ctx.fillStyle = DAMAGE_RADIUS_COLOR;
        ctx.beginPath();
        ctx.arc(mousePos.x, mousePos.y, pixelRadius, 0, Math.PI * 2);
        ctx.fill();

        // Draw the border
        ctx.strokeStyle = DAMAGE_RADIUS_BORDER_COLOR;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(mousePos.x, mousePos.y, pixelRadius, 0, Math.PI * 2);
        ctx.stroke();
    }
}