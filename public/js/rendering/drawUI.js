// js/rendering/drawUI.js

import * as stateModifiers from '../state/stateModifiers.js'; // For worldToScreen

// Example: Define UI style constants (could be in config.js)
const TARGETING_LINE_COLOR = 'rgba(255, 0, 0, 0.7)';
const TARGETING_LINE_WIDTH = 2; // Screen pixels
const TARGETING_LINE_DASH = [5, 5]; // Dash pattern [on, off]

// Draws UI elements directly on the canvas (targeting line)
// This runs AFTER the context is restored (i.e., in screen space)
export function renderOverlayUI(ctx, state) {

    // Draw Targeting Line (if active)
    if (state.clickState === 'waitingForSecondClick' && state.firstClickCoords && state.currentMousePos) {
        // state.firstClickCoords is in WORLD coordinates (where the first click landed)
        // state.currentMousePos is in SCREEN coordinates (current mouse position on canvas)
        
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
            ctx.setLineDash([]); // Reset line dash for other drawing operations
            ctx.restore();
        }
    }

    // Future UI elements can be added here, e.g.:
    // - Player scores
    // - Kill feed
    // - Mini-map (more complex)
}