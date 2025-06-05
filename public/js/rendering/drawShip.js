/* File: public/js/rendering/drawShip.js */
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



    const size = ship.size;   // This is now the radius (e.g., 12.5)
    const color = ship.color; 



    // Vertices are calculated relative to the ship's center (0,0) using its radius
    const noseX = size;          // Nose is at a distance of 1 radius unit forward
    const wingX = -size * 0.75;  // Wings are pulled back a bit
    const wingY = size * 0.8;    // Wings extend sideways, scaled by radius



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