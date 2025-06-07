/* File: public/js/entities/Projectile.js */
// js/entities/Projectile.js





import * as config from '../config.js';

import * as utils from '../utils.js';

import { getState } from '../state/gameState.js';





// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=ProjectileClass##





// Messages for projectiles lost in space (can be removed if server handles all "lost" logic)

const LOST_IN_SPACE_MESSAGES = [

    "was lost in the cosmic void.",

    "hit space dust and was obliterated.",

    "was consumed by a rogue space amoeba.",

    // ... (keep or remove as desired, server may make these redundant)

];





export class Projectile {

    /** Constructor - Now expects angle and initialSpeedInternalPxFrame for vx,vy setup */

    constructor(id, ownerShipId, x, y, angle, initialSpeedInternalPxFrame, color, projectileMass) {

        const state = getState(); 
        const settings = state?.settings; 





        this.id = id; 
        this.ownerShipId = ownerShipId; 
        this.x = x;
        this.y = y;
        this.prevX = x;
        this.prevY = y;





        this.vx = Math.cos(angle) * initialSpeedInternalPxFrame;
        this.vy = Math.sin(angle) * initialSpeedInternalPxFrame;
        
        this.angle = angle; 
        this.initialSpeedInternalPxFrame = initialSpeedInternalPxFrame; 





        this.color = color;
        this.size = config.PROJECTILE_SIZE_PX;
        this.isActive = true;
        this.massKg = projectileMass; 
        this.damage = 0; 





        const clientPixelsPerMeter = settings?.pixelsPerMeter || config.PIXELS_PER_METER;
        const clientSecondsPerFrame = settings?.secondsPerFrame || config.SECONDS_PER_FRAME;
        this.initialSpeed_mps = (initialSpeedInternalPxFrame / clientPixelsPerMeter) / clientSecondsPerFrame;





        this.pathHistory = [{ x: this.x, y: this.y }];
        this.trailColor = config.PROJECTILE_TRAIL_COLOR;
        this.inactiveTrailColor = '#D2691E'; 
        this.trailLife = config.PROJECTILE_TRAIL_PERSIST_DURATION_FRAMES;
        this.trailPersistsAfterImpact = true;
        this.isLost = false;





        // --- BEGIN MODIFICATION: Add interpolation properties ---
        this.targetX = x;
        this.targetY = y;
        this.lastServerUpdateTime = 0;
        this.INTERPOLATION_FACTOR = 0.15; // A higher value corrects faster
        // --- END MODIFICATION ---

    }





    /** Updates projectile position based on its own velocity (client-side prediction) */

    update() {

        if (!this.isActive && this.trailLife <= 0) {
            this.trailPersistsAfterImpact = false; 
            return;
        }





        if (!this.isActive && this.trailLife > 0) {
            this.trailLife--;
            return; 
        }





        const state = getState();
        if (!state || !state.settings) { 
            this.prevX = this.x;
            this.prevY = this.y;
            this.x += this.vx;
            this.y += this.vy;
            this.pathHistory.push({ x: this.x, y: this.y });
            if (this.pathHistory.length > config.PROJECTILE_MAX_PATH_POINTS) {
                this.pathHistory.shift();
            }
            return;
        }



        const settings = state.settings;
        const eventHorizonRadius = settings.blackHoleEventHorizonRadius;
        const eventHorizonRadiusSq = eventHorizonRadius * eventHorizonRadius;
        const pixelsPerMeter = settings.pixelsPerMeter;
        const G = settings.G;
        const secondsPerFrame = settings.secondsPerFrame;





        this.prevX = this.x;
        this.prevY = this.y;





        let totalAccX_pixels = 0;
        let totalAccY_pixels = 0;





        // **** START: CLIENT-SIDE GRAVITY PREDICTION ****
        // This part remains the same, as the prediction model is now accurate.
        state.planets.forEach(planet => {
            const dx_pixels = planet.x - this.x;
            const dy_pixels = planet.y - this.y;
            const distSq_pixels = dx_pixels * dx_pixels + dy_pixels * dy_pixels;

            if (distSq_pixels < 1.0 && !planet.isBlackHole) return;
            if (planet.isBlackHole && distSq_pixels < 0.01) return;

            const dist_pixels = Math.sqrt(distSq_pixels);
            const dist_m = dist_pixels / pixelsPerMeter;
            let accelerationMagnitude_mps2 = 0;

            if (planet.isBlackHole) {
                if (dist_m > 0) {
                    accelerationMagnitude_mps2 = settings.blackHoleGravitationalConstant / (dist_m * dist_m);
                }
                const ehRadius = settings.blackHoleEventHorizonRadius;
                const dragZoneOuterRadius = ehRadius * settings.bhDragZoneMultiplier;
                if (dist_pixels < dragZoneOuterRadius && dist_pixels > ehRadius) {
                    const normalizedDistInZone = (dragZoneOuterRadius - dist_pixels) / (dragZoneOuterRadius - ehRadius);
                    const dragCoeff = settings.bhDragCoefficientMax * normalizedDistInZone;
                    this.vx *= (1 - dragCoeff); 
                    this.vy *= (1 - dragCoeff);
                }
            } else if (planet.massKg > 0) {
                const effectiveG = G * settings.planetGravityMultiplier;
                const M = planet.massKg;
                const originalRadius_m = planet.originalRadius_m || (planet.originalRadius / pixelsPerMeter);
                const coreRadius_m = originalRadius_m * settings.planetGravityCoreRadiusFactor;

                if (dist_m > 0) {
                    if (dist_m >= coreRadius_m) {
                        accelerationMagnitude_mps2 = (effectiveG * M) / (dist_m * dist_m);
                    } else {
                        const forceAtCoreEdge = (effectiveG * M) / (coreRadius_m * coreRadius_m);
                        accelerationMagnitude_mps2 = forceAtCoreEdge * (dist_m / coreRadius_m);
                    }
                }
            }

            if (accelerationMagnitude_mps2 > 0) {
                const accX_mps2 = (dx_pixels / dist_pixels) * accelerationMagnitude_mps2;
                const accY_mps2 = (dy_pixels / dist_pixels) * accelerationMagnitude_mps2;
                const scaleFactor = pixelsPerMeter * secondsPerFrame * secondsPerFrame;
                totalAccX_pixels += accX_mps2 * scaleFactor;
                totalAccY_pixels += accY_mps2 * scaleFactor;
            }
        });
        // **** END: CLIENT-SIDE GRAVITY PREDICTION ****





        // Apply predicted physics
        this.vx += totalAccX_pixels;
        this.vy += totalAccY_pixels;
        this.x += this.vx;
        this.y += this.vy;


        // --- BEGIN MODIFICATION: Apply smooth interpolation ---
        // Instead of snapping, we gently nudge the projectile towards its true server position.
        if (this.lastServerUpdateTime > 0) {
            this.x += (this.targetX - this.x) * this.INTERPOLATION_FACTOR;
            this.y += (this.targetY - this.y) * this.INTERPOLATION_FACTOR;
        }
        // --- END MODIFICATION ---



        const buffer = settings.projectileBoundsBuffer || 500;
        if (this.x < settings.worldMinX - buffer || this.x > settings.worldMaxX + buffer ||
            this.y < settings.worldMinY - buffer || this.y > settings.worldMaxY + buffer) {
            if (this.isActive) {
                this.isLost = true;
            }
        } else {
            this.pathHistory.push({ x: this.x, y: this.y });
            if (this.pathHistory.length > config.PROJECTILE_MAX_PATH_POINTS) {
                this.pathHistory.shift();
            }
        }





        state.planets.forEach(planet => {
            if (!this.isActive || !planet.isBlackHole) return;
            if (utils.distanceSq({x: this.x, y: this.y}, {x: planet.x, y: planet.y}) <= eventHorizonRadiusSq) {
                // Server handles deactivation for BH absorption
            }
        });
    }





     /** Draw function */

     draw(ctx) {

        if (!this.isActive && this.trailLife <= 0 && !this.trailPersistsAfterImpact) return;



        if (this.trailPersistsAfterImpact && this.pathHistory.length >= 2 && this.trailLife > 0) {

            const camZoom = getState()?.settings?.cameraZoom || 1.0;
            const safeZoom = Math.max(0.01, camZoom);





            ctx.save();
            ctx.strokeStyle = this.isActive ? this.trailColor : this.inactiveTrailColor;





            let trailAlpha = 1.0;
            if (!this.isActive) { 
                trailAlpha = Math.max(0, this.trailLife / config.PROJECTILE_TRAIL_PERSIST_DURATION_FRAMES);
                ctx.globalAlpha = trailAlpha;
            }





            ctx.lineWidth = 1 / safeZoom; 
            ctx.beginPath();
            ctx.moveTo(this.pathHistory[0].x, this.pathHistory[0].y);
            for (let i = 1; i < this.pathHistory.length; i++) {
                ctx.lineTo(this.pathHistory[i].x, this.pathHistory[i].y);
            }
            ctx.stroke();
            ctx.globalAlpha = 1.0; 
            ctx.restore();
        }





        if (this.isActive) {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }




    // --- BEGIN MODIFICATION: Refactored server update handler ---
    applyServerUpdate(updateData) {
        // We no longer teleport the projectile. Instead, we set its "target"
        // and update its velocity to be in sync with the server.
        this.targetX = updateData.x;
        this.targetY = updateData.y;
        
        if (updateData.vx !== undefined) this.vx = updateData.vx;
        if (updateData.vy !== undefined) this.vy = updateData.vy;

        this.lastServerUpdateTime = Date.now();

        if (updateData.isActive === false && this.isActive) {
            this.isActive = false;
        }
    }
    // --- END MODIFICATION ---
}
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=ProjectileClass##