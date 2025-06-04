// js/entities/BHParticle.js

import * as utils from '../utils.js';
import { getState } from '../state/gameState.js'; // getState is used here, ensure it's appropriate or pass state if possible
import * as config from '../config.js';

export class BHParticle {
    /**
     * Creates a visual particle for black hole effects.
     * @param {number} centerX - BH Center X (for initial position only)
     * @param {number} centerY - BH Center Y (for initial position only)
     * @param {number} spawnRefRadius - Original radius of the planet that became the BH
     * @param {object} settings - The global settings object from gameState (passed in, not from getState())
     */
    constructor(centerX, centerY, spawnRefRadius, settings) { // settings is passed
        // Spawn position logic
        const angle = Math.random() * Math.PI * 2;
        const minFactor = settings.bhSpawnRadiusMinFactor; // From settings
        const maxFactor = settings.bhSpawnRadiusMaxFactor; // From settings
        const validMin = Math.min(minFactor, maxFactor);
        const validMax = Math.max(minFactor, maxFactor);
        const radiusFactor = validMin + Math.random() * (validMax - validMin);
        const spawnDist = spawnRefRadius * radiusFactor;
        this.x = centerX + Math.cos(angle) * spawnDist;
        this.y = centerY + Math.sin(angle) * spawnDist;

        // Size logic
        const minSize = settings.bhParticleMinSize; // From settings
        const maxSize = settings.bhParticleMaxSize; // From settings
        this.radius = Math.max(0.1, minSize + Math.random() * (maxSize - minSize));

        // Initial velocity logic
        const baseSpeedRandomComponent = Math.random() * config.BHPARTICLE_INITIAL_SPEED_BASE_RANDOM_RANGE;
        const baseSpeed = config.BHPARTICLE_INITIAL_SPEED_BASE_MIN + baseSpeedRandomComponent;
        
        const speed = baseSpeed * settings.bhParticleSpeedFactor; // Modulated by settings
        const tangentDir = Math.random() < 0.5 ? 1 : -1; 
        const angularSpeed = speed * settings.bhInitialAngularFactor * tangentDir; // Modulated by settings
        const vx_tangent = -Math.sin(angle) * angularSpeed;
        const vy_tangent = Math.cos(angle) * angularSpeed;
        
        const inwardSpeed = speed * settings.bhInitialInwardFactor; // Modulated by settings
        const vx_radial = -Math.cos(angle) * inwardSpeed;
        const vy_radial = -Math.sin(angle) * inwardSpeed;
        
        this.vx = vx_tangent + vx_radial;
        this.vy = vy_tangent + vy_radial;

        this.isActive = true;
        this.color = config.BHPARTICLE_COLORS[Math.floor(Math.random() * config.BHPARTICLE_COLORS.length)];
        // Lifespan is implicitly handled by being absorbed or going off-screen.
        // Explicit lifespan could be added using settings.bhParticleLifeFactor if desired.
    }

    /**
     * Updates particle position based on net gravity from ALL black holes
     * and checks event horizon entry for ALL black holes.
     * @param {object} state - The global game state object.
     */
    update(state) { 
        if (!this.isActive) return;

        const settings = state.settings; // Passed in state
        const planets = state.planets;   // Passed in state
        const eventHorizonRadiusSq = settings.blackHoleEventHorizonRadius * settings.blackHoleEventHorizonRadius;

        let totalAccX = 0;
        let totalAccY = 0;

        // --- Calculate Net Gravity from all Black Holes ---
        planets.forEach(planet => {
            if (planet.isBlackHole) {
                const dx = planet.x - this.x;
                const dy = planet.y - this.y;
                const distSq = dx * dx + dy * dy;

                if (distSq > 1.0) { // Avoid division by zero / extreme forces
                    const dist = Math.sqrt(distSq);
                    // settings.blackHoleGravitationalConstant is the GM value for BHs
                    const gravityMagnitude = settings.blackHoleGravitationalConstant / distSq; 
                    totalAccX += (dx / dist) * gravityMagnitude;
                    totalAccY += (dy / dist) * gravityMagnitude;
                }
            }
        });

        // Apply Net Acceleration
        this.vx += totalAccX;
        this.vy += totalAccY;

        // Apply Movement
        this.x += this.vx;
        this.y += this.vy;

        // --- Event Horizon Check (against ALL BHs) ---
        for (const planet of planets) {
             if (planet.isBlackHole) {
                 const distSqToBH = utils.distanceSq({x: this.x, y: this.y}, {x: planet.x, y: planet.y});
                 if (distSqToBH <= eventHorizonRadiusSq) {
                      this.isActive = false;
                      return; // Exit update early if absorbed
                 }
             }
        }
        // Note: bhParticleLifeFactor from settings is not currently used for explicit decay.
        // If it were, logic like this.life -= (1 / settings.bhParticleLifeFactor) / config.GAME_FPS; would go here.
    }

    /**
     * Draws the particle and its trail.
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {
        if (!this.isActive || this.radius <= 0) return;

        // --- Draw Fading Trail (Velocity-based) ---
        const trailEndX = this.x - this.vx * config.BHPARTICLE_TRAIL_LENGTH_MULTIPLIER;
        const trailEndY = this.y - this.vy * config.BHPARTICLE_TRAIL_LENGTH_MULTIPLIER;

        const trailDx = this.x - trailEndX;
        const trailDy = this.y - trailEndY;
        if (trailDx * trailDx + trailDy * trailDy > config.BHPARTICLE_TRAIL_MIN_LENGTH_THRESHOLD_SQ) {
            // hexToRgba can remain a local helper or be moved to utils if used elsewhere
            function hexToRgba(hex, alpha) {
                if (!hex || typeof hex !== 'string') { return `rgba(255, 255, 255, ${alpha})`; }
                hex = hex.replace('#', '');
                let r = 255, g = 255, b = 255; // Default to white on error
                try {
                    if (hex.length === 3) {
                        r = parseInt(hex.substring(0, 1).repeat(2), 16);
                        g = parseInt(hex.substring(1, 2).repeat(2), 16);
                        b = parseInt(hex.substring(2, 3).repeat(2), 16);
                    } else if (hex.length === 6) {
                        r = parseInt(hex.substring(0, 2), 16);
                        g = parseInt(hex.substring(2, 4), 16);
                        b = parseInt(hex.substring(4, 6), 16);
                    }
                    if (isNaN(r) || isNaN(g) || isNaN(b)) { r = 255; g = 255; b = 255; }
                } catch (e) {
                    // console.warn("Error parsing hex color for BHParticle trail:", hex, e);
                }
                return `rgba(${r}, ${g}, ${b}, ${alpha})`;
            }

            const gradient = ctx.createLinearGradient(this.x, this.y, trailEndX, trailEndY);
            gradient.addColorStop(0, hexToRgba(this.color, config.BHPARTICLE_TRAIL_HEAD_ALPHA)); // More opaque near particle head
            gradient.addColorStop(0.7, hexToRgba(this.color, config.BHPARTICLE_TRAIL_MID_ALPHA)); // Mid alpha
            gradient.addColorStop(1, hexToRgba(this.color, config.BHPARTICLE_TRAIL_END_ALPHA));   // Fully transparent at tail end

            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(trailEndX, trailEndY);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = this.radius * config.BHPARTICLE_TRAIL_WIDTH_FACTOR; 
            ctx.globalAlpha = config.BHPARTICLE_TRAIL_GLOBAL_ALPHA; 
            ctx.stroke();
            ctx.globalAlpha = 1.0; // Reset global alpha
        }
        // --- End Trail ---\

        // Draw the main particle
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}