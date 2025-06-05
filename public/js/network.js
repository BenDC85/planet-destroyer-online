// public/js/network.js

import { initializeGame, stopGameLoop } from './main.js';
import { Projectile } from './entities/Projectile.js';
import { Chunk } from './entities/Chunk.js';
import { Particle } from './entities/Particle.js';
import { addProjectile, applyServerPlanetState, addParticleToState } from './state/stateModifiers.js';
import * as config from './config.js';
import { getState, getMyPlayerData as getGameStateMyPlayerData } from './state/gameState.js';

export const socket = io({ autoConnect: false });

const joinSection = document.getElementById('join-section');
const gameContent = document.getElementById('game-content');
const userIdInput = document.getElementById('user-id-input');
const playerNameInput = document.getElementById('player-name-input');
const shipColorSelect = document.getElementById('ship-color-select');
const joinGameButton = document.getElementById('join-game-button');
const joinMessageParagraph = document.getElementById('join-message');

const messageList = document.getElementById('message-list'); // This is the <ul> we append to

let myServerData = null;
let allPlayersData = {};
let serverPlanets = [];

function initNetwork() {
    // ... (rest of initNetwork is the same)
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
                console.log("[NETWORK] Join validation failed on client:", validationError);
                joinMessageParagraph.textContent = validationError.trim();
                return;
            }

            joinMessageParagraph.textContent = 'Attempting to join...';
            joinGameButton.disabled = true;
            localStorage.setItem('planetDestroyerUserId', userId);
            localStorage.setItem('planetDestroyerPlayerName', playerName);
            localStorage.setItem('planetDestroyerShipColor', shipColor);

            console.log("[NETWORK] Socket connected status:", socket.connected);
            if (socket.connected) {
                console.log("[NETWORK] Socket already connected, calling sendJoinRequest().");
                sendJoinRequest();
            } else {
                console.log("[NETWORK] Socket not connected, calling socket.connect().");
                socket.connect();
            }
        });
    }
    setupSocketListeners();
    addMessageToLog("Network system ready. Please provide your details and join the game.");
}

function sendJoinRequest() {
    // ... (same)
    const joinData = {
        userId: userIdInput.value.trim(),
        playerName: playerNameInput.value.trim(),
        shipColor: shipColorSelect.value
    };
    console.log("[NETWORK] Emitting 'joinGame' with data:", joinData);
    socket.emit('joinGame', joinData);
}

function setupSocketListeners() {
    // ... (all socket listeners are the same)

    socket.on('connect', () => {
        console.log('Socket.IO: Successfully connected. Socket ID:', socket.id);
        addMessageToLog('Connected to server! Sending join request...');
        if (joinGameButton && joinGameButton.disabled) {
             sendJoinRequest();
        } else {
            console.log("[NETWORK] Connected, but no join attempt in progress. Waiting for user to click join.");
        }
    });

    socket.on('connect_error', (err) => {
        console.error('[NETWORK] Connection Error:', err);
        addMessageToLog(`Connection Error: ${err.message}`);
        joinMessageParagraph.textContent = `Could not connect: ${err.message}. Try again.`;
        if (joinGameButton) joinGameButton.disabled = false;
    });

    socket.on('join_success', (data) => {
        console.log("[NETWORK] 'join_success' received from server:", data);
        myServerData = data.myPlayerData;
        allPlayersData = data.allPlayers;
        serverPlanets = data.planets || [];

        console.log('[NETWORK] Join Success. My Data (from server):', JSON.parse(JSON.stringify(myServerData)));
        console.log('[NETWORK] ALL PLAYERS DATA on my join_success (from server):', JSON.parse(JSON.stringify(allPlayersData)));

        addMessageToLog(`Successfully joined as ${myServerData.playerName} (Player ${myServerData.playerNumber}). HP: ${myServerData.health}`);
        console.log(`Socket.IO: Received ${serverPlanets.length} planets from server.`);

        if (joinSection) joinSection.classList.add('hidden');
        if (gameContent) gameContent.classList.remove('hidden');
        if (joinGameButton) joinGameButton.disabled = false;

        const initialWorldData = { planets: serverPlanets };
        initializeGame(initialWorldData, myServerData);
    });

    socket.on('join_fail', (message) => {
        console.error('[NETWORK] \'join_fail\' received from server:', message);
        addMessageToLog(`Join failed: ${message}`);
        joinMessageParagraph.textContent = message;
        if (joinGameButton) joinGameButton.disabled = false;
        if (socket.connected) {
            console.log("[NETWORK] Disconnecting socket due to join_fail.");
            socket.disconnect();
        }
    });

    socket.on('server_message', (message) => { addMessageToLog(`Server: ${message}`); });
    socket.on('player_joined', (newPlayerData) => { if (myServerData && newPlayerData.socketId === myServerData.socketId) { return; } allPlayersData[newPlayerData.socketId] = newPlayerData; addMessageToLog(`${newPlayerData.playerName} (Player ${newPlayerData.playerNumber}) has joined.`); console.log(`[NETWORK] Player Joined Event. New Player Data:`, JSON.parse(JSON.stringify(newPlayerData))); });
    socket.on('player_left', (data) => { if (allPlayersData[data.socketId]) { const leftPlayerName = allPlayersData[data.socketId].playerName; delete allPlayersData[data.socketId]; const clientState = getState(); if (clientState && clientState.remotePlayers && clientState.remotePlayers[data.socketId]) { delete clientState.remotePlayers[data.socketId]; } addMessageToLog(`${leftPlayerName} (Socket: ${data.socketId}) has disconnected.`); console.log(`[NETWORK] Player Left Event. Player: ${leftPlayerName}. SocketId: ${data.socketId}`); } });
    socket.on('player_moved', (data) => { if (allPlayersData[data.socketId] && myServerData && data.socketId !== myServerData.socketId) { allPlayersData[data.socketId].x = data.x; allPlayersData[data.socketId].y = data.y; allPlayersData[data.socketId].angle = data.angle; } });

    socket.on('planet_update', (updatedPlanetDataFromServer) => {
        const clientState = getState();
        if (clientState && clientState.planets) {
            applyServerPlanetState(updatedPlanetDataFromServer.id, updatedPlanetDataFromServer);
        }
    });

    socket.on('new_projectile_created', (projectileDataFromServer) => { const newProj = new Projectile( projectileDataFromServer.id, projectileDataFromServer.ownerShipId, projectileDataFromServer.x, projectileDataFromServer.y, projectileDataFromServer.angle, projectileDataFromServer.initialSpeedInternalPxFrame, config.PROJECTILE_COLOR, projectileDataFromServer.massKg ); addProjectile(newProj);  });
    socket.on('projectiles_update', (serverProjectilesData) => { const clientState = getState(); if (!clientState || !clientState.projectiles) return; serverProjectilesData.forEach(serverProjData => { const clientProj = clientState.projectiles.find(p => p.id === serverProjData.id); if (clientProj) { clientProj.applyServerUpdate(serverProjData); }  }); clientState.projectiles = clientState.projectiles.filter(p => { const serverVersion = serverProjectilesData.find(sp => sp.id === p.id); if (serverVersion) { return serverVersion.isActive;  } if (!serverVersion && p.isActive) { p.isActive = false;  } return p.isActive || (p.trailPersistsAfterImpact && p.trailLife > 0); }); });

    socket.on('projectile_hit_planet', (hitData) => {
        const clientState = getState();
        if (!clientState) return;

        if (clientState.projectiles) {
            const projectile = clientState.projectiles.find(p => p.id === hitData.projectileId);
            if (projectile) {
                projectile.isActive = false;
            }
        }
        if (clientState.planets) {
            const planet = clientState.planets.find(p => p.id === hitData.planetId);
            if (planet) {
                if (hitData.crater && typeof hitData.crater.x === 'number' && typeof hitData.crater.y === 'number' && typeof hitData.crater.radius === 'number') {
                    if (!planet.craters) planet.craters = [];
                    const craterExists = planet.craters.some(c => Math.abs(c.x - hitData.crater.x) < 0.1 && Math.abs(c.y - hitData.crater.y) < 0.1 && Math.abs(c.radius - hitData.crater.radius) < 0.1 );
                    if (!craterExists) {
                        planet.craters.push(hitData.crater);
                    }
                }
            }
        }
    });

    socket.on('chunks_created', (newChunksData) => { const clientState = getState(); if (!clientState || !clientState.settings) return; newChunksData.forEach(chunkData => { const settings = clientState.settings;  const newChunk = new Chunk( chunkData.x, chunkData.y, 0, 0, 0, settings,  chunkData.originPlanetId ); newChunk.id = chunkData.id;  newChunk.vx = chunkData.vx; newChunk.vy = chunkData.vy; newChunk.angle = chunkData.angle; newChunk.angularVelocity = chunkData.angularVelocity; newChunk.points = chunkData.points;  newChunk.size = chunkData.size;  newChunk.massKg = chunkData.massKg;  newChunk.isActive = chunkData.isActive; clientState.chunks.push(newChunk); }); });
    socket.on('chunks_update', (serverChunksData) => { const clientState = getState(); if (!clientState || !clientState.chunks) return; serverChunksData.forEach(serverChunkData => { const clientChunk = clientState.chunks.find(c => c.id === serverChunkData.id); if (clientChunk) { clientChunk.x = serverChunkData.x; clientChunk.y = serverChunkData.y; clientChunk.angle = serverChunkData.angle; clientChunk.isActive = serverChunkData.isActive; }  }); clientState.chunks = clientState.chunks.filter(c => { const serverVersion = serverChunksData.find(sc => sc.id === c.id); if (serverVersion) { return serverVersion.isActive;  } if (!serverVersion && c.isActive) { c.isActive = false;  } return c.isActive || (!c.persistentDrift && c.life > 0);  }); });
    socket.on('world_reset_data', (newWorldData) => { console.log('[NETWORK] Received world_reset_data from server. Re-initializing client state.'); addMessageToLog('Server has reset the world. Reloading map...'); stopGameLoop(); const clientState = getState(); if (clientState) { clientState.projectiles = []; clientState.chunks = []; clientState.particles = []; clientState.bhParticles = []; } initializeGame(newWorldData, myServerData);  });
    socket.on('player_state_reset', (playerDataFromServer) => { console.log(`[NETWORK] Received player_state_reset for ${playerDataFromServer.playerName} (${playerDataFromServer.socketId})`); allPlayersData[playerDataFromServer.socketId] = playerDataFromServer;  const clientState = getState(); if (myServerData && myServerData.socketId === playerDataFromServer.socketId) { myServerData = playerDataFromServer;  if (clientState && clientState.ship) { clientState.ship.x = playerDataFromServer.x; clientState.ship.y = playerDataFromServer.y; clientState.ship.angle = playerDataFromServer.angle; clientState.ship.health = playerDataFromServer.health;  clientState.ship.isAlive = playerDataFromServer.isAlive;  } } else if (clientState && clientState.remotePlayers && clientState.remotePlayers[playerDataFromServer.socketId]) { /* updateRemotePlayerShips will handle */ } });

    socket.on('ship_hit', (hitData) => {
        const shooterName = allPlayersData[hitData.shooterId]?.playerName || `Player ${hitData.shooterId}`;
        const targetName = allPlayersData[hitData.hitPlayerId]?.playerName || `Player ${hitData.hitPlayerId}`;
        addMessageToLog(`Ship ${targetName} was hit by ${shooterName}! HP: ${hitData.newHealth}`);

        const clientState = getState();
        if (!clientState) return;

        if (clientState.projectiles) {
            const projectileThatHit = clientState.projectiles.find(p => p.id === hitData.projectileId);
            if (projectileThatHit) { projectileThatHit.isActive = false; }
        }

        let targetShipInstance;
        if (myServerData && hitData.hitPlayerId === myServerData.socketId) {
            targetShipInstance = clientState.ship;
            myServerData.health = hitData.newHealth;
            myServerData.isAlive = hitData.newHealth > 0;
        } else if (clientState.remotePlayers[hitData.hitPlayerId]) {
            targetShipInstance = clientState.remotePlayers[hitData.hitPlayerId];
            if(allPlayersData[hitData.hitPlayerId]) {
                allPlayersData[hitData.hitPlayerId].health = hitData.newHealth;
                allPlayersData[hitData.hitPlayerId].isAlive = hitData.newHealth > 0;
            }
        }

        if (targetShipInstance) {
            if (targetShipInstance.health !== undefined) targetShipInstance.health = hitData.newHealth;
            if (targetShipInstance.isAlive !== undefined) targetShipInstance.isAlive = hitData.newHealth > 0;
            if (typeof targetShipInstance.takeHit === 'function') { targetShipInstance.takeHit(); }
        }
    });

    socket.on('ship_destroyed', (destructionData) => {
        const destroyedName = allPlayersData[destructionData.destroyedShipId]?.playerName || `Player ${destructionData.destroyedShipId}`;
        const killerName = allPlayersData[destructionData.killerId]?.playerName || (destructionData.killerId === destructionData.destroyedShipId ? 'Self' : `Player ${destructionData.killerId}`);
        console.log(`[NETWORK] Ship Destroyed: ${destroyedName} by ${killerName}`);
        addMessageToLog(`Ship ${destroyedName} was destroyed by ${killerName}!`);

        const clientState = getState();
        if (!clientState) return;

        let targetShipInstance;
        if (myServerData && destructionData.destroyedShipId === myServerData.socketId) {
            targetShipInstance = clientState.ship;
            if(myServerData) { myServerData.isAlive = false; myServerData.health = 0; }
        } else if (allPlayersData[destructionData.destroyedShipId]) {
            allPlayersData[destructionData.destroyedShipId].isAlive = false;
            allPlayersData[destructionData.destroyedShipId].health = 0;
            targetShipInstance = clientState.remotePlayers[destructionData.destroyedShipId];
        }

        if (targetShipInstance) {
            if(targetShipInstance.isAlive !== undefined) targetShipInstance.isAlive = false;
            if(targetShipInstance.health !== undefined) targetShipInstance.health = 0;
        }
    });

    socket.on('ship_hit_by_chunk', (hitData) => {
        const targetName = allPlayersData[hitData.hitPlayerId]?.playerName || `Player ${hitData.hitPlayerId}`;
        addMessageToLog(`Ship ${targetName} was hit by flying debris! HP: ${hitData.newHealth}`);

        const clientState = getState();
        if (!clientState) return;

        if (clientState.chunks) {
            const chunkThatHit = clientState.chunks.find(c => c.id === hitData.chunkId);
            if (chunkThatHit) { chunkThatHit.isActive = false; }
        }

        let targetShipInstance;
        if (myServerData && hitData.hitPlayerId === myServerData.socketId) {
            targetShipInstance = clientState.ship;
            myServerData.health = hitData.newHealth;
            myServerData.isAlive = hitData.newHealth > 0;
        } else if (clientState.remotePlayers[hitData.hitPlayerId]) {
            targetShipInstance = clientState.remotePlayers[hitData.hitPlayerId];
            if(allPlayersData[hitData.hitPlayerId]) {
                allPlayersData[hitData.hitPlayerId].health = hitData.newHealth;
                allPlayersData[hitData.hitPlayerId].isAlive = hitData.newHealth > 0;
            }
        }

        if (targetShipInstance) {
            if (targetShipInstance.health !== undefined) targetShipInstance.health = hitData.newHealth;
            if (targetShipInstance.isAlive !== undefined) targetShipInstance.isAlive = hitData.newHealth > 0;
            if (typeof targetShipInstance.takeHit === 'function') { targetShipInstance.takeHit(); }
        }
    });

    socket.on('ship_destroyed_by_chunk', (destructionData) => {
        const destroyedName = allPlayersData[destructionData.destroyedShipId]?.playerName || `Player ${destructionData.destroyedShipId}`;
        console.log(`[NETWORK] Ship Destroyed by Chunk: ${destroyedName}`);
        addMessageToLog(`Ship ${destroyedName} was obliterated by debris!`);

        const clientState = getState();
        if (!clientState) return;

        if (clientState.chunks) {
            const chunkThatHit = clientState.chunks.find(c => c.id === destructionData.chunkId);
            if (chunkThatHit) { chunkThatHit.isActive = false; }
        }

        let targetShipInstance;
        if (myServerData && destructionData.destroyedShipId === myServerData.socketId) {
            targetShipInstance = clientState.ship;
            if(myServerData) { myServerData.isAlive = false; myServerData.health = 0; }
        } else if (allPlayersData[destructionData.destroyedShipId]) {
            allPlayersData[destructionData.destroyedShipId].isAlive = false;
            allPlayersData[destructionData.destroyedShipId].health = 0;
            targetShipInstance = clientState.remotePlayers[destructionData.destroyedShipId];
        }

        if (targetShipInstance) {
            if(targetShipInstance.isAlive !== undefined) targetShipInstance.isAlive = false;
            if(targetShipInstance.health !== undefined) targetShipInstance.health = 0;
        }
    });

    socket.on('chunk_damaged_planet', (data) => {
        const clientState = getState();
        if (!clientState) return;

        if (clientState.chunks) {
            const chunk = clientState.chunks.find(c => c.id === data.chunkId);
            if (chunk) { chunk.isActive = false; }
        }
        if (clientState.planets) {
            const planet = clientState.planets.find(p => p.id === data.planetId);
            if (planet && data.newCrater) {
                if (!planet.craters) planet.craters = [];
                const craterExists = planet.craters.some(c => Math.abs(c.x - data.newCrater.x) < 0.1 && Math.abs(c.y - data.newCrater.y) < 0.1 && Math.abs(c.radius - data.newCrater.radius) < 0.1);
                if (!craterExists) { planet.craters.push(data.newCrater); }

                if (data.impactPoint) {
                    const numParticles = 5 + Math.floor(Math.random() * 5);
                    for (let i = 0; i < numParticles; i++) {
                        const p = new Particle(data.impactPoint.x, data.impactPoint.y);
                        p.radius *= 0.5;
                        p.speed *= 0.7;
                        addParticleToState(p);
                    }
                }
            }
        }
    });

    socket.on('chunk_hit_planet', (data) => {
        const clientState = getState();
        if (clientState && clientState.chunks) {
            const chunk = clientState.chunks.find(c => c.id === data.chunkId);
            if (chunk) { chunk.isActive = false; }
        }
    });

    socket.on('chunk_absorbed_by_bh', (data) => {
        const clientState = getState();
        if (clientState && clientState.chunks) {
            const chunk = clientState.chunks.find(c => c.id === data.chunkId);
            if (chunk) { chunk.isActive = false; }
        }
    });

    socket.on('player_respawned', (playerDataFromServer) => {
        console.log(`[NETWORK] Player Respawned: ${playerDataFromServer.playerName} (${playerDataFromServer.socketId}) at X:${playerDataFromServer.x.toFixed(0)}, Y:${playerDataFromServer.y.toFixed(0)}, HP:${playerDataFromServer.health}`);
        addMessageToLog(`${playerDataFromServer.playerName} has respawned!`);

        allPlayersData[playerDataFromServer.socketId] = playerDataFromServer;

        const clientState = getState();
        if (!clientState) return;

        if (myServerData && playerDataFromServer.socketId === myServerData.socketId) {
            myServerData = playerDataFromServer;
            if (clientState.ship) {
                clientState.ship.x = playerDataFromServer.x;
                clientState.ship.y = playerDataFromServer.y;
                clientState.ship.angle = playerDataFromServer.angle;
                clientState.ship.health = playerDataFromServer.health;
                clientState.ship.isAlive = true;
                clientState.ship.color = clientState.ship.defaultColor;
                clientState.ship.hitFlashTimer = 0;
            }
        } else if (clientState.remotePlayers[playerDataFromServer.socketId]) {
            const remoteShip = clientState.remotePlayers[playerDataFromServer.socketId];
            remoteShip.x = playerDataFromServer.x;
            remoteShip.y = playerDataFromServer.y;
            remoteShip.angle = playerDataFromServer.angle;
            remoteShip.health = playerDataFromServer.health;
            remoteShip.isAlive = true;
            remoteShip.color = remoteShip.defaultColor;
            remoteShip.hitFlashTimer = 0;
        }
    });

    socket.on('disconnect', (reason) => { console.warn('[NETWORK] Disconnected from server. Reason:', reason); addMessageToLog(`Disconnected from server: ${reason}.`); if (joinSection && gameContent) { joinSection.classList.remove('hidden'); gameContent.classList.add('hidden'); } myServerData = null; allPlayersData = {}; serverPlanets = []; if(joinGameButton) joinGameButton.disabled = false; stopGameLoop();  });
}


// ---- MODIFICATION FOR SCROLLING (scrollIntoView METHOD) ----
function addMessageToLog(messageText) {
    if (messageList) { // Only need messageList (the <ul>)
        const li = document.createElement('li');
        const timestamp = new Date().toLocaleTimeString();
        li.textContent = `[${timestamp}] ${messageText}`;
        messageList.appendChild(li);

        // Scroll the newly added li into view
        // 'auto' for instant scroll, 'smooth' for animated scroll (might be too slow for rapid messages)
        // 'block: 'end'' attempts to align the bottom of the element with the bottom of the scrollable ancestor.
        li.scrollIntoView({ behavior: 'auto', block: 'end' });
    } else {
        console.error("Message Log Error: <ul> #message-list not found. Cannot add message or scroll.");
    }
}
// ---- END MODIFICATION ----

export function sendShipUpdate(shipState) { if (socket.connected && myServerData && myServerData.isAlive) { socket.emit('ship_update', shipState); } }
export function sendProjectileFireRequest(projectileData) { if (socket.connected && myServerData && myServerData.isAlive) { socket.emit('request_fire_projectile', projectileData); } else { console.warn("[NETWORK] Conditions not met to send 'request_fire_projectile'. Connected:", socket.connected, "myServerData:", !!myServerData, "isAlive:", myServerData?.isAlive); } }
export function getMyPlayerId() { return myServerData ? myServerData.socketId : null; }
export function getClientSidePlayers() { return allPlayersData; }
export function getMyNetworkData() { return myServerData; }

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', initNetwork); }
else { initNetwork(); }