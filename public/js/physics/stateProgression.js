// js/physics/stateProgression.js

import * as config from '../config.js'; // For destruction timings and parameters
import * as stateModifiers from '../state/stateModifiers.js';

// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=stateProgressionFileContent##

// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=updateDestructionStateFunction##
/**
 * Updates the destruction phase and timers for EACH planet individually on the client.
 * In multiplayer, the server will be authoritative for these state changes.
 * This client-side logic is for prediction and visual smoothness.
 * @param {object} state - The global game state containing the planets array and settings.
 */
export function updateDestructionState(state) {
    state.planets.forEach(planet => {
        // Pass the specific planet, global settings, AND the global state object (for chunk check)
        updateSinglePlanetDestruction(planet, state.settings, state); 
    });
}
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=updateDestructionStateFunction##

// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=updateSinglePlanetDestructionFunction##
/**
 * Updates destruction state for a single planet on the client.
 * @param {object} planet - The planet object to update.
 * @param {object} settings - Global game settings (contains effect durations).
 * @param {object} globalState - The global game state (needed for checking global chunk count).
 */
function updateSinglePlanetDestruction(planet, settings, globalState) {
    // Use settings for core effect durations, and config for fixed phase durations
    const currentCoreExplosionDuration = settings.coreExplosionDuration;
    const currentCoreImplosionDuration = settings.coreImplosionDuration;
    const coreTotalVisualDuration = currentCoreExplosionDuration + currentCoreImplosionDuration;

    // --- Advance Timers for this planet (client-side prediction) ---
    if (planet.isBreakingUp || planet.isDestroying || planet.chunkGracePeriodFrame > 0) {
        if (planet.destructionElapsedTime !== null) { // Timer is running
             stateModifiers.advanceDestructionElapsedTime(planet);
        } else if (planet.isBreakingUp || planet.isDestroying) { 
             // If timer somehow not started during active phase, initiate it (defensive)
             planet.destructionElapsedTime = planet.isBreakingUp ? planet.breakupFrame : planet.explosionFrame;
        }
    }

    // Advance specific phase frame counters for this planet
    if (planet.isBreakingUp) { stateModifiers.advanceBreakupFrame(planet); }
    else if (planet.isDestroying) { stateModifiers.advanceExplosionFrame(planet); }
    else if (planet.chunkGracePeriodFrame > 0) { stateModifiers.advanceGraceFrame(planet); }

    // --- Check for Phase Transitions for this planet (client-side prediction) ---
    const implosionVisualStartFrame = Math.max(1, currentCoreExplosionDuration - config.CORE_EFFECT_OVERLAP_FRAMES);

    // 1. Breakup -> Destroying
    if (planet.isBreakingUp && planet.breakupFrame >= config.BREAKUP_DURATION_FRAMES) {
        // Client predicts transition; server will send authoritative state change.
        // For now, client makes the change for visual continuity.
        stateModifiers.setPhaseToDestroying(planet);
        
        // Set SW2 reversal radius if implosion starts immediately or very early
        if (implosionVisualStartFrame <= 0 || planet.explosionFrame >= implosionVisualStartFrame) {
            const shockwaveSpeed1 = (planet.originalRadius * config.EFFECT_PARAMETERS.SHOCKWAVES.PRIMARY_SPEED_RADIUS_FACTOR) / Math.max(1, currentCoreExplosionDuration);
            const shockwaveSpeed2 = shockwaveSpeed1 * config.EFFECT_PARAMETERS.SHOCKWAVES.SECONDARY_SPEED_FACTOR;
            let radiusAtImplosionStart = planet.originalRadius + shockwaveSpeed2 * Math.max(0, implosionVisualStartFrame -1);
            radiusAtImplosionStart = Math.max(planet.originalRadius, radiusAtImplosionStart);
            if (planet.shockwave2ReversalStartRadius === null) {
                 stateModifiers.setShockwaveReversalRadius(planet, radiusAtImplosionStart);
            }
        }
    }
    // 2. Destroying -> Black Hole / Destroyed / Grace
    else if (planet.isDestroying) {
        // Set SW2 reversal radius if it's time and not yet set
         if (planet.explosionFrame === implosionVisualStartFrame && planet.shockwave2ReversalStartRadius === null) {
            const shockwaveSpeed1 = (planet.originalRadius * config.EFFECT_PARAMETERS.SHOCKWAVES.PRIMARY_SPEED_RADIUS_FACTOR) / Math.max(1, currentCoreExplosionDuration);
            const shockwaveSpeed2 = shockwaveSpeed1 * config.EFFECT_PARAMETERS.SHOCKWAVES.SECONDARY_SPEED_FACTOR;
            let radius = planet.originalRadius + shockwaveSpeed2 * Math.max(0, planet.explosionFrame - 1);
            radius = Math.max(planet.originalRadius, radius);
            stateModifiers.setShockwaveReversalRadius(planet, radius);
         }

        // Check if core destruction animation timing is finished (client-side prediction)
        if (planet.explosionFrame >= coreTotalVisualDuration) {
            if (!planet.isBlackHole && !planet.isDestroyed) { 
                 // Client predicts outcome based on willBecomeBlackHole (which server would set)
                 if (planet.willBecomeBlackHole) { // This flag would be set by server message
                     // stateModifiers.setPhaseToBlackHole(planet); // Client doesn't make this final call
                 } else {
                     // stateModifiers.setPhaseToDestroyed(planet); // Client doesn't make this final call
                 }
                 // For now, client doesn't transition to BH/Destroyed on its own, waits for server.
                 // It just stops the 'isDestroying' phase effects.
            }

            const globalChunksExist = globalState.chunks.some(chunk => chunk.isActive); 
            if (globalChunksExist) {
                 if (planet.chunkGracePeriodFrame <= 0 && !planet.isBlackHole) { 
                    // stateModifiers.setPhaseToGrace(planet); // Client predicts grace period if chunks exist
                 }
             } else {
                  if (!planet.isBlackHole) { // If not a BH and no chunks, stop timer.
                    // stateModifiers.stopPhysicsTimer(planet);
                  }
             }
             // The actual transition to BH/Destroyed/Grace will be driven by server messages.
             // Client-side, we might just stop the `isDestroying` flag to stop core effects.
             // Planet will visually persist until server confirms its new state.
        }
    }
    // 3. Grace Period -> End (client-side prediction)
    else if (planet.chunkGracePeriodFrame > 0) {
        if (planet.chunkGracePeriodFrame >= config.CHUNK_GRACE_PERIOD_DURATION_FRAMES) {
             // stateModifiers.endGracePeriod(planet); // Client predicts end of grace
        }
    }
}
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=updateSinglePlanetDestructionFunction##

// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=stateProgressionFileContent##