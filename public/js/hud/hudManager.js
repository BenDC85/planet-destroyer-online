// js/hud/hudManager.js


import * as config from '../config.js';
import * as utils from '../utils.js'; // For formatLargeNumber


// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=hudManagerFileContent##


// --- Element References ---\n// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=hudElementReferences##
let hudStatusEl, hudMassRemainingEl, hudCraterCountEl;
let shipAngleValueEl;
let hudShipHealthEl; // **** NEW: For ship health ****


// Value Span References
let damageRadiusValueEl;
let projectileSpeedValueEl;
let projectileMassValueEl;
let cameraZoomValueEl, shipZoomAttractValueEl, planetZoomAttractValueEl;


// BH FX
let bhDragFactorValueEl; 
let bhDragReachValueEl;  
let bhLifeValueEl, bhSpeedValueEl, bhInwardVelValueEl, bhAngularVelValueEl;
let bhSpawnRateValueEl, bhMaxParticlesValueEl;
let bhSpawnMinValueEl, bhSpawnMaxValueEl;
let bhParticleMinSizeValueEl, bhParticleMaxSizeValueEl;


// Physics / Timing
let chunkLifespanValueEl, chunkMaxSpeedValueEl;
let coreExplosionValueEl, coreImplosionValueEl;
let planetCountValueEl;
let bhGravityFactorValueEl;
let bhEventHorizonValueEl;
let craterScaleValueEl, keToEjectValueEl, bhEnergyMultValueEl;
let planetGravityMultiplierValueEl;


let isHudInitialized = false;
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=hudElementReferences##


// --- HUD Update Throttling ---
let hudDynamicUpdateCounter = 0;
const HUD_DYNAMIC_UPDATE_THROTTLE = 10; 


// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=initializeHudFunction##
export function initializeHUD() {
    console.log("HUD Manager: Attempting to initialize and grab elements...");
    isHudInitialized = grabHudElements();
    if (!isHudInitialized) {
        console.error("HUD Manager: Initialization failed - Could not grab required HUD elements!");
    }
    return isHudInitialized;
}
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=initializeHudFunction##


// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=grabHudElementsFunction##
function grabHudElements() {
    hudStatusEl = document.getElementById('hud_status');
    hudMassRemainingEl = document.getElementById('hud_massRemaining');
    hudCraterCountEl = document.getElementById('hud_craterCount');
    shipAngleValueEl = document.getElementById('hud_shipAngleValue');
    hudShipHealthEl = document.getElementById('hud_shipHealth'); // **** NEW ****


    damageRadiusValueEl = document.getElementById('hud_damageRadiusValue');
    projectileSpeedValueEl = document.getElementById('hud_projectileSpeedValue');
    projectileMassValueEl = document.getElementById('hud_projectileMassValue');
    cameraZoomValueEl = document.getElementById('hud_cameraZoomValue');
    shipZoomAttractValueEl = document.getElementById('hud_shipZoomAttractValue');
    planetZoomAttractValueEl = document.getElementById('hud_planetZoomAttractValue');


    bhDragFactorValueEl = document.getElementById('hud_bhDragFactorValue'); 
    bhDragReachValueEl = document.getElementById('hud_bhDragReachValue');   
    bhLifeValueEl = document.getElementById('hud_bhLifeValue');
    bhSpeedValueEl = document.getElementById('hud_bhSpeedValue');
    bhInwardVelValueEl = document.getElementById('hud_bhInwardVelValue');
    bhAngularVelValueEl = document.getElementById('hud_bhAngularVelValue');
    bhSpawnRateValueEl = document.getElementById('hud_bhSpawnRateValue');
    bhMaxParticlesValueEl = document.getElementById('hud_bhMaxParticlesValue');
    bhSpawnMinValueEl = document.getElementById('hud_bhSpawnMinValue');
    bhSpawnMaxValueEl = document.getElementById('hud_bhSpawnMaxValue');
    bhParticleMinSizeValueEl = document.getElementById('hud_bhParticleMinSizeValue');
    bhParticleMaxSizeValueEl = document.getElementById('hud_bhParticleMaxSizeValue');


    planetGravityMultiplierValueEl = document.getElementById('hud_planetGravityMultiplierValue');
    chunkLifespanValueEl = document.getElementById('hud_chunkLifespanValue');
    chunkMaxSpeedValueEl = document.getElementById('hud_chunkMaxSpeedValue');
    coreExplosionValueEl = document.getElementById('hud_coreExplosionValue');
    coreImplosionValueEl = document.getElementById('hud_coreImplosionValue');
    craterScaleValueEl = document.getElementById('hud_craterScaleValue');
    keToEjectValueEl = document.getElementById('hud_keToEjectValue');
    bhEnergyMultValueEl = document.getElementById('hud_bhEnergyMultValue');


    planetCountValueEl = document.getElementById('hud_planetCountValue');
    bhGravityFactorValueEl = document.getElementById('hud_bhGravityConstValue'); 
    bhEventHorizonValueEl = document.getElementById('hud_bhEventHorizonValue');


    const allElements = [
        hudStatusEl, hudMassRemainingEl, hudCraterCountEl, shipAngleValueEl, hudShipHealthEl, // Added hudShipHealthEl
        damageRadiusValueEl, projectileSpeedValueEl, projectileMassValueEl, cameraZoomValueEl,
        shipZoomAttractValueEl, planetZoomAttractValueEl,
        bhDragFactorValueEl, bhDragReachValueEl, 
        bhLifeValueEl, bhSpeedValueEl, bhInwardVelValueEl, bhAngularVelValueEl, bhSpawnRateValueEl,
        bhMaxParticlesValueEl, bhSpawnMinValueEl, bhSpawnMaxValueEl, bhParticleMinSizeValueEl,
        bhParticleMaxSizeValueEl,
        planetGravityMultiplierValueEl,
        chunkLifespanValueEl, chunkMaxSpeedValueEl, coreExplosionValueEl,
        coreImplosionValueEl, craterScaleValueEl, keToEjectValueEl, bhEnergyMultValueEl,
        planetCountValueEl, bhGravityFactorValueEl, bhEventHorizonValueEl
    ];


    const elementIds = [ 
        'hud_status', 'hud_massRemaining', 'hud_craterCount', 'hud_shipAngleValue', 'hud_shipHealth', // Added 'hud_shipHealth'
        'hud_damageRadiusValue', 'hud_projectileSpeedValue', 'hud_projectileMassValue', 'hud_cameraZoomValue',
        'hud_shipZoomAttractValue', 'hud_planetZoomAttractValue',
        'hud_bhDragFactorValue', 'hud_bhDragReachValue',
        'hud_bhLifeValue', 'hud_bhSpeedValue', 'hud_bhInwardVelValue', 'hud_bhAngularVelValue', 'hud_bhSpawnRateValue',
        'hud_bhMaxParticlesValue', 'hud_bhSpawnMinValue', 'hud_bhSpawnMaxValue', 'hud_bhParticleMinSizeValue',
        'hud_bhParticleMaxSizeValue',
        'hud_planetGravityMultiplierValue',
        'hud_chunkLifespanValue', 'hud_chunkMaxSpeedValue', 'hud_coreExplosionValue',
        'hud_coreImplosionValue', 'hud_craterScaleValue', 'hud_keToEjectValue', 'hud_bhEnergyMultValue',
        'hud_planetCountValue', 'hud_bhGravityConstValue', 'hud_bhEventHorizonValue'
    ];


    let missingElementFound = false;
    allElements.forEach((el, index) => {
        if (!el) {
            if (!missingElementFound) { 
                console.error("HUD Manager: Failed to grab one or more required HUD elements! Check HTML IDs.");
                missingElementFound = true;
            }
            const expectedId = elementIds[index] ? `'${elementIds[index]}'` : `(Unknown ID at index ${index})`;
            console.error(`    Missing element: expected ID ${expectedId} not found in HTML.`);
        }
    });


    if (missingElementFound) { return false; }
    return true;
}
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=grabHudElementsFunction##


// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=updateHudFunction##
export function updateHUD(currentState) {
    if (!isHudInitialized) {
        isHudInitialized = grabHudElements();
        if (!isHudInitialized) return; 
    }


    const settings = currentState.settings;
    const localShip = currentState.ship; 


    const updateValueSpan = (element, value, precision = 0, useExponential = false, useLocale = false, suffix = '') => {
        if (!element) return;
        if (typeof value !== 'number' || !isFinite(value)) {
            element.textContent = '--';
            return;
        }
        try {
            let displayVal = value;
            if (element.id === 'hud_projectileSpeedValue') {
                displayVal = value / config.PROJECTILE_SPEED_HUD_SCALE_FACTOR;
                precision = 0; 
            } else if (element.id === 'hud_planetGravityMultiplierValue') {
                displayVal = value / config.PLANET_GRAVITY_HUD_SCALE_FACTOR;
                precision = 1;
            } else if (element.id === 'hud_bhGravityConstValue') { 
                displayVal = value; 
                precision = 1;
            }


            if (useExponential) {
                element.textContent = displayVal.toExponential(precision) + suffix;
            } else if (useLocale) {
                element.textContent = displayVal.toLocaleString(undefined, { minimumFractionDigits: precision, maximumFractionDigits: precision }) + suffix;
            } else {
                element.textContent = displayVal.toFixed(precision) + suffix;
            }
        } catch (e) {
            console.warn("HUD Update Error: ", e, "for element:", element.id, "value:", value);
            element.textContent = 'ERR';
        }
    };


    hudDynamicUpdateCounter++;
    if (hudDynamicUpdateCounter % HUD_DYNAMIC_UPDATE_THROTTLE === 0) {
        hudDynamicUpdateCounter = 0;


        let totalMassKg = 0, totalOriginalMassKg = 0, totalCraters = 0;
        let statusText = "Idle", activeDestruction = false, activeBreakup = false, activeGrace = false, anyBlackHoles = false;


        currentState.planets.forEach(p => {
            totalMassKg += p.massKg ?? 0;
            totalOriginalMassKg += p.originalMassKg ?? 0;
            totalCraters += p.craters.length;
            if (p.isBreakingUp) activeBreakup = true;
            if (p.isDestroying) activeDestruction = true;
            if (p.chunkGracePeriodFrame > 0) activeGrace = true;
            if (p.isBlackHole) anyBlackHoles = true;
        });


        if (activeBreakup) statusText = "Shattering...";
        else if (activeDestruction) statusText = "Destroying...";
        else if (activeGrace) statusText = "Clearing Debris";
        else if (anyBlackHoles) statusText = "Black Hole(s) Active";
        else if (totalMassKg <= 0 && currentState.chunks.length === 0 && currentState.particles.length === 0 && currentState.projectiles.length === 0 && currentState.bhParticles.length === 0 && currentState.planets.every(p => p.isDestroyed || p.isBlackHole || p.massKg <=0)) statusText = "System Obliterated";
        else if (totalMassKg <= 0 && currentState.planets.every(p => p.isDestroyed || p.isBlackHole || p.massKg <=0)) statusText = "Debris Field";
        else if (currentState.planets.length === 0) statusText = "Empty System";
        
        if (hudStatusEl) hudStatusEl.textContent = statusText;


        const formattedTotalMass = utils.formatLargeNumber(totalMassKg, 2);
        const formattedOriginalMass = utils.formatLargeNumber(totalOriginalMassKg, 2);
        if (hudMassRemainingEl) hudMassRemainingEl.textContent = `${formattedTotalMass} / ${formattedOriginalMass} kg`;
        
        updateValueSpan(hudCraterCountEl, totalCraters);


        if (shipAngleValueEl && localShip) {
            const degrees = ((localShip.angle * 180 / Math.PI) % 360 + 360) % 360;
            updateValueSpan(shipAngleValueEl, degrees, 1, false, false, '°');
        } else if (shipAngleValueEl) {
            shipAngleValueEl.textContent = '--';
        }

        // **** NEW: Update Ship Health HUD ****
        if (hudShipHealthEl && localShip) {
            if (localShip.isAlive) {
                updateValueSpan(hudShipHealthEl, localShip.health, 0);
            } else {
                hudShipHealthEl.textContent = "DESTROYED";
                hudShipHealthEl.style.color = "red"; // Optional: style for destroyed state
            }
        } else if (hudShipHealthEl) {
            hudShipHealthEl.textContent = '--';
        }
        // Reset color if not destroyed (in case it was red)
        if (localShip && localShip.isAlive && hudShipHealthEl) {
            hudShipHealthEl.style.color = ""; // Reset to default color
        }
    }


    updateValueSpan(damageRadiusValueEl, settings.baseDamageRadius);
    updateValueSpan(projectileSpeedValueEl, settings.projectileSpeed); 
    updateValueSpan(projectileMassValueEl, settings.projectileMass, 0, false, true);
    updateValueSpan(cameraZoomValueEl, settings.cameraZoom, 1);
    updateValueSpan(shipZoomAttractValueEl, settings.shipZoomAttractFactor, 2);
    updateValueSpan(planetZoomAttractValueEl, settings.planetZoomAttractFactor, 2);


    updateValueSpan(bhDragFactorValueEl, settings.bhDragCoefficientMax, 2);
    updateValueSpan(bhDragReachValueEl, settings.bhDragZoneMultiplier, 1);
    updateValueSpan(bhLifeValueEl, settings.bhParticleLifeFactor, 1);
    updateValueSpan(bhSpeedValueEl, settings.bhParticleSpeedFactor, 1);
    updateValueSpan(bhInwardVelValueEl, settings.bhInitialInwardFactor, 1);
    updateValueSpan(bhAngularVelValueEl, settings.bhInitialAngularFactor, 1);
    updateValueSpan(bhSpawnRateValueEl, settings.bhParticleSpawnRate);
    updateValueSpan(bhMaxParticlesValueEl, settings.bhMaxParticles, 0, false, true);
    updateValueSpan(bhSpawnMinValueEl, settings.bhSpawnRadiusMinFactor, 2);
    updateValueSpan(bhSpawnMaxValueEl, settings.bhSpawnRadiusMaxFactor, 2);
    updateValueSpan(bhParticleMinSizeValueEl, settings.bhParticleMinSize, 1);
    updateValueSpan(bhParticleMaxSizeValueEl, settings.bhParticleMaxSize, 1);


    updateValueSpan(planetGravityMultiplierValueEl, settings.planetGravityMultiplier); 
    updateValueSpan(chunkLifespanValueEl, settings.chunkLifespanFrames);
    updateValueSpan(chunkMaxSpeedValueEl, settings.chunkMaxSpeedThreshold);
    updateValueSpan(coreExplosionValueEl, settings.coreExplosionDuration);
    updateValueSpan(coreImplosionValueEl, settings.coreImplosionDuration);
    updateValueSpan(craterScaleValueEl, settings.craterScalingC, 1, true);
    updateValueSpan(keToEjectValueEl, settings.keToMassEjectEta, 1, true);
    updateValueSpan(bhEnergyMultValueEl, settings.bhEnergyMultiplier, 1);


    updateValueSpan(planetCountValueEl, settings.planetCount);
    updateValueSpan(bhGravityFactorValueEl, settings.bhGravityFactor, 1); 
    updateValueSpan(bhEventHorizonValueEl, settings.blackHoleEventHorizonRadius);
}
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=updateHudFunction##


// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=hudManagerFileContent##
