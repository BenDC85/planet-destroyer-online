/* File: public/js/physics/entityUpdater.js */
// js/physics/entityUpdater.js





import * as config from '../config.js';

import * as utils from '../utils.js';

import * as stateModifiers from '../state/stateModifiers.js';

import { BHParticle } from '../entities/BHParticle.js'; // For BH particle spawning





// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=entityUpdaterFileContent##





function calculateBindingEnergy(planet, settings) {

    if (!planet || !settings || !settings.G || !planet.massKg || !planet.radius_m || planet.massKg <= 0 || planet.radius_m <= 0) {
        return 0;
    }
    const G = settings.G;
    const M = planet.massKg;
    const R = planet.radius_m;
    // U = (3/5) * G * M^2 / R  (for a uniform sphere)
    return (3 / 5) * G * (M ** 2) / R;
}





// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=updateEntitiesFunction##

export function updateEntities(state, deltaTime) { // deltaTime is not currently used by entities, they use fixed SECONDS_PER_FRAME

    const settings = state.settings;
    const pixelsPerMeter = settings.pixelsPerMeter;
    const secondsPerFrame = settings.secondsPerFrame; // Used for converting speeds





    // Update Local Player's Ship (inputs are processed in inputHandler, applied in ship.update)

    if (state.ship) { // state.ship is the local player's ship
        state.ship.update(true); // Pass true to indicate it's the client's own ship
    }





    // Update other players' ships (their state is set by network.js from server messages)

    const clientPlayers = state.remotePlayers || {}; // Assuming remotePlayers will be populated by network.js
    for (const id in clientPlayers) {
        if (clientPlayers[id] && typeof clientPlayers[id].update === 'function') { // Check for ship instance via update method
            clientPlayers[id].update(false);
        }
    }





    // --- Update Projectiles & Basic Despawn ---

    if (state.projectiles.length > 0) {
        state.projectiles.forEach(proj => {
            if (!proj.isActive && !proj.trailPersistsAfterImpact) return; 
            proj.update(); // Projectile updates its own physics (client-side prediction)
        });
    }





    // Update Particles

    state.particles.forEach(p => p.update());





    // Update Chunks (client-side prediction/visuals)

    if (state.chunks.length > 0) {
        state.chunks.forEach(chunk => {
            if (!chunk.isActive) return;
            chunk.update(state); // Chunk updates its own physics
        });
        // REMOVED: All client-side chunk collision logic has been deleted.
        // The server is now the sole authority for chunk-planet collisions.
        // The client will see the results via 'planet_update' and 'chunk_damaged_planet' events.
    }





    // Update Black Hole Particles

    state.planets.forEach(planet => { 
        if (planet.isBlackHole) { 
            const spawnRate = settings.bhParticleSpawnRate;
            const maxSpawned = settings.bhMaxParticles;
            if (maxSpawned === 0 || planet.bhParticlesSpawnedCount < maxSpawned) {
                for (let i = 0; i < spawnRate; i++) { 
                    if (maxSpawned !== 0 && planet.bhParticlesSpawnedCount >= maxSpawned) break;
                    state.bhParticles.push(new BHParticle( planet.x, planet.y, planet.originalRadius, settings )); 
                    planet.bhParticlesSpawnedCount++; 
                } 
            } 
        } 
    });
    state.bhParticles.forEach(p => { p.update(state); }); 
}

// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=updateEntitiesFunction##



// DELETED: The findAccurateImpactPoint function has been removed from this file.
// The server now contains the authoritative version of this logic.



// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=entityUpdaterFileContent##