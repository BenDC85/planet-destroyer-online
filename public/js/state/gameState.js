// js/state/gameState.js


import * as config from '../config.js';
import { Ship } from '../entities/Ship.js';
import { getMyPlayerId as getSocketIdForLocalPlayer, getClientSidePlayers } from '../network.js'; 


// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=gameStateFileContent##


let currentState = {};


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
    if (authoritativeLocalPlayerData) {
        console.log("   Using authoritativeLocalPlayerData for local ship setup:", authoritativeLocalPlayerData);
    } else {
        console.warn("   authoritativeLocalPlayerData is null during initializeState. Local ship will use defaults.");
    }


    const internalDefaultProjectileSpeed = (initialSettings.projectileSpeed ?? config.defaultProjectileSpeed) * config.PROJECTILE_SPEED_HUD_SCALE_FACTOR;
    const internalDefaultPlanetGravityMultiplier = (initialSettings.planetGravityMultiplier ?? config.defaultPlanetGravityMultiplier) * config.PLANET_GRAVITY_HUD_SCALE_FACTOR;
    let bhGravityFactorToUse = config.defaultBHGravityFactor;
    if (initialSettings.bhGravityFactor !== undefined) {
        bhGravityFactorToUse = initialSettings.bhGravityFactor;
    }
    const calculatedBHGravitationalConstant = config.G * config.REFERENCE_PLANET_MASS_FOR_BH_FACTOR *
                                            internalDefaultPlanetGravityMultiplier * bhGravityFactorToUse;


    const settings = { 
        worldMinX: WORLD_MIN_X, worldMinY: WORLD_MIN_Y, worldMaxX: WORLD_MAX_X, worldMaxY: WORLD_MAX_Y,
        worldWidth: WORLD_WIDTH, worldHeight: WORLD_HEIGHT, 
        cameraOffsetX: initialSettings.cameraOffsetX ?? TARGET_CENTER_OFFSET_X,
        cameraOffsetY: initialSettings.cameraOffsetY ?? TARGET_CENTER_OFFSET_Y,
        cameraZoom: initialSettings.cameraZoom ?? config.defaultCameraZoom,
        shipZoomAttractFactor: initialSettings.shipZoomAttractFactor ?? config.DEFAULT_SHIP_ZOOM_ATTRACT_FACTOR,
        planetZoomAttractFactor: initialSettings.planetZoomAttractFactor ?? config.DEFAULT_PLANET_ZOOM_ATTRACT_FACTOR,
        planetCount: initialSettings.planetCount ?? config.DEFAULT_PLANET_COUNT, 
        destructionChunkCount: initialSettings.destructionChunkCount ?? config.DEFAULT_DESTRUCTION_CHUNK_COUNT,
        destructionParticleCount: initialSettings.destructionParticleCount ?? config.DEFAULT_DESTRUCTION_PARTICLE_COUNT,
        baseDamageRadius: initialSettings.baseDamageRadius ?? config.defaultBaseDamageRadius,
        persistentChunkDrift: initialSettings.persistentChunkDrift ?? config.defaultPersistentChunkDrift,
        projectileSpeed: internalDefaultProjectileSpeed,
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
        bhGravityFactor: bhGravityFactorToUse,
        blackHoleGravitationalConstant: calculatedBHGravitationalConstant,
        blackHoleEventHorizonRadius: initialSettings.blackHoleEventHorizonRadius ?? config.DEFAULT_BH_EVENT_HORIZON_RADIUS,
        bhDragZoneMultiplier: initialSettings.bhDragZoneMultiplier ?? config.defaultBHDragZoneMultiplier,
        bhDragCoefficientMax: initialSettings.bhDragCoefficientMax ?? config.defaultBHDragCoefficientMax,
        planetGravityMultiplier: internalDefaultPlanetGravityMultiplier,
        chunkLifespanFrames: initialSettings.chunkLifespanFrames ?? config.defaultChunkLifespan,
        chunkMaxSpeedThreshold: initialSettings.chunkMaxSpeedThreshold ?? config.defaultChunkMaxSpeed,
        coreExplosionDuration: initialSettings.coreExplosionDuration ?? config.defaultCoreExplosionDuration,
        coreImplosionDuration: initialSettings.coreImplosionDuration ?? config.defaultCoreImplosionDuration,
        G: config.G,
        pixelsPerMeter: config.PIXELS_PER_METER,
        gameFps: config.GAME_FPS,
        secondsPerFrame: config.SECONDS_PER_FRAME,
        craterScalingC: initialSettings.craterScalingC ?? config.defaultCraterScalingC,
        keToMassEjectEta: initialSettings.keToMassEjectEta ?? config.defaultKEToMassEjectEta,
        bhEnergyMultiplier: initialSettings.bhEnergyMultiplier ?? config.defaultBHEnergyMultiplier,
        referenceDensity: config.REFERENCE_DENSITY,
        referenceYieldStrength: config.REFERENCE_YIELD_STRENGTH,
        referencePlanetMassForBHFactor: config.REFERENCE_PLANET_MASS_FOR_BH_FACTOR,
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


    if (serverInitialWorldData && serverInitialWorldData.planets) {
        currentState.planets = serverInitialWorldData.planets.map(serverPlanet => {
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

    // console.log("[GameState] updateRemotePlayerShips - networkPlayersData:", JSON.parse(JSON.stringify(networkPlayersData)), "myActualSocketId:", myActualSocketId);


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
            // For the local player, primarily update health and alive status from server data,
            // as x, y, angle are controlled locally and sent to server.
            if (currentState.ship) {
                // if (currentState.ship.x !== playerDataFromServer.x) console.log("Local ship X differs from server cache"); // DEBUG
                // if (currentState.ship.angle !== playerDataFromServer.angle) console.log("Local ship Angle differs from server cache"); // DEBUG
                
                // Only update if different to avoid unnecessary churn or overwriting intermediate local changes
                if (currentState.ship.health !== playerDataFromServer.health) {
                    currentState.ship.health = playerDataFromServer.health;
                }
                if (currentState.ship.isAlive !== playerDataFromServer.isAlive) {
                    currentState.ship.isAlive = playerDataFromServer.isAlive;
                }
                // DO NOT update currentState.ship.x, y, angle here from networkPlayersData.
                // The local player's ship physics loop is authoritative for its own position/angle.
            }
            continue; 
        }
        
        // This is for remote players
        if (!currentState.remotePlayers[socketIdFromServer]) {
            // console.log(`[GameState] Creating NEW Ship instance for remote player ${playerDataFromServer.playerName} (${socketIdFromServer})`);
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
            // Ensure name and color are also kept up-to-date if they can change
            currentState.remotePlayers[socketIdFromServer].name = playerDataFromServer.playerName; 
            currentState.remotePlayers[socketIdFromServer].color = playerDataFromServer.shipColor;
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
