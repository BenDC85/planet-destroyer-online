/* File: public/js/entities/Chunk.js */
// js/entities/Chunk.js

import * as config from '../config.js';
import * as utils from '../utils.js';
import { getState } from '../state/gameState.js';

// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=ChunkClass##
export class Chunk {
    /** 
     * Constructor - REFACTORED
     * Now accepts a data object directly from the server. 
     * It no longer generates its own properties like size, velocity, or points.
     */
    constructor(chunkData, settings) {
        // --- Properties from Server Data ---
        this.id = chunkData.id;
        this.originPlanetId = chunkData.originPlanetId;
        this.x = chunkData.x;
        this.y = chunkData.y;
        this.vx = chunkData.vx;
        this.vy = chunkData.vy;
        this.angle = chunkData.angle;
        this.angularVelocity = chunkData.angularVelocity;
        this.size = chunkData.size;
        this.points = chunkData.points; // Shape is now dictated by the server
        this.massKg = chunkData.massKg;
        this.isActive = chunkData.isActive;

        // --- Client-Side Only Properties ---
        this.prevX = this.x;
        this.prevY = this.y;
        this.damage = 0; // KE damage is a server-side concept

        // Properties for gentle interpolation
        this.targetX = this.x;
        this.targetY = this.y;
        this.targetAngle = this.angle;
        this.lastServerUpdateTime = Date.now();
        this.INTERPOLATION_FACTOR = 0.05;

        // Life decay properties (driven by client settings for visual fade-out)
        this.life = 1.0;
        const lifespanFrames = Math.max(1, settings.chunkLifespanFrames);
        this.lifeDecayRate = 1.0 / lifespanFrames;
        this.persistentDrift = settings.persistentChunkDrift;

        // Other client-side state flags
        this.reachedCenter = false;
        this.isTargetedForRemoval = false; // This might be a purely client-side effect
        this.maxSpeedThreshold = settings.chunkMaxSpeedThreshold;
        this.maxSpeedSq = this.maxSpeedThreshold * this.maxSpeedThreshold;
    }

    update(state) {
        if (!this.isActive || (!this.persistentDrift && this.life <= 0)) {
            this.isActive = false;
            return;
        }

        // === STAGE 1: CLIENT-SIDE PHYSICS PREDICTION ===
        this.prevX = this.x;
        this.prevY = this.y;

        const planets = state.planets;
        const settings = state.settings;
        const eventHorizonRadius = settings.blackHoleEventHorizonRadius;
        const eventHorizonRadiusSq = eventHorizonRadius * eventHorizonRadius;
        const pixelsPerMeter = settings.pixelsPerMeter || 1.0;
        const G = settings.G;

        let totalAccX_pixels = 0;
        let totalAccY_pixels = 0;
        let isNearActiveBH_for_damping = false;

        planets.forEach(planet => {
            const dx_pixels = planet.x - this.x;
            const dy_pixels = planet.y - this.y;
            const distSq_pixels = dx_pixels * dx_pixels + dy_pixels * dy_pixels;

            if (distSq_pixels < 1.0 && !planet.isBlackHole) return;
            if (planet.isBlackHole && distSq_pixels < 0.01) return;

            const dist_pixels = Math.sqrt(distSq_pixels);
            const dist_m = dist_pixels / pixelsPerMeter;
            let accelerationMagnitude_mps2 = 0;

            if (planet.isBlackHole) {
                isNearActiveBH_for_damping = true;
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
                    this.angularVelocity *= (1 - dragCoeff * 0.5);
                }

            } else if (planet.massKg > 0) {
                const effectiveG = G * settings.planetGravityMultiplier;
                const M = planet.massKg;
                const originalRadius_m = (planet.originalRadius_m || planet.originalRadius / pixelsPerMeter);
                const coreRadius_m = originalRadius_m * config.PLANET_GRAVITY_CORE_RADIUS_FACTOR;

                if (dist_m > 0) {
                    if (dist_m >= coreRadius_m) {
                        // Standard "always outside" formula
                        accelerationMagnitude_mps2 = (effectiveG * M) / (dist_m * dist_m);
                    } else {
                        // "Soft center" formula
                        const forceAtCoreEdge = (effectiveG * M) / (coreRadius_m * coreRadius_m);
                        accelerationMagnitude_mps2 = forceAtCoreEdge * (dist_m / coreRadius_m);
                    }
                }
            }

            if (accelerationMagnitude_mps2 > 0) {
                const accX_mps2 = (dx_pixels / dist_pixels) * accelerationMagnitude_mps2;
                const accY_mps2 = (dy_pixels / dist_pixels) * accelerationMagnitude_mps2;
                const scaleFactor = pixelsPerMeter * settings.secondsPerFrame * settings.secondsPerFrame;
                totalAccX_pixels += accX_mps2 * scaleFactor;
                totalAccY_pixels += accY_mps2 * scaleFactor;
            }
        });

        // Update velocity based on client-side physics
        this.vx += totalAccX_pixels;
        this.vy += totalAccY_pixels;
        
        // This is a special state that bypasses normal movement
        if (this.isTargetedForRemoval) {
             this.x += this.vx;
             this.y += this.vy;
             for (const planet of planets) {
                 if (!planet.isBlackHole && utils.distanceSq(this, planet) < config.CHUNK_PROXIMITY_REMOVAL_RADIUS_SQ_PX) {
                     this.isActive = false;
                     this.life = 0;
                     return;
                 }
             }
             return; // End update here for targeted removal
         }

        // Apply the predicted velocity to get a new "predicted" position
        this.x += this.vx;
        this.y += this.vy;
        this.angle += this.angularVelocity;

        // === STAGE 2: GENTLE CORRECTION TOWARDS SERVER STATE (INTERPOLATION) ===
        if (this.lastServerUpdateTime > 0) {
            // Gently move current position towards the server's target position
            this.x += (this.targetX - this.x) * this.INTERPOLATION_FACTOR;
            this.y += (this.targetY - this.y) * this.INTERPOLATION_FACTOR;

            // Gently correct angle
            let angleDifference = this.targetAngle - this.angle;
            while (angleDifference > Math.PI) { angleDifference -= (2 * Math.PI); }
            while (angleDifference < -Math.PI) { angleDifference += (2 * Math.PI); }
            this.angle += angleDifference * this.INTERPOLATION_FACTOR;
            this.angle = (this.angle + 2 * Math.PI) % (2 * Math.PI);
        }

        // === STAGE 3: FINAL CHECKS AND STATE CHANGES ===
        // Damping (only if not near a black hole)
        if (!this.persistentDrift && !isNearActiveBH_for_damping) {
            this.vx *= config.CHUNK_VELOCITY_DAMPING_FACTOR;
            this.vy *= config.CHUNK_VELOCITY_DAMPING_FACTOR;
            this.angularVelocity *= config.CHUNK_ANGULAR_VELOCITY_DAMPING_FACTOR;
        }

        // Check for absorption by any BH (Event Horizon)
        for (const planet of planets) {
            if (planet.isBlackHole) {
                if (utils.distanceSq(this, {x: planet.x, y: planet.y}) <= eventHorizonRadiusSq) {
                    this.isActive = false;
                    this.life = 0;
                    return;
                }
            }
        }
        
        // Life decay for non-persistent chunks
        if (!this.persistentDrift) {
            this.life -= this.lifeDecayRate;
            if (this.life <= 0) {
                this.life = 0;
                this.isActive = false;
            }
        }
    }

    // ##AI_AUTOMATION::TARGET_ID_DEFINE_START=chunkDrawFunction##
    draw(ctx) {
        if (!this.isActive || this.life <= 0) return;

        const opacity = this.persistentDrift ? 1.0 : Math.max(0, Math.min(1, this.life));
        if (opacity < 0.01) {
            this.isActive = false;
            return;
        }

        const colorStr = this.isTargetedForRemoval ?
            `rgba(150, 100, 100, ${opacity.toFixed(2)})` :
            `rgba(128, 128, 128, ${opacity.toFixed(2)})`;

        ctx.fillStyle = colorStr;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.beginPath();
        if (this.points.length > 0) {
            ctx.moveTo(this.points[0].x, this.points[0].y);
            for (let i = 1; i < this.points.length; i++) {
                ctx.lineTo(this.points[i].x, this.points[i].y);
            }
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }
    // ##AI_AUTOMATION::TARGET_ID_DEFINE_END=chunkDrawFunction##
}
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=ChunkClass##