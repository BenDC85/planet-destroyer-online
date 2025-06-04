// js/rendering/drawShip.js


// import * as config from '../config.js'; // Not strictly needed if all info comes from ship object


// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=renderShipFunction##
/**
 * Draws the player ship on the canvas.
 * Assumes the context is already translated to the ship's world position
 * and rotated to the ship's angle.
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
 * @param {Ship} ship - The ship object containing size, color, and isAlive status.
 */
export function renderShip(ctx, ship) {
    // **** NEW: Only draw if the ship is alive ****
    if (!ship || !ship.isAlive) {
        // Optionally, draw a wreck or explosion animation here later
        return; 
    }

    const size = ship.size;   
    const color = ship.color; 


    const noseX = size * 1.0; 
    const wingX = -size * 0.5; 
    const wingY = size * 0.6;  

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(noseX, 0);      
    ctx.lineTo(wingX, wingY);  
    ctx.lineTo(wingX, -wingY); 
    ctx.closePath();
    ctx.fill();

    // Optional: Add a small identifier or name tag near the ship later
    // This should also check if ship.isAlive
    // if (ship.name && ship.isAlive) {
    //     // ... drawing name tag ...
    // }
}
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=renderShipFunction##
