// server.js for Planet Destroyer Online


require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const socketIo = require('socket.io');
const { createClient } = require('@supabase/supabase-js');


// --- Server-Side Config ---
const SV_WORLD_MIN_X = -2900; const SV_WORLD_MIN_Y = -2250;
const SV_WORLD_MAX_X = 4800; const SV_WORLD_MAX_Y = 2250;
const SV_WORLD_WIDTH = SV_WORLD_MAX_X - SV_WORLD_MIN_X;
const SV_WORLD_HEIGHT = SV_WORLD_MAX_Y - SV_WORLD_MIN_Y;
const SV_PIXELS_PER_METER = 0.5;
const SV_DEFAULT_PLANET_COUNT = 6;
const SV_MIN_PLANET_RADIUS_RANGE_PX = 20;
const SV_MAX_PLANET_RADIUS_RANGE_PX = 200;
const SV_PLANET_SPAWN_BORDER_FACTOR = 1.1;
const SV_MIN_PLANET_SEPARATION_FACTOR = 2.2;
const SV_MAX_PLANET_SPAWN_ATTEMPTS_PER_PLANET = 50;
const SV_REFERENCE_DENSITY_CONFIG = 5515;
const SV_REFERENCE_YIELD_STRENGTH_CONFIG = 1e8;
const SV_PLANET_TYPES = {
    icy: { density: 1500, yieldStrength: 1e6, baseColorRGB_server: [173, 216, 230], clientColor: '#ADD8E6', displayName: "Icy Planet" },
    rocky: { density: SV_REFERENCE_DENSITY_CONFIG, yieldStrength: SV_REFERENCE_YIELD_STRENGTH_CONFIG, baseColorRGB_server: [160, 82, 45], clientColor: '#A0522D', displayName: "Rocky Planet" },
    metallic: { density: 8000, yieldStrength: 5e8, baseColorRGB_server: [169, 169, 169], clientColor: '#A9A9A9', displayName: "Metallic Planet" }
};
const SV_DEFAULT_PLANET_TYPE_KEY = 'rocky';
const SV_TARGET_CENTER_OFFSET_X = SV_WORLD_MIN_X + SV_WORLD_WIDTH / 2 - 930;
const SV_TARGET_CENTER_OFFSET_Y = SV_WORLD_MIN_Y + SV_WORLD_HEIGHT / 2;

const SV_G = 6.674e-11;
const SV_PLANET_GRAVITY_MULTIPLIER_HUD_SCALED = 15.0;
const SV_PLANET_GRAVITY_HUD_SCALE_FACTOR = 1000000.0;
const SV_PLANET_GRAVITY_MULTIPLIER_INTERNAL = SV_PLANET_GRAVITY_MULTIPLIER_HUD_SCALED * SV_PLANET_GRAVITY_HUD_SCALE_FACTOR;
const SV_REFERENCE_PLANET_MASS_FOR_BH_FACTOR = 1e11;
const SV_BH_GRAVITY_FACTOR = 5.0;
const SV_BLACK_HOLE_GRAVITATIONAL_CONSTANT = SV_G * SV_REFERENCE_PLANET_MASS_FOR_BH_FACTOR * SV_PLANET_GRAVITY_MULTIPLIER_INTERNAL * SV_BH_GRAVITY_FACTOR;
const SV_BH_EVENT_HORIZON_RADIUS_PX = 30;
const SV_BH_DRAG_ZONE_MULTIPLIER = 5.0;
const SV_BH_DRAG_COEFFICIENT_MAX = 0.100;

// Projectile & Impact Config
const SV_PROJECTILE_UPDATE_INTERVAL_MS = 50;
const SV_PROJECTILE_SIMULATION_FPS = 60;
const SV_PROJECTILE_SECONDS_PER_FRAME = 1 / SV_PROJECTILE_SIMULATION_FPS;
const SV_PROJECTILE_MAX_LIFESPAN_FRAMES = 4000;
const SV_PROJECTILE_BOUNDS_BUFFER = 500;
const SV_PROJECTILE_SIZE_PX = 5;
const SV_CRATER_SCALING_C = 1.0e-1;
const SV_KE_TO_MASS_EJECT_ETA = 3e+1;
const SV_VELOCITY_SCALING_BASELINE_MPS = 50;
const SV_VELOCITY_SCALING_EXPONENT_CRATER_EFFECT = 0.25;
const SV_VELOCITY_SCALING_EXPONENT_MASS_EJECT = 0.15;

// Destruction Thresholds & Durations
const SV_BH_ENERGY_MULTIPLIER = 2.0;
const SV_MASS_LOSS_DESTRUCTION_THRESHOLD_FACTOR = 0.60;
const SV_MAX_CRATER_COUNT_FOR_DESTRUCTION_THRESHOLD = 75;
const SV_MIN_MASS_LOSS_FOR_CRATER_COUNT_DESTRUCTION = 0.50;
const SV_VISUAL_HOLLOWNESS_DESTRUCTION_THRESHOLD = 0.75;
const SV_BREAKUP_DURATION_FRAMES = 30;
const SV_CORE_EXPLOSION_DURATION_FRAMES = 45;
const SV_CORE_IMPLOSION_DURATION_FRAMES = 22;
const SV_CORE_EFFECT_OVERLAP_FRAMES = 5;
const SV_CHUNK_GRACE_PERIOD_DURATION_FRAMES = 20;

// Server-Side Chunk Config
const SV_CHUNK_SIMULATION_FPS = SV_PROJECTILE_SIMULATION_FPS;
const SV_CHUNK_SECONDS_PER_FRAME = 1 / SV_CHUNK_SIMULATION_FPS;
const SV_DEFAULT_DESTRUCTION_CHUNK_COUNT = 40;
const SV_CHUNK_MAX_GENERATION_ATTEMPTS_FACTOR = 15;
const SV_CHUNK_LIFESPAN_FRAMES = 9999;
const SV_CHUNK_DEFAULT_BASE_SIZE_MIN = 8;
const SV_CHUNK_DEFAULT_BASE_SIZE_RANDOM_RANGE = 24;
const SV_CHUNK_MASS_AREA_FACTOR = 0.1;
const SV_CHUNK_DEFAULT_ANGULAR_VELOCITY_FACTOR = 0.05;
const SV_CHUNK_INITIAL_RADIAL_SPEED_MIN = 0.5;
const SV_CHUNK_INITIAL_RADIAL_SPEED_RANDOM_RANGE = 3.0;
const SV_CHUNK_INITIAL_TANGENTIAL_SPEED_FACTOR_MIN = 0.2;
const SV_CHUNK_INITIAL_TANGENTIAL_SPEED_FACTOR_RANDOM_RANGE = 1.8;
const SV_CHUNK_DEFAULT_NUM_POINTS_MIN = 5;
const SV_CHUNK_DEFAULT_NUM_POINTS_RANDOM_RANGE = 4;
const SV_CHUNK_POINT_DISTANCE_FACTOR_MIN = 0.6;
const SV_CHUNK_POINT_DISTANCE_FACTOR_RANDOM_RANGE = 0.8;
const SV_CHUNK_POINT_ANGLE_INCREMENT_BASE_FACTOR = 1.5;
const SV_CHUNK_POINT_ANGLE_RANDOM_FACTOR = 0.5;
const SV_CHUNK_BOUNDS_BUFFER = 200;
const SV_CHUNK_IMPACT_CRATER_SCALE_FACTOR = 1;
const SV_CHUNK_IMPACT_MASS_EJECT_SCALE_FACTOR = 1;
const SV_CHUNK_IMPACT_ENERGY_SCALE_FACTOR = 1;


// Ship Combat & Spawn Config
const SV_SHIP_RADIUS_PX = 12.5;
const SV_SHIP_DEFAULT_HEALTH = 100;
const SV_PROJECTILE_DAMAGE = 25;
const SV_CHUNK_DAMAGE = 15;
const SV_SHIP_RESPAWN_DELAY_MS = 5000;
const SV_SHIP_SPAWN_SAFETY_RADIUS_FACTOR = 3.0;
const SV_MAX_PLAYER_SPAWN_ATTEMPTS = 100;
const SV_PLAYER_SPAWN_WORLD_PADDING_FACTOR = 5;
// --- End Server-Side Config ---

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = process.env.PORT || 3000;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) { console.error("CRITICAL ERROR: Supabase URL or Key is missing."); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);
console.log("Supabase client initialized.");
const publicDirectoryPath = path.join(__dirname, 'public');
app.use(express.static(publicDirectoryPath));

let players = {};
let playerNumberAssigner = 0;
const MAX_PLAYERS = 5;
let serverPlanetsState = [];
let nextServerPlanetId = 0;
let serverProjectiles = [];
let nextProjectileId = 0;
let serverChunks = [];
let nextServerChunkId = 0;

// Helper function to get a display name for a planet
function getPlanetDisplayName(planet) {
    const planetTypeInfo = SV_PLANET_TYPES[planet.type];
    const baseName = planetTypeInfo && planetTypeInfo.displayName ? planetTypeInfo.displayName : "Planet";
    const idSuffix = planet.id.split('_').pop(); // Get number part of id
    return `${baseName} #${idSuffix}`;
}

function serverDistanceSq(p1, p2) { const dx = p1.x - p2.x; const dy = p1.y - p2.y; return dx * dx + dy * dy;}
function serverIsPointInsideCircle(px, py, cx, cy, r) {if (r <= 0) return false; const dx = px - cx; const dy = py - cy; return dx * dx + dy * dy < r * r;}
function serverIsPointInsideAnyCrater(px, py, planet) { if (!planet || !planet.craters || planet.craters.length === 0) return false; for (const crater of planet.craters) { if (crater.radius <= 0) continue; if (serverIsPointInsideCircle(px, py, crater.x, crater.y, crater.radius)) {return true;}} return false;}
function serverCalculateBindingEnergy(planetMassKg, planetRadiusM) {if (!SV_G || !planetMassKg || !planetRadiusM || planetMassKg <= 0 || planetRadiusM <= 0) {return 0;} return (3 / 5) * SV_G * (planetMassKg ** 2) / planetRadiusM;}
function serverFindAccurateImpactPoint(p1, p2, planet) {const segmentDx = p2.x - p1.x; const segmentDy = p2.y - p1.y; const segmentLenSq = segmentDx * segmentDx + segmentDy * segmentDy; if (segmentLenSq < 1e-6) { const isP1Boundary = serverIsPointInsideCircle(p1.x, p1.y, planet.x, planet.y, planet.radius);  const isP1Crater = serverIsPointInsideAnyCrater(p1.x, p1.y, planet); if (isP1Boundary && !isP1Crater) { return { t: 0, point: { x: p1.x, y: p1.y } }; } return null; } const segmentLen = Math.sqrt(segmentLenSq); const numSteps = Math.min(Math.max(5, Math.ceil(segmentLen / (SV_PROJECTILE_SIZE_PX * 2))), 30);  if (serverIsPointInsideCircle(p1.x, p1.y, planet.x, planet.y, planet.radius) && !serverIsPointInsideAnyCrater(p1.x, p1.y, planet)) { return { t: 0, point: { x: p1.x, y: p1.y } }; } for (let i = 0; i <= numSteps; i++) { const t = (numSteps === 0) ? 0 : (i / numSteps); const testX = p1.x + t * segmentDx; const testY = p1.y + t * segmentDy; if (serverIsPointInsideCircle(testX, testY, planet.x, planet.y, planet.radius) && !serverIsPointInsideAnyCrater(testX, testY, planet)) { return { t: t, point: { x: testX, y: testY } }; } } return null;}

function findRandomSafeSpawnPoint() {
    const safetyBufferFromPlanet = SV_SHIP_RADIUS_PX * SV_SHIP_SPAWN_SAFETY_RADIUS_FACTOR;
    const worldEdgePadding = SV_SHIP_RADIUS_PX * SV_PLAYER_SPAWN_WORLD_PADDING_FACTOR;
    let spawnPoint = null;
    for (let i = 0; i < SV_MAX_PLAYER_SPAWN_ATTEMPTS; i++) {
        const x = (SV_WORLD_MIN_X + worldEdgePadding) + Math.random() * (SV_WORLD_WIDTH - 2 * worldEdgePadding);
        const y = (SV_WORLD_MIN_Y + worldEdgePadding) + Math.random() * (SV_WORLD_HEIGHT - 2 * worldEdgePadding);
        let isSafe = true;
        for (const planet of serverPlanetsState) {
            if ((planet.isDestroyed && !planet.isBlackHole) || (!planet.isBlackHole && planet.radius <= 0)) { continue; }
            let planetEffectiveRadius; let requiredDistance;
            if (planet.isBlackHole) {
                planetEffectiveRadius = SV_BH_EVENT_HORIZON_RADIUS_PX * SV_BH_DRAG_ZONE_MULTIPLIER;
                requiredDistance = planetEffectiveRadius + safetyBufferFromPlanet;
            } else {
                planetEffectiveRadius = planet.radius;
                requiredDistance = planetEffectiveRadius + safetyBufferFromPlanet;
            }
            const distSq = serverDistanceSq({ x, y }, { x: planet.x, y: planet.y });
            if (distSq < requiredDistance * requiredDistance) { isSafe = false; break; }
        }
        if (isSafe) { spawnPoint = { x, y }; break; }
    }
    if (!spawnPoint) {
        console.warn(`[SERVER] Failed to find a random safe spawn point after ${SV_MAX_PLAYER_SPAWN_ATTEMPTS} attempts. Spawning near pre-defined offset as fallback.`);
        return { x: SV_TARGET_CENTER_OFFSET_X, y: SV_TARGET_CENTER_OFFSET_Y };
    }
    return spawnPoint;
}

function generatePlanetsOnServer(numPlanetsOverride = null) {
    serverPlanetsState = [];
    nextServerPlanetId = 0;
    const numPlanets = numPlanetsOverride !== null ? numPlanetsOverride : SV_DEFAULT_PLANET_COUNT;
    console.log(`[SERVER] Generating ${numPlanets} planets...`);
    const planetTypesArray = Object.keys(SV_PLANET_TYPES);
    for (let i = 0; i < numPlanets; i++) {
        let attempts = 0; let placed = false;
        while (attempts < SV_MAX_PLANET_SPAWN_ATTEMPTS_PER_PLANET && !placed) {
            attempts++;
            const radius_pixels = SV_MIN_PLANET_RADIUS_RANGE_PX + Math.random() * (SV_MAX_PLANET_RADIUS_RANGE_PX - SV_MIN_PLANET_RADIUS_RANGE_PX);
            const radius_m = radius_pixels / SV_PIXELS_PER_METER;
            const spawnMinX = SV_WORLD_MIN_X + radius_pixels * SV_PLANET_SPAWN_BORDER_FACTOR;
            const spawnMaxX = SV_WORLD_MAX_X - radius_pixels * SV_PLANET_SPAWN_BORDER_FACTOR;
            const spawnMinY = SV_WORLD_MIN_Y + radius_pixels * SV_PLANET_SPAWN_BORDER_FACTOR;
            const spawnMaxY = SV_WORLD_MAX_Y - radius_pixels * SV_PLANET_SPAWN_BORDER_FACTOR;
            if (spawnMaxX <= spawnMinX || spawnMaxY <= spawnMinY) { continue; }
            const x = spawnMinX + Math.random() * (spawnMaxX - spawnMinX);
            const y = spawnMinY + Math.random() * (spawnMaxY - spawnMinY);
            let overlaps = false;
            for (const existingPlanet of serverPlanetsState) {
                const distSq = serverDistanceSq({ x, y }, existingPlanet);
                const requiredSeparation = (radius_pixels + existingPlanet.radius) * SV_MIN_PLANET_SEPARATION_FACTOR;
                if (distSq < requiredSeparation * requiredSeparation) { overlaps = true; break; }
            }
            if (!overlaps) {
                const pTypeKey = planetTypesArray[Math.floor(Math.random() * planetTypesArray.length)] || SV_DEFAULT_PLANET_TYPE_KEY;
                const pTypeData = SV_PLANET_TYPES[pTypeKey];
                const volume_m3 = (4 / 3) * Math.PI * Math.pow(radius_m, 3);
                const initialMassKg = volume_m3 * pTypeData.density;
                if (initialMassKg <= 0) { continue; }
                serverPlanetsState.push({
                    id: `srv_planet_${nextServerPlanetId++}`, type: pTypeKey, x, y, radius: radius_pixels, originalRadius: radius_pixels, radius_m,
                    massKg: initialMassKg, originalMassKg: initialMassKg, color: pTypeData.clientColor, density: pTypeData.density, yieldStrength: pTypeData.yieldStrength,
                    craters: [], isBreakingUp: false, breakupFrame: 0, lastImpactPoint: null, isDestroying: false, willBecomeBlackHole: false, isBlackHole: false, isDestroyed: false,
                    explosionFrame: 0, destructionElapsedTime: 0, chunkGracePeriodFrame: 0, shockwave2ReversalStartRadius: null, bhParticlesSpawnedCount: 0,
                    cumulativeImpactEnergy: 0, cumulativeCraterAreaEffect: 0, originalSurfaceArea: Math.PI * radius_pixels * radius_pixels
                });
                placed = true;
            }
        }
        if (!placed) console.warn(`[SERVER] Failed to place planet ${i+1} after ${SV_MAX_PLANET_SPAWN_ATTEMPTS_PER_PLANET} attempts.`);
    }
    console.log(`[SERVER] Successfully generated ${serverPlanetsState.length} planets.`);
}
generatePlanetsOnServer();

io.on('connection', (socket) => {
    console.log(`--- Client connected: ${socket.id} (Awaiting join request) ---`);
    socket.on('joinGame', (joinData) => {
        const { userId, playerName, shipColor } = joinData || {};
        if (!userId || typeof userId !== 'string' || userId.trim().length === 0 || !playerName || typeof playerName !== 'string' || playerName.trim().length === 0 || !shipColor || typeof shipColor !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(shipColor)) { let errorMsg = "Invalid join data:"; if (!userId || userId.trim().length === 0) errorMsg += " User ID missing."; if (!playerName || playerName.trim().length === 0) errorMsg += " Player Name missing."; if (!shipColor || !/^#[0-9A-Fa-f]{6}$/.test(shipColor)) errorMsg += " Ship Color invalid."; console.log(`Join attempt failed for socket ${socket.id}: ${errorMsg}`); socket.emit('join_fail', errorMsg); socket.disconnect(true); return; }
        const trimmedUserId = userId.trim(); const trimmedPlayerName = playerName.trim();
        for (const id in players) { if (players[id].userId === trimmedUserId) { socket.emit('join_fail', 'This User ID is already in the game. Try a different ID.'); socket.disconnect(true); return; } }
        if (Object.keys(players).length >= MAX_PLAYERS) { socket.emit('join_fail', 'Sorry, the game is currently full.'); socket.disconnect(true); return; }
        playerNumberAssigner++;
        if (Object.keys(players).length === 0) playerNumberAssigner = 1;
        const spawnPoint = findRandomSafeSpawnPoint();
        const initialAngle = Math.random() * Math.PI * 2;
        players[socket.id] = {
            socketId: socket.id, playerNumber: playerNumberAssigner, userId: trimmedUserId, playerName: trimmedPlayerName, shipColor: shipColor,
            x: spawnPoint.x, y: spawnPoint.y, angle: initialAngle, health: SV_SHIP_DEFAULT_HEALTH, isAlive: true, lastFireTime: 0
        };
        console.log(`Socket ${socket.id} joined as Player ${players[socket.id].playerNumber} (Name: \"${trimmedPlayerName}\", HP: ${players[socket.id].health}) at (${spawnPoint.x.toFixed(0)}, ${spawnPoint.y.toFixed(0)})`);
        socket.emit('join_success', { myPlayerData: players[socket.id], allPlayers: players, planets: serverPlanetsState  });
        socket.broadcast.emit('player_joined', players[socket.id]); io.emit('server_message', `${trimmedPlayerName} (Player ${players[socket.id].playerNumber}) has joined. (${Object.keys(players).length}/${MAX_PLAYERS})`);
    });
    socket.on('ship_update', (shipData) => { const player = players[socket.id]; if (player && player.isAlive && shipData) { player.x = shipData.x; player.y = shipData.y; player.angle = shipData.angle; socket.broadcast.emit('player_moved', { socketId: socket.id, x: shipData.x, y: shipData.y, angle: shipData.angle }); } });
    socket.on('request_fire_projectile', (projectileData) => { const player = players[socket.id]; if (!player || !player.isAlive) { return; } if (!projectileData || typeof projectileData.startX !== 'number' || typeof projectileData.massKg !== 'number') { console.warn(`[SERVER] Invalid projectile data from ${player.playerName} (${socket.id})`); return; } const FIRE_RATE_MS = 160; const now = Date.now(); if (now - player.lastFireTime < FIRE_RATE_MS) { return; } player.lastFireTime = now; const serverProjId = `srv_proj_${nextProjectileId++}`; const initialSpeed = projectileData.initialSpeedInternalPxFrame; const vx = Math.cos(projectileData.angle) * initialSpeed; const vy = Math.sin(projectileData.angle) * initialSpeed; const newServerProjectile = { id: serverProjId, ownerShipId: player.socketId, x: projectileData.startX, y: projectileData.startY, prevX: projectileData.startX, prevY: projectileData.startY, vx: vx, vy: vy, angle: projectileData.angle, initialSpeedInternalPxFrame: initialSpeed, massKg: projectileData.massKg, isActive: true, framesAlive: 0, }; serverProjectiles.push(newServerProjectile); io.emit('new_projectile_created', newServerProjectile); });
    socket.on('request_world_reset', (clientSuggestedSettings) => {
        console.log(`[SERVER] Received 'request_world_reset' from ${players[socket.id]?.playerName || socket.id}.`);
        let numPlanetsForReset = SV_DEFAULT_PLANET_COUNT;
        if (clientSuggestedSettings && typeof clientSuggestedSettings.planetCount === 'number' && clientSuggestedSettings.planetCount >= 1 && clientSuggestedSettings.planetCount <= 50) { numPlanetsForReset = clientSuggestedSettings.planetCount; }
        generatePlanetsOnServer(numPlanetsForReset);
        serverProjectiles = []; nextProjectileId = 0; serverChunks = []; nextServerChunkId = 0;
        Object.values(players).forEach((player) => {
            const spawnPoint = findRandomSafeSpawnPoint();
            player.x = spawnPoint.x; player.y = spawnPoint.y; player.angle = Math.random() * Math.PI * 2;
            player.lastFireTime = 0; player.health = SV_SHIP_DEFAULT_HEALTH; player.isAlive = true;
            io.to(player.socketId).emit('player_state_reset', player);
        });
        const newWorldData = { planets: serverPlanetsState, }; io.emit('world_reset_data', newWorldData);
        io.emit('server_message', `The world has been reset by ${players[socket.id]?.playerName || 'an admin'}!`);
    });
    socket.on('disconnect', () => {
        const disconnectedPlayerData = players[socket.id];
        if (disconnectedPlayerData) {
            console.log(`--- Client disconnected: ${socket.id} (was Player ${disconnectedPlayerData.playerNumber}, Name: \"${disconnectedPlayerData.playerName}\") ---`);
            delete players[socket.id];
            io.emit('player_left', { socketId: socket.id, playerName: disconnectedPlayerData.playerName });
            io.emit('server_message', `${disconnectedPlayerData.playerName} has disconnected. (${Object.keys(players).length}/${MAX_PLAYERS})`);
            if (Object.keys(players).length === 0) {
                playerNumberAssigner = 0; console.log("All players disconnected. Resetting world and clearing entities.");
                generatePlanetsOnServer(); serverProjectiles = []; nextProjectileId = 0; serverChunks = []; nextServerChunkId = 0;
            }
        } else { console.log(`--- Client disconnected: ${socket.id} (was not an active player or already removed) ---`); }
    });
});

function generateServerChunks(planet, impactPoint) { const newChunks = []; const targetChunkCount = SV_DEFAULT_DESTRUCTION_CHUNK_COUNT; let chunksGenerated = 0; let attempts = 0; const maxAttempts = targetChunkCount * SV_CHUNK_MAX_GENERATION_ATTEMPTS_FACTOR; const cratersToConsider = planet.craters; console.log(`[SERVER] Generating ~${targetChunkCount} chunks for planet ${planet.id} at impact (${impactPoint.x.toFixed(0)}, ${impactPoint.y.toFixed(0)})`); const spinDirection = planet.spinDirection || (Math.random() < 0.5 ? 1 : -1); const spinMagnitude = planet.spinMagnitude || ((SV_CHUNK_INITIAL_RADIAL_SPEED_MIN + SV_CHUNK_INITIAL_RADIAL_SPEED_RANDOM_RANGE / 2) * 0.5); while (chunksGenerated < targetChunkCount && attempts < maxAttempts) { attempts++; const angle = Math.random() * Math.PI * 2; const radius = Math.random() * planet.originalRadius; const potentialX = planet.x + Math.cos(angle) * radius; const potentialY = planet.y + Math.sin(angle) * radius; const isInsideCraterCheck = serverIsPointInsideAnyCrater(potentialX, potentialY, { craters: cratersToConsider, x: planet.x, y: planet.y }); const isInsideOriginal = serverIsPointInsideCircle(potentialX, potentialY, planet.x, planet.y, planet.originalRadius); if (isInsideOriginal && !isInsideCraterCheck) { const chunkAngle = Math.atan2(potentialY - planet.y, potentialX - planet.x); const chunkSize = SV_CHUNK_DEFAULT_BASE_SIZE_MIN + Math.random() * SV_CHUNK_DEFAULT_BASE_SIZE_RANDOM_RANGE; const chunkPoints = []; const numPoints = SV_CHUNK_DEFAULT_NUM_POINTS_MIN + Math.floor(Math.random() * SV_CHUNK_DEFAULT_NUM_POINTS_RANDOM_RANGE); let lastAngleForShape = Math.random() * Math.PI * 0.5; for (let k = 0; k < numPoints; k++) { const dist = chunkSize * (SV_CHUNK_POINT_DISTANCE_FACTOR_MIN + Math.random() * SV_CHUNK_POINT_DISTANCE_FACTOR_RANDOM_RANGE); const currentAngleForShape = lastAngleForShape + (Math.PI / (numPoints / SV_CHUNK_POINT_ANGLE_INCREMENT_BASE_FACTOR)) + (Math.random() - 0.5) * SV_CHUNK_POINT_ANGLE_RANDOM_FACTOR; chunkPoints.push({ x: Math.cos(currentAngleForShape) * dist, y: Math.sin(currentAngleForShape) * dist }); lastAngleForShape = currentAngleForShape; } const radialSpeed = SV_CHUNK_INITIAL_RADIAL_SPEED_MIN + Math.random() * SV_CHUNK_INITIAL_RADIAL_SPEED_RANDOM_RANGE; const radialVx = Math.cos(chunkAngle) * radialSpeed; const radialVy = Math.sin(chunkAngle) * radialSpeed; const tangentialSpeedFactor = SV_CHUNK_INITIAL_TANGENTIAL_SPEED_FACTOR_MIN + Math.random() * SV_CHUNK_INITIAL_TANGENTIAL_SPEED_FACTOR_RANDOM_RANGE; const randomTangentialSpeed = radialSpeed * tangentialSpeedFactor; const randomDirection = Math.random() < 0.5 ? 1 : -1; const randomTangentialVx = -Math.sin(chunkAngle) * randomTangentialSpeed * randomDirection; const randomTangentialVy = Math.cos(chunkAngle) * randomTangentialSpeed * randomDirection; const spinVx = -Math.sin(chunkAngle) * spinMagnitude * spinDirection; const spinVy = Math.cos(chunkAngle) * spinMagnitude * spinDirection; const newChunk = { id: `srv_chk_${nextServerChunkId++}`, originPlanetId: planet.id, x: potentialX, y: potentialY, prevX: potentialX, prevY: potentialY, vx: radialVx + randomTangentialVx + spinVx, vy: radialVy + randomTangentialVy + spinVy, angle: Math.random() * Math.PI * 2, angularVelocity: (Math.random() - 0.5) * SV_CHUNK_DEFAULT_ANGULAR_VELOCITY_FACTOR, size: chunkSize, points: chunkPoints, massKg: Math.max(1, Math.round((chunkSize * chunkSize) * SV_CHUNK_MASS_AREA_FACTOR)), isActive: true, framesAlive: 0 }; serverChunks.push(newChunk); newChunks.push(newChunk); chunksGenerated++; } } if (newChunks.length > 0) { io.emit('chunks_created', newChunks); } console.log(`[SERVER] Generated ${chunksGenerated} server-side chunks for planet ${planet.id}.`); }

function updateServerProjectiles() {
    if (serverProjectiles.length === 0) return;
    for (let i = serverProjectiles.length - 1; i >= 0; i--) {
        const proj = serverProjectiles[i];
        if (!proj.isActive) continue;
        proj.prevX = proj.x; proj.prevY = proj.y;
        let totalAccX_pixels = 0; let totalAccY_pixels = 0; let wasAbsorbedThisFrame = false;
        serverPlanetsState.forEach(planet => {
            if (!proj.isActive) return; if (planet.isDestroyed || planet.isBreakingUp || planet.isDestroying || planet.massKg <= 0) { if (!planet.isBlackHole && !planet.willBecomeBlackHole) return; } const dx_pixels = planet.x - proj.x; const dy_pixels = planet.y - proj.y; const distSq_pixels = dx_pixels * dx_pixels + dy_pixels * dy_pixels; if (distSq_pixels < 1.0 && !planet.isBlackHole) return; if ((planet.isBlackHole || planet.willBecomeBlackHole) && distSq_pixels < 0.01) return; const dist_pixels = Math.sqrt(distSq_pixels); const dist_m = dist_pixels / SV_PIXELS_PER_METER; let accelerationMagnitude_mps2 = 0; if (planet.isBlackHole || planet.willBecomeBlackHole) { if (dist_m > 0) { accelerationMagnitude_mps2 = SV_BLACK_HOLE_GRAVITATIONAL_CONSTANT / (dist_m * dist_m); } const ehRadius = SV_BH_EVENT_HORIZON_RADIUS_PX; const dragZoneOuterRadius = ehRadius * SV_BH_DRAG_ZONE_MULTIPLIER; if (dist_pixels < dragZoneOuterRadius && dist_pixels > ehRadius) { const normalizedDistInZone = (dragZoneOuterRadius - dist_pixels) / (dragZoneOuterRadius - ehRadius); const dragCoeff = SV_BH_DRAG_COEFFICIENT_MAX * normalizedDistInZone; proj.vx *= (1 - dragCoeff); proj.vy *= (1 - dragCoeff); } if (distSq_pixels <= ehRadius * ehRadius) { proj.isActive = false; wasAbsorbedThisFrame = true; console.log(`[SERVER] Projectile ${proj.id} absorbed by Black Hole ${planet.id}`); return; } } else if (planet.massKg > 0 && planet.radius_m > 0.01) { const effectiveG = SV_G * SV_PLANET_GRAVITY_MULTIPLIER_INTERNAL; const M = planet.massKg; const R_planet_m = planet.radius_m; if (dist_m >= R_planet_m) { accelerationMagnitude_mps2 = (effectiveG * M) / (dist_m * dist_m); } else { accelerationMagnitude_mps2 = (effectiveG * M * dist_m) / (R_planet_m * R_planet_m * R_planet_m); } } if (accelerationMagnitude_mps2 > 0) { const accX_mps2 = (dx_pixels / dist_pixels) * accelerationMagnitude_mps2; const accY_mps2 = (dy_pixels / dist_pixels) * accelerationMagnitude_mps2; const scaleFactor = SV_PIXELS_PER_METER * SV_PROJECTILE_SECONDS_PER_FRAME * SV_PROJECTILE_SECONDS_PER_FRAME; totalAccX_pixels += accX_mps2 * scaleFactor; totalAccY_pixels += accY_mps2 * scaleFactor; }
        });
        if (wasAbsorbedThisFrame || !proj.isActive) continue;
        proj.vx += totalAccX_pixels; proj.vy += totalAccY_pixels; proj.x += proj.vx; proj.y += proj.vy; proj.framesAlive++;
        if (proj.isActive) {
            for (const playerId in players) {
                const player = players[playerId];
                if (!player.isAlive) continue;
                const distSqToShip = serverDistanceSq(proj, player);
                const effectiveShipRadius = SV_SHIP_RADIUS_PX * 1.25;
                const collisionDist = effectiveShipRadius + (SV_PROJECTILE_SIZE_PX / 2);
                if (distSqToShip < collisionDist * collisionDist) {
                    proj.isActive = false; player.health -= SV_PROJECTILE_DAMAGE;
                    console.log(`[SERVER] Projectile ${proj.id} (owner: ${proj.ownerShipId}) HIT SHIP ${player.socketId}. Player Health: ${player.health}`);
                    io.emit('ship_hit', { projectileId: proj.id, hitPlayerId: player.socketId, newHealth: player.health, shooterId: proj.ownerShipId });
                    if (player.health <= 0) {
                        player.isAlive = false; player.health = 0;
                        const killerName = players[proj.ownerShipId]?.playerName || (proj.ownerShipId === player.socketId ? 'Self' : 'Unknown');
                        console.log(`[SERVER] Ship ${player.socketId} (${player.playerName}) DESTROYED by projectile ${proj.id} from ${killerName}.`);
                        io.emit('ship_destroyed', { destroyedShipId: player.socketId, destroyedShipName: player.playerName, killerId: proj.ownerShipId, killerName: killerName });
                        setTimeout(() => {
                            if (players[player.socketId]) {
                                const respawnPlayer = players[player.socketId];
                                respawnPlayer.isAlive = true; respawnPlayer.health = SV_SHIP_DEFAULT_HEALTH;
                                const respawnPoint = findRandomSafeSpawnPoint();
                                respawnPlayer.x = respawnPoint.x; respawnPlayer.y = respawnPoint.y; respawnPlayer.angle = Math.random() * Math.PI * 2;
                                console.log(`[SERVER] Ship ${respawnPlayer.socketId} (${respawnPlayer.playerName}) RESPAWNED.`);
                                io.emit('player_respawned', respawnPlayer);
                            }
                        }, SV_SHIP_RESPAWN_DELAY_MS);
                    }
                    break;
                }
            }
        }
        if (proj.isActive) {
            for (const planet of serverPlanetsState) {
                if (planet.isBlackHole || planet.willBecomeBlackHole || planet.isDestroyed || planet.isBreakingUp || planet.isDestroying || planet.massKg <= 0) { continue; }
                const projMinX = Math.min(proj.prevX, proj.x) - SV_PROJECTILE_SIZE_PX; const projMaxX = Math.max(proj.prevX, proj.x) + SV_PROJECTILE_SIZE_PX; const projMinY = Math.min(proj.prevY, proj.y) - SV_PROJECTILE_SIZE_PX; const projMaxY = Math.max(proj.prevY, proj.y) + SV_PROJECTILE_SIZE_PX;
                const planetBounds = { minX: planet.x - planet.radius, maxX: planet.x + planet.radius, minY: planet.y - planet.radius, maxY: planet.y + planet.radius, };
                if (!(projMaxX < planetBounds.minX || projMinX > planetBounds.maxX || projMaxY < planetBounds.minY || projMinY > planetBounds.maxY)) {
                    const impact = serverFindAccurateImpactPoint({x: proj.prevX, y: proj.prevY}, {x: proj.x, y: proj.y}, planet);
                    if (impact) {
                        proj.isActive = false;
                        const impactSpeed_pixels_frame = Math.sqrt(proj.vx**2 + proj.vy**2); const impactSpeed_mps = Math.max(0.1, impactSpeed_pixels_frame / SV_PIXELS_PER_METER / SV_PROJECTILE_SECONDS_PER_FRAME); const impactKE = 0.5 * proj.massKg * (impactSpeed_mps ** 2);
                        const massBeforeImpact = planet.massKg; const radiusMBeforeImpact = planet.radius_m; const bindingEnergyBeforeImpact = serverCalculateBindingEnergy(massBeforeImpact, radiusMBeforeImpact); const cumulativeEnergyAfterThisImpact = (planet.cumulativeImpactEnergy || 0) + impactKE;
                        let massEjected_kg = impactKE * SV_KE_TO_MASS_EJECT_ETA; if (SV_VELOCITY_SCALING_BASELINE_MPS > 0 && impactSpeed_mps > 0.01) { const speedRatioMass = SV_VELOCITY_SCALING_BASELINE_MPS / impactSpeed_mps; const velocityFactorMass = Math.pow(speedRatioMass, SV_VELOCITY_SCALING_EXPONENT_MASS_EJECT); massEjected_kg *= Math.max(0.1, Math.min(velocityFactorMass, 10.0)); }
                        const baseCraterRadius_m = SV_CRATER_SCALING_C * Math.pow(proj.massKg, 1/3) * Math.pow(impactSpeed_mps, 0.7); const planetDensity = planet.density;  const planetYield = planet.yieldStrength; const densityFactor = (SV_REFERENCE_DENSITY_CONFIG > 1e-9) ? (planetDensity / SV_REFERENCE_DENSITY_CONFIG) : 1.0; const strengthFactor = (SV_REFERENCE_YIELD_STRENGTH_CONFIG > 1e-9) ? (planetYield / SV_REFERENCE_YIELD_STRENGTH_CONFIG) : 1.0; const combinedModifier = Math.sqrt(densityFactor * strengthFactor); const clampedModifier = Math.max(0.5, Math.min(2.0, isNaN(combinedModifier) ? 1.0 : combinedModifier)); let finalCraterRadius_m = baseCraterRadius_m / clampedModifier; const craterRadius_pixels = Math.max(1, finalCraterRadius_m * SV_PIXELS_PER_METER);
                        planet.massKg = Math.max(0, planet.massKg - massEjected_kg); planet.cumulativeImpactEnergy = cumulativeEnergyAfterThisImpact;
                        if (planet.density > 0 && planet.massKg > 0) { const volume_m3 = planet.massKg / planet.density; planet.radius_m = Math.pow((3 * volume_m3) / (4 * Math.PI), 1 / 3); } else { planet.radius_m = 0; planet.massKg = 0;  }
                        planet.radius = planet.radius_m * SV_PIXELS_PER_METER;
                        const newCrater = { x: impact.point.x, y: impact.point.y, radius: craterRadius_pixels }; planet.craters.push(newCrater);
                        const craterArea = Math.PI * craterRadius_pixels * craterRadius_pixels; planet.cumulativeCraterAreaEffect = (planet.cumulativeCraterAreaEffect || 0) + (craterArea / 2.0);
                        console.log(`[SERVER] Projectile ${proj.id} HIT planet ${planet.id}. Mass: ${planet.massKg.toFixed(0)}kg, Radius: ${planet.radius.toFixed(1)}px, OrigMass: ${planet.originalMassKg.toExponential(2)}`);
                        io.emit('projectile_hit_planet', { projectileId: proj.id, planetId: planet.id, impactPoint: impact.point, crater: newCrater  });
                        let destructionTriggered = false; let destructionReason = "";
                        if (!planet.isBreakingUp && !planet.isDestroying && !planet.isDestroyed) {
                            const massRatio = planet.originalMassKg > 0 ? (planet.massKg / planet.originalMassKg) : 0;
                            if (bindingEnergyBeforeImpact > 0 && cumulativeEnergyAfterThisImpact > bindingEnergyBeforeImpact) { destructionTriggered = true; destructionReason = `Cumulative Impact Energy (${cumulativeEnergyAfterThisImpact.toExponential(2)} J) exceeded Binding Energy (${bindingEnergyBeforeImpact.toExponential(2)} J).`; }
                            if (!destructionTriggered && planet.originalMassKg > 0 && massRatio < SV_MASS_LOSS_DESTRUCTION_THRESHOLD_FACTOR) { destructionTriggered = true; destructionReason = `Mass Ratio (${massRatio.toFixed(3)}) fell below threshold (${SV_MASS_LOSS_DESTRUCTION_THRESHOLD_FACTOR}).`; }
                            if (!destructionTriggered && finalCraterRadius_m > radiusMBeforeImpact && massBeforeImpact > 0) { if (finalCraterRadius_m > radiusMBeforeImpact * 1.1 || radiusMBeforeImpact < 1.0) { destructionTriggered = true; destructionReason = `Visually hollowed out by large crater (Crater Radius: ${finalCraterRadius_m.toFixed(1)}m vs Planet Radius Before Hit: ${radiusMBeforeImpact.toFixed(1)}m).`; } }
                            const massLostEnoughForCraterCount = massRatio < SV_MIN_MASS_LOSS_FOR_CRATER_COUNT_DESTRUCTION;
                            if (!destructionTriggered && planet.craters.length > SV_MAX_CRATER_COUNT_FOR_DESTRUCTION_THRESHOLD && massLostEnoughForCraterCount) { destructionTriggered = true; destructionReason = `Excessive crater count (${planet.craters.length}) with significant mass loss (ratio: ${massRatio.toFixed(3)}).`; }
                            if (!destructionTriggered && planet.originalSurfaceArea > 0 && (planet.cumulativeCraterAreaEffect / planet.originalSurfaceArea) > SV_VISUAL_HOLLOWNESS_DESTRUCTION_THRESHOLD) { destructionTriggered = true; destructionReason = `Cumulative crater area (${(planet.cumulativeCraterAreaEffect / planet.originalSurfaceArea * 100).toFixed(1)}%) exceeded visual hollowness threshold.`; }
                            if (destructionTriggered) {
                                planet.isBreakingUp = true; planet.breakupFrame = 0; planet.destructionElapsedTime = 0;  planet.lastImpactPoint = { x: impact.point.x, y: impact.point.y };
                                if (bindingEnergyBeforeImpact > 0 && cumulativeEnergyAfterThisImpact > (SV_BH_ENERGY_MULTIPLIER * bindingEnergyBeforeImpact)) { planet.willBecomeBlackHole = true; } else { planet.willBecomeBlackHole = false; }
                                console.log(`[SERVER] Planet ${planet.id} is now BREAKING UP. Reason: ${destructionReason}. WillBecomeBH: ${planet.willBecomeBlackHole}`);
                                // REMOVED: io.emit('server_message', `${getPlanetDisplayName(planet)} is breaking up!`);
                                generateServerChunks(planet, impact.point);
                            }
                        }
                        io.emit('planet_update', planet); break;
                    }
                }
            }
        }
        if (proj.isActive && (proj.framesAlive > SV_PROJECTILE_MAX_LIFESPAN_FRAMES || proj.x < SV_WORLD_MIN_X - SV_PROJECTILE_BOUNDS_BUFFER || proj.x > SV_WORLD_MAX_X + SV_PROJECTILE_BOUNDS_BUFFER || proj.y < SV_WORLD_MIN_Y - SV_PROJECTILE_BOUNDS_BUFFER || proj.y > SV_WORLD_MAX_Y + SV_PROJECTILE_BOUNDS_BUFFER)) { proj.isActive = false; }
    }
    serverProjectiles = serverProjectiles.filter(p => p.isActive);
}

function updateServerChunks() {
    if (serverChunks.length === 0) return;
    for (let i = serverChunks.length - 1; i >= 0; i--) {
        const chunk = serverChunks[i];
        if (!chunk.isActive) continue;
        chunk.prevX = chunk.x; chunk.prevY = chunk.y;
        let totalAccX_pixels = 0; let totalAccY_pixels = 0; let wasAbsorbedByBH = false;

        serverPlanetsState.forEach(planet => {
            if (!chunk.isActive) return; if (planet.isDestroyed && !planet.isBlackHole) return;
            const dx_pixels = planet.x - chunk.x; const dy_pixels = planet.y - chunk.y;
            const distSq_pixels = dx_pixels * dx_pixels + dy_pixels * dy_pixels;
            if (distSq_pixels < 1.0 && !planet.isBlackHole) return; if (planet.isBlackHole && distSq_pixels < 0.01) return;
            const dist_pixels = Math.sqrt(distSq_pixels); const dist_m = dist_pixels / SV_PIXELS_PER_METER;
            let accelerationMagnitude_mps2 = 0;
            if (planet.isBlackHole || planet.willBecomeBlackHole) {
                if (dist_m > 0) { accelerationMagnitude_mps2 = SV_BLACK_HOLE_GRAVITATIONAL_CONSTANT / (dist_m * dist_m); }
                const ehRadius = SV_BH_EVENT_HORIZON_RADIUS_PX;
                if (distSq_pixels <= ehRadius * ehRadius) {
                    chunk.isActive = false; wasAbsorbedByBH = true;
                    io.emit('chunk_absorbed_by_bh', { chunkId: chunk.id, planetId: planet.id });
                    return;
                }
            } else if (planet.massKg > 0 && planet.radius_m > 0.01) {
                const effectiveG = SV_G * SV_PLANET_GRAVITY_MULTIPLIER_INTERNAL; const M = planet.massKg; const R_planet_m = planet.radius_m;
                if (dist_m >= R_planet_m) { accelerationMagnitude_mps2 = (effectiveG * M) / (dist_m * dist_m); }
                else { accelerationMagnitude_mps2 = (effectiveG * M * dist_m) / (R_planet_m * R_planet_m * R_planet_m); }
            }
            if (accelerationMagnitude_mps2 > 0) {
                const accX_mps2 = (dx_pixels / dist_pixels) * accelerationMagnitude_mps2; const accY_mps2 = (dy_pixels / dist_pixels) * accelerationMagnitude_mps2;
                const scaleFactor = SV_PIXELS_PER_METER * SV_CHUNK_SECONDS_PER_FRAME * SV_CHUNK_SECONDS_PER_FRAME;
                totalAccX_pixels += accX_mps2 * scaleFactor; totalAccY_pixels += accY_mps2 * scaleFactor;
            }
        });
        if (wasAbsorbedByBH || !chunk.isActive) continue;
        chunk.vx += totalAccX_pixels; chunk.vy += totalAccY_pixels;
        chunk.x += chunk.vx; chunk.y += chunk.vy;
        chunk.angle += chunk.angularVelocity; chunk.framesAlive++;

        if (chunk.isActive) {
            for (const planet of serverPlanetsState) {
                if (planet.isBlackHole || planet.willBecomeBlackHole || planet.isDestroyed ||
                    planet.isBreakingUp || planet.isDestroying || planet.massKg <= 0 || planet.radius <=0) {
                    continue;
                }
                const impact = serverFindAccurateImpactPoint({ x: chunk.prevX, y: chunk.prevY }, { x: chunk.x, y: chunk.y }, planet );
                if (impact) {
                    chunk.isActive = false;

                    const impactSpeed_pixels_frame = Math.sqrt(chunk.vx**2 + chunk.vy**2);
                    const impactSpeed_mps = Math.max(0.1, impactSpeed_pixels_frame / SV_PIXELS_PER_METER / SV_CHUNK_SECONDS_PER_FRAME);
                    const impactKE_chunk = 0.5 * chunk.massKg * (impactSpeed_mps ** 2);
                    const effectiveImpactKE = impactKE_chunk * SV_CHUNK_IMPACT_ENERGY_SCALE_FACTOR;

                    const massBeforeImpact = planet.massKg;
                    const radiusMBeforeImpact = planet.radius_m;
                    const bindingEnergyBeforeImpact = serverCalculateBindingEnergy(massBeforeImpact, radiusMBeforeImpact);
                    const cumulativeEnergyAfterThisImpact = (planet.cumulativeImpactEnergy || 0) + effectiveImpactKE;

                    let massEjected_kg = effectiveImpactKE * SV_KE_TO_MASS_EJECT_ETA;
                    massEjected_kg *= SV_CHUNK_IMPACT_MASS_EJECT_SCALE_FACTOR;
                    if (SV_VELOCITY_SCALING_BASELINE_MPS > 0 && impactSpeed_mps > 0.01) {
                        const speedRatioMass = SV_VELOCITY_SCALING_BASELINE_MPS / impactSpeed_mps;
                        const velocityFactorMass = Math.pow(speedRatioMass, SV_VELOCITY_SCALING_EXPONENT_MASS_EJECT);
                        massEjected_kg *= Math.max(0.1, Math.min(velocityFactorMass, 10.0));
                    }

                    const baseCraterRadius_m_proj_equiv = SV_CRATER_SCALING_C * Math.pow(chunk.massKg, 1/3) * Math.pow(impactSpeed_mps, 0.7);
                    const planetDensity = planet.density; const planetYield = planet.yieldStrength;
                    const densityFactor = (SV_REFERENCE_DENSITY_CONFIG > 1e-9) ? (planetDensity / SV_REFERENCE_DENSITY_CONFIG) : 1.0;
                    const strengthFactor = (SV_REFERENCE_YIELD_STRENGTH_CONFIG > 1e-9) ? (planetYield / SV_REFERENCE_YIELD_STRENGTH_CONFIG) : 1.0;
                    const combinedModifier = Math.sqrt(densityFactor * strengthFactor);
                    const clampedModifier = Math.max(0.5, Math.min(2.0, isNaN(combinedModifier) ? 1.0 : combinedModifier));
                    let finalCraterRadius_m_proj_equiv = baseCraterRadius_m_proj_equiv / clampedModifier;
                    const finalCraterRadius_m_chunk = finalCraterRadius_m_proj_equiv * SV_CHUNK_IMPACT_CRATER_SCALE_FACTOR;
                    const craterRadius_pixels_chunk = Math.max(1, finalCraterRadius_m_chunk * SV_PIXELS_PER_METER);

                    planet.massKg = Math.max(0, planet.massKg - massEjected_kg);
                    planet.cumulativeImpactEnergy = cumulativeEnergyAfterThisImpact;
                    if (planet.density > 0 && planet.massKg > 0) { const volume_m3 = planet.massKg / planet.density; planet.radius_m = Math.pow((3 * volume_m3) / (4 * Math.PI), 1 / 3); }
                    else { planet.radius_m = 0; planet.massKg = 0; }
                    planet.radius = planet.radius_m * SV_PIXELS_PER_METER;
                    const newCraterByChunk = { x: impact.point.x, y: impact.point.y, radius: craterRadius_pixels_chunk };
                    planet.craters.push(newCraterByChunk);
                    const craterArea = Math.PI * craterRadius_pixels_chunk * craterRadius_pixels_chunk;
                    planet.cumulativeCraterAreaEffect = (planet.cumulativeCraterAreaEffect || 0) + (craterArea / 2.0);

                    console.log(`[SERVER] Chunk ${chunk.id} DAMAGED planet ${planet.id} at (${impact.point.x.toFixed(0)}, ${impact.point.y.toFixed(0)}). New Mass: ${planet.massKg.toFixed(0)}kg`);
                    io.emit('chunk_damaged_planet', {
                        chunkId: chunk.id, planetId: planet.id, impactPoint: impact.point, newCrater: newCraterByChunk
                    });

                    let destructionTriggered = false; let destructionReason = "";
                    if (!planet.isBreakingUp && !planet.isDestroying && !planet.isDestroyed) {
                        const massRatio = planet.originalMassKg > 0 ? (planet.massKg / planet.originalMassKg) : 0;
                        if (bindingEnergyBeforeImpact > 0 && cumulativeEnergyAfterThisImpact > bindingEnergyBeforeImpact) { destructionTriggered = true; destructionReason = `CI Energy (${cumulativeEnergyAfterThisImpact.toExponential(2)} J) > BE (${bindingEnergyBeforeImpact.toExponential(2)} J) after chunk hit.`; }
                        if (!destructionTriggered && planet.originalMassKg > 0 && massRatio < SV_MASS_LOSS_DESTRUCTION_THRESHOLD_FACTOR) { destructionTriggered = true; destructionReason = `Mass Ratio (${massRatio.toFixed(3)}) < Thresh (${SV_MASS_LOSS_DESTRUCTION_THRESHOLD_FACTOR}) after chunk hit.`; }
                        if (!destructionTriggered && finalCraterRadius_m_chunk > radiusMBeforeImpact && massBeforeImpact > 0) { if (finalCraterRadius_m_chunk > radiusMBeforeImpact * 1.1 || radiusMBeforeImpact < 1.0) { destructionTriggered = true; destructionReason = `Large chunk crater (Crater Radius: ${finalCraterRadius_m_chunk.toFixed(1)}m vs Planet Radius: ${radiusMBeforeImpact.toFixed(1)}m).`; } }
                        const massLostEnoughForCraterCount = massRatio < SV_MIN_MASS_LOSS_FOR_CRATER_COUNT_DESTRUCTION;
                        if (!destructionTriggered && planet.craters.length > SV_MAX_CRATER_COUNT_FOR_DESTRUCTION_THRESHOLD && massLostEnoughForCraterCount) { destructionTriggered = true; destructionReason = `Excessive craters (${planet.craters.length}) + mass loss (ratio: ${massRatio.toFixed(3)}) after chunk hit.`; }
                        if (!destructionTriggered && planet.originalSurfaceArea > 0 && (planet.cumulativeCraterAreaEffect / planet.originalSurfaceArea) > SV_VISUAL_HOLLOWNESS_DESTRUCTION_THRESHOLD) { destructionTriggered = true; destructionReason = `Cumulative crater area (${(planet.cumulativeCraterAreaEffect / planet.originalSurfaceArea * 100).toFixed(1)}%) > Hollowness Thresh after chunk hit.`; }
                        if (destructionTriggered) {
                            planet.isBreakingUp = true; planet.breakupFrame = 0; planet.destructionElapsedTime = 0;
                            planet.lastImpactPoint = { x: impact.point.x, y: impact.point.y };
                            if (bindingEnergyBeforeImpact > 0 && cumulativeEnergyAfterThisImpact > (SV_BH_ENERGY_MULTIPLIER * bindingEnergyBeforeImpact)) { planet.willBecomeBlackHole = true; }
                            else { planet.willBecomeBlackHole = false; }
                            console.log(`[SERVER] Planet ${planet.id} BREAKING UP due to chunk impact. Reason: ${destructionReason}. WillBecomeBH: ${planet.willBecomeBlackHole}`);
                            // REMOVED: io.emit('server_message', `${getPlanetDisplayName(planet)} is breaking up due to debris impact!`);
                            generateServerChunks(planet, impact.point);
                        }
                    }
                    io.emit('planet_update', planet);
                    break;
                }
            }
        }

        if (chunk.isActive) {
            for (const playerId in players) {
                const player = players[playerId];
                if (!player.isAlive) continue;
                const effectiveShipRadius = SV_SHIP_RADIUS_PX * 1.25;
                const collisionDist = effectiveShipRadius + (chunk.size || SV_CHUNK_DEFAULT_BASE_SIZE_MIN);
                const distSqToShip = serverDistanceSq({x: chunk.x, y: chunk.y}, player);

                if (distSqToShip < collisionDist * collisionDist) {
                    chunk.isActive = false; player.health -= SV_CHUNK_DAMAGE;
                    console.log(`[SERVER] Chunk ${chunk.id} HIT SHIP ${player.socketId}. Player Health: ${player.health}`);
                    io.emit('ship_hit_by_chunk', { chunkId: chunk.id, hitPlayerId: player.socketId, newHealth: player.health });
                    if (player.health <= 0) {
                        player.isAlive = false; player.health = 0;
                        console.log(`[SERVER] Ship ${player.socketId} (${player.playerName}) DESTROYED by chunk ${chunk.id}.`);
                        io.emit('ship_destroyed_by_chunk', { destroyedShipId: player.socketId, destroyedShipName: player.playerName, chunkId: chunk.id });
                        setTimeout(() => {
                            if (players[player.socketId]) {
                                const respawnPlayer = players[player.socketId];
                                respawnPlayer.isAlive = true; respawnPlayer.health = SV_SHIP_DEFAULT_HEALTH;
                                const respawnPoint = findRandomSafeSpawnPoint();
                                respawnPlayer.x = respawnPoint.x; respawnPlayer.y = respawnPoint.y; respawnPlayer.angle = Math.random() * Math.PI * 2;
                                console.log(`[SERVER] Ship ${respawnPlayer.socketId} (${respawnPlayer.playerName}) RESPAWNED after chunk collision.`);
                                io.emit('player_respawned', respawnPlayer);
                            }
                        }, SV_SHIP_RESPAWN_DELAY_MS);
                    }
                    break;
                }
            }
        }

        if (chunk.isActive && (chunk.framesAlive > SV_CHUNK_LIFESPAN_FRAMES ||
            chunk.x < SV_WORLD_MIN_X - SV_CHUNK_BOUNDS_BUFFER || chunk.x > SV_WORLD_MAX_X + SV_CHUNK_BOUNDS_BUFFER ||
            chunk.y < SV_WORLD_MIN_Y - SV_CHUNK_BOUNDS_BUFFER || chunk.y > SV_WORLD_MAX_Y + SV_CHUNK_BOUNDS_BUFFER)) {
            chunk.isActive = false;
        }
    }
    serverChunks = serverChunks.filter(c => c.isActive);
}


function updateServerPlanetDestructionStates() {
    serverPlanetsState.forEach(planet => {
        if (planet.isBreakingUp) {
            planet.breakupFrame++;
            planet.destructionElapsedTime++;
            if (planet.breakupFrame >= SV_BREAKUP_DURATION_FRAMES) {
                planet.isBreakingUp = false;
                planet.isDestroying = true;
                planet.explosionFrame = 0;
                console.log(`[SERVER] Planet ${planet.id} transitioned from breaking up to DESTROYING. WillBecomeBH: ${planet.willBecomeBlackHole}`);
                io.emit('planet_update', planet);
            }
        } else if (planet.isDestroying) {
            planet.explosionFrame++;
            planet.destructionElapsedTime++;
            const coreTotalVisualDuration = SV_CORE_EXPLOSION_DURATION_FRAMES + SV_CORE_IMPLOSION_DURATION_FRAMES;
            if (planet.explosionFrame >= coreTotalVisualDuration) {
                planet.isDestroying = false;
                const planetNameForMsg = getPlanetDisplayName(planet);

                if (planet.willBecomeBlackHole) {
                    planet.isBlackHole = true;
                    planet.massKg = planet.originalMassKg * 0.5;
                    planet.radius = SV_BH_EVENT_HORIZON_RADIUS_PX;
                    planet.radius_m = planet.radius / SV_PIXELS_PER_METER;
                    planet.craters = [];
                    console.log(`[SERVER] Planet ${planet.id} BECAME A BLACK HOLE. Display Mass: ${planet.massKg.toExponential(2)}`);
                    io.emit('server_message', `${planetNameForMsg} has collapsed into a Black Hole!`);
                } else {
                    planet.isDestroyed = true;
                    planet.massKg = 0;
                    planet.radius = 0;
                    planet.radius_m = 0;
                    console.log(`[SERVER] Planet ${planet.id} is DESTROYED.`);
                    io.emit('server_message', `${planetNameForMsg} has been destroyed!`);
                }
                planet.destructionElapsedTime = null;
                io.emit('planet_update', planet);
            }
        }
    });
}


setInterval(updateServerPlanetDestructionStates, 1000 / SV_PROJECTILE_SIMULATION_FPS);
setInterval(updateServerProjectiles, 1000 / SV_PROJECTILE_SIMULATION_FPS);
setInterval(updateServerChunks, 1000 / SV_CHUNK_SIMULATION_FPS);

setInterval(() => {
    if (Object.keys(players).length > 0) {
        const projectileUpdates = serverProjectiles.map(p => ({ id: p.id, x: p.x, y: p.y, vx: p.vx, vy: p.vy, isActive: p.isActive }));
        io.emit('projectiles_update', projectileUpdates);
        if (serverChunks.length > 0) {
            const chunkUpdates = serverChunks.map(c => ({ id: c.id, x: c.x, y: c.y, angle: c.angle, isActive: c.isActive }));
            io.emit('chunks_update', chunkUpdates);
        } else {
             io.emit('chunks_update', []);
        }
    }
}, SV_PROJECTILE_UPDATE_INTERVAL_MS);


server.listen(PORT, () => {
    console.log(`Server for Planet Destroyer Online is running on http://localhost:${PORT}`);
    console.log("Socket.IO is attached and listening.");
    if (supabaseUrl && supabaseKey) console.log("Supabase client is configured.");
    else console.warn("Supabase URL/Key NOT DETECTED. Database features will fail.");
    console.log(`Max players per game session: ${MAX_PLAYERS}`);
    console.log("Waiting for client connections...");
});