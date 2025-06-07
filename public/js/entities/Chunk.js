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
        // --- BEGIN MODIFICATION: Consistent interpolation factor ---
        this.INTERPOLATION_FACTOR = 0.15; // Adjusted to match projectiles
        // --- END MODIFICATION ---

        // Life decay properties (driven by client settings for visual fade-out)
        this.life = 1.0;
        const lifespanFrames = Math.max(1, settings.chunkLifespanFrames);
        this.lifeDecayRate = 1.0 / lifespanFrames;
        this.persistentDrift = settings.persistentChunkDrift;

        // Other client-side state flags
        this.reachedCenter = false;
        this.isTargetedForRemoval = false;
    }

    /**
     * applyServerUpdate - NEW
     * A dedicated method to update the chunk's state from a server packet.
     * This includes the authoritative position, velocity, and angle.
     */
    applyServerUpdate(serverData) {
        this.targetX = serverData.x;
        this.targetY = serverData.y;
        this.targetAngle = serverData.angle;
        
        // Directly update velocity from the server's data
        this.vx = serverData.vx;
        this.vy = serverData.vy;

        this.isActive = serverData.isActive;
        this.lastServerUpdateTime = Date.now();
    }


    /**
     * update - REFACTORED
     * The chunk no longer simulates its own gravity. It simply:
     * 1. Moves based on its last known velocity from the server (dead reckoning).
     * 2. Gently interpolates its position towards the server's authoritative state.
     * 3. Handles its own visual lifetime decay.
     */
    update() {
        if (!this.isActive) {
            return;
        }

        // === STAGE 1: MOVEMENT (DEAD RECKONING) ===
        // Move the chunk based on the last known velocity from the server.
        this.x += this.vx;
        this.y += this.vy;
        this.angle += this.angularVelocity;


        // === STAGE 2: GENTLE CORRECTION TOWARDS SERVER STATE (INTERPOLATION) ===
        // Smoothly nudge the chunk towards its actual server position.
        // This corrects any minor drift from the dead reckoning.
        if (this.lastServerUpdateTime > 0) {
            this.x += (this.targetX - this.x) * this.INTERPOLATION_FACTOR;
            this.y += (this.targetY - this.y) * this.INTERPOLATION_FACTOR;

            let angleDifference = this.targetAngle - this.angle;
            while (angleDifference > Math.PI) { angleDifference -= (2 * Math.PI); }
            while (angleDifference < -Math.PI) { angleDifference += (2 * Math.PI); }
            this.angle += angleDifference * this.INTERPOLATION_FACTOR;
            this.angle = (this.angle + 2 * Math.PI) % (2 * Math.PI);
        }


        // === STAGE 3: VISUAL LIFETIME DECAY ===
        // If not set to drift forever, fade out over time.
        if (!this.persistentDrift) {
            this.life -= this.lifeDecayRate;
            if (this.life <= 0) {
                this.life = 0;
                this.isActive = false; // Mark for cleanup
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