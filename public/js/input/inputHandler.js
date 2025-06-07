/* File: public/js/input/inputHandler.js */
// js/input/inputHandler.js


import * as config from '../config.js';
import { getState, initializeState } from '../state/gameState.js';
import * as stateModifiers from '../state/stateModifiers.js';
import * as interaction from './interaction.js';
import * as utils from '../utils.js';
import * as stateUtils from '../state/stateUtils.js'; 
import { socket } from '../network.js'; 
// --- BEGIN MODIFICATION: Import Projectile for instant creation ---
import { Projectile } from '../entities/Projectile.js';
// --- END MODIFICATION ---


// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=inputHandlerFileContent##


// --- Module State --
// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=moduleStateVariables##
let canvas = null;
let resetButton;
let logSettingsButton; 
let horizontalScrollbar, verticalScrollbar;
let persistentDriftCheckbox;


// Number Input & Value Span References
let damageRadiusInput, damageRadiusValue;
let projectileSpeedInput, projectileSpeedValue;
let projectileMassInput, projectileMassValue;
let cameraZoomInput, cameraZoomValue, zoomOutButton, zoomInButton;
let shipZoomAttractInput, shipZoomAttractValue;
let planetZoomAttractInput, planetZoomAttractValue;


// BH FX General
let bhLifeInput, bhLifeValue;
let bhSpeedInput, bhSpeedValue;
let bhInwardVelInput, bhInwardVelValue;
let bhAngularVelInput, bhAngularVelValue;
let bhSpawnRateInput, bhSpawnRateValue;
let bhMaxParticlesInput, bhMaxParticlesValue;
let bhSpawnMinInput, bhSpawnMinValue;
let bhSpawnMaxInput, bhSpawnMaxValue;
let bhParticleMinSizeInput, bhParticleMinSizeValue;
let bhParticleMaxSizeInput, bhParticleMaxSizeValue;


// BH Drag Specific
let bhDragFactorInput, bhDragFactorValue;
let bhDragReachInput, bhDragReachValue;


// Physics / Timing
let chunkLifespanInput, chunkLifespanValue;
let chunkMaxSpeedInput, chunkMaxSpeedValue;
let coreExplosionInput, coreExplosionValue;
let coreImplosionInput, coreImplosionValue;
let planetCountInput, planetCountValue;
let bhGravityFactorInput, bhGravityFactorValue; 
let bhEventHorizonInput, bhEventHorizonValue;
let craterScaleInput, craterScaleValue;
let keToEjectInput, keToEjectValue;
let bhEnergyMultInput, bhEnergyMultValue;
let planetGravityMultiplierInput, planetGravityMultiplierValue;


let isProcessingScroll = false;
const ZOOM_STEP = 0.1;
let keyState = {
    ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: false, Space: false,
    Numpad4: false, Numpad6: false 
};
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=moduleStateVariables##


// --- Initialization ---
// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=setupInputListenersFunction##
export function setupInputListeners(canvasElement) {
    if (!canvasElement) {
        console.error("Canvas required for input handler setup.");
        return;
    }
    canvas = canvasElement;


    resetButton = document.getElementById('resetButton');
    logSettingsButton = document.getElementById('logSettingsButton');
    horizontalScrollbar = document.getElementById('horizontalScrollbar');
    verticalScrollbar = document.getElementById('verticalScrollbar');
    persistentDriftCheckbox = document.getElementById('hud_persistentChunkDriftCheckbox');
    zoomOutButton = document.getElementById('zoomOutButton');
    zoomInButton = document.getElementById('zoomInButton');


    damageRadiusInput = document.getElementById('hud_damageRadiusInput'); damageRadiusValue = document.getElementById('hud_damageRadiusValue');
    projectileSpeedInput = document.getElementById('hud_projectileSpeedInput'); projectileSpeedValue = document.getElementById('hud_projectileSpeedValue');
    projectileMassInput = document.getElementById('hud_projectileMassInput'); projectileMassValue = document.getElementById('hud_projectileMassValue');
    cameraZoomInput = document.getElementById('hud_cameraZoomInput'); cameraZoomValue = document.getElementById('hud_cameraZoomValue');
    shipZoomAttractInput = document.getElementById('hud_shipZoomAttractInput'); shipZoomAttractValue = document.getElementById('hud_shipZoomAttractValue');
    planetZoomAttractInput = document.getElementById('hud_planetZoomAttractInput'); planetZoomAttractValue = document.getElementById('hud_planetZoomAttractValue');


    bhDragFactorInput = document.getElementById('hud_bhDragFactorInput'); bhDragFactorValue = document.getElementById('hud_bhDragFactorValue');
    bhDragReachInput = document.getElementById('hud_bhDragReachInput'); bhDragReachValue = document.getElementById('hud_bhDragReachValue');
    bhLifeInput = document.getElementById('hud_bhLifeInput'); bhLifeValue = document.getElementById('hud_bhLifeValue');
    bhSpeedInput = document.getElementById('hud_bhSpeedInput'); bhSpeedValue = document.getElementById('hud_bhSpeedValue');
    bhInwardVelInput = document.getElementById('hud_bhInwardVelInput'); bhInwardVelValue = document.getElementById('hud_bhInwardVelValue');
    bhAngularVelInput = document.getElementById('hud_bhAngularVelInput'); bhAngularVelValue = document.getElementById('hud_bhAngularVelValue');
    bhSpawnRateInput = document.getElementById('hud_bhSpawnRateInput'); bhSpawnRateValue = document.getElementById('hud_bhSpawnRateValue');
    bhMaxParticlesInput = document.getElementById('hud_bhMaxParticlesInput'); bhMaxParticlesValue = document.getElementById('hud_bhMaxParticlesValue');
    bhSpawnMinInput = document.getElementById('hud_bhSpawnMinInput'); bhSpawnMinValue = document.getElementById('hud_bhSpawnMinValue');
    bhSpawnMaxInput = document.getElementById('hud_bhSpawnMaxInput'); bhSpawnMaxValue = document.getElementById('hud_bhSpawnMaxValue');
    bhParticleMinSizeInput = document.getElementById('hud_bhParticleMinSizeInput'); bhParticleMinSizeValue = document.getElementById('hud_bhParticleMinSizeValue');
    bhParticleMaxSizeInput = document.getElementById('hud_bhParticleMaxSizeInput'); bhParticleMaxSizeValue = document.getElementById('hud_bhParticleMaxSizeValue');


    planetGravityMultiplierInput = document.getElementById('hud_planetGravityMultiplierInput'); planetGravityMultiplierValue = document.getElementById('hud_planetGravityMultiplierValue');
    chunkLifespanInput = document.getElementById('hud_chunkLifespanInput'); chunkLifespanValue = document.getElementById('hud_chunkLifespanValue');
    chunkMaxSpeedInput = document.getElementById('hud_chunkMaxSpeedInput'); chunkMaxSpeedValue = document.getElementById('hud_chunkMaxSpeedValue');
    coreExplosionInput = document.getElementById('hud_coreExplosionInput'); coreExplosionValue = document.getElementById('hud_coreExplosionValue');
    coreImplosionInput = document.getElementById('hud_coreImplosionInput'); coreImplosionValue = document.getElementById('hud_coreImplosionValue');
    craterScaleInput = document.getElementById('hud_craterScaleInput'); craterScaleValue = document.getElementById('hud_craterScaleValue');
    keToEjectInput = document.getElementById('hud_keToEjectInput'); keToEjectValue = document.getElementById('hud_keToEjectValue');
    bhEnergyMultInput = document.getElementById('hud_bhEnergyMultInput'); bhEnergyMultValue = document.getElementById('hud_bhEnergyMultValue');


    planetCountInput = document.getElementById('hud_planetCountInput'); planetCountValue = document.getElementById('hud_planetCountValue');
    bhGravityFactorInput = document.getElementById('hud_bhGravityConstInput'); bhGravityFactorValue = document.getElementById('hud_bhGravityConstValue');
    bhEventHorizonInput = document.getElementById('hud_bhEventHorizonInput'); bhEventHorizonValue = document.getElementById('hud_bhEventHorizonValue');


    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('mousemove', handleCanvasMouseMove);
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);


    if (horizontalScrollbar) { horizontalScrollbar.addEventListener('input', handleHorizontalScroll); }
    if (verticalScrollbar) { verticalScrollbar.addEventListener('input', handleVerticalScroll); }
    if (resetButton) { resetButton.addEventListener('click', handleReset); } 
    if (logSettingsButton) { logSettingsButton.addEventListener('click', handleLogSettings); }
    if (zoomOutButton) { zoomOutButton.addEventListener('click', handleZoomOutButton); }
    if (zoomInButton) { zoomInButton.addEventListener('click', handleZoomInButton); }
    if (persistentDriftCheckbox) { persistentDriftCheckbox.addEventListener('change', handleDriftCheckbox); }


    const initialGameState = getState();
    if (!initialGameState || !initialGameState.settings) {
        console.error("Input Handler: Cannot get initial settings from state for HUD setup.");
        return;
    }
    const initialSettings = initialGameState.settings;


    const setupInput = (inputEl, valueEl, internalInitialValue, modifierFunc, hudPrecision, isScaled = false, scaleFactor = 1, formatLocale = false, updateFunc = null) => {
        if (inputEl && valueEl) {
            let displayValue = internalInitialValue;
            if (isScaled && typeof internalInitialValue === 'number' && isFinite(internalInitialValue)) {
                displayValue = internalInitialValue / scaleFactor;
            }


            if (typeof displayValue === 'number' && isFinite(displayValue)) {
                inputEl.value = displayValue.toFixed(hudPrecision);
            } else {
                inputEl.value = String(displayValue); 
            }


            if (typeof displayValue !== 'number' || !isFinite(displayValue)) {
                 valueEl.textContent = '--';
            } else if (inputEl.id.includes('craterScale') || inputEl.id.includes('keToEject')) { 
                 valueEl.textContent = displayValue.toExponential(1);
            } else if (formatLocale) {
                 valueEl.textContent = displayValue.toLocaleString(undefined, { minimumFractionDigits: hudPrecision, maximumFractionDigits: hudPrecision });
            } else {
                 valueEl.textContent = displayValue.toFixed(hudPrecision);
            }
            inputEl.addEventListener('input', handleGenericNumberInput(modifierFunc, valueEl, hudPrecision, isScaled, scaleFactor, formatLocale, updateFunc));
        }
    };


    setupInput(damageRadiusInput, damageRadiusValue, initialSettings.baseDamageRadius, stateModifiers.setDamageRadius, 0);
    setupInput(projectileSpeedInput, projectileSpeedValue, initialSettings.projectileSpeed, stateModifiers.setProjectileLaunchSpeed, 0, true, config.PROJECTILE_SPEED_HUD_SCALE_FACTOR);
    setupInput(projectileMassInput, projectileMassValue, initialSettings.projectileMass, stateModifiers.setProjectileMass, 0, false, 1, true);
    setupInput(cameraZoomInput, cameraZoomValue, initialSettings.cameraZoom, (val) => updateZoom(val), 1, false, 1, false, updateScrollbars);
    setupInput(shipZoomAttractInput, shipZoomAttractValue, initialSettings.shipZoomAttractFactor, stateModifiers.setShipZoomAttractFactor, 2);
    setupInput(planetZoomAttractInput, planetZoomAttractValue, initialSettings.planetZoomAttractFactor, stateModifiers.setPlanetZoomAttractFactor, 2);
    
    setupInput(bhDragFactorInput, bhDragFactorValue, initialSettings.bhDragCoefficientMax, stateModifiers.setBHDragCoefficientMax, 2);
    setupInput(bhDragReachInput, bhDragReachValue, initialSettings.bhDragZoneMultiplier, stateModifiers.setBHDragZoneMultiplier, 1);
    setupInput(bhLifeInput, bhLifeValue, initialSettings.bhParticleLifeFactor, stateModifiers.setBHParticleLifeFactor, 1);
    setupInput(bhSpeedInput, bhSpeedValue, initialSettings.bhParticleSpeedFactor, stateModifiers.setBHParticleSpeedFactor, 1);
    setupInput(bhInwardVelInput, bhInwardVelValue, initialSettings.bhInitialInwardFactor, stateModifiers.setBHInitialInwardFactor, 1);
    setupInput(bhAngularVelInput, bhAngularVelValue, initialSettings.bhInitialAngularFactor, stateModifiers.setBHInitialAngularFactor, 1);
    setupInput(bhSpawnRateInput, bhSpawnRateValue, initialSettings.bhParticleSpawnRate, stateModifiers.setBHParticleSpawnRate, 0);
    setupInput(bhMaxParticlesInput, bhMaxParticlesValue, initialSettings.bhMaxParticles, stateModifiers.setBHMaxParticles, 0, false, 1, true);
    setupInput(bhSpawnMinInput, bhSpawnMinValue, initialSettings.bhSpawnRadiusMinFactor, stateModifiers.setBHSpawnRadiusMinFactor, 2);
    setupInput(bhSpawnMaxInput, bhSpawnMaxValue, initialSettings.bhSpawnRadiusMaxFactor, stateModifiers.setBHSpawnRadiusMaxFactor, 2);
    setupInput(bhParticleMinSizeInput, bhParticleMinSizeValue, initialSettings.bhParticleMinSize, stateModifiers.setBHParticleMinSize, 1);
    setupInput(bhParticleMaxSizeInput, bhParticleMaxSizeValue, initialSettings.bhParticleMaxSize, stateModifiers.setBHParticleMaxSize, 1);


    setupInput(planetGravityMultiplierInput, planetGravityMultiplierValue, initialSettings.planetGravityMultiplier, stateModifiers.setPlanetGravityMultiplier, 1, true, config.PLANET_GRAVITY_HUD_SCALE_FACTOR);
    setupInput(chunkLifespanInput, chunkLifespanValue, initialSettings.chunkLifespanFrames, stateModifiers.setChunkLifespan, 0);
    setupInput(chunkMaxSpeedInput, chunkMaxSpeedValue, initialSettings.chunkMaxSpeedThreshold, stateModifiers.setChunkMaxSpeed, 0);
    setupInput(coreExplosionInput, coreExplosionValue, initialSettings.coreExplosionDuration, stateModifiers.setCoreExplosionDuration, 0);
    setupInput(coreImplosionInput, coreImplosionValue, initialSettings.coreImplosionDuration, stateModifiers.setCoreImplosionDuration, 0);
    setupInput(craterScaleInput, craterScaleValue, initialSettings.craterScalingC, stateModifiers.setCraterScalingC, 1, false, 1, false); 
    setupInput(keToEjectInput, keToEjectValue, initialSettings.keToMassEjectEta, stateModifiers.setKeToMassEjectEta, 1, false, 1, false); 
    setupInput(bhEnergyMultInput, bhEnergyMultValue, initialSettings.bhEnergyMultiplier, stateModifiers.setBHEnergyMultiplier, 1);


    setupInput(planetCountInput, planetCountValue, initialSettings.planetCount, stateModifiers.setSetupPlanetCount, 0);
    setupInput(bhGravityFactorInput, bhGravityFactorValue, initialSettings.bhGravityFactor, stateModifiers.setBHGravityFactor, 1);
    setupInput(bhEventHorizonInput, bhEventHorizonValue, initialSettings.blackHoleEventHorizonRadius, stateModifiers.setBlackHoleEventHorizonRadius, 0);


    if (persistentDriftCheckbox) {
        persistentDriftCheckbox.checked = initialSettings.persistentChunkDrift;
    }


    document.querySelectorAll('#devHud .section-title.collapsible').forEach((title, index) => {
        const targetId = title.getAttribute('data-target');
        if (!targetId) return;
        const contentDiv = document.getElementById(targetId);
        if (!contentDiv) return;
        const shouldBeOpen = index === 0; 
        title.addEventListener('click', handleCollapseToggle);
        if (shouldBeOpen) {
            title.textContent = title.textContent.replace(/\[[+-]\]/g, '[-]');
            contentDiv.style.maxHeight = contentDiv.scrollHeight + "px";
            contentDiv.classList.remove('collapsed');
        } else {
            title.textContent = title.textContent.replace(/\[[+-]\]/g, '[+]');
            contentDiv.style.maxHeight = '0px';
            contentDiv.classList.add('collapsed');
        }
    });


    updateScrollbars(); 
    console.log("Input Listeners Set Up with initial HUD values populated.");
}
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=setupInputListenersFunction##


// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=eventHandlers##
function handleCanvasClick(event) {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const screenCoords = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const state = getState();
    if (!state) return; 
    const worldCoords = stateModifiers.screenToWorld(screenCoords, state);


    if (state.clickState === 'idle') {
        stateModifiers.setClickState('waitingForSecondClick', screenCoords);
    } else if (state.clickState === 'waitingForSecondClick') {
        interaction.processClick(worldCoords, state); 
    }
}
function handleCanvasMouseMove(event) {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const screenCoords = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    stateModifiers.setCurrentMousePos(screenCoords);
}
function handleResize() {
    if (!canvas) return;
    const newWidth = window.innerWidth;
    const newHeight = window.innerHeight;
    canvas.width = newWidth;
    canvas.height = newHeight;
    const state = getState();
    if (!state) { console.error("handleResize: Cannot get current state!"); return; }
    state.canvasWidth = newWidth;
    state.canvasHeight = newHeight;
    updateScrollbars();
}
function handleKeyDown(event) {
    if (event.target.tagName === 'INPUT' && event.target.type !== 'checkbox') return; 
    
    if (keyState.hasOwnProperty(event.code)) {
        if(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Numpad4', 'Numpad6'].includes(event.code)) {
            event.preventDefault();
        }
        if (!keyState[event.code]) { 
            keyState[event.code] = true;
            if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
                updateShipStateFromKeys();
            } else if (event.code === 'Space') {
                // --- BEGIN MODIFICATION: Client-Side Prediction for Firing ---
                const ghostProjectileData = stateModifiers.fireShipProjectile(); 
                if (ghostProjectileData) {
                    // Instantly create the "ghost" projectile on the client
                    const ghost = new Projectile(
                        ghostProjectileData.id,
                        ghostProjectileData.ownerShipId,
                        ghostProjectileData.x,
                        ghostProjectileData.y,
                        ghostProjectileData.angle,
                        ghostProjectileData.initialSpeedInternalPxFrame,
                        ghostProjectileData.color,
                        ghostProjectileData.massKg
                    );
                    stateModifiers.addProjectile(ghost);
                }
                // --- END MODIFICATION ---
            }
        }
    }
}
function handleKeyUp(event) {
     if (keyState.hasOwnProperty(event.code)) {
        if(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Numpad4', 'Numpad6'].includes(event.code)) {
            if (!(event.target.tagName === 'INPUT' && event.target.type !== 'checkbox')) {
                event.preventDefault();
            }
        }
        if (keyState[event.code]) { 
            keyState[event.code] = false;
            if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') updateShipStateFromKeys();
        }
    }
}
function updateShipStateFromKeys() {
    stateModifiers.setShipRotation(keyState.ArrowLeft, keyState.ArrowRight);
}
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=eventHandlers##


// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=inGameControlHandlers##
function handleDriftCheckbox(event) {
    stateModifiers.setPersistentChunkDrift(event.target.checked);
}
function handleZoomOutButton() {
    const currentZoom = getState()?.settings?.cameraZoom || config.defaultCameraZoom;
    updateZoom(currentZoom - ZOOM_STEP);
}
function handleZoomInButton() {
    const currentZoom = getState()?.settings?.cameraZoom || config.defaultCameraZoom;
    updateZoom(currentZoom + ZOOM_STEP);
}
function updateZoom(newZoomRaw) {
    if (!canvas) return;
    const newZoom = Math.max(config.minZoom, Math.min(config.maxZoom, isNaN(newZoomRaw) ? config.defaultCameraZoom : newZoomRaw));
    const state = getState();
    if (!state || !state.settings) return;
    stateModifiers.setCameraZoom(newZoom, state.canvasWidth / 2, state.canvasHeight / 2); 
    if (cameraZoomInput) cameraZoomInput.value = newZoom.toFixed(1);
    if (cameraZoomValue) cameraZoomValue.textContent = newZoom.toFixed(1);
    updateScrollbars();
}
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=inGameControlHandlers##


// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=genericSliderHandlers## 
function handleGenericNumberInput(modifierFunction, valueElement, hudPrecision, isScaled = false, scaleFactor = 1, formatAsLocaleString = false, updateCallback = null) {
    return function(event) {
        if (!event || !event.target) return;


        const rawValue = event.target.value;
        let parsedHudValue = parseFloat(rawValue);


        if (isNaN(parsedHudValue) && rawValue.trim() !== "" && rawValue.trim() !== "-") {
            return; 
        }


        let internalValue;
        if (!isNaN(parsedHudValue)) {
            internalValue = isScaled ? parsedHudValue * scaleFactor : parsedHudValue;
            modifierFunction(internalValue); 
        } else if (rawValue.trim() === "") {
             modifierFunction(NaN); 
        } else {
            return; 
        }
        
        const currentState = getState();
        let actualInternalValue = NaN; 
        const id = event.target.id; 


        if (id.includes('damageRadius')) actualInternalValue = currentState?.settings?.baseDamageRadius;
        else if (id.includes('projectileSpeed')) actualInternalValue = currentState?.settings?.projectileSpeed;
        else if (id.includes('projectileMass')) actualInternalValue = currentState?.settings?.projectileMass;
        else if (id.includes('cameraZoom')) actualInternalValue = currentState?.settings?.cameraZoom;
        else if (id.includes('shipZoomAttract')) actualInternalValue = currentState?.settings?.shipZoomAttractFactor;
        else if (id.includes('planetZoomAttract')) actualInternalValue = currentState?.settings?.planetZoomAttractFactor;
        else if (id.includes('bhDragFactor')) actualInternalValue = currentState?.settings?.bhDragCoefficientMax;
        else if (id.includes('bhDragReach')) actualInternalValue = currentState?.settings?.bhDragZoneMultiplier;
        else if (id.includes('bhLife')) actualInternalValue = currentState?.settings?.bhParticleLifeFactor;
        else if (id.includes('bhSpeed')) actualInternalValue = currentState?.settings?.bhParticleSpeedFactor;
        else if (id.includes('bhInwardVel')) actualInternalValue = currentState?.settings?.bhInitialInwardFactor;
        else if (id.includes('bhAngularVel')) actualInternalValue = currentState?.settings?.bhInitialAngularFactor;
        else if (id.includes('bhSpawnRate')) actualInternalValue = currentState?.settings?.bhParticleSpawnRate;
        else if (id.includes('bhMaxParticles')) actualInternalValue = currentState?.settings?.bhMaxParticles;
        else if (id.includes('bhSpawnMin')) actualInternalValue = currentState?.settings?.bhSpawnRadiusMinFactor;
        else if (id.includes('bhSpawnMax')) actualInternalValue = currentState?.settings?.bhSpawnRadiusMaxFactor;
        else if (id.includes('bhParticleMinSize')) actualInternalValue = currentState?.settings?.bhParticleMinSize;
        else if (id.includes('bhParticleMaxSize')) actualInternalValue = currentState?.settings?.bhParticleMaxSize;
        else if (id.includes('chunkLifespan')) actualInternalValue = currentState?.settings?.chunkLifespanFrames;
        else if (id.includes('chunkMaxSpeed')) actualInternalValue = currentState?.settings?.chunkMaxSpeedThreshold;
        else if (id.includes('coreExplosion')) actualInternalValue = currentState?.settings?.coreExplosionDuration;
        else if (id.includes('coreImplosion')) actualInternalValue = currentState?.settings?.coreImplosionDuration;
        else if (id.includes('planetCount')) actualInternalValue = currentState?.settings?.planetCount;
        else if (id.includes('bhGravityConst')) actualInternalValue = currentState?.settings?.bhGravityFactor;
        else if (id.includes('bhEventHorizon')) actualInternalValue = currentState?.settings?.blackHoleEventHorizonRadius;
        else if (id.includes('craterScale')) actualInternalValue = currentState?.settings?.craterScalingC;
        else if (id.includes('keToEject')) actualInternalValue = currentState?.settings?.keToMassEjectEta;
        else if (id.includes('bhEnergyMult')) actualInternalValue = currentState?.settings?.bhEnergyMultiplier;
        else if (id.includes('planetGravityMultiplier')) actualInternalValue = currentState?.settings?.planetGravityMultiplier;
        
        let displayValueForHud = actualInternalValue;
        if (isScaled && typeof actualInternalValue === 'number' && isFinite(actualInternalValue)) {
            displayValueForHud = actualInternalValue / scaleFactor;
        }


        if (valueElement) {
             if (typeof displayValueForHud !== 'number' || !isFinite(displayValueForHud)) {
                 valueElement.textContent = '--';
             } else if (id.includes('craterScale') || id.includes('keToEject')) {
                 valueElement.textContent = displayValueForHud.toExponential(1);
             } else if (formatAsLocaleString && !id.includes('bhGravityConst')) { 
                  valueElement.textContent = displayValueForHud.toLocaleString(undefined, { minimumFractionDigits: hudPrecision, maximumFractionDigits: hudPrecision });
             } else {
                 valueElement.textContent = displayValueForHud.toFixed(hudPrecision);
             }
        }
        if (event.target && typeof displayValueForHud === 'number' && isFinite(displayValueForHud)) {
            const formattedNewVal = displayValueForHud.toFixed(hudPrecision);
            // if (document.activeElement !== event.target || event.target.value !== formattedNewVal) {
            // } // Removed to prevent cursor jump
        }
        if (updateCallback) updateCallback();
    }
}
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=genericSliderHandlers##


// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=resetHandler##
function handleReset() {
    if (!canvas) { console.error("Reset failed: Canvas not found."); return; }
    
    console.log("InputHandler: Requesting server to reset world...");
    if (socket && socket.connected) {
        socket.emit('request_world_reset', {}); 
    } else {
        console.error("Cannot send world reset request: Socket not connected.");
    }
}
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=resetHandler##


// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=logSettingsHandler##
function handleLogSettings() {
    const state = getState();
    if (state && state.settings) {
        console.log("--- Current Game Settings (Internal Values) ---");
        const { settings } = state;
        console.log(`  World: Min(${settings.worldMinX},${settings.worldMinY}), Max(${settings.worldMaxX},${settings.worldMaxY}), Size(${settings.worldWidth}x${settings.worldHeight})`);
        console.log(`  Camera: Offset(${settings.cameraOffsetX.toFixed(1)},${settings.cameraOffsetY.toFixed(1)}), Zoom:${settings.cameraZoom.toFixed(2)}`);
        console.log(`  Zoom Attract: Ship=${settings.shipZoomAttractFactor.toFixed(2)}, Planet=${settings.planetZoomAttractFactor.toFixed(2)}`);
        console.log(`  Physics: G=${settings.G.toExponential(3)}, Pixels/Meter=${settings.pixelsPerMeter}, FPS=${settings.gameFps}`);
        console.log(`  Planet Gravity Multiplier (Internal): ${settings.planetGravityMultiplier.toExponential(3)} (HUD: ${(settings.planetGravityMultiplier / config.PLANET_GRAVITY_HUD_SCALE_FACTOR).toFixed(1)})`);
        console.log(`  Planet Count: ${settings.planetCount}, Click Damage Radius: ${settings.baseDamageRadius}, Persistent Drift: ${settings.persistentChunkDrift}`);
        console.log(`  Projectile: Speed (Internal):${settings.projectileSpeed.toFixed(2)} (HUD:${(settings.projectileSpeed / config.PROJECTILE_SPEED_HUD_SCALE_FACTOR).toFixed(0)}), Mass:${settings.projectileMass}kg`);
        console.log(`  Destruction: CraterScale(c)=${settings.craterScalingC.toExponential(2)}, KE-to-Eject(eta)=${settings.keToMassEjectEta.toExponential(2)}, BH Energy Mult=${settings.bhEnergyMultiplier.toFixed(2)}`);
        console.log(`  Chunks: Lifespan=${settings.chunkLifespanFrames}f, MaxSpeed=${settings.chunkMaxSpeedThreshold}px/f`);
        console.log(`  Effects Timing: CoreExplode=${settings.coreExplosionDuration}f, CoreImplode=${settings.coreImplosionDuration}f`);
        console.log(`  BH Core: GravityFactor=${settings.bhGravityFactor.toFixed(1)}x (GM=${settings.blackHoleGravitationalConstant.toExponential(3)}), EventHorizon=${settings.blackHoleEventHorizonRadius}px`);
        console.log(`  BH Drag: ZoneMultiplier=${settings.bhDragZoneMultiplier.toFixed(2)}, MaxDragCoeff=${settings.bhDragCoefficientMax.toFixed(3)}`);
        console.log(`  BH Particles: LifeFactor=${settings.bhParticleLifeFactor.toFixed(1)}, SpeedFactor=${settings.bhParticleSpeedFactor.toFixed(1)}, SpawnRate=${settings.bhParticleSpawnRate}/f, MaxTotal=${settings.bhMaxParticles}`);
        console.log(`  BH Particle Spawn: MinRadiusFactor=${settings.bhSpawnRadiusMinFactor.toFixed(2)}, MaxRadiusFactor=${settings.bhSpawnRadiusMaxFactor.toFixed(2)}, MinSize=${settings.bhParticleMinSize.toFixed(1)}px, MaxSize=${settings.bhParticleMaxSize.toFixed(1)}px`);
        console.log(`  BH Particle Vel: InwardFactor=${settings.bhInitialInwardFactor.toFixed(2)}, AngularFactor=${settings.bhInitialAngularFactor.toFixed(2)}`);
        console.log("---------------------------------------------");
    } else {
        console.log("Log Settings: Game state or settings not available.");
    }
}
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=logSettingsHandler##


// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=collapseHandler##
function handleCollapseToggle(event) {
    const title = event.currentTarget;
    const targetId = title.getAttribute('data-target');
    if (!targetId) return;
    const contentDiv = document.getElementById(targetId);
    if (!contentDiv) return;
    const isCollapsed = contentDiv.classList.contains('collapsed');
    if (isCollapsed) {
        contentDiv.classList.remove('collapsed');
        title.textContent = title.textContent.replace(/\[[+-]\]/g, '[-]');
        contentDiv.style.maxHeight = contentDiv.scrollHeight + "px"; 
    } else {
        contentDiv.classList.add('collapsed');
        title.textContent = title.textContent.replace(/\[[+-]\]/g, '[+]');
        contentDiv.style.maxHeight = '0px'; 
    }
}
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=collapseHandler##


// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=scrollBarHandlers##
const SCROLL_MAX_VAL = 1000; 


function handleHorizontalScroll(event) {
    if (isProcessingScroll) return; 
    isProcessingScroll = true;


    const state = getState();
    if (!state || !state.settings || !state.settings.worldWidth) {
        requestAnimationFrame(() => { isProcessingScroll = false; });
        return;
    }
    const settings = state.settings;
    const zoom = settings.cameraZoom;
    const canvasWidth = state.canvasWidth;
    const visibleWidth = canvasWidth / zoom;
    const minAllowedOffsetX = settings.worldMinX + visibleWidth / 2;
    const maxAllowedOffsetX = settings.worldMaxX - visibleWidth / 2;
    const horizontalScrollRange = maxAllowedOffsetX - minAllowedOffsetX;


    if (horizontalScrollRange <= 1) { 
        requestAnimationFrame(() => { isProcessingScroll = false; });
        return;
    }
    const scrollValue = parseFloat(event.target.value);
    const scrollPos = scrollValue / SCROLL_MAX_VAL; 
    const newOffsetX = minAllowedOffsetX + scrollPos * horizontalScrollRange;
    stateModifiers.setCameraOffset(newOffsetX, settings.cameraOffsetY);


    updateScrollbars(); 
}


function handleVerticalScroll(event) {
    if (isProcessingScroll) return;
    isProcessingScroll = true;


    const state = getState();
    if (!state || !state.settings || !state.settings.worldHeight) {
        requestAnimationFrame(() => { isProcessingScroll = false; });
        return;
    }
    const settings = state.settings;
    const zoom = settings.cameraZoom;
    const canvasHeight = state.canvasHeight;
    const visibleHeight = canvasHeight / zoom;
    const minAllowedOffsetY = settings.worldMinY + visibleHeight / 2;
    const maxAllowedOffsetY = settings.worldMaxY - visibleHeight / 2;
    const verticalScrollRange = maxAllowedOffsetY - minAllowedOffsetY;


    if (verticalScrollRange <= 1) {
        requestAnimationFrame(() => { isProcessingScroll = false; });
        return;
    }
    const scrollValue = parseFloat(event.target.value);
    const scrollPos = scrollValue / SCROLL_MAX_VAL; 
    const newOffsetY = minAllowedOffsetY + scrollPos * verticalScrollRange;
    stateModifiers.setCameraOffset(settings.cameraOffsetX, newOffsetY);
    
    updateScrollbars();
}
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=scrollBarHandlers##


// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=updateScrollbarsFunction##
function updateScrollbars() {
    if (!canvas || !horizontalScrollbar || !verticalScrollbar) {
        if(isProcessingScroll) requestAnimationFrame(() => { isProcessingScroll = false; });
        return;
    }
    const state = getState();
    if (!state || !state.settings || typeof state.settings.worldMinX === 'undefined') {
        if(horizontalScrollbar) horizontalScrollbar.style.display = 'none';
        if(verticalScrollbar) verticalScrollbar.style.display = 'none';
        if(isProcessingScroll) requestAnimationFrame(() => { isProcessingScroll = false; });
        return;
    }


    let wasCalledByEventHandler = isProcessingScroll;
    if (!isProcessingScroll) { 
        isProcessingScroll = true;
    }


    try {
        const settings = state.settings;
        const zoom = settings.cameraZoom;
        const worldMinX = settings.worldMinX; const worldMinY = settings.worldMinY;
        const worldMaxX = settings.worldMaxX; const worldMaxY = settings.worldMaxY;
        const canvasWidth = state.canvasWidth; const canvasHeight = state.canvasHeight;
        
        let currentOffsetX = settings.cameraOffsetX;
        let currentOffsetY = settings.cameraOffsetY;


        if (zoom <= 0 || canvasWidth <= 0 || canvasHeight <= 0) { 
            horizontalScrollbar.style.display = 'none'; verticalScrollbar.style.display = 'none';
            return;
        }
        const visibleWidth = canvasWidth / zoom; const visibleHeight = canvasHeight / zoom;


        const minAllowedOffsetX = worldMinX + visibleWidth / 2;
        const maxAllowedOffsetX = worldMaxX - visibleWidth / 2;
        const minAllowedOffsetY = worldMinY + visibleHeight / 2;
        const maxAllowedOffsetY = worldMaxY - visibleHeight / 2;


        let clampedOffsetX = currentOffsetX;
        let clampedOffsetY = currentOffsetY;
        let hScrollNeeded = false;
        let vScrollNeeded = false;


        const horizontalScrollRange = maxAllowedOffsetX - minAllowedOffsetX;
        if (settings.worldWidth > visibleWidth + 1 && horizontalScrollRange > 1) { 
            hScrollNeeded = true;
            clampedOffsetX = Math.max(minAllowedOffsetX, Math.min(maxAllowedOffsetX, currentOffsetX));
        } else { 
            clampedOffsetX = stateUtils.calculateTargetOffsetX(settings); 
            hScrollNeeded = false;
        }


        const verticalScrollRange = maxAllowedOffsetY - minAllowedOffsetY;
         if (settings.worldHeight > visibleHeight + 1 && verticalScrollRange > 1) { 
             vScrollNeeded = true;
             clampedOffsetY = Math.max(minAllowedOffsetY, Math.min(maxAllowedOffsetY, currentOffsetY));
         } else { 
            clampedOffsetY = stateUtils.calculateTargetOffsetY(settings); 
            vScrollNeeded = false;
         }


        if (Math.abs(settings.cameraOffsetX - clampedOffsetX) > 0.01 || Math.abs(settings.cameraOffsetY - clampedOffsetY) > 0.01) {
             stateModifiers.setCameraOffset(clampedOffsetX, clampedOffsetY);
        }


        if (hScrollNeeded) {
            horizontalScrollbar.style.display = 'block';
            horizontalScrollbar.min = "0";
            horizontalScrollbar.max = String(SCROLL_MAX_VAL);
            const hScrollPosRatio = (horizontalScrollRange > 1) ? (clampedOffsetX - minAllowedOffsetX) / horizontalScrollRange : 0;
            const newHScrollVal = String(Math.max(0, Math.min(SCROLL_MAX_VAL, Math.round(hScrollPosRatio * SCROLL_MAX_VAL))));
            if (horizontalScrollbar.value !== newHScrollVal) { 
                horizontalScrollbar.value = newHScrollVal;
            }
        } else { horizontalScrollbar.style.display = 'none'; }


        if (vScrollNeeded) {
            verticalScrollbar.style.display = 'block';
            verticalScrollbar.min = "0";
            verticalScrollbar.max = String(SCROLL_MAX_VAL);
            const vScrollPosRatio = (verticalScrollRange > 1) ? (clampedOffsetY - minAllowedOffsetY) / verticalScrollRange : 0;
            const newVScrollVal = String(Math.max(0, Math.min(SCROLL_MAX_VAL, Math.round(vScrollPosRatio * SCROLL_MAX_VAL))));
            if (verticalScrollbar.value !== newVScrollVal) {
                verticalScrollbar.value = newVScrollVal;
            }
        } else { verticalScrollbar.style.display = 'none'; }


    } catch (error) {
        console.error("Error during updateScrollbars:", error);
        if(horizontalScrollbar) horizontalScrollbar.style.display = 'none';
        if(verticalScrollbar) verticalScrollbar.style.display = 'none';
    } finally {
        if (wasCalledByEventHandler || (!wasCalledByEventHandler && isProcessingScroll)) {
             requestAnimationFrame(() => { isProcessingScroll = false; });
        }
    }
}
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=updateScrollbarsFunction##


// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=processHeldKeysFunction##
export function processHeldKeys() {
    let speedChangedByKeys = false;
    if (keyState.ArrowUp) { stateModifiers.adjustProjectileLaunchSpeed(true); speedChangedByKeys = true; }
    if (keyState.ArrowDown) { stateModifiers.adjustProjectileLaunchSpeed(false); speedChangedByKeys = true; }


    if (speedChangedByKeys) {
        const internalSpeed = getState().settings.projectileSpeed;
        const displaySpeed = internalSpeed / config.PROJECTILE_SPEED_HUD_SCALE_FACTOR;
        if (projectileSpeedInput) projectileSpeedInput.value = displaySpeed.toFixed(0);
        if (projectileSpeedValue) projectileSpeedValue.textContent = displaySpeed.toFixed(0);
    }
    if (keyState.Numpad4) stateModifiers.adjustShipAngle(-config.SHIP_FINE_TURN_RATE_RAD_FRAME);
    if (keyState.Numpad6) stateModifiers.adjustShipAngle(config.SHIP_FINE_TURN_RATE_RAD_FRAME);
}
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=processHeldKeysFunction##


// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=inputHandlerFileContent##