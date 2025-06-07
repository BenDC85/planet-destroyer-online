/* File: public/js/state/gameState.js */
// js/state/gameState.js

import * as config from '../config.js';
import { Ship } from '../entities/Ship.js';
import { getMyPlayerId as getSocketIdForLocalPlayer, getClientSidePlayers } from '../network.js'; 


// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=gameStateFileContent##

let currentState = {};

// **** MODIFIED: These are now primarily fallbacks. The server will provide the authoritative values. ****
const WORLD_MIN_X = -2900; const WORLD_MIN_Y = -2250;
const WORLD_MAX_X = 4800; const WORLD_MAX_Y = 2250;
const WORLD_WIDTH = WORLD_MAX_X - WORLD_MIN_X;
const WORLD_HEIGHT = WORLD_MAX_Y - WORLD_MIN_Y; 

const WORLD_CENTER_X = WORLD_MIN_X + WORLD_WIDTH / 2;
const WORLD_CENTER_Y = WORLD_MIN_Y + WORLD_HEIGHT / 2;

export const TARGET_CENTER_OFFSET_X = WORLD_CENTER_X - 930;
export const TARGET_CENTER_OFFSET_Y = WORLD_CENTER_Y;


// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=initializeStateFunction##
export function initializeState(canvasWidth, canvasHeight, initialSettings = {}, serverInitialWorldData = null, authoritativeLocalPlayerData = null) { 
    console.log(`--- Initializing Client Game State (Canvas: ${canvasWidth}x${canvasHeight}) ---`);

    // **** NEW: Destructure the server data, including the new config object ****
    const { planets: serverPlanets, config: serverConfig } = serverInitialWorldData || {};
    const serverPhysics = serverConfig?.physics; // Extract the physics bundle

    if (serverPhysics && Object.keys(serverPhysics).length > 0) {
        console.log("   Using authoritative server configuration for physics constants:", serverPhysics);
    } else {
        console.warn("   Server physics configuration not received or is empty. Falling back to local config.js values. Physics prediction will likely be inaccurate!");
    }

    if (authoritativeLocalPlayerData) {
        console.log("   Using authoritativeLocalPlayerData for local ship setup:", authoritativeLocalPlayerData);
    } else {
        console.warn("   authoritativeLocalPlayerData is null during initializeState. Local ship will use defaults.");
    }

    /**
     * Safely retrieves a value from the server's physics config.
     * If the server value is not present, it logs a warning and uses a local fallback.
     * This makes desync issues due to missing config values obvious during development.
     * @param {object} serverPhysicsConfig - The physics object from the server.
     * @param {string} key - The key of the constant to retrieve.
     * @param {*} localConfigValue - The value from the local config.js (preferred fallback).
     * @param {*} hardcodedFallback - A hardcoded value to use if localConfigValue is also undefined.
     * @returns {*} The authoritative value for the setting.
     */
    function getSyncedValue(serverPhysicsConfig, key, localConfigValue, hardcodedFallback) {
        if (serverPhysicsConfig && serverPhysicsConfig[key] !== undefined) {
            return serverPhysicsConfig[key];
        }
        const valueToUse = localConfigValue !== undefined ? localConfigValue : hardcodedFallback;
        console.warn(`[GameState] Server did not provide physics constant '${key}'. Using local/default fallback of ${valueToUse}. This may cause desync.`);
        return valueToUse;
    }


    // **** NEW: Prioritize server-sent config, use local config as a fallback. ****
    // This ensures client prediction matches server reality.
    const settings = { 
        // World and Camera (can be sourced from server or client)
        worldMinX: serverConfig?.worldMinX ?? WORLD_MIN_X,
        worldMinY: serverConfig?.worldMinY ?? WORLD_MIN_Y,
        worldMaxX: serverConfig?.worldMaxX ?? WORLD_MAX_X,
        worldMaxY: serverConfig?.worldMaxY ?? WORLD_MAX_Y,
        worldWidth: (serverConfig?.worldMaxX - serverConfig?.worldMinX) ?? WORLD_WIDTH,
        worldHeight: (serverConfig?.worldMaxY - serverConfig?.worldMinY) ?? WORLD_HEIGHT,
        cameraOffsetX: initialSettings.cameraOffsetX ?? TARGET_CENTER_OFFSET_X,
        cameraOffsetY: initialSettings.cameraOffsetY ?? TARGET_CENTER_OFFSET_Y,
        cameraZoom: initialSettings.cameraZoom ?? config.defaultCameraZoom,

        // Critical Physics Constants (MUST match server)
        G: getSyncedValue(serverPhysics, 'G', config.G, 6.674e-11),
        pixelsPerMeter: getSyncedValue(serverPhysics, 'pixelsPerMeter', config.PIXELS_PER_METER, 0.5),
        secondsPerFrame: getSyncedValue(serverPhysics, 'secondsPerFrame', config.SECONDS_PER_FRAME, 1/60),
        planetGravityMultiplier: getSyncedValue(serverPhysics, 'planetGravityMultiplier', undefined, config.defaultPlanetGravityMultiplier * config.PLANET_GRAVITY_HUD_SCALE_FACTOR),
        planetGravityCoreRadiusFactor: getSyncedValue(serverPhysics, 'planetGravityCoreRadiusFactor', config.PLANET_GRAVITY_CORE_RADIUS_FACTOR, 0.20),
        blackHoleGravitationalConstant: getSyncedValue(serverPhysics, 'blackHoleGravitationalConstant', undefined, 0),
        bhDragZoneMultiplier: getSyncedValue(serverPhysics, 'bhDragZoneMultiplier', config.defaultBHDragZoneMultiplier, 5.0),
        bhDragCoefficientMax: getSyncedValue(serverPhysics, 'bhDragCoefficientMax', config.defaultBHDragCoefficientMax, 0.100),
        chunkLifespanFrames: getSyncedValue(serverPhysics, 'chunkLifespanFrames', config.defaultChunkLifespan, 9999),
        chunkBoundsBuffer: getSyncedValue(serverPhysics, 'chunkBoundsBuffer', undefined, 200),
        
        // --- BEGIN ADDED CODE: Receive new constants to fix desync (Bugs #3 & #4) ---
        referencePlanetMassForBHFactor: getSyncedValue(serverPhysics, 'referencePlanetMassForBHFactor', config.REFERENCE_PLANET_MASS_FOR_BH_FACTOR, 1e11),
        projectileBoundsBuffer: getSyncedValue(serverPhysics, 'projectileBoundsBuffer', undefined, 500),
        // --- END ADDED CODE ---

        // HUD-Modifiable Settings (start with defaults, can be changed by user)
        shipZoomAttractFactor: initialSettings.shipZoomAttractFactor ?? config.DEFAULT_SHIP_ZOOM_ATTRACT_FACTOR,
        planetZoomAttractFactor: initialSettings.planetZoomAttractFactor ?? config.DEFAULT_PLANET_ZOOM_ATTRACT_FACTOR,
        planetCount: initialSettings.planetCount ?? config.DEFAULT_PLANET_COUNT, 
        destructionChunkCount: initialSettings.destructionChunkCount ?? config.DEFAULT_DESTRUCTION_CHUNK_COUNT,
        destructionParticleCount: initialSettings.destructionParticleCount ?? config.DEFAULT_DESTRUCTION_PARTICLE_COUNT,
        baseDamageRadius: initialSettings.baseDamageRadius ?? config.defaultBaseDamageRadius,
        persistentChunkDrift: initialSettings.persistentChunkDrift ?? config.defaultPersistentChunkDrift,
        projectileSpeed: (initialSettings.projectileSpeed ?? config.defaultProjectileSpeed) * config.PROJECTILE_SPEED_HUD_SCALE_FACTOR,
        projectileMass: initialSettings.projectileMass ?? config.defaultProjectileMass,
        bhParticleLifeFactor: initialSettings.bhParticleLifeFactor ?? config.defaultBHParticleLifeFactor,
        bhParticleSpeedFactor: initialSettings.bhParticleSpeedFactor ?? config.defaultBHParticleSpeedFactor,
        bhParticleSpawnRate: initialSettings.bhParticleSpawnRate ?? config.defaultBHParticleSpawnRate,
        bhMaxParticles: initialSettings.bhMaxParticles ?? config.defaultBHMaxParticles,
        bhSpawnRadiusMinFactor: initialSettings.bhSpawnRadiusMinFactor ?? config.defaultBHSpawnRadiusMinFactor,
        bhSpawnRadiusMaxFactor: initialSettings.bhSpawnRadiusMaxFactor ?? config.defaultBHSpawnRadiusMaxFactor,
        bhParticleMinSize: initialSettings.bhParticleMinSize ?? config.defaultBHParticleMinSize,
        bhParticleMaxSize: initialSettings.bhParticleMaxSize ?? config.defaultBHParticleMaxSize,
        bhInitialInwardFactor: initialSettings.bhInitialInwardFactor ?? config.defaultBHInitialInwardFactor,
        bhInitialAngularFactor: initialSettings.bhInitialAngularFactor ?? config.defaultBHInitialAngularFactor,
        bhGravityFactor: initialSettings.bhGravityFactor ?? config.defaultBHGravityFactor,
        blackHoleEventHorizonRadius: initialSettings.blackHoleEventHorizonRadius ?? config.DEFAULT_BH_EVENT_HORIZON_RADIUS,
        chunkMaxSpeedThreshold: initialSettings.chunkMaxSpeedThreshold ?? config.defaultChunkMaxSpeed,
        coreExplosionDuration: initialSettings.coreExplosionDuration ?? config.defaultCoreExplosionDuration,
        coreImplosionDuration: initialSettings.coreImplosionDuration ?? config.defaultCoreImplosionDuration,
        craterScalingC: initialSettings.craterScalingC ?? config.defaultCraterScalingC,
        keToMassEjectEta: initialSettings.keToMassEjectEta ?? config.defaultKEToMassEjectEta,
        bhEnergyMultiplier: initialSettings.bhEnergyMultiplier ?? config.defaultBHEnergyMultiplier,

        // Other settings that are client-only or derived
        gameFps: config.GAME_FPS,
        clientShipDefaultHealth: 100, 
    };

    const localPlayerShip = new Ship(
        authoritativeLocalPlayerData?.socketId || `local_init_id_${Date.now()}`, 
        authoritativeLocalPlayerData?.playerName || 'LocalPlayer',
        authoritativeLocalPlayerData?.x !== undefined ? authoritativeLocalPlayerData.x : WORLD_CENTER_X + config.SHIP_INITIAL_X_OFFSET_PX,
        authoritativeLocalPlayerData?.y !== undefined ? authoritativeLocalPlayerData.y : WORLD_CENTER_Y + config.SHIP_INITIAL_Y_OFFSET_PX,
        authoritativeLocalPlayerData?.angle !== undefined ? authoritativeLocalPlayerData.angle : -Math.PI / 2,
        authoritativeLocalPlayerData?.shipColor || config.SHIP_COLOR,
        authoritativeLocalPlayerData?.health !== undefined ? authoritativeLocalPlayerData.health : settings.clientShipDefaultHealth, 
        authoritativeLocalPlayerData?.isAlive !== undefined ? authoritativeLocalPlayerData.isAlive : true                     
    );
    localPlayerShip.isLocalPlayer = true;
    if(authoritativeLocalPlayerData) { 
        localPlayerShip.health = authoritativeLocalPlayerData.health;
        localPlayerShip.isAlive = authoritativeLocalPlayerData.isAlive;
    }

    currentState = {
        settings: settings,
        planets: [], 
        particles: [], chunks: [], bhParticles: [], projectiles: [],
        ship: localPlayerShip, 
        remotePlayers: {},     
        clickState: 'idle', firstClickCoords: null, currentMousePos: null, worldMousePos: null,
        canvasWidth: canvasWidth, canvasHeight: canvasHeight,
    };

    if (serverPlanets) {
        currentState.planets = serverPlanets.map(serverPlanet => {
            return { ...serverPlanet }; 
        });
        console.log(`   Populated ${currentState.planets.length} planets from server data.`);
    } else {
        console.warn("   No planet data received from server, or data was malformed during init. World will be empty of planets.");
    }
    
    updateRemotePlayerShips(); 

    console.log(`>>> Client gameState Initialized. Local Ship ID: ${currentState.ship.id}, HP: ${currentState.ship.health}, Alive: ${currentState.ship.isAlive}. Planets loaded: ${currentState.planets.length}`);
}
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=initializeStateFunction##


export function updateRemotePlayerShips() {
    if (!currentState || !currentState.settings) {
        return;
    }
    const networkPlayersData = getClientSidePlayers(); 
    const myActualSocketId = getSocketIdForLocalPlayer(); 

    for (const socketIdFromServer in networkPlayersData) {
        const playerDataFromServer = networkPlayersData[socketIdFromServer]; 
        if (!playerDataFromServer) { 
            if(currentState.remotePlayers[socketIdFromServer]) { 
                console.log(`[GameState] Removing stale remote player ${socketIdFromServer} from remotePlayers.`);
                delete currentState.remotePlayers[socketIdFromServer];
            }
            continue;
        }

        if (socketIdFromServer === myActualSocketId) {
            continue; 
        }
        
        // This is for remote players
        if (!currentState.remotePlayers[socketIdFromServer]) {
            currentState.remotePlayers[socketIdFromServer] = new Ship(
                socketIdFromServer, 
                playerDataFromServer.playerName, 
                playerDataFromServer.x, 
                playerDataFromServer.y,
                playerDataFromServer.angle, 
                playerDataFromServer.shipColor,
                playerDataFromServer.health,    
                playerDataFromServer.isAlive    
            );
            currentState.remotePlayers[socketIdFromServer].isLocalPlayer = false;
        } else {
            // Update existing remote ship instance using its setState method
            currentState.remotePlayers[socketIdFromServer].setState(
                playerDataFromServer.x, 
                playerDataFromServer.y, 
                playerDataFromServer.angle,
                playerDataFromServer.health,    
                playerDataFromServer.isAlive    
            );
            currentState.remotePlayers[socketIdFromServer].name = playerDataFromServer.playerName; 
            currentState.remotePlayers[socketIdFromServer].defaultColor = playerDataFromServer.shipColor;
            if (currentState.remotePlayers[socketIdFromServer].hitFlashTimer <= 0) {
                 currentState.remotePlayers[socketIdFromServer].color = playerDataFromServer.shipColor;
            }
        }
    }
    // Cleanup loop for remotePlayers remains the same
    for (const socketIdInState in currentState.remotePlayers) {
        if (!networkPlayersData[socketIdInState]) { 
            console.log(`[GameState] Cleaning up. Removing remote player ${socketIdInState} not in network data.`);
            delete currentState.remotePlayers[socketIdInState];
        }
    }
}

// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=getStateFunctions##
export function getState() { return currentState; }
export function getSettings() { return currentState?.settings; } 
export function getMyPlayerData() { 
    return currentState?.ship;
}
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=getStateFunctions##

// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=gameStateFileContent##