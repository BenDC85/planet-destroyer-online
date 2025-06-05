/* File: public/js/physics/stateProgression.js */
// js/physics/stateProgression.js

import * as config from '../config.js'; // For effect parameters and timings
import * as stateModifiers from '../state/stateModifiers.js'; // For setting visual-only properties like shockwave radius

// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=stateProgressionFileContent##

// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=updateDestructionStateFunction##
/**
 * Updates client-side animation frame counters for planet destruction effects,
 * based on the authoritative state flags received from the server.
 * This function also calculates purely visual effect parameters, like when
 * a shockwave should reverse direction. It does NOT change core game phases.
 * @param {object} state - The global game state containing the planets array and settings.
 */
export function updateDestructionState(state) {
    if (!state || !state.settings || !state.planets) return;

    const settings = state.settings;

    state.planets.forEach(planet => {
        // The server is authoritative for isBreakingUp, isDestroying, etc.
        // The client's role is to advance local animation counters for smooth visuals
        // based on the state flags provided by the server.

        if (planet.isBreakingUp) {
            // If the server just set this flag, initialize the local counter.
            if (planet.breakupFrame === undefined) planet.breakupFrame = 0;
            planet.breakupFrame++; // Advance local animation frame
        } 
        else if (planet.isDestroying) {
            // If the server just set this flag, initialize the local counter.
            if (planet.explosionFrame === undefined) planet.explosionFrame = 0;
            planet.explosionFrame++; // Advance local animation frame

            // --- MERGED LOGIC: Calculate shockwave reversal for visual effects ---
            // This is purely visual and safe for the client to calculate.
            // It determines when the secondary shockwave effect should start imploding.
            const currentCoreExplosionDuration = settings.coreExplosionDuration;
            const implosionVisualStartFrame = Math.max(1, currentCoreExplosionDuration - config.CORE_EFFECT_OVERLAP_FRAMES);
            
            // Check if it's time to set the reversal radius, and if it hasn't been set yet.
            if (planet.explosionFrame >= implosionVisualStartFrame && planet.shockwave2ReversalStartRadius === null) {
                const shockwaveSpeed1 = (planet.originalRadius * config.EFFECT_PARAMETERS.SHOCKWAVES.PRIMARY_SPEED_RADIUS_FACTOR) / Math.max(1, currentCoreExplosionDuration);
                const shockwaveSpeed2 = shockwaveSpeed1 * config.EFFECT_PARAMETERS.SHOCKWAVES.SECONDARY_SPEED_FACTOR;
                
                // Calculate where the shockwave would be at the moment implosion effects start.
                let radiusAtImplosionStart = planet.originalRadius + shockwaveSpeed2 * Math.max(0, implosionVisualStartFrame - 1);
                radiusAtImplosionStart = Math.max(planet.originalRadius, radiusAtImplosionStart);
                
                // Set this purely visual property on the planet object.
                stateModifiers.setShockwaveReversalRadius(planet, radiusAtImplosionStart);
            }
            // --- END OF MERGED LOGIC ---

        } 
        else if (planet.isDestroyed || planet.isBlackHole) {
            // Destruction is complete, no more local frame counting needed for these effects.
            // The planet state is now final until a world reset.
        }

        // Advance the general-purpose destruction timer if it's running.
        // This can be used for effects that persist across phases (like shockwave fading).
        // This assumes the server initiates the timer by setting the value.
        if (planet.destructionElapsedTime !== null && typeof planet.destructionElapsedTime === 'number') {
           planet.destructionElapsedTime++;
        }
    });
}
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=updateDestructionStateFunction##

// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=stateProgressionFileContent##