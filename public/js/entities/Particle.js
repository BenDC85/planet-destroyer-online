// js/entities/Particle.js

import * as config from '../config.js';

export class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = config.PARTICLE_RADIUS_MIN + Math.random() * config.PARTICLE_RADIUS_RANDOM_RANGE;
        this.speed = config.PARTICLE_SPEED_MIN + Math.random() * config.PARTICLE_SPEED_RANDOM_RANGE;
        this.angle = Math.random() * 2 * Math.PI;
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;
        this.life = 1; // Lifespan, 1 to 0

        // Orangey-red explosion particle color
        const r = config.PARTICLE_COLOR_R_MIN + Math.random() * config.PARTICLE_COLOR_R_RANDOM_RANGE;
        const g = config.PARTICLE_COLOR_G_MIN + Math.random() * config.PARTICLE_COLOR_G_RANDOM_RANGE;
        const b = config.PARTICLE_COLOR_B_MIN + Math.random() * config.PARTICLE_COLOR_B_RANDOM_RANGE;
        this.baseColor = `rgba(${r.toFixed(0)}, ${g.toFixed(0)}, ${b.toFixed(0)}, OPACITY)`;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= config.PARTICLE_LIFESPAN_DECAY_RATE; // Controls fade out speed
        this.radius *= config.PARTICLE_RADIUS_SHRINK_RATE; // Controls shrink speed
        this.vx *= config.PARTICLE_VELOCITY_DAMPING_FACTOR; // Simple air resistance/slowdown
        this.vy *= config.PARTICLE_VELOCITY_DAMPING_FACTOR;
    }

    draw(ctx) {
        if (this.life <= 0 || this.radius <= 0.1) return; // Condition for not drawing

        const opacity = Math.max(0, this.life);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
        ctx.fillStyle = this.baseColor.replace('OPACITY', opacity.toFixed(2));
        ctx.fill();
    }
}