// js/state/stateUtils.js

// No direct config import needed here, as it relies on constants from gameState or direct calculations.
import * as utils from '../utils.js'; // Keep if other utils from utils.js are ever needed here.

// Import the constants directly from gameState where they are defined
import { TARGET_CENTER_OFFSET_X, TARGET_CENTER_OFFSET_Y } from './gameState.js'; 

// Re-export utils if other modules import it via stateUtils (though direct import is clearer)
export { utils };


// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=stateUtilsFunctions##

/**
 * Calculates the target camera X offset for centering the view when no specific attraction is active.
 * This is often a fixed point or calculated based on initial world setup.
 * @param {object} settings - The game settings object (currently unused by this specific function).
 * @returns {number} The target X offset.
 */
export function calculateTargetOffsetX(settings) {
    // Uses the pre-calculated constant from gameState.js
    return TARGET_CENTER_OFFSET_X;
}

/**
 * Calculates the target camera Y offset for centering the view when no specific attraction is active.
 * This is often a fixed point or calculated based on initial world setup.
 * @param {object} settings - The game settings object (currently unused by this specific function).
 * @returns {number} The target Y offset.
 */
export function calculateTargetOffsetY(settings) {
    // Uses the pre-calculated constant from gameState.js
    return TARGET_CENTER_OFFSET_Y;
}

// isPointInsideAnyCrater function was moved to js/utils.js.
// Modules should import it directly from 'js/utils.js'.

// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=stateUtilsFunctions##