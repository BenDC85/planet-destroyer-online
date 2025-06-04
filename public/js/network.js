// public/js/network.js


import { initializeGame, stopGameLoop } from './main.js'; 
import { Projectile } from './entities/Projectile.js'; 
import { Chunk } from './entities/Chunk.js'; 
import { addProjectile, applyServerPlanetState } from './state/stateModifiers.js'; 
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
const messageList = document.getElementById('message-list');


let myServerData = null; 
let allPlayersData = {}; 
let serverPlanets = []; 


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
    const joinData = {
        userId: userIdInput.value.trim(),
        playerName: playerNameInput.value.trim(),
        shipColor: shipColorSelect.value
    };
    console.log("[NETWORK] Emitting 'joinGame' with data:", joinData);
    socket.emit('joinGame', joinData);
}


function setupSocketListeners() {
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
    socket.on('planet_update', (updatedPlanetDataFromServer) => { const clientState = getState(); if (clientState && clientState.planets) { applyServerPlanetState(updatedPlanetDataFromServer.id, updatedPlanetDataFromServer); } });
    socket.on('new_projectile_created', (projectileDataFromServer) => { const newProj = new Projectile( projectileDataFromServer.id, projectileDataFromServer.ownerShipId, projectileDataFromServer.x, projectileDataFromServer.y, projectileDataFromServer.angle, projectileDataFromServer.initialSpeedInternalPxFrame, config.PROJECTILE_COLOR, projectileDataFromServer.massKg ); addProjectile(newProj);  });
    socket.on('projectiles_update', (serverProjectilesData) => { const clientState = getState(); if (!clientState || !clientState.projectiles) return; serverProjectilesData.forEach(serverProjData => { const clientProj = clientState.projectiles.find(p => p.id === serverProjData.id); if (clientProj) { clientProj.applyServerUpdate(serverProjData); }  }); clientState.projectiles = clientState.projectiles.filter(p => { const serverVersion = serverProjectilesData.find(sp => sp.id === p.id); if (serverVersion) { return serverVersion.isActive;  } if (!serverVersion && p.isActive) { p.isActive = false;  } return p.isActive || (p.trailPersistsAfterImpact && p.trailLife > 0); }); });
    socket.on('projectile_hit_planet', (hitData) => { const clientState = getState(); if (clientState && clientState.projectiles) { const projectile = clientState.projectiles.find(p => p.id === hitData.projectileId); if (projectile) { projectile.isActive = false;  } } if (clientState && clientState.planets && hitData.crater) { const planet = clientState.planets.find(p => p.id === hitData.planetId); if (planet) { if (!planet.craters) { planet.craters = []; } const craterExists = planet.craters.some(c =>  c.x === hitData.crater.x &&  c.y === hitData.crater.y &&  c.radius === hitData.crater.radius ); if (!craterExists) { planet.craters.push(hitData.crater); } } } });
    socket.on('chunks_created', (newChunksData) => { const clientState = getState(); if (!clientState || !clientState.settings) return; newChunksData.forEach(chunkData => { const settings = clientState.settings;  const newChunk = new Chunk( chunkData.x, chunkData.y, 0, 0, 0, settings,  chunkData.originPlanetId ); newChunk.id = chunkData.id;  newChunk.vx = chunkData.vx; newChunk.vy = chunkData.vy; newChunk.angle = chunkData.angle; newChunk.angularVelocity = chunkData.angularVelocity; newChunk.points = chunkData.points;  newChunk.size = chunkData.size;  newChunk.massKg = chunkData.massKg;  newChunk.isActive = chunkData.isActive; clientState.chunks.push(newChunk); }); });
    socket.on('chunks_update', (serverChunksData) => { const clientState = getState(); if (!clientState || !clientState.chunks) return; serverChunksData.forEach(serverChunkData => { const clientChunk = clientState.chunks.find(c => c.id === serverChunkData.id); if (clientChunk) { clientChunk.x = serverChunkData.x; clientChunk.y = serverChunkData.y; clientChunk.angle = serverChunkData.angle; clientChunk.isActive = serverChunkData.isActive; }  }); clientState.chunks = clientState.chunks.filter(c => { const serverVersion = serverChunksData.find(sc => sc.id === c.id); if (serverVersion) { return serverVersion.isActive;  } if (!serverVersion && c.isActive) { c.isActive = false;  } return c.isActive || (!c.persistentDrift && c.life > 0);  }); });
    socket.on('world_reset_data', (newWorldData) => { console.log('[NETWORK] Received world_reset_data from server. Re-initializing client state.'); addMessageToLog('Server has reset the world. Reloading map...'); stopGameLoop(); const clientState = getState(); if (clientState) { clientState.projectiles = []; clientState.chunks = []; clientState.particles = []; clientState.bhParticles = []; } initializeGame(newWorldData, myServerData);  }); 
    socket.on('player_state_reset', (playerDataFromServer) => { console.log(`[NETWORK] Received player_state_reset for ${playerDataFromServer.playerName} (${playerDataFromServer.socketId})`); allPlayersData[playerDataFromServer.socketId] = playerDataFromServer;  const clientState = getState(); if (myServerData && myServerData.socketId === playerDataFromServer.socketId) { myServerData = playerDataFromServer;  if (clientState && clientState.ship) { clientState.ship.x = playerDataFromServer.x; clientState.ship.y = playerDataFromServer.y; clientState.ship.angle = playerDataFromServer.angle; clientState.ship.health = playerDataFromServer.health;  clientState.ship.isAlive = playerDataFromServer.isAlive;  } } else if (clientState && clientState.remotePlayers && clientState.remotePlayers[playerDataFromServer.socketId]) { /* updateRemotePlayerShips will handle from allPlayersData */ } });
    socket.on('ship_hit', (hitData) => { console.log(`[NETWORK] Ship Hit: Target ${hitData.hitPlayerId}, New HP: ${hitData.newHealth}, Shooter: ${hitData.shooterId}`); addMessageToLog(`Ship ${allPlayersData[hitData.hitPlayerId]?.playerName || hitData.hitPlayerId} was hit! HP: ${hitData.newHealth}`); const clientState = getState(); if (!clientState) return; let targetShipObject; if (myServerData && hitData.hitPlayerId === myServerData.socketId) { targetShipObject = clientState.ship; myServerData.health = hitData.newHealth; myServerData.isAlive = hitData.newHealth > 0;  } else if (allPlayersData[hitData.hitPlayerId]) { allPlayersData[hitData.hitPlayerId].health = hitData.newHealth; allPlayersData[hitData.hitPlayerId].isAlive = hitData.newHealth > 0; targetShipObject = clientState.remotePlayers[hitData.hitPlayerId]?.shipInstance; } if (targetShipObject) { if (targetShipObject.health !== undefined) targetShipObject.health = hitData.newHealth; if (targetShipObject.isAlive !== undefined) targetShipObject.isAlive = hitData.newHealth > 0;} });
    socket.on('ship_destroyed', (destructionData) => { const destroyedName = allPlayersData[destructionData.destroyedShipId]?.playerName || destructionData.destroyedShipId; const killerName = allPlayersData[destructionData.killerId]?.playerName || destructionData.killerId; console.log(`[NETWORK] Ship Destroyed: ${destroyedName} by ${killerName}`); addMessageToLog(`Ship ${destroyedName} was destroyed by ${killerName}!`); const clientState = getState(); if (!clientState) return; let targetShipObject; if (myServerData && destructionData.destroyedShipId === myServerData.socketId) { targetShipObject = clientState.ship; if(myServerData) myServerData.isAlive = false; myServerData.health = 0;} else if (allPlayersData[destructionData.destroyedShipId]) { allPlayersData[destructionData.destroyedShipId].isAlive = false; allPlayersData[destructionData.destroyedShipId].health = 0; targetShipObject = clientState.remotePlayers[destructionData.destroyedShipId]?.shipInstance;} if (targetShipObject) { if(targetShipObject.isAlive !== undefined) targetShipObject.isAlive = false; if(targetShipObject.health !== undefined) targetShipObject.health = 0; } });
    socket.on('player_respawned', (playerDataFromServer) => { console.log(`[NETWORK] Player Respawned: ${playerDataFromServer.playerName} (${playerDataFromServer.socketId}) at X:${playerDataFromServer.x.toFixed(0)}, Y:${playerDataFromServer.y.toFixed(0)}, HP:${playerDataFromServer.health}`); addMessageToLog(`${playerDataFromServer.playerName} has respawned!`); allPlayersData[playerDataFromServer.socketId] = playerDataFromServer;  const clientState = getState(); if (!clientState) return; if (myServerData && playerDataFromServer.socketId === myServerData.socketId) { myServerData = playerDataFromServer;  if (clientState.ship) { clientState.ship.x = playerDataFromServer.x; clientState.ship.y = playerDataFromServer.y; clientState.ship.angle = playerDataFromServer.angle; clientState.ship.health = playerDataFromServer.health;  clientState.ship.isAlive = true; } } else if (clientState.remotePlayers[playerDataFromServer.socketId]) { /* updateRemotePlayerShips handles this from allPlayersData */ }  });
    socket.on('disconnect', (reason) => { console.warn('[NETWORK] Disconnected from server. Reason:', reason); addMessageToLog(`Disconnected from server: ${reason}.`); if (joinSection && gameContent) { joinSection.classList.remove('hidden'); gameContent.classList.add('hidden'); } myServerData = null; allPlayersData = {}; serverPlanets = []; if(joinGameButton) joinGameButton.disabled = false; stopGameLoop();  });
}

function addMessageToLog(messageText) { if (messageList) { const li = document.createElement('li'); const timestamp = new Date().toLocaleTimeString(); li.textContent = `[${timestamp}] ${messageText}`; messageList.appendChild(li); messageList.scrollTop = messageList.scrollHeight; } }
export function sendShipUpdate(shipState) { if (socket.connected && myServerData && myServerData.isAlive) { socket.emit('ship_update', shipState); } } 
export function sendProjectileFireRequest(projectileData) { 
    console.log("[NETWORK] sendProjectileFireRequest called. Socket connected:", socket.connected, "myServerData exists:", !!myServerData, "isAlive:", myServerData?.isAlive); 
    if (socket.connected && myServerData && myServerData.isAlive) { 
        socket.emit('request_fire_projectile', projectileData);
        console.log("[NETWORK] 'request_fire_projectile' EMITTED to server.", projectileData); 
    } else {
        console.warn("[NETWORK] Conditions not met to send 'request_fire_projectile'. Connected:", socket.connected, "myServerData:", !!myServerData, "isAlive:", myServerData?.isAlive); 
    }
}
export function getMyPlayerId() { return myServerData ? myServerData.socketId : null; }
export function getClientSidePlayers() { return allPlayersData; } 
export function getMyNetworkData() { return myServerData; } 


if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', initNetwork); } 
else { initNetwork(); }
