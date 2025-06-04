// js/physics/physicsUpdater.js

import * as stateProgression from './stateProgression.js';
import * as entityUpdater from './entityUpdater.js';
import { getState } from '../state/gameState.js';
import * as stateModifiers from '../state/stateModifiers.js'; // For filtering debris

// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=physicsUpdaterFileContent##

// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=updatePhysicsFunction##
export function updatePhysics(deltaTime) {
    const state = getState(); // Get the current global state
    if (!state) return; // Should not happen if game is initialized

    // 1. Update overall game phase and timers for each planet (destruction, grace period, etc.)
    // stateProgression.updateDestructionState expects the full state object
    // This will be driven by server events in multiplayer for authoritative state.
    // Client-side prediction can still run this for smoother visuals.
    stateProgression.updateDestructionState(state);

    // 2. Update individual entities (ship angle, projectiles, particles, chunks, BH particles)
    // entityUpdater.updateEntities also expects the full state and deltaTime
    // For multiplayer, local player ship is updated by input, remote ships by network data.
    // Projectiles/chunks are simulated client-side for prediction/local effects.
    entityUpdater.updateEntities(state, deltaTime);

    // 3. Filter *all* dead/inactive entities from client-side state arrays
    // stateModifiers.filterDebris works directly on the state obtained via getState() internally
    const debrisCounts = stateModifiers.filterDebris(); 

    // 4. Post-filter logic (e.g., related to client-side effects or cleanup)
    // This logic may become less relevant or change significantly as server becomes authoritative.
    if (debrisCounts.chunkCountBefore > 0 && debrisCounts.chunkCountAfter === 0) {
        // console.log("PhysicsUpdater (Client): All client-side chunks cleared.");
        // Original logic to stop a global physics timer is removed as planet timers are individual.
    }
}
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=updatePhysicsFunction##

// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=physicsUpdaterFileContent##