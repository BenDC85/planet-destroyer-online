// js/physics/stateProgression.js


import * as config from '../config.js'; // Client-side effect durations for visual pacing IF server doesn't send frame counts
// import * as stateModifiers from '../state/stateModifiers.js'; // No longer directly calling phase setters here


// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=stateProgressionFileContent##


// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=updateDestructionStateFunction##
/**
 * Updates client-side animation frame counters for planet destruction effects,
 * based on the authoritative state flags received from the server.
 * @param {object} state - The global game state containing the planets array and settings.
 */
export function updateDestructionState(state) {
    state.planets.forEach(planet => {
        // The server is now authoritative for isBreakingUp, isDestroying, isDestroyed, isBlackHole,
        // and the timing of these phase transitions.
        // The client's role here is to advance local animation counters if the
        // corresponding phase is active according to the server-updated planet state.

        // The server should be sending `breakupFrame`, `explosionFrame`, `destructionElapsedTime`
        // as part of the planet_update. If it does, the client uses those directly.
        // If the server only sends the state flags (isBreakingUp, isDestroying),
        // then the client can advance its own frame counters for smooth local animation.
        // For now, let's assume the server might not send every frame count, so client advances.

        if (planet.isBreakingUp) {
            if (planet.breakupFrame === undefined) planet.breakupFrame = 0; // Initialize if missing
            planet.breakupFrame++; // Advance local animation frame
            // Visual breakup duration on client can use client's config.BREAKUP_DURATION_FRAMES
            // if (planet.breakupFrame >= config.BREAKUP_DURATION_FRAMES) {
            //     // Client no longer transitions state here; waits for server update
            // }
        } else if (planet.isDestroying) {
            if (planet.explosionFrame === undefined) planet.explosionFrame = 0; // Initialize
            planet.explosionFrame++; // Advance local animation frame

            // Visual core effect duration on client uses client's config
            // const clientCoreTotalVisualDuration = config.defaultCoreExplosionDuration + config.defaultCoreImplosionDuration;
            // if (planet.explosionFrame >= clientCoreTotalVisualDuration) {
            //     // Client no longer transitions state here
            // }
        } else if (planet.isDestroyed || planet.isBlackHole) {
            // Destruction complete, no more local frame counting for these effects.
            // Ensure timers are considered stopped if server hasn't set destructionElapsedTime to null yet
            if (planet.destructionElapsedTime !== null) {
                // planet.destructionElapsedTime = null; // Client does not change this
            }
        }

        // Client still needs to manage its own local `destructionElapsedTime` if the server doesn't send it,
        // or if the client wants to use it for purely client-side effects that might outlast server phases (e.g. very long shockwave fades)
        // For now, let's assume the server sends `destructionElapsedTime` and the client uses it.
        // If `planet.destructionElapsedTime` is a frame count from server, it doesn't need client-side advance here.
        // If it's a timer for client-side effects:
        // if (planet.destructionElapsedTime !== null && (planet.isBreakingUp || planet.isDestroying || planet.isDestroyed || planet.isBlackHole)) {
        //    planet.destructionElapsedTime++; // Example for client-side effect timer
        // }


        // The client no longer calls stateModifiers like setPhaseToDestroying, setPhaseToBlackHole, etc.
        // All such state changes are now driven by 'planet_update' from the server.
        // The client rendering functions (drawPlanet, drawEffects) will simply read
        // planet.isBreakingUp, planet.isDestroying, planet.breakupFrame, planet.explosionFrame, etc.
        // which have been updated by the server.
    });
}
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=updateDestructionStateFunction##


// updateSinglePlanetDestruction function is removed as its logic is now simplified
// and integrated above, or made obsolete by server authority.
// The client no longer needs to manage transitions or complex timer logic for phases.

// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=stateProgressionFileContent##
