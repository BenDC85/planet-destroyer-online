// js/entities/Chunk.js

import * as config from '../config.js';
import * as utils from '../utils.js';
import { getState } from '../state/gameState.js';

// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=ChunkClass##
export class Chunk {
    /** Constructor */
    constructor(x, y, initialAngle, planetSpinMag, planetSpinDir, settings, originPlanetId = -1) {
        this.x = x;
        this.y = y;
        this.prevX = x;
        this.prevY = y;
        this.vx = 0;
        this.vy = 0;

        this.size = config.CHUNK_DEFAULT_BASE_SIZE_MIN + Math.random() * config.CHUNK_DEFAULT_BASE_SIZE_RANDOM_RANGE;
        this.angle = Math.random() * Math.PI * 2;
        this.angularVelocity = (Math.random() - 0.5) * config.CHUNK_DEFAULT_ANGULAR_VELOCITY_FACTOR;
        this.isActive = true;

        const approxArea = this.size * this.size; // Rough approximation
        this.massKg = Math.max(1, Math.round(approxArea * config.CHUNK_MASS_AREA_FACTOR));
        this.damage = 0; // KE damage calculated on impact

        // ---- START OF PROPERTIES TO ADD ----
        this.targetX = x;                       // Where the server wants it to be (X)
        this.targetY = y;                       // Where the server wants it to be (Y)
        this.targetAngle = this.angle;          // Where the server wants its angle to be
        this.lastServerUpdateTime = 0;          // When did we last hear from the server about this chunk?
        this.INTERPOLATION_FACTOR = 0.2;        // How quickly to glide (0.0 to 1.0). Try 0.1, 0.2, or 0.3.
        // ---- END OF PROPERTIES TO ADD ----

        // Initial Velocity
        const radialSpeed = config.CHUNK_INITIAL_RADIAL_SPEED_MIN + Math.random() * config.CHUNK_INITIAL_RADIAL_SPEED_RANDOM_RANGE;
        const radialVx = Math.cos(initialAngle) * radialSpeed;
        const radialVy = Math.sin(initialAngle) * radialSpeed;

        const tangentialSpeedFactor = config.CHUNK_INITIAL_TANGENTIAL_SPEED_FACTOR_MIN + Math.random() * config.CHUNK_INITIAL_TANGENTIAL_SPEED_FACTOR_RANDOM_RANGE;
        const randomTangentialSpeed = radialSpeed * tangentialSpeedFactor;
        const randomDirection = Math.random() < 0.5 ? 1 : -1;
        const randomTangentialVx = -Math.sin(initialAngle) * randomTangentialSpeed * randomDirection;
        const randomTangentialVy = Math.cos(initialAngle) * randomTangentialSpeed * randomDirection;

        const spinVx = -Math.sin(initialAngle) * planetSpinMag * planetSpinDir;
        const spinVy = Math.cos(initialAngle) * planetSpinMag * planetSpinDir;

        this.vx = radialVx + randomTangentialVx + spinVx;
        this.vy = radialVy + randomTangentialVy + spinVy;

        // Shape points
        this.points = [];
        const numPoints = config.CHUNK_DEFAULT_NUM_POINTS_MIN + Math.floor(Math.random() * config.CHUNK_DEFAULT_NUM_POINTS_RANDOM_RANGE);
        let lastAngleForShape = Math.random() * Math.PI * 0.5;
        for (let i = 0; i < numPoints; i++) {
            const dist = this.size * (config.CHUNK_POINT_DISTANCE_FACTOR_MIN + Math.random() * config.CHUNK_POINT_DISTANCE_FACTOR_RANDOM_RANGE);
            const currentAngleForShape = lastAngleForShape + (Math.PI / (numPoints / config.CHUNK_POINT_ANGLE_INCREMENT_BASE_FACTOR)) + (Math.random() - 0.5) * config.CHUNK_POINT_ANGLE_RANDOM_FACTOR;
            this.points.push({ x: Math.cos(currentAngleForShape) * dist, y: Math.sin(currentAngleForShape) * dist });
            lastAngleForShape = currentAngleForShape;
        }

        this.life = 1.0;
        const lifespanFrames = Math.max(1, settings.chunkLifespanFrames);
        this.lifeDecayRate = 1.0 / lifespanFrames;

        this.reachedCenter = false;
        this.isTargetedForRemoval = false;
        this.persistentDrift = settings.persistentChunkDrift;
        this.maxSpeedThreshold = settings.chunkMaxSpeedThreshold;
        this.maxSpeedSq = this.maxSpeedThreshold * this.maxSpeedThreshold;
        this.originPlanetId = originPlanetId;
    }

    update(state) {
        if (!this.isActive || (!this.persistentDrift && this.life <= 0)) {
            this.isActive = false;
            return;
        }

        // === STAGE 1: Client Predicts Its Own Movement (Keep this existing logic) ===
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
        let isNearActiveBH_for_damping = false; // Renamed to avoid conflict with drag logic's scope

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
                // Apply drag if near this black hole
                const ehRadius = settings.blackHoleEventHorizonRadius; // Assuming this is in pixels
                const dragZoneOuterRadius = ehRadius * settings.bhDragZoneMultiplier; // Use settings

                if (dist_pixels < dragZoneOuterRadius && dist_pixels > ehRadius) {
                    const normalizedDistInZone = (dragZoneOuterRadius - dist_pixels) / (dragZoneOuterRadius - ehRadius);
                    const dragCoeff = settings.bhDragCoefficientMax * normalizedDistInZone; // Use settings

                    this.vx *= (1 - dragCoeff);
                    this.vy *= (1 - dragCoeff);
                    // Optionally, also dampen angular velocity more strongly near BH
                    this.angularVelocity *= (1 - dragCoeff * 0.5); // Example: half the linear drag effect
                }

            } else if (planet.massKg > 0 && planet.radius_m > 0.01) {
                const effectiveG = G * settings.planetGravityMultiplier;
                const M = planet.massKg;
                const R_planet_m = planet.radius_m;

                if (dist_m >= R_planet_m) {
                    accelerationMagnitude_mps2 = (effectiveG * M) / (dist_m * dist_m);
                } else {
                    accelerationMagnitude_mps2 = (effectiveG * M * dist_m) / (R_planet_m * R_planet_m * R_planet_m);
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

        this.vx += totalAccX_pixels;
        this.vy += totalAccY_pixels;

        const currentSpeedSq = this.vx * this.vx + this.vy * this.vy;
        if (!this.isTargetedForRemoval && currentSpeedSq > this.maxSpeedSq) {
            let closestPlanet = null;
            let minDistSq = Infinity;
            planets.forEach(p => {
                if (!p.isBlackHole && !p.isDestroyed && p.massKg > 0) {
                    const dSq = utils.distanceSq(this, p);
                    if (dSq < minDistSq) {
                        minDistSq = dSq;
                        closestPlanet = p;
                    }
                }
            });

            if (closestPlanet && minDistSq < config.CHUNK_PROXIMITY_REMOVAL_RADIUS_SQ_PX * 100) {
                this.isTargetedForRemoval = true;
                const targetDx = closestPlanet.x - this.x;
                const targetDy = closestPlanet.y - this.y;
                const targetDist = Math.sqrt(minDistSq);
                if (targetDist > 1) {
                    this.vx = (targetDx / targetDist) * config.CHUNK_TARGETED_REMOVAL_SPEED_PX_FRAME;
                    this.vy = (targetDy / targetDist) * config.CHUNK_TARGETED_REMOVAL_SPEED_PX_FRAME;
                    this.angularVelocity = 0;
                } else {
                    this.isActive = false;
                    this.life = 0;
                    return;
                }
            }
        }

        if (this.isTargetedForRemoval) {
            // This is a special state, interpolation is bypassed.
            this.x += this.vx;
            this.y += this.vy;
            for (const planet of planets) {
                if (!planet.isBlackHole && utils.distanceSq(this, planet) < config.CHUNK_PROXIMITY_REMOVAL_RADIUS_SQ_PX) {
                    this.isActive = false;
                    this.life = 0;
                    return;
                }
            }
        } else {
            // Predict client-side movement
            this.x += this.vx;
            this.y += this.vy;
            this.angle += this.angularVelocity;

            // === STAGE 2: Smoothly Glide Towards Server's Target Position ===
            if (this.lastServerUpdateTime > 0) { // Check if we have a target from the server
                
                // Move current position a bit closer to the target position
                this.x = this.x + (this.targetX - this.x) * this.INTERPOLATION_FACTOR;
                this.y = this.y + (this.targetY - this.y) * this.INTERPOLATION_FACTOR;

                // Smoothly change angle towards target angle (handles wrapping around 360 degrees)
                let angleDifference = this.targetAngle - this.angle;
                while (angleDifference > Math.PI) { angleDifference -= (2 * Math.PI); }
                while (angleDifference < -Math.PI) { angleDifference += (2 * Math.PI); }
                this.angle = this.angle + angleDifference * this.INTERPOLATION_FACTOR;
                this.angle = (this.angle + 2 * Math.PI) % (2 * Math.PI); // Keep angle between 0 and 2PI

                // Optional: If it's super close, just snap it to avoid tiny wobbles
                const distanceToTargetSquared = (this.targetX - this.x)**2 + (this.targetY - this.y)**2;
                if (distanceToTargetSquared < (0.1 * 0.1)) { // e.g., less than 0.1 pixels
                    this.x = this.targetX;
                    this.y = this.targetY;
                    // Note: Angle snapping might not be needed if interpolation is good
                }
            }

            // === STAGE 3: Other Client-Side Checks (use the new, interpolated this.x, this.y) ===
            // Standard damping if persistentDrift is OFF AND not near BH for gravity OR drag
            if (!this.persistentDrift && !isNearActiveBH_for_damping) {
                this.vx *= config.CHUNK_VELOCITY_DAMPING_FACTOR;
                this.vy *= config.CHUNK_VELOCITY_DAMPING_FACTOR;
                this.angularVelocity *= config.CHUNK_ANGULAR_VELOCITY_DAMPING_FACTOR;
            }

            // Check for absorption by any BH (Event Horizon) AFTER movement and drag
            for (const planet of planets) {
                if (planet.isBlackHole) {
                    if (utils.distanceSq(this, {x: planet.x, y: planet.y}) <= eventHorizonRadiusSq) {
                        this.isActive = false;
                        this.life = 0;
                        return;
                    }
                }
            }
            if (!this.persistentDrift) {
                this.life -= this.lifeDecayRate;
                if (this.life <= 0) {
                    this.life = 0;
                    this.isActive = false;
                }
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