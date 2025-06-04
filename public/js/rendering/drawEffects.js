// js/rendering/drawEffects.js

import * as config from '../config.js'; // For effect parameters and core timings

// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=drawEffectsFileContent##

// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=renderCoreEffectsFunction##
/**
 * Renders glow and implosion effects for a specific destroying planet.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} planet - The specific planet object.
 * @param {object} settings - Global game settings (contains effect durations).
 */
export function renderCoreEffects(ctx, planet, settings) {
    if (!planet || !planet.isDestroying) return; // Only render if actively in the 'isDestroying' phase

    const currentCoreExplosionDuration = settings.coreExplosionDuration;
    const currentCoreImplosionDuration = settings.coreImplosionDuration;
    const coreTotalVisualDuration = currentCoreExplosionDuration + currentCoreImplosionDuration;
    
    // Use CORE_EFFECT_OVERLAP_FRAMES from config.js
    const implosionVisualStartFrame = Math.max(1, currentCoreExplosionDuration - config.CORE_EFFECT_OVERLAP_FRAMES);
    const implosionVisualDuration = coreTotalVisualDuration - implosionVisualStartFrame;

    const t_explosion_core = Math.min(1, planet.explosionFrame / currentCoreExplosionDuration);
    let t_implosion_core = 0;
    let isImplosionPhaseActive = false;

    if (planet.explosionFrame >= implosionVisualStartFrame && implosionVisualDuration > 0) {
        t_implosion_core = Math.min(1, (planet.explosionFrame - implosionVisualStartFrame) / implosionVisualDuration);
        isImplosionPhaseActive = t_implosion_core > 0;
    }
    
    const overallCoreProgress = Math.min(1, planet.explosionFrame / coreTotalVisualDuration);
    const explosionEffectsFade = Math.max(0, 1 - overallCoreProgress); // Effects fade as overall progress completes
    
    // finalRadius is where implosion effects converge
    const finalRadius = planet.willBecomeBlackHole ? 
        (planet.originalRadius / 40) : // TODO: Move BH final radius factor to config
        0; // Normal destruction converges to zero or very small radius

    drawGlowInternal(ctx, planet, t_explosion_core, explosionEffectsFade);

    if (isImplosionPhaseActive && !planet.isBlackHole) { // Implosion effects for non-BH destruction
         drawImplosionEffectsInternal(ctx, planet, t_implosion_core, finalRadius, planet.explosionFrame, explosionEffectsFade);
    }
}
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=renderCoreEffectsFunction##

// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=renderShockwavesFunction##
/**
 * Renders expanding/imploding shockwaves for a specific destroying planet.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} planet - The specific planet object.
 * @param {object} settings - Global game settings (durations).
 */
export function renderShockwaves(ctx, planet, settings) {
    // Render shockwaves if planet is in a destruction phase or just finished (for fade out)
    if (planet.destructionElapsedTime === null || (!planet.isDestroying && !planet.isBreakingUp && !planet.isBlackHole && !planet.isDestroyed && planet.chunkGracePeriodFrame === 0)) {
        // Stricter check: only render if destructionElapsedTime is active OR it's a black hole (which might have persistent cues not covered here)
        if (!planet.isBlackHole && planet.destructionElapsedTime === null) return;
    }

    const currentCoreExplosionDuration = settings.coreExplosionDuration;
    const currentCoreImplosionDuration = settings.coreImplosionDuration;
    const coreTotalVisualDuration = currentCoreExplosionDuration + currentCoreImplosionDuration;

    const implosionVisualStartFrame = Math.max(1, currentCoreExplosionDuration - config.CORE_EFFECT_OVERLAP_FRAMES);
    const implosionVisualDuration = coreTotalVisualDuration - implosionVisualStartFrame;

    // Shockwave max duration for fade out (can be tied to chunk physics or a specific effect duration)
    const shockwaveMaxDuration = config.CHUNK_PHYSICS_TOTAL_FRAMES; // Example: fade over chunk lifespan
    const currentProgress = (planet.destructionElapsedTime !== null) ? Math.min(1, planet.destructionElapsedTime / shockwaveMaxDuration) : 0;
    const currentFadeFactor = Math.max(0, 1 - currentProgress); // Fade factor for shockwaves
    
    const finalRadius = planet.willBecomeBlackHole ? (planet.originalRadius / 40) : 0;

    drawPrimaryShockwaveInternal(ctx, planet, currentFadeFactor, currentCoreExplosionDuration);
    drawSecondaryShockwaveInternal(ctx, planet, finalRadius, currentCoreExplosionDuration, implosionVisualStartFrame, implosionVisualDuration, shockwaveMaxDuration, currentFadeFactor);
}
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=renderShockwavesFunction##

// --- Internal Effect Drawing Helpers ---
// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=internalEffectHelpers##
function drawGlowInternal(ctx, planet, t_explosion_core, explosionEffectsFade) {
    const glowParams = config.EFFECT_PARAMETERS.GENERAL_GLOW;
    // Ensure glowIntensity peaks early and fades. Original sin(t*PI*0.5) peaks at t=1.
    // We want it to peak around t_explosion_core = 0.5 for explosion, then fade.
    const glowIntensity = (Math.sin(t_explosion_core * Math.PI)) * explosionEffectsFade; // sin(t*PI) peaks at t=0.5
    
    const glowRadius = planet.originalRadius * (1 + Math.sin(t_explosion_core * Math.PI) * glowParams.RADIUS_SIN_MULTIPLIER);
    
    if (glowIntensity > 0.01 && glowRadius > 0) {
        const gradient = ctx.createRadialGradient(planet.x, planet.y, 0, planet.x, planet.y, glowRadius);
        gradient.addColorStop(0, `rgba(255, 150, 50, ${glowParams.GRADIENT_STOP_0_ALPHA_FACTOR * glowIntensity})`);
        gradient.addColorStop(0.7, `rgba(255, 100, 0, ${glowParams.GRADIENT_STOP_1_ALPHA_FACTOR * glowIntensity})`);
        gradient.addColorStop(1, 'rgba(255, 50, 0, 0)');
        
        ctx.fillStyle = gradient;
        const fillSize = planet.originalRadius * glowParams.FILL_SIZE_FACTOR; // Glow covers a larger area
        ctx.fillRect(planet.x - fillSize / 2, planet.y - fillSize / 2, fillSize, fillSize);
    }
}

function drawImplosionEffectsInternal(ctx, planet, t_implosion_core, finalRadius, currentExplosionFrame, overallFade) {
    const implParams = config.EFFECT_PARAMETERS.IMPLOSION_EFFECTS;
    // explosionEndRadius is a conceptual radius from which implosion starts, can be larger than originalRadius
    const explosionEndRadius = planet.originalRadius * (1 + 1.0 * 1.5); // Example: 1.5x original radius
    
    const collapseFactor = Math.max(0, Math.pow(1 - t_implosion_core, implParams.ACCRETION_COLLAPSE_POWER));
    const baseOpacity = Math.sin(t_implosion_core * Math.PI) * implParams.ACCRETION_OPACITY_SIN_PI_MULTIPLIER;
    const opacity = baseOpacity * overallFade; // Fade with overall effect duration

    drawAccretionRingsInternal(ctx, planet, t_implosion_core, opacity, collapseFactor, finalRadius, explosionEndRadius, currentExplosionFrame);
    
    const implosionIntensity = Math.sin(t_implosion_core * Math.PI) * overallFade;
    if (implosionIntensity > 0.01) {
        drawImplosionArcsInternal(ctx, planet, implosionIntensity, finalRadius, explosionEndRadius, t_implosion_core);
        drawImplosionLightningInternal(ctx, planet, implosionIntensity, finalRadius, explosionEndRadius, collapseFactor);
    }
}

function drawAccretionRingsInternal(ctx, planet, t_implosion_core, opacity, collapseFactor, targetRadiusAccretion, explosionEndRadius, currentExplosionFrame) {
    const implParams = config.EFFECT_PARAMETERS.IMPLOSION_EFFECTS;
    const currentAngularVelocity = implParams.ACCRETION_BASE_SPEED * (1 + implParams.ACCRETION_ACCELERATION_FACTOR * Math.pow(t_implosion_core, 3));
    
    const accretionRings = [ 
        { baseRadiusFactor: implParams.ACCRETION_RING_1_BASE_RADIUS_FACTOR, speedFactor: implParams.ACCRETION_RING_1_SPEED_FACTOR, numParticles: implParams.ACCRETION_RING_1_NUM_PARTICLES, size: implParams.ACCRETION_RING_1_SIZE, color: `rgba(255, 255, 220, OPACITY)` },
        { baseRadiusFactor: implParams.ACCRETION_RING_2_BASE_RADIUS_FACTOR, speedFactor: implParams.ACCRETION_RING_2_SPEED_FACTOR, numParticles: implParams.ACCRETION_RING_2_NUM_PARTICLES, size: implParams.ACCRETION_RING_2_SIZE, color: `rgba(200, 230, 255, OPACITY)` },
        { baseRadiusFactor: implParams.ACCRETION_RING_3_BASE_RADIUS_FACTOR, speedFactor: implParams.ACCRETION_RING_3_SPEED_FACTOR, numParticles: implParams.ACCRETION_RING_3_NUM_PARTICLES, size: implParams.ACCRETION_RING_3_SIZE, color: `rgba(255, 255, 255, OPACITY)` } 
    ]; 

    if (opacity > 0.01) { 
        accretionRings.forEach(ring => { 
            const initialRingRadius = explosionEndRadius * ring.baseRadiusFactor; 
            let currentRingRadius = targetRadiusAccretion + (initialRingRadius - targetRadiusAccretion) * collapseFactor; 
            currentRingRadius = Math.max(targetRadiusAccretion + ring.size * 1.5, currentRingRadius); 
            const ringOpacity = opacity * (0.6 + Math.random() * 0.4); 
            
            if (ringOpacity <= 0.01 || currentRingRadius <= ring.size) return; 
            
            ctx.fillStyle = ring.color.replace('OPACITY', ringOpacity.toFixed(3)); 
            const totalRotation = currentExplosionFrame * currentAngularVelocity * ring.speedFactor; 
            
            for (let i = 0; i < ring.numParticles; i++) { 
                const particleBaseAngle = (i / ring.numParticles) * 2 * Math.PI + (Math.random() - 0.5) * 0.1; 
                const particleCurrentAngle = (particleBaseAngle + totalRotation) % (2 * Math.PI); 
                const px = planet.x + Math.cos(particleCurrentAngle) * currentRingRadius; 
                const py = planet.y + Math.sin(particleCurrentAngle) * currentRingRadius; 
                const particleSize = ring.size * (0.8 + Math.random() * 0.4) * (0.5 + ringOpacity * 0.5); 
                ctx.beginPath(); ctx.arc(px, py, Math.max(0.5, particleSize), 0, 2 * Math.PI); ctx.fill(); 
            } 
        }); 
    }
}

function drawImplosionArcsInternal(ctx, planet, implosionIntensity, targetRadiusAccretion, explosionEndRadius, t_implosion_core) {
    const arcParams = config.EFFECT_PARAMETERS.IMPLOSION_EFFECTS;
    const currentArcRadius = targetRadiusAccretion + (explosionEndRadius - targetRadiusAccretion) * (1 - t_implosion_core); // Arcs shrink
    
    ctx.lineWidth = arcParams.ARC_LINE_WIDTH_BASE + arcParams.ARC_LINE_WIDTH_INTENSITY_MULTIPLIER * implosionIntensity;
    ctx.strokeStyle = `rgba(0, 150, 255, ${arcParams.ARC_ALPHA_INTENSITY_MULTIPLIER * implosionIntensity})`;
    
    for (let i = 0; i < arcParams.ARC_NUM_ARCS; i++) { 
        const startAngle = Math.random() * Math.PI * 2; 
        const endAngle = startAngle + arcParams.ARC_ANGLE_LENGTH_MIN + Math.random() * arcParams.ARC_ANGLE_LENGTH_RANDOM; 
        ctx.beginPath(); 
        ctx.arc(planet.x, planet.y, Math.max(targetRadiusAccretion + ctx.lineWidth, currentArcRadius + (Math.random() - 0.5) * arcParams.ARC_RANDOM_RADIUS_OFFSET), startAngle, endAngle); 
        ctx.stroke(); 
    }
}

function drawImplosionLightningInternal(ctx, planet, implosionIntensity, targetRadiusAccretion, explosionEndRadius, collapseFactor) {
    const boltParams = config.EFFECT_PARAMETERS.IMPLOSION_EFFECTS;
    const numBolts = Math.floor(boltParams.LIGHTNING_NUM_BOLTS_BASE + boltParams.LIGHTNING_NUM_BOLTS_INTENSITY_MULTIPLIER * implosionIntensity); 
    
    ctx.lineWidth = boltParams.LIGHTNING_LINE_WIDTH_BASE + implosionIntensity;
    ctx.strokeStyle = `rgba(100, 220, 255, ${boltParams.LIGHTNING_ALPHA_INTENSITY_MULTIPLIER * implosionIntensity})`;
    
    for (let i = 0; i < numBolts; i++) { 
        const startAngle = Math.random() * Math.PI * 2; 
        const initialLightningOuterRadius = explosionEndRadius * boltParams.LIGHTNING_OUTER_RADIUS_FACTOR; 
        const targetLightningOuterRadius = targetRadiusAccretion + boltParams.LIGHTNING_TARGET_OUTER_RADIUS_OFFSET; 
        let currentLightningStartRadius = targetLightningOuterRadius + (initialLightningOuterRadius - targetLightningOuterRadius) * collapseFactor; 
        currentLightningStartRadius = Math.max(targetRadiusAccretion + 10, currentLightningStartRadius); 
        
        const startRad = currentLightningStartRadius * (0.95 + Math.random() * boltParams.LIGHTNING_START_RADIUS_VARIATION_FACTOR); 
        const startX = planet.x + Math.cos(startAngle) * startRad; 
        const startY = planet.y + Math.sin(startAngle) * startRad; 
        const endAngle = startAngle + (Math.random() - 0.5) * 0.5; 
        const endRad = targetRadiusAccretion + Math.random() * boltParams.LIGHTNING_END_RADIUS_RANDOM_OFFSET; 
        const endX = planet.x + Math.cos(endAngle) * endRad; 
        const endY = planet.y + Math.sin(endAngle) * endRad; 
        
        ctx.beginPath(); ctx.moveTo(startX, startY); 
        const midX1 = startX + (endX - startX) * 0.3 + (Math.random() - 0.5) * boltParams.LIGHTNING_MIDPOINT_OFFSET_FACTOR * implosionIntensity; 
        const midY1 = startY + (endY - startY) * 0.3 + (Math.random() - 0.5) * boltParams.LIGHTNING_MIDPOINT_OFFSET_FACTOR * implosionIntensity; 
        const midX2 = startX + (endX - startX) * 0.7 + (Math.random() - 0.5) * boltParams.LIGHTNING_MIDPOINT_OFFSET_FACTOR * implosionIntensity; 
        const midY2 = startY + (endY - startY) * 0.7 + (Math.random() - 0.5) * boltParams.LIGHTNING_MIDPOINT_OFFSET_FACTOR * implosionIntensity; 
        ctx.lineTo(midX1, midY1); ctx.lineTo(midX2, midY2); ctx.lineTo(endX, endY); 
        ctx.stroke(); 
    }
}

function drawPrimaryShockwaveInternal(ctx, planet, currentFadeFactor, coreExplosionDuration) {
    const swParams = config.EFFECT_PARAMETERS.SHOCKWAVES;
    // Speed calculated based on explosion duration to reach target radius by end of explosion
    const shockwaveSpeed1 = (planet.originalRadius * swParams.PRIMARY_SPEED_RADIUS_FACTOR) / Math.max(1, coreExplosionDuration);
    // Elapsed time for shockwave is planet.destructionElapsedTime (overall timer)
    const shockwaveRadius1 = planet.originalRadius + shockwaveSpeed1 * (planet.destructionElapsedTime || 0);
    
    const shockwaveOpacity1 = swParams.PRIMARY_BASE_OPACITY * currentFadeFactor;
    const shockwaveLineWidth1 = Math.max(1, swParams.PRIMARY_INITIAL_MAX_LINE_WIDTH * currentFadeFactor);
    
    if (shockwaveOpacity1 > 0.01 && shockwaveRadius1 > 0) { 
        ctx.beginPath(); 
        ctx.arc(planet.x, planet.y, shockwaveRadius1, 0, 2 * Math.PI); 
        ctx.strokeStyle = `rgba(180, 160, 140, ${shockwaveOpacity1.toFixed(2)})`; 
        ctx.lineWidth = shockwaveLineWidth1; 
        ctx.stroke(); 
    }
}

function drawSecondaryShockwaveInternal(ctx, planet, finalRadius, coreExplosionDuration, implosionVisualStartFrame, implosionVisualDuration, shockwaveMaxDuration, overallFadeFactor) {
    const swParams = config.EFFECT_PARAMETERS.SHOCKWAVES;
    const shockwaveSpeed1 = (planet.originalRadius * swParams.PRIMARY_SPEED_RADIUS_FACTOR) / Math.max(1, coreExplosionDuration);
    const shockwaveSpeed2 = shockwaveSpeed1 * swParams.SECONDARY_SPEED_FACTOR; 
    
    let shockwaveRadius2; 
    let shockwaveOpacity2; 
    let shockwaveLineWidth2; 
    
    let t_implosion_core_sw = 0; 
    let isImplosionPhaseActive_sw = false; 
    // Use overall destructionElapsedTime for secondary shockwave timing, but use explosionFrame for implosion phase detection
    const currentTimerForImplosionCheck = planet.explosionFrame; 
    const currentTimerForExpansion = planet.destructionElapsedTime || 0;

    if (implosionVisualDuration > 0 && currentTimerForImplosionCheck >= implosionVisualStartFrame) { 
        t_implosion_core_sw = Math.min(1, (currentTimerForImplosionCheck - implosionVisualStartFrame) / implosionVisualDuration); 
        isImplosionPhaseActive_sw = t_implosion_core_sw > 0; 
    } 
    
    if (isImplosionPhaseActive_sw) { 
        const startRadius = planet.shockwave2ReversalStartRadius || (planet.originalRadius + shockwaveSpeed2 * (implosionVisualStartFrame -1));
        const sw2ReturnProgress = Math.min(1, t_implosion_core_sw * config.SW2_IMPLOSION_SPEED_FACTOR); 
        const radiusDiff = startRadius - finalRadius; 
        shockwaveRadius2 = finalRadius + radiusDiff * Math.pow(1 - sw2ReturnProgress, swParams.SECONDARY_IMPLOSION_RADIUS_POW_FACTOR); 
        shockwaveRadius2 = Math.max(finalRadius, shockwaveRadius2); 
        shockwaveOpacity2 = swParams.SECONDARY_BASE_OPACITY * Math.pow(1 - sw2ReturnProgress, swParams.SECONDARY_IMPLOSION_OPACITY_POW_FACTOR) * overallFadeFactor; 
        shockwaveLineWidth2 = Math.max(1, swParams.SECONDARY_INITIAL_MAX_LINE_WIDTH * Math.pow(1 - sw2ReturnProgress, swParams.SECONDARY_IMPLOSION_LINE_WIDTH_POW_FACTOR) * overallFadeFactor); 
    } else { // Expanding phase for secondary shockwave
        shockwaveRadius2 = planet.originalRadius + shockwaveSpeed2 * currentTimerForExpansion; 
        const expansionFadeFactor = Math.max(0, 1 - (currentTimerForExpansion / (shockwaveMaxDuration * swParams.SECONDARY_EXPANSION_FADE_DURATION_FACTOR))); 
        shockwaveOpacity2 = swParams.SECONDARY_BASE_OPACITY * expansionFadeFactor * overallFadeFactor; 
        shockwaveLineWidth2 = Math.max(1, swParams.SECONDARY_INITIAL_MAX_LINE_WIDTH * expansionFadeFactor * overallFadeFactor); 
    } 
    
    if (shockwaveOpacity2 > 0.01 && shockwaveRadius2 > 0) { 
        ctx.beginPath(); 
        ctx.arc(planet.x, planet.y, shockwaveRadius2, 0, 2 * Math.PI); 
        ctx.strokeStyle = `rgba(230, 120, 80, ${shockwaveOpacity2.toFixed(2)})`; 
        ctx.lineWidth = shockwaveLineWidth2; 
        ctx.stroke(); 
    }
}
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=internalEffectHelpers##

// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=drawEffectsFileContent##