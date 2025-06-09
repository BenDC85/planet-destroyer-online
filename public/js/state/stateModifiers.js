// js/state/stateModifiers.js


import * as config from '../config.js';
import * as utils from '../utils.js';
import { getState, updateRemotePlayerShips } from './gameState.js'; 
// Particle is imported for addParticleToState
import { Particle } from '../entities/Particle.js'; 
import { sendProjectileFireRequest } from '../network.js'; 


// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=stateModifiersFileContent##


// --- Interaction State ---
// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=interactionStateModifiers##
export function setClickState(newState, screenCoords = null) {
    const state = getState();
    if (!state) return;
    state.clickState = newState;


    if (newState === 'idle') {
        state.firstClickCoords = null;
    } else if (newState === 'waitingForSecondClick' && screenCoords) {
        state.currentMousePos = { ...screenCoords };
        state.worldMousePos = screenToWorld(screenCoords, state);
        state.firstClickCoords = { ...state.worldMousePos };
    }
}


export function setCurrentMousePos(screenCoords) {
    const state = getState();
    if (!state) return;
    state.currentMousePos = { ...screenCoords };
    state.worldMousePos = screenToWorld(screenCoords, state);
}
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=interactionStateModifiers##


// --- Ship Control Modifiers ---
// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=shipControlModifiers##
export function setShipRotation(isLeft, isRight) {
    const state = getState();
    if (state && state.ship) state.ship.setRotating(isLeft, isRight); 
}


export function adjustShipAngle(deltaAngle) {
    const state = getState();
    if (state && state.ship && state.ship.isLocalPlayer) { 
        state.ship.angle += deltaAngle;
        state.ship.angle = (state.ship.angle + Math.PI * 4) % (Math.PI * 2);
    }
}


/**
 * fireShipProjectile - REFACTORED for Client-Side Prediction
 * This function now has two roles:
 * 1. It prepares the projectile data and sends a request to the server.
 * 2. It returns the complete data for a "ghost" projectile so the client can render it instantly.
 */
export function fireShipProjectile() {
    const state = getState();
    if (!state || !state.ship || !state.ship.isLocalPlayer) {
        return null;
    }

    const projectileDataForServer = state.ship.fire(); 
    if (projectileDataForServer) {
        const tempId = `temp_proj_${Date.now()}_${Math.random()}`;
        projectileDataForServer.tempId = tempId;

        sendProjectileFireRequest(projectileDataForServer);

        return {
            id: tempId,
            ownerShipId: state.ship.id,
            x: projectileDataForServer.startX,
            y: projectileDataForServer.startY,
            angle: projectileDataForServer.angle,
            initialSpeedInternalPxFrame: projectileDataForServer.initialSpeedInternalPxFrame,
            color: config.PROJECTILE_COLOR,
            massKg: projectileDataForServer.massKg,
            isGhost: true
        };
    }
    return null;
}


export function addProjectile(projectileInstance) { 
    const state = getState();
    if (state && projectileInstance) state.projectiles.push(projectileInstance);
}

export function addParticleToState(particleInstance) {
    const state = getState();
    if (state && particleInstance) {
        state.particles.push(particleInstance);
    }
}
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=shipControlModifiers##


// --- In-Game Settings Modifiers ---
// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=inGameSettingsModifiers##
export function setDamageRadius(radius) {
    const state = getState(); if (!state || !state.settings) return;
    const numValue = parseInt(radius, 10);
    state.settings.baseDamageRadius = Math.max(config.minDamageRadius, Math.min(config.maxDamageRadius, isNaN(numValue) ? config.defaultBaseDamageRadius : numValue));
}


// ** THE FIX IS HERE **
// This function is now greatly simplified. It only updates the zoom value.
// The renderer is now solely responsible for calculating the resulting view.
export function setCameraZoom(newZoomRaw) {
    const state = getState();
    if (!state || !state.settings) return;

    const newZoom = Math.max(config.minZoom, Math.min(config.maxZoom, isNaN(newZoomRaw) ? config.defaultCameraZoom : newZoomRaw));
    
    // Only update the zoom level. Do NOT modify camera offset here.
    state.settings.cameraZoom = newZoom;
}


export function setPersistentChunkDrift(isEnabled) {
    const state = getState(); if (state && state.settings) state.settings.persistentChunkDrift = !!isEnabled;
}
export function setShipZoomAttractFactor(factor) {
    const state = getState(); if (state && state.settings) { const numValue = parseFloat(factor); state.settings.shipZoomAttractFactor = Math.max(config.MIN_SHIP_ZOOM_ATTRACT_FACTOR, Math.min(config.MAX_SHIP_ZOOM_ATTRACT_FACTOR, isNaN(numValue) ? config.DEFAULT_SHIP_ZOOM_ATTRACT_FACTOR : numValue)); }
}
export function setPlanetZoomAttractFactor(factor) {
    const state = getState(); if (state && state.settings) { const numValue = parseFloat(factor); state.settings.planetZoomAttractFactor = Math.max(config.MIN_PLANET_ZOOM_ATTRACT_FACTOR, Math.min(config.MAX_PLANET_ZOOM_ATTRACT_FACTOR, isNaN(numValue) ? config.DEFAULT_PLANET_ZOOM_ATTRACT_FACTOR : numValue)); }
}
export function setProjectileLaunchSpeed(internalSpeed) { 
    const state = getState(); if (state && state.settings) { const numValue = parseFloat(internalSpeed); const internalDefault = config.defaultProjectileSpeed * config.PROJECTILE_SPEED_HUD_SCALE_FACTOR; state.settings.projectileSpeed = Math.min(config.MAX_PROJECTILE_SPEED_INTERNAL, Math.max(config.MIN_PROJECTILE_SPEED_INTERNAL, isNaN(numValue) ? internalDefault : numValue)); }
}
export function adjustProjectileLaunchSpeed(increase) {
    const state = getState(); if (state && state.settings) { let currentInternalSpeed = state.settings.projectileSpeed; currentInternalSpeed += increase ? config.PROJECTILE_SPEED_STEP_INTERNAL : -config.PROJECTILE_SPEED_STEP_INTERNAL; setProjectileLaunchSpeed(currentInternalSpeed); }
}
export function setProjectileMass(mass) {
    const state = getState(); if (state && state.settings) { const numValue = parseFloat(mass); state.settings.projectileMass = Math.max(config.minProjectileMass, isNaN(numValue) ? config.defaultProjectileMass : numValue); }
}
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=inGameSettingsModifiers##


// --- BH Effect Modifiers ---
// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=bhEffectModifiers##
export function setBHParticleLifeFactor(factor) { const s=getState()?.settings; if(s){const val = parseFloat(factor); s.bhParticleLifeFactor=Math.max(0.1, isNaN(val)?config.defaultBHParticleLifeFactor:val);} }
export function setBHParticleSpeedFactor(factor) { const s=getState()?.settings; if(s){const val = parseFloat(factor); s.bhParticleSpeedFactor=Math.max(0.1, isNaN(val)?config.defaultBHParticleSpeedFactor:val);} }
export function setBHParticleSpawnRate(rate) { const s=getState()?.settings; if(s){const val = parseInt(rate, 10); s.bhParticleSpawnRate=Math.max(0, isNaN(val)?config.defaultBHParticleSpawnRate:val);} }
export function setBHMaxParticles(count) { const s=getState()?.settings; if(s){const val = parseInt(count, 10); s.bhMaxParticles=Math.max(config.minBHMaxParticles, isNaN(val)?config.defaultBHMaxParticles:val);} }
export function setBHSpawnRadiusMinFactor(factor) { const s=getState()?.settings; if(s){const val = parseFloat(factor); const minVal = Math.max(config.minBHSpawnRadiusFactor, isNaN(val)?config.defaultBHSpawnRadiusMinFactor:val); s.bhSpawnRadiusMinFactor=Math.min(s.bhSpawnRadiusMaxFactor ?? Infinity, minVal);} }
export function setBHSpawnRadiusMaxFactor(factor) { const s=getState()?.settings; if(s){const val = parseFloat(factor); const maxVal = Math.min(config.maxBHSpawnRadiusFactor, isNaN(val)?config.defaultBHSpawnRadiusMaxFactor:val); s.bhSpawnRadiusMaxFactor=Math.max(s.bhSpawnRadiusMinFactor ?? 0, maxVal);} }
export function setBHParticleMinSize(size) { const s=getState()?.settings; if(s){const val = parseFloat(size); const minVal = Math.max(config.minBHParticleSize, isNaN(val)?config.defaultBHParticleMinSize:val); s.bhParticleMinSize=Math.min(s.bhParticleMaxSize ?? Infinity, minVal);} }
export function setBHParticleMaxSize(size) { const s=getState()?.settings; if(s){const val = parseFloat(size); const maxVal = Math.min(config.maxBHParticleSize, isNaN(val)?config.defaultBHParticleMaxSize:val); s.bhParticleMaxSize=Math.max(s.bhParticleMinSize ?? 0.1, maxVal);} }
export function setBHInitialInwardFactor(factor) { const s=getState()?.settings; if(s){const val = parseFloat(factor); s.bhInitialInwardFactor=Math.max(config.minBHInitialInwardFactor, Math.min(config.maxBHInitialInwardFactor, isNaN(val)?config.defaultBHInitialInwardFactor:val));} }
export function setBHInitialAngularFactor(factor) { const s=getState()?.settings; if(s){const val = parseFloat(factor); s.bhInitialAngularFactor=Math.max(config.minBHInitialAngularFactor, Math.min(config.maxBHInitialAngularFactor, isNaN(val)?config.defaultBHInitialAngularFactor:val));} }
export function setBHDragZoneMultiplier(multiplier) { const s = getState()?.settings; if(s){const val = parseFloat(multiplier); s.bhDragZoneMultiplier = Math.max(config.minBHDragZoneMultiplier, Math.min(config.maxBHDragZoneMultiplier, isNaN(val) ? config.defaultBHDragZoneMultiplier : val));} }
export function setBHDragCoefficientMax(coefficient) { const s = getState()?.settings; if(s){const val = parseFloat(coefficient); s.bhDragCoefficientMax = Math.max(config.minBHDragCoefficientMax, Math.min(config.maxBHDragCoefficientMax, isNaN(val) ? config.defaultBHDragCoefficientMax : val));} }
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=bhEffectModifiers##


// --- Other Tunable Params Modifiers ---
// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=tunableParamModifiers##
export function setPlanetGravityMultiplier(internalValue) { 
    const state = getState(); if (state && state.settings) { const numValue = parseFloat(internalValue); const internalDefault = config.defaultPlanetGravityMultiplier * config.PLANET_GRAVITY_HUD_SCALE_FACTOR; const internalMin = config.minPlanetGravityMultiplier * config.PLANET_GRAVITY_HUD_SCALE_FACTOR; state.settings.planetGravityMultiplier = Math.max(internalMin, isNaN(numValue) ? internalDefault : numValue); recalculateBHGravitationalConstant(state.settings); }
}
export function setChunkLifespan(frames) { const s=getState()?.settings; if(s){const val = parseInt(frames, 10); s.chunkLifespanFrames=Math.max(config.minChunkLifespan, isNaN(val)?config.defaultChunkLifespan:val);} }
export function setChunkMaxSpeed(speed) { const s=getState()?.settings; if(s){const val = parseInt(speed, 10); s.chunkMaxSpeedThreshold=Math.max(config.minChunkMaxSpeed, Math.min(config.maxChunkMaxSpeed, isNaN(val)?config.defaultChunkMaxSpeed:val));} }
export function setCoreExplosionDuration(frames) { const s=getState()?.settings; if(s){const val = parseInt(frames, 10); s.coreExplosionDuration=Math.max(config.minCoreExplosionDuration, Math.min(config.maxCoreExplosionDuration, isNaN(val)?config.defaultCoreExplosionDuration:val));} }
export function setCoreImplosionDuration(frames) { const s=getState()?.settings; if(s){const val = parseInt(frames, 10); s.coreImplosionDuration=Math.max(config.minCoreImplosionDuration, Math.min(config.maxCoreImplosionDuration, isNaN(val)?config.defaultCoreImplosionDuration:val));} }
export function setCraterScalingC(value) { const state = getState(); if (state?.settings) { const numValue = parseFloat(value); state.settings.craterScalingC = Math.max(config.minCraterScalingC, isNaN(numValue) ? config.defaultCraterScalingC : numValue); } }
export function setKeToMassEjectEta(value) { const state = getState(); if (state?.settings) { const numValue = parseFloat(value); state.settings.keToMassEjectEta = Math.max(config.minKEToMassEjectEta, isNaN(numValue) ? config.defaultKEToMassEjectEta : numValue); } }
export function setBHEnergyMultiplier(value) { const state = getState(); if (state?.settings) { const numValue = parseFloat(value); state.settings.bhEnergyMultiplier = Math.max(config.minBHEnergyMultiplier, isNaN(numValue) ? config.defaultBHEnergyMultiplier : numValue); } }
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=tunableParamModifiers##


// --- Setup Settings Modifiers ---
// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=setupSettingsModifiers##
export function setSetupPlanetCount(count) {
    const s=getState()?.settings; if(s){const val = parseInt(count, 10); s.planetCount = Math.max(config.minPlanetCount, Math.min(config.maxPlanetCount, isNaN(val)?config.defaultPlanetCount:val));}
}
export function setBHGravityFactor(factor) { 
    const state = getState(); if (state && state.settings) { const numValue = parseFloat(factor); state.settings.bhGravityFactor = Math.max(config.minBHGravityFactor, Math.min(config.maxBHGravityFactor, isNaN(numValue) ? config.defaultBHGravityFactor : numValue)); recalculateBHGravitationalConstant(state.settings); }
}
function recalculateBHGravitationalConstant(settings) { 
    if (!settings || typeof settings.G !== 'number' || typeof settings.referencePlanetMassForBHFactor !== 'number' || typeof settings.planetGravityMultiplier !== 'number' || typeof settings.bhGravityFactor !== 'number') { return; }
    settings.blackHoleGravitationalConstant = settings.G * settings.referencePlanetMassForBHFactor * settings.planetGravityMultiplier * settings.bhGravityFactor;
}
export function setBlackHoleEventHorizonRadius(value) {
    // This function is now deprecated. The server dictates the event horizon radius.
}
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=setupSettingsModifiers##


// --- Core Game State Changes ---
// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=coreStateChangeModifiers##
export function addCrater(planet, x, y, craterRadius_pixels, massEjected_kg, impactKE, impactSpeed_mps = null) {
    if (!planet || planet.massKg === undefined || !isFinite(planet.massKg)) {
        console.error("addCrater (client): Invalid planet object provided.", planet);
        return planet?.massKg ?? 0; 
    }


    let actualCraterRadius = 0;
    if (craterRadius_pixels > 0) { 
        actualCraterRadius = craterRadius_pixels;
    } else if (craterRadius_pixels === null) { 
        const settings = getState()?.settings;
        if (settings && settings.baseDamageRadius > 0) {
            actualCraterRadius = settings.baseDamageRadius;
        }
    }


    if (actualCraterRadius > 0) {
        const craterExists = planet.craters.some(c => 
            c.x === x && 
            c.y === y && 
            c.radius === actualCraterRadius
        );
        if (!craterExists) {
            planet.craters.push({ x, y, radius: actualCraterRadius });
        }
    }
    return planet.massKg; 
}


export function filterDebris() { 
    const state = getState();
    if (!state) return { chunkCountBefore:0, particleCountBefore:0, projectileCountBefore:0, bhParticleCountBefore:0, chunkCountAfter:0, particleCountAfter:0, projectileCountAfter:0, bhParticleCountAfter:0 };
    
    const counts = {
        chunkCountBefore: state.chunks.length, particleCountBefore: state.particles.length,
        projectileCountBefore: state.projectiles.length, bhParticleCountBefore: state.bhParticles.length,
    };


    state.projectiles = state.projectiles.filter(p => p.isActive || (p.trailPersistsAfterImpact && p.trailLife > 0));
    state.particles = state.particles.filter(p => p.life > 0 && p.radius > 0.1);
    state.chunks = state.chunks.filter(c => c.isActive || (!c.persistentDrift && c.life > 0)); 
    state.bhParticles = state.bhParticles.filter(p => p.isActive);


    counts.chunkCountAfter = state.chunks.length; counts.particleCountAfter = state.particles.length;
    counts.projectileCountAfter = state.projectiles.length; counts.bhParticleCountAfter = state.bhParticles.length;
    return counts;
}
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=coreStateChangeModifiers##


// --- Destruction Sequence Trigger (Client-side visual prediction / initiation) ---
// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=destructionTrigger##
export function triggerDestructionSequence(planet, impactX, impactY) {
    if (!planet || planet.isBreakingUp || planet.isDestroying || planet.isBlackHole || planet.isDestroyed) {
        return false; 
    }
    planet.lastImpactPoint = { x: impactX, y: impactY };
    return true; 
}

// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=destructionTrigger##


// --- State Phase Setters (Client-side visual/predictive state changes) ---
// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=statePhaseSetters##
export function advanceBreakupFrame(planet) { if (planet && planet.isBreakingUp) planet.breakupFrame++; } 
export function advanceExplosionFrame(planet) { if (planet && planet.isDestroying) planet.explosionFrame++; } 
export function advanceDestructionElapsedTime(planet) { 
    if (planet && planet.destructionElapsedTime !== null) planet.destructionElapsedTime++; 
}
export function advanceGraceFrame(planet) { if (planet && planet.chunkGracePeriodFrame > 0) planet.chunkGracePeriodFrame++; }


export function setPhaseToDestroying(planet) { 
    if (planet) { 
        planet.isBreakingUp = false; 
        planet.isDestroying = true; 
    }
}
export function applyServerPlanetState(planetId, serverPlanetData) {
    const state = getState();
    if (!state || !state.planets) return;

    const planetIndex = state.planets.findIndex(p => p.id === planetId);
    if (planetIndex !== -1) {
        const clientPlanet = state.planets[planetIndex];
        Object.assign(clientPlanet, serverPlanetData);
    } else {
        console.warn(`[CLIENT S_MOD] applyServerPlanetState: Planet ID ${planetId} not found on client. Adding it.`);
        state.planets.push(serverPlanetData); 
    }
}


export function stopPhysicsTimer(planet) { if (planet) { planet.destructionElapsedTime = null; } }
export function setShockwaveReversalRadius(planet, radius) { if (planet) { planet.shockwave2ReversalStartRadius = radius; } }
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=statePhaseSetters##


// --- Camera Coordinate Conversion & Offset ---
// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=coordinateConversion##
export function screenToWorld(screenCoords, state) {
    if (!screenCoords || !state?.settings || !state.canvasWidth) return { x: 0, y: 0 };
    const settings = state.settings;
    const viewCenterX = settings.cameraOffsetX; const viewCenterY = settings.cameraOffsetY;
    const safeZoom = Math.max(0.01, settings.cameraZoom);
    const worldX = viewCenterX + (screenCoords.x - state.canvasWidth / 2) / safeZoom;
    const worldY = viewCenterY + (screenCoords.y - state.canvasHeight / 2) / safeZoom;
    return { x: worldX, y: worldY };
}
export function worldToScreen(worldCoords, state) {
    if (!worldCoords || !state?.settings || !state.canvasWidth) return { x: 0, y: 0 };
    
    // This calculation needs to match the renderer's logic exactly.
    const BASE_VIEWPORT_HEIGHT = 806;
    const safeZoom = Math.max(0.01, state.settings.cameraZoom);
    const cameraViewHeight = BASE_VIEWPORT_HEIGHT / safeZoom;
    const scale = state.canvasHeight / cameraViewHeight;

    const screenX = state.canvasWidth / 2 + (worldCoords.x - state.settings.cameraOffsetX) * scale;
    const screenY = state.canvasHeight / 2 + (worldCoords.y - state.settings.cameraOffsetY) * scale;

    return { x: screenX, y: screenY };
}
export function setCameraOffset(newOffsetX, newOffsetY) {
    const state = getState();
    if (state && state.settings) {
        state.settings.cameraOffsetX = newOffsetX;
        state.settings.cameraOffsetY = newOffsetY;
    }
}
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=coordinateConversion##

export function setCanvasDimensions(width, height) {
    const state = getState();
    if (state) {
        state.canvasWidth = width;
        state.canvasHeight = height;
    }
}

// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=stateModifiersFileContent##