/* File: public/js/entities/Projectile.js */
// js/entities/Projectile.js







import * as config from '../config.js';

import * as utils from '../utils.js';

import { getState } from '../state/gameState.js';





// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=ProjectileClass##





export class Projectile {

    /** Constructor - Now expects angle and initialSpeedInternalPxFrame for vx,vy setup */

    // ##AI_MODIFICATION_START##
    constructor(id, ownerShipId, x, y, angle, initialSpeedInternalPxFrame, color, projectileMass, isGhost = false) {
    // ##AI_MODIFICATION_END##
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
        
        // ##AI_MODIFICATION_START##
        this.isGhost = isGhost;
        // ##AI_MODIFICATION_END##
        
        // --- BEGIN MODIFICATION: Client-side lifespan tracking ---
        this.framesAlive = 0;
        // --- END MODIFICATION ---

        this.targetX = x;
        this.targetY = y;
        this.lastServerUpdateTime = 0;
        this.INTERPOLATION_FACTOR = 0.15;

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
        const eventHorizonRadius = settings.bhEventHorizonRadiusPx;
        const eventHorizonRadiusSq = eventHorizonRadius * eventHorizonRadius;
        const pixelsPerMeter = settings.pixelsPerMeter;
        const G = settings.G;
        const secondsPerFrame = settings.secondsPerFrame;




        this.prevX = this.x;
        this.prevY = this.y;




        let totalAccX_pixels = 0;
        let totalAccY_pixels = 0;




        // CLIENT-SIDE GRAVITY PREDICTION
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
                const ehRadius = settings.bhEventHorizonRadiusPx;
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




        // Apply predicted physics
        this.vx += totalAccX_pixels;
        this.vy += totalAccY_pixels;
        this.x += this.vx;
        this.y += this.vy;

        // Apply smooth interpolation
        if (this.lastServerUpdateTime > 0) {
            this.x += (this.targetX - this.x) * this.INTERPOLATION_FACTOR;
            this.y += (this.targetY - this.y) * this.INTERPOLATION_FACTOR;
        }

        // --- BEGIN MODIFICATION: Client-side deactivation checks ---
        this.framesAlive++;

        const buffer = settings.projectileBoundsBuffer;
        const maxFrames = settings.projectileMaxLifespanFrames;

        if (this.framesAlive > maxFrames || 
            this.x < settings.worldMinX - buffer || this.x > settings.worldMaxX + buffer ||
            this.y < settings.worldMinY - buffer || this.y > settings.worldMaxY + buffer) {
            
            this.isActive = false; // Deactivate locally to stop rendering/updates
        } else {
            // Only add to path history if it's still active
            this.pathHistory.push({ x: this.x, y: this.y });
            if (this.pathHistory.length > config.PROJECTILE_MAX_PATH_POINTS) {
                this.pathHistory.shift();
            }
        }
        // --- END MODIFICATION ---

        state.planets.forEach(planet => {
            if (!this.isActive || !planet.isBlackHole) return;
            if (utils.distanceSq({x: this.x, y: this.y}, {x: planet.x, y: planet.y}) <= eventHorizonRadiusSq) {
                this.isActive = false;
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





    applyServerUpdate(updateData) {
        this.targetX = updateData.x;
        this.targetY = updateData.y;
        
        if (updateData.vx !== undefined) this.vx = updateData.vx;
        if (updateData.vy !== undefined) this.vy = updateData.vy;

        this.lastServerUpdateTime = Date.now();

        if (updateData.isActive === false && this.isActive) {
            this.isActive = false;
        }
    }
}
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=ProjectileClass##