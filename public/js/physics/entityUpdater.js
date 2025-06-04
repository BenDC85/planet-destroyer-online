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
        if (clientPlayers[id] && clientPlayers[id].shipInstance) { // Check if shipInstance exists
            clientPlayers[id].shipInstance.update(false);
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

            // Client-side chunk collision remains (purely visual for debris impact)
            if (chunk.isActive) { 
                const p1 = { x: chunk.prevX, y: chunk.prevY };
                const p2 = { x: chunk.x, y: chunk.y };
                let firstValidImpact = null;

                state.planets.forEach(planet => {
                    if (!planet.isBlackHole && (planet.massKg ?? 0) > 0 && !planet.isBreakingUp && !planet.isDestroying && !planet.isDestroyed) {
                        const chunkMinX = Math.min(p1.x, p2.x) - chunk.size; const chunkMaxX = Math.max(p1.x, p2.x) + chunk.size;
                        const chunkMinY = Math.min(p1.y, p2.y) - chunk.size; const chunkMaxY = Math.max(p1.y, p2.y) + chunk.size;
                        const planetBounds = {
                            minX: planet.x - planet.originalRadius, maxX: planet.x + planet.originalRadius,
                            minY: planet.y - planet.originalRadius, maxY: planet.y + planet.originalRadius,
                        };
                        if (!(chunkMaxX < planetBounds.minX || chunkMinX > planetBounds.maxX || chunkMaxY < planetBounds.minY || chunkMinY > planetBounds.maxY)) {
                            const entryPointInfo = findAccurateImpactPoint(p1, p2, planet);
                            if (entryPointInfo) {
                                if (firstValidImpact === null || entryPointInfo.t < firstValidImpact.t) {
                                    firstValidImpact = { 
                                        t: entryPointInfo.t, planet: planet, point: entryPointInfo.point, 
                                        vx: chunk.vx, vy: chunk.vy,
                                    };
                                }
                            }
                        }
                    }
                });

                if (firstValidImpact) {
                    const targetPlanet = firstValidImpact.planet;
                    const impactPoint = firstValidImpact.point;
                    const impactorMassKg = chunk.massKg;
                    const impactSpeed_pixels_frame = Math.sqrt(firstValidImpact.vx**2 + firstValidImpact.vy**2);
                    const impactSpeed_mps = Math.max(0.1, impactSpeed_pixels_frame / pixelsPerMeter / secondsPerFrame);
                    let KE = 0.5 * impactorMassKg * (impactSpeed_mps ** 2);
                    let massEjected_kg_chunk = KE * settings.keToMassEjectEta;

                    stateModifiers.addCrater(targetPlanet, impactPoint.x, impactPoint.y, (chunk.size * 0.75), massEjected_kg_chunk, KE, impactSpeed_mps); // Smaller crater for chunks
                    chunk.isActive = false; chunk.life = 0;
                }
            }
        });
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


// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=findImpactInternalFunction##
// This helper function determines the precise impact point of a line segment (p1-p2) with a planet's surface.
function findAccurateImpactPoint(p1, p2, planet) {
    const segmentDx = p2.x - p1.x;
    const segmentDy = p2.y - p1.y;
    const segmentLenSq = segmentDx * segmentDx + segmentDy * segmentDy;

    if (segmentLenSq < 1e-6) { // Segment is essentially a point
        const isP1Boundary = utils.isPointInsideRadius(p1.x, p1.y, planet.x, planet.y, planet.originalRadius);
        const isP1Crater = utils.isPointInsideAnyCrater(p1.x, p1.y, planet);
        if (isP1Boundary && !isP1Crater) {
            return { t: 0, point: { x: p1.x, y: p1.y } }; // Impact at p1
        }
        return null; // p1 is not an impact point
    }

    const segmentLen = Math.sqrt(segmentLenSq);
    const numSteps = Math.min(Math.max(5, Math.ceil(segmentLen / 5)), 50); 

    const p1IsInsideSolid = utils.isPointInsideRadius(p1.x, p1.y, planet.x, planet.y, planet.originalRadius) &&
                           !utils.isPointInsideAnyCrater(p1.x, p1.y, planet);
    if (p1IsInsideSolid) {
        return { t: 0, point: { x: p1.x, y: p1.y } };
    }

    for (let i = 0; i <= numSteps; i++) { 
        const t = (numSteps === 0) ? 0 : (i / numSteps) ; // t is 0 to 1
        const testX = p1.x + t * segmentDx;
        const testY = p1.y + t * segmentDy;

        const isInsideBoundary = utils.isPointInsideRadius(testX, testY, planet.x, planet.y, planet.originalRadius);
        const isInsideCrater = utils.isPointInsideAnyCrater(testX, testY, planet);

        if (isInsideBoundary && !isInsideCrater) {
            // This is the first point found along the segment that's on solid ground
            return { t: t, point: { x: testX, y: testY } };
        }
    }
    return null; // No impact point found on solid ground along the segment
}
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=findImpactInternalFunction##


// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=entityUpdaterFileContent##
