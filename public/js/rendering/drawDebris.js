// js/rendering/drawDebris.js

// No direct config import needed here if entities handle their own config lookups for drawing.
// However, individual entity draw methods might use getState() for cameraZoom etc.

// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=drawDebrisFileContent##

// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=renderDebrisFunction##
// Draws all active particles, chunks, projectiles, and BH particles
export function renderDebris(ctx, state) { // state is passed for entities that might need it

    // Draw Regular Particles (Explosion debris)
    // ##AI_AUTOMATION::TARGET_ID_DEFINE_START=drawParticlesLoop##
    state.particles.forEach(p => p.draw(ctx)); // Particle.draw(ctx)
    // ##AI_AUTOMATION::TARGET_ID_DEFINE_END=drawParticlesLoop##

    // Draw Chunks
    // ##AI_AUTOMATION::TARGET_ID_DEFINE_START=drawChunksLoop##
    state.chunks.forEach(c => c.draw(ctx)); // Chunk.draw(ctx)
    // ##AI_AUTOMATION::TARGET_ID_DEFINE_END=drawChunksLoop##

    // Draw Projectiles
    // ##AI_AUTOMATION::TARGET_ID_DEFINE_START=drawProjectilesLoop##
    state.projectiles.forEach(p => p.draw(ctx)); // Projectile.draw(ctx) - now handles its trail
    // ##AI_AUTOMATION::TARGET_ID_DEFINE_END=drawProjectilesLoop##

    // Draw Black Hole Particles (if any)
    // ##AI_AUTOMATION::TARGET_ID_DEFINE_START=drawBhParticlesLoop##
    state.bhParticles.forEach(p => p.draw(ctx)); // BHParticle.draw(ctx)
    // ##AI_AUTOMATION::TARGET_ID_DEFINE_END=drawBhParticlesLoop##
}
// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=renderDebrisFunction##

// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=drawDebrisFileContent##