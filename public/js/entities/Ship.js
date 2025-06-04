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
        this.color = color; 

        this.health = initialHealth ?? config.SV_SHIP_DEFAULT_HEALTH; // Server is authoritative
        this.isAlive = initialIsAlive ?? true;

        this.isRotatingLeft = false;
        this.isRotatingRight = false;
        this.isMovingForward = false; 

        this.fireCooldown = 0;
        this.fireRate = config.SHIP_FIRE_RATE_FRAMES; 

        this.isLocalPlayer = false; // This is set to true by gameState.js for the client's own ship
        this.lastSentState = { x: 0, y: 0, angle: 0 };
        this.updateSendThrottle = 0;
        this.UPDATE_SEND_INTERVAL = 3; 
        // console.log(`[Ship CONSTRUCTOR] ID: ${this.id}, Name: ${this.name}, isLocalPlayer (initial): ${this.isLocalPlayer}`); // DEBUG
    }


    update(isThisClientShip = false) { 
        // isThisClientShip is set to true for the client's own ship in entityUpdater.js
        this.isLocalPlayer = isThisClientShip; 
        // if (this.isLocalPlayer) console.log(`[Ship ${this.id}] update. isLocalPlayer SET to: ${this.isLocalPlayer}`);


        if (!this.isAlive && this.isLocalPlayer) { 
            this.isRotatingLeft = false; 
            this.isRotatingRight = false;
            return;
        }

        if (this.isLocalPlayer) { // Rotation and sending updates only if local and alive
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
        console.log(`[Ship ${this.id}] attempting fire. isLocalPlayer: ${this.isLocalPlayer}, isAlive: ${this.isAlive}, fireCooldown: ${this.fireCooldown}`); // DEBUG
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
        console.log(`[Ship ${this.id}] FIRING. Data:`, projectileData); // DEBUG
        return projectileData;
    }


    setRotating(left, right) {
        // This method is called on the local player's ship instance (gameState.ship)
        console.log(`[Ship ${this.id}] setRotating called. isLocalPlayer (at call time): ${this.isLocalPlayer}, isAlive: ${this.isAlive}, left: ${left}, right: ${right}`); // DEBUG
        if (this.isLocalPlayer && this.isAlive) { 
            this.isRotatingLeft = left;
            this.isRotatingRight = right;
            console.log(`[Ship ${this.id}] setRotating: flags set - isRotatingLeft=${this.isRotatingLeft}, isRotatingRight=${this.isRotatingRight}`); // DEBUG
        } else if (this.isLocalPlayer && !this.isAlive) {
            this.isRotatingLeft = false;
            this.isRotatingRight = false;
        }
    }


    setState(x, y, angle, health, isAlive) { 
        if (!this.isLocalPlayer) { 
            this.x = x;
            this.y = y;
            this.angle = angle;
            if (health !== undefined) this.health = health;
            if (isAlive !== undefined) this.isAlive = isAlive;
        }
    }
}
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=ShipClass##
