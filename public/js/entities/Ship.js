// js/entities/Ship.js


import * as config from '../config.js';
import { getState } from '../state/gameState.js';
import { sendShipUpdate } from '../network.js';


// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=ShipClass##
export class Ship {

    constructor(id, name, initialX, initialY, initialAngle, color, initialHealth, initialIsAlive) {
        this.id = id;
        this.name = name;
        this.x = initialX;
        this.y = initialY;
        this.angle = initialAngle;
        this.size = config.SHIP_SIZE_PX;

        this.defaultColor = color; // Store original color
        this.color = color;        // Current drawing color

        this.health = initialHealth ?? 100; // Default to 100 if not provided by server initially
        this.isAlive = initialIsAlive ?? true;

        this.isRotatingLeft = false;
        this.isRotatingRight = false;
        this.isMovingForward = false;

        this.fireCooldown = 0;
        this.fireRate = config.SHIP_FIRE_RATE_FRAMES;

        this.isLocalPlayer = false;
        this.lastSentState = { x: 0, y: 0, angle: 0 };
        this.updateSendThrottle = 0;
        this.UPDATE_SEND_INTERVAL = 3;

        // **** NEW: For hit flash effect ****
        this.hitColor = '#FFFFFF'; // White flash on hit
        // Original: this.HIT_FLASH_DURATION = 10;
        this.HIT_FLASH_DURATION = 20; // << INCREASED DURATION (e.g., to 20 frames = ~333ms)
        this.hitFlashTimer = 0;
    }


    update(isThisClientShip = false) {
        this.isLocalPlayer = isThisClientShip;

        // **** NEW: Update hit flash timer ****
        if (this.hitFlashTimer > 0) {
            this.hitFlashTimer--;
            if (this.hitFlashTimer <= 0) {
                this.color = this.defaultColor; // Revert to default color
            } else {
                // Original flicker: this.color = (this.hitFlashTimer % 4 < 2) ? this.hitColor : this.defaultColor;
                // Solid flash for the first half, then flicker for the second half
                if (this.hitFlashTimer > this.HIT_FLASH_DURATION / 2) {
                    this.color = this.hitColor; // Solid white for the first half
                } else {
                    // Flicker for the second half
                    this.color = (this.hitFlashTimer % 6 < 3) ? this.hitColor : this.defaultColor; // Slower flicker
                }
            }
        }


        if (!this.isAlive && this.isLocalPlayer) {
            this.isRotatingLeft = false;
            this.isRotatingRight = false;
            return;
        }

        if (this.isLocalPlayer) {
            if (this.isRotatingLeft) {
                this.angle -= config.SHIP_TURN_RATE_RAD_FRAME;
            }
            if (this.isRotatingRight) {
                this.angle += config.SHIP_TURN_RATE_RAD_FRAME;
            }
            this.angle = (this.angle + Math.PI * 4) % (Math.PI * 2);

            this.updateSendThrottle++;
            if (this.updateSendThrottle >= this.UPDATE_SEND_INTERVAL) {
                this.updateSendThrottle = 0;
                if (Math.abs(this.x - this.lastSentState.x) > 0.1 ||
                    Math.abs(this.y - this.lastSentState.y) > 0.1 ||
                    Math.abs(this.angle - this.lastSentState.angle) > 0.01) {

                    const shipState = { x: this.x, y: this.y, angle: this.angle };
                    sendShipUpdate(shipState);
                    this.lastSentState = { ...shipState };
                }
            }
        }

        if (this.fireCooldown > 0) {
            this.fireCooldown--;
        }
    }


    fire() {
        // console.log(`[Ship ${this.id}] attempting fire. isLocalPlayer: ${this.isLocalPlayer}, isAlive: ${this.isAlive}, fireCooldown: ${this.fireCooldown}`);
        if (!this.isLocalPlayer || this.fireCooldown > 0 || !this.isAlive) {
            return null;
        }

        this.fireCooldown = this.fireRate;

        const state = getState();
        if (!state || !state.settings) {
            console.error("Ship.fire(): Cannot access game state or settings.");
            return null;
        }

        const muzzleOffsetX = Math.cos(this.angle) * this.size * config.SHIP_PROJECTILE_MUZZLE_OFFSET_FACTOR;
        const muzzleOffsetY = Math.sin(this.angle) * this.size * config.SHIP_PROJECTILE_MUZZLE_OFFSET_FACTOR;
        const startX = this.x + muzzleOffsetX;
        const startY = this.y + muzzleOffsetY;

        const projectileData = {
            ownerShipId: this.id,
            startX: startX,
            startY: startY,
            angle: this.angle,
            initialSpeedInternalPxFrame: state.settings.projectileSpeed,
            massKg: state.settings.projectileMass,
        };
        // console.log(`[Ship ${this.id}] FIRING. Data:`, projectileData);
        return projectileData;
    }


    setRotating(left, right) {
        // console.log(`[Ship ${this.id}] setRotating called. isLocalPlayer (at call time): ${this.isLocalPlayer}, isAlive: ${this.isAlive}, left: ${left}, right: ${right}`);
        if (this.isLocalPlayer && this.isAlive) {
            this.isRotatingLeft = left;
            this.isRotatingRight = right;
            // console.log(`[Ship ${this.id}] setRotating: flags set - isRotatingLeft=${this.isRotatingLeft}, isRotatingRight=${this.isRotatingRight}`);
        } else if (this.isLocalPlayer && !this.isAlive) {
            this.isRotatingLeft = false;
            this.isRotatingRight = false;
        }
    }

    // **** NEW: Method to call when ship takes a hit ****
    takeHit() {
        if (!this.isAlive) return; // Don't flash if already destroyed

        this.hitFlashTimer = this.HIT_FLASH_DURATION;
        this.color = this.hitColor; // Immediately change to hit color
        console.log(`[Ship ${this.id}] takeHit called. Flash timer set to ${this.hitFlashTimer}. Color set to: ${this.color}`); // Add console log
    }


    setState(x, y, angle, health, isAlive) {
        if (!this.isLocalPlayer) {
            this.x = x;
            this.y = y;
            this.angle = angle;
            if (health !== undefined) this.health = health;
            if (isAlive !== undefined) {
                const previousAliveState = this.isAlive;
                this.isAlive = isAlive;
                if (previousAliveState && !this.isAlive) {
                    // Ship was just marked as not alive (destroyed) by server update
                    // TODO: Could trigger client-side explosion particles here for remote ships
                    // console.log(`[Ship ${this.id}] Remote ship marked as destroyed by server state.`);
                } else if (!previousAliveState && this.isAlive) {
                     // Ship was just respawned by server update
                     this.color = this.defaultColor; // Ensure color is reset on respawn
                    // console.log(`[Ship ${this.id}] Remote ship marked as respawned by server state.`);
                }
            }
        }
    }
}
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=ShipClass##