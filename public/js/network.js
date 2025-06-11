// public/js/network.js

import { initializeGame, stopGameLoop } from './main.js';
import { Projectile } from './entities/Projectile.js';
import { Chunk } from './entities/Chunk.js';
import { Particle } from './entities/Particle.js';
import { addProjectile, applyServerPlanetState, addParticleToState, setCurrentMousePos, setCameraOffset, setShipRotation, adjustShipAngle, fireShipProjectile, setCameraZoom } from './state/stateModifiers.js';
import * as config from './config.js';
import { getState } from './state/gameState.js';

export const socket = io({ autoConnect: false });

const joinSection = document.getElementById('join-section');
const gameContent = document.getElementById('game-content');
const userIdInput = document.getElementById('user-id-input');
const playerNameInput = document.getElementById('player-name-input');
const shipColorSelect = document.getElementById('ship-color-select');
const joinGameButton = document.getElementById('join-game-button');
const joinMessageParagraph = document.getElementById('join-message');
const messageList = document.getElementById('message-list');

let myServerData = null;
let allPlayersData = {}; // This will now be keyed by userId
let serverPlanets = [];
let serverConfig = {}; 

let ping_rtt = 0;
let ping_start_time;
const PING_INTERVAL_MS = 2500;

function initNetwork() {
    console.log("Network.js: Initializing...");
    const savedUserId = localStorage.getItem('planetDestroyerUserId');
    if (savedUserId && userIdInput) userIdInput.value = savedUserId;

    const savedPlayerName = localStorage.getItem('planetDestroyerPlayerName');
    if (savedPlayerName && playerNameInput) playerNameInput.value = savedPlayerName;

    const savedShipColor = localStorage.getItem('planetDestroyerShipColor');
    if (savedShipColor && shipColorSelect) shipColorSelect.value = savedShipColor;

    if (joinGameButton) {
        joinGameButton.addEventListener('click', () => {
            console.log("[NETWORK] Join Game button clicked.");
            const userId = userIdInput.value.trim();
            const playerName = playerNameInput.value.trim();
            const shipColor = shipColorSelect.value;
            let validationError = "";
            if (!userId) validationError += 'User ID required. ';
            if (!playerName) validationError += 'Player Name required. ';
            if (!shipColor || !shipColor.startsWith('#')) validationError += 'Ship Color invalid. ';

            if (validationError) {
                joinMessageParagraph.textContent = validationError.trim();
                return;
            }

            joinMessageParagraph.textContent = 'Attempting to join...';
            joinGameButton.disabled = true;
            localStorage.setItem('planetDestroyerUserId', userId);
            localStorage.setItem('planetDestroyerPlayerName', playerName);
            localStorage.setItem('planetDestroyerShipColor', shipColor);

            if (socket.connected) {
                sendJoinRequest();
            } else {
                socket.connect();
            }
        });
    }
    setupSocketListeners();
    addMessageToLog("Network system ready. Please provide your details and join the game.");
}

function sendJoinRequest() {
    const joinData = {
        userId: userIdInput.value.trim(),
        playerName: playerNameInput.value.trim(),
        shipColor: shipColorSelect.value
    };
    socket.emit('joinGame', joinData);
}

function setupSocketListeners() {
    socket.on('connect', () => {
        console.log('Socket.IO: Successfully connected. Socket ID:', socket.id);
        if (joinGameButton && joinGameButton.disabled) {
             sendJoinRequest();
        }
        setInterval(() => {
            ping_start_time = Date.now();
            socket.emit('ping_from_client');
        }, PING_INTERVAL_MS);
    });
    
    socket.on('pong_from_server', () => {
        ping_rtt = Date.now() - ping_start_time;
    });

    socket.on('connect_error', (err) => {
        console.error('[NETWORK] Connection Error:', err);
        addMessageToLog(`Connection Error: ${err.message}`);
        joinMessageParagraph.textContent = `Could not connect: ${err.message}. Try again.`;
        if (joinGameButton) joinGameButton.disabled = false;
    });

    socket.on('join_success', (data) => {
        myServerData = data.myPlayerData;
        allPlayersData = data.allPlayers; // Server now sends object keyed by userId
        serverPlanets = data.planets || [];
        serverConfig = data.serverConfig || {}; 

        addMessageToLog(`Successfully joined as ${myServerData.playerName}.`);
        
        if (joinSection) joinSection.classList.add('hidden');
        if (gameContent) gameContent.classList.remove('hidden');
        if (joinGameButton) joinGameButton.disabled = false;

        initializeGame({ planets: serverPlanets, config: serverConfig }, myServerData);
    });

    socket.on('join_fail', (message) => {
        console.error('[NETWORK] Join failed:', message);
        addMessageToLog(`Join failed: ${message}`);
        joinMessageParagraph.textContent = message;
        if (joinGameButton) joinGameButton.disabled = false;
        if (socket.connected) {
            socket.disconnect();
        }
    });

    socket.on('server_message', (message) => { addMessageToLog(`Server: ${message}`); });

    socket.on('player_joined', (newPlayerData) => {
        if (myServerData && newPlayerData.userId === myServerData.userId) return;
        allPlayersData[newPlayerData.userId] = newPlayerData;
        addMessageToLog(`${newPlayerData.playerName} has joined.`);
    });

    // --- REVISED EVENT HANDLERS FOR NEW SERVER LOGIC ---\n

    socket.on('player_disconnected', (data) => {
        if (allPlayersData[data.userId]) {
            allPlayersData[data.userId].isConnected = false;
            addMessageToLog(`${data.playerName} has disconnected (derelict).`);
        }
    });

    socket.on('player_reconnected', (reconnectedPlayerData) => {
        allPlayersData[reconnectedPlayerData.userId] = reconnectedPlayerData;
        addMessageToLog(`${reconnectedPlayerData.playerName} has reconnected.`);
    });
    
    socket.on('player_removed', (data) => {
        if (allPlayersData[data.userId]) {
            const removedPlayerName = allPlayersData[data.userId].playerName;
            delete allPlayersData[data.userId];
            const clientState = getState();
            if (clientState?.remotePlayers?.[data.userId]) {
                delete clientState.remotePlayers[data.userId];
            }
            addMessageToLog(`${removedPlayerName}'s ship has been removed from the game.`);
        }
    });

    // --- END REVISED EVENT HANDLERS ---\n

    socket.on('player_moved', (data) => {
        // Now using userId
        if (allPlayersData[data.userId] && myServerData && data.userId !== myServerData.userId) {
            allPlayersData[data.userId].x = data.x;
            allPlayersData[data.userId].y = data.y;
            allPlayersData[data.userId].angle = data.angle;
        }
    });

    socket.on('planet_update', (updatedPlanetDataFromServer) => {
        const clientState = getState();
        if (clientState?.planets) {
            applyServerPlanetState(updatedPlanetDataFromServer.id, updatedPlanetDataFromServer);
        }
    });

    socket.on('new_projectile_created', (projectileDataFromServer) => {
        const clientState = getState();
        if (!clientState) return;

        let projectileToUpdate = null;
        // Projectile ownership is now by userId
        if (projectileDataFromServer.ownerUserId === getMyPlayerId() && projectileDataFromServer.tempId) {
            projectileToUpdate = clientState.projectiles.find(p => p.id === projectileDataFromServer.tempId);
        }

        if (projectileToUpdate) {
            projectileToUpdate.id = projectileDataFromServer.id;
            projectileToUpdate.isGhost = false;
            projectileToUpdate.applyServerUpdate(projectileDataFromServer);
            // console.log(`[NETWORK] Promoted ghost projectile ${projectileDataFromServer.tempId} to ${projectileDataFromServer.id}`);
        } else {
            const newProj = new Projectile(
                projectileDataFromServer.id,
                projectileDataFromServer.ownerUserId, // Now ownerUserId
                projectileDataFromServer.x,
                projectileDataFromServer.y,
                projectileDataFromServer.angle,
                projectileDataFromServer.initialSpeedInternalPxFrame,
                config.PROJECTILE_COLOR,
                projectileDataFromServer.massKg
            );
            addProjectile(newProj);
        }
    });

    socket.on('projectiles_update', (serverProjectilesData) => {
        const clientState = getState();
        if (!clientState?.projectiles) return;
        
        serverProjectilesData.forEach(serverProjData => {
            const clientProj = clientState.projectiles.find(p => p.id === serverProjData.id);
            if (clientProj) {
                clientProj.applyServerUpdate(serverProjData);
            }
        });

        const activeServerIds = new Set(serverProjectilesData.map(p => p.id));
        clientState.projectiles = clientState.projectiles.filter(p => {
             // Keep the projectile if the server says it's active OR if it's a non-ghost projectile that just hit something and needs to show its trail
            return activeServerIds.has(p.id) || (p.isGhost === false && p.trailPersistsAfterImpact && p.trailLife > 0);
        });
    });

    socket.on('projectile_hit_planet', (hitData) => {
        const clientState = getState();
        if (!clientState) return;

        const projectile = clientState.projectiles.find(p => p.id === hitData.projectileId);
        if (projectile) {
            projectile.isActive = false;
        }

        const planet = clientState.planets.find(p => p.id === hitData.planetId);
        if (planet && hitData.crater) {
            if (!planet.craters) planet.craters = [];
            const craterExists = planet.craters.some(c => 
                Math.abs(c.x - hitData.crater.x) < 0.1 && 
                Math.abs(c.y - hitData.crater.y) < 0.1
            );
            if (!craterExists) {
                planet.craters.push(hitData.crater);
            }
            planet.textureNeedsUpdate = true; // Tell the renderer to re-bake the texture
        }
    });

    socket.on('projectile_absorbed_by_bh', (data) => {
        const clientState = getState();
        if (!clientState?.projectiles || !data.projectileId) return;
        const projectile = clientState.projectiles.find(p => p.id === data.projectileId);
        if (projectile) {
            projectile.isActive = false;
        }
    });

    socket.on('chunks_created', (newChunksData) => {
        const clientState = getState();
        if (!clientState?.settings) return;
        newChunksData.forEach(chunkData => {
            // Check if chunk already exists to prevent duplicates on reconnect/resync
            if (!clientState.chunks.some(c => c.id === chunkData.id)) {
                clientState.chunks.push(new Chunk(chunkData, clientState.settings));
            }
        });
    });

    socket.on('chunks_update', (serverChunksData) => {
        const clientState = getState();
        if (!clientState?.chunks) return;

        serverChunksData.forEach(serverChunkData => {
            const clientChunk = clientState.chunks.find(c => c.id === serverChunkData.id);
            if (clientChunk) {
                clientChunk.applyServerUpdate(serverChunkData);
            }
        });
        
        const activeServerChunkIds = new Set(serverChunksData.map(c => c.id));
        clientState.chunks = clientState.chunks.filter(c => activeServerChunkIds.has(c.id));
    });
    
    socket.on('world_reset_data', (newWorldData) => {
        addMessageToLog('Server has reset the world. Reloading map...');
        stopGameLoop();
        const clientState = getState();
        if (clientState) {
            clientState.projectiles = [];
            clientState.chunks = [];
            clientState.particles = [];
            clientState.bhParticles = [];
        }
        initializeGame({ planets: newWorldData.planets, config: serverConfig }, myServerData);
    });

    socket.on('player_state_reset', (playerDataFromServer) => {
        allPlayersData[playerDataFromServer.userId] = playerDataFromServer;
        const clientState = getState();
        if (myServerData && myServerData.userId === playerDataFromServer.userId) {
            myServerData = playerDataFromServer;
            if (clientState?.ship) {
                Object.assign(clientState.ship, playerDataFromServer);
            }
        }
    });

    const handleHit = (hitData, isChunk) => {
        const damage = hitData.damageDealt || config.PROJECTILE_DAMAGE;
        const targetName = allPlayersData[hitData.hitPlayerId]?.playerName || 'A ship';
        const sourceName = isChunk ? 'debris' : (allPlayersData[hitData.shooterId]?.playerName || 'a projectile');
        addMessageToLog(`${targetName} was hit by ${sourceName} for ${damage} damage! HP: ${hitData.newHealth}`);

        const clientState = getState();
        if (!clientState) return;

        if (isChunk) {
            const chunk = clientState.chunks.find(c => c.id === hitData.chunkId);
            if (chunk) chunk.isActive = false;
        } else {
            const proj = clientState.projectiles.find(p => p.id === hitData.projectileId);
            if (proj) proj.isActive = false;
        }
        
        let targetShipInstance;
        if (myServerData?.userId === hitData.hitPlayerId) {
            targetShipInstance = clientState.ship;
            myServerData.health = hitData.newHealth;
        } else if (clientState.remotePlayers[hitData.hitPlayerId]) {
            targetShipInstance = clientState.remotePlayers[hitData.hitPlayerId];
            if(allPlayersData[hitData.hitPlayerId]) {
                allPlayersData[hitData.hitPlayerId].health = hitData.newHealth;
            }
        }

        if (targetShipInstance) {
            targetShipInstance.health = hitData.newHealth;
            targetShipInstance.isAlive = hitData.newHealth > 0;
            if (typeof targetShipInstance.takeHit === 'function') {
                targetShipInstance.takeHit();
            }
        }
    };
    
    socket.on('ship_hit', (hitData) => handleHit(hitData, false));
    socket.on('ship_hit_by_chunk', (hitData) => handleHit(hitData, true));
    
    const handleDestroyed = (destructionData, isChunk) => {
        const destroyedName = allPlayersData[destructionData.destroyedShipId]?.playerName || 'A ship';
        const sourceName = isChunk ? 'debris' : (allPlayersData[destructionData.killerId]?.playerName || 'a projectile');
        addMessageToLog(`${destroyedName} was destroyed by ${sourceName}!`);

        const clientState = getState();
        if (!clientState) return;
        
        if (isChunk && clientState.chunks) {
            const chunk = clientState.chunks.find(c => c.id === destructionData.chunkId);
            if (chunk) chunk.isActive = false;
        }

        let targetShipInstance;
        if (myServerData?.userId === destructionData.destroyedShipId) {
            targetShipInstance = clientState.ship;
            if (myServerData) myServerData.isAlive = false;
        } else if (allPlayersData[destructionData.destroyedShipId]) {
            allPlayersData[destructionData.destroyedShipId].isAlive = false;
            targetShipInstance = clientState.remotePlayers[destructionData.destroyedShipId];
        }

        if (targetShipInstance) {
            targetShipInstance.isAlive = false;
            targetShipInstance.health = 0;
        }
    };
    
    socket.on('ship_destroyed', (data) => handleDestroyed(data, false));
    socket.on('ship_destroyed_by_chunk', (data) => handleDestroyed(data, true));

    socket.on('chunk_damaged_planet', (data) => {
        const clientState = getState();
        if (!clientState) return;

        if (clientState.chunks) {
            const chunk = clientState.chunks.find(c => c.id === data.chunkId);
            if (chunk) chunk.isActive = false;
        }
        if (clientState.planets) {
            const planet = clientState.planets.find(p => p.id === data.planetId);
            if (planet && data.newCrater) {
                if (!planet.craters) planet.craters = [];
                const craterExists = planet.craters.some(c => Math.abs(c.x - data.newCrater.x) < 0.1);
                if (!craterExists) planet.craters.push(data.newCrater);

                planet.textureNeedsUpdate = true; // Tell the renderer to re-bake the texture

                if (data.impactPoint) {
                    const numParticles = 5 + Math.floor(Math.random() * 5);
                    for (let i = 0; i < numParticles; i++) {
                        addParticleToState(new Particle(data.impactPoint.x, data.impactPoint.y, 0.5, 0.7));
                    }
                }
            }
        }
    });

    socket.on('chunk_absorbed_by_bh', (data) => {
        const clientState = getState();
        if (clientState?.chunks) {
            const chunk = clientState.chunks.find(c => c.id === data.chunkId);
            if (chunk) chunk.isActive = false;
        }
    });

    socket.on('player_respawned', (playerDataFromServer) => {
        addMessageToLog(`${playerDataFromServer.playerName} has respawned!`);
        allPlayersData[playerDataFromServer.userId] = playerDataFromServer;
        const clientState = getState();
        if (!clientState) return;

        let targetShip;
        if (myServerData?.userId === playerDataFromServer.userId) {
            myServerData = playerDataFromServer;
            targetShip = clientState.ship;
        } else if (clientState.remotePlayers[playerDataFromServer.userId]) {
            targetShip = clientState.remotePlayers[playerDataFromServer.userId];
        }
        
        if (targetShip) {
            Object.assign(targetShip, playerDataFromServer);
            targetShip.color = targetShip.defaultColor;
            targetShip.hitFlashTimer = 0;
            targetShip.isDerelict = false; // Ensure it's not derelict on respawn
        }
    });

    // --- BEGIN: Server Heartbeat Listener ---\n    // This listener exists solely to keep the connection alive.
    // Receiving this event from the server prevents idle timeouts.
    socket.on('server_heartbeat', () => {
        // We don't need to do anything, but a log can be useful for debugging.
        // console.log('Received server heartbeat.');
    });
    // --- END: Server Heartbeat Listener ---\n

    socket.on('disconnect', (reason) => {
        addMessageToLog(`Disconnected from server: ${reason}.`);
        if (joinSection) joinSection.classList.remove('hidden');
        if (gameContent) gameContent.classList.add('hidden');
        myServerData = null;
        allPlayersData = {};
        serverPlanets = [];
        if(joinGameButton) joinGameButton.disabled = false;
        stopGameLoop();
    });
}

function addMessageToLog(messageText) {
    if (messageList) {
        const li = document.createElement('li');
        const timestamp = new Date().toLocaleTimeString();
        li.textContent = `[${timestamp}] ${messageText}`;
        messageList.appendChild(li);
        // Autoscroll to the bottom
        messageList.parentElement.scrollTop = messageList.parentElement.scrollHeight;
    }
}

export function sendShipUpdate(shipState) { 
    if (socket.connected && myServerData?.isAlive) {
        shipState.ping = ping_rtt;
        socket.emit('ship_update', shipState);
    }
}

export function sendProjectileFireRequest(projectileData) { if (socket.connected && myServerData?.isAlive) socket.emit('request_fire_projectile', projectileData); }
export function getMyPlayerId() { return myServerData ? myServerData.userId : null; } // CRITICAL CHANGE
export function getClientSidePlayers() { return allPlayersData; }
export function getMyNetworkData() { return myServerData; }

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', initNetwork); }
else { initNetwork(); }