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
        this.derelictColor = '#888888'; // Grey for disconnected ships

        this.health = initialHealth ?? 100; // Default to 100 if not provided by server initially
        this.isAlive = initialIsAlive ?? true;
        this.isDerelict = false; // NEW: Flag for disconnected state

        this.isRotatingLeft = false;
        this.isRotatingRight = false;
        this.isMovingForward = false;

        this.fireCooldown = 0;
        this.fireRate = config.SHIP_FIRE_RATE_FRAMES;

        this.isLocalPlayer = false;
        this.lastSentState = { x: 0, y: 0, angle: 0 };
        this.updateSendThrottle = 0;
        this.UPDATE_SEND_INTERVAL = 3;

        this.hitColor = '#FFFFFF'; // White flash on hit
        this.HIT_FLASH_DURATION = 20; 
        this.hitFlashTimer = 0;
    }


    update(isThisClientShip = false) {
        this.isLocalPlayer = isThisClientShip;

        // NEW: Derelict state overrides all other states
        if (this.isDerelict) {
            this.color = this.derelictColor;
            this.isRotatingLeft = false;
            this.isRotatingRight = false;
            this.isMovingForward = false;
            return; // No further updates needed for a derelict ship
        }

        if (this.hitFlashTimer > 0) {
            this.hitFlashTimer--;
            if (this.hitFlashTimer <= 0) {
                this.color = this.defaultColor; // Revert to default color
            } else {
                if (this.hitFlashTimer > this.HIT_FLASH_DURATION / 2) {
                    this.color = this.hitColor; // Solid white for the first half
                } else {
                    this.color = (this.hitFlashTimer % 6 < 3) ? this.hitColor : this.defaultColor; // Slower flicker
                }
            }
        } else if (this.isAlive) {
             this.color = this.defaultColor;
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
            // tempId is now added by the caller in stateModifiers.js
        };
        return projectileData;
    }


    setRotating(left, right) {
        if (this.isLocalPlayer && this.isAlive) {
            this.isRotatingLeft = left;
            this.isRotatingRight = right;
        } else if (this.isLocalPlayer && !this.isAlive) {
            this.isRotatingLeft = false;
            this.isRotatingRight = false;
        }
    }

    takeHit() {
        if (!this.isAlive || this.isDerelict) return; // Don't flash if already destroyed or derelict

        this.hitFlashTimer = this.HIT_FLASH_DURATION;
        this.color = this.hitColor; // Immediately change to hit color
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
                if (!previousAliveState && this.isAlive) {
                     // Ship was just respawned by server update
                     this.color = this.defaultColor;
                     this.hitFlashTimer = 0; // Reset flash timer on respawn
                }
            }
        }
    }
}
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=ShipClass##