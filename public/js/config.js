/* File: public/js/config.js */
// js/config.js



// --- Core Physics Constants ---

export const G = 6.674e-11; // m^3 kg^-1 s^-2



// --- Scaling Factors ---

export const PIXELS_PER_METER = 0.5;

export const GAME_FPS = 60;

export const SECONDS_PER_FRAME = 1 / GAME_FPS;



// --- Gameplay Constants (Impact & Destruction Physics) ---

export const CRATER_SCALING_C = 1.0e-1;

export const KE_TO_MASS_EJECT_ETA = 3e+1;

export const BH_ENERGY_MULTIPLIER = 2.0;

export const MASS_LOSS_DESTRUCTION_THRESHOLD_FACTOR = 0.60;

export const MAX_CRATER_COUNT_FOR_DESTRUCTION_THRESHOLD = 75;

export const MIN_MASS_LOSS_FOR_CRATER_COUNT_DESTRUCTION = 0.50;

export const VISUAL_HOLLOWNESS_DESTRUCTION_THRESHOLD = 0.75;



// Velocity-dependent damage scaling

export const VELOCITY_SCALING_BASELINE_MPS = 50;

export const VELOCITY_SCALING_EXPONENT_CRATER_EFFECT = 0.25;

export const VELOCITY_SCALING_EXPONENT_MASS_EJECT = 0.15;



// Black Hole Gravity
export const PLANET_GRAVITY_CORE_RADIUS_FACTOR = 0.20; // NEW: For "soft center" gravity model
export const REFERENCE_PLANET_MASS_FOR_BH_FACTOR = 1e11;

// Black Hole Drag Effect

export const BH_DRAG_ZONE_MULTIPLIER = 5.0;

export const BH_DRAG_COEFFICIENT_MAX = 0.100;



// --- Material Reference Constants (for crater resistance scaling) ---

export const REFERENCE_DENSITY = 5515;

export const REFERENCE_YIELD_STRENGTH = 1e8;



// --- Planet Type Definitions ---

export const PLANET_TYPES = {

    icy: { density: 1500, yieldStrength: 1e6, baseColor: [173, 216, 230], color: '#ADD8E6' },

    rocky: { density: REFERENCE_DENSITY, yieldStrength: REFERENCE_YIELD_STRENGTH, baseColor: [160, 82, 45], color: '#A0522D' },

    metallic: { density: 8000, yieldStrength: 5e8, baseColor: [169, 169, 169], color: '#A9A9A9' }

};

export const DEFAULT_PLANET_TYPE_KEY = 'rocky';



// --- Core Planet Destruction & Effect Timings ---

export const BREAKUP_DURATION_FRAMES = 30;

export const CORE_EFFECT_OVERLAP_FRAMES = 5;

export const CHUNK_GRACE_PERIOD_DURATION_FRAMES = 20;

export const SW2_IMPLOSION_SPEED_FACTOR = 1.25;



// --- Chunk Behavior ---
// Note: Many of these are now dictated by the server, but kept for reference or potential client-side fallback.
export const CHUNK_PHYSICS_TOTAL_FRAMES = 180; // Client-side visual effect timer
export const CHUNK_PROXIMITY_REMOVAL_RADIUS_PX = 50; // Client-side visual effect
export const CHUNK_PROXIMITY_REMOVAL_RADIUS_SQ_PX = CHUNK_PROXIMITY_REMOVAL_RADIUS_PX * CHUNK_PROXIMITY_REMOVAL_RADIUS_PX;
export const CHUNK_TARGETED_REMOVAL_SPEED_PX_FRAME = 60; // Client-side only constant, potential inconsistency.
export const CHUNK_MAX_GENERATION_ATTEMPTS_FACTOR = 15;
export const CHUNK_MASS_AREA_FACTOR = 0.1;
export const CHUNK_DEFAULT_BASE_SIZE_MIN = 8;
export const CHUNK_DEFAULT_BASE_SIZE_RANDOM_RANGE = 24; // UPDATED to match server (was 12)
export const CHUNK_DEFAULT_ANGULAR_VELOCITY_FACTOR = 0.05;
export const CHUNK_INITIAL_RADIAL_SPEED_MIN = 0.5;
export const CHUNK_INITIAL_RADIAL_SPEED_RANDOM_RANGE = 3.0;
export const CHUNK_INITIAL_TANGENTIAL_SPEED_FACTOR_MIN = 0.2;
export const CHUNK_INITIAL_TANGENTIAL_SPEED_FACTOR_RANDOM_RANGE = 1.8;
export const CHUNK_DEFAULT_NUM_POINTS_MIN = 5;
export const CHUNK_DEFAULT_NUM_POINTS_RANDOM_RANGE = 4;
export const CHUNK_POINT_DISTANCE_FACTOR_MIN = 0.6;
export const CHUNK_POINT_DISTANCE_FACTOR_RANDOM_RANGE = 0.8;
export const CHUNK_POINT_ANGLE_INCREMENT_BASE_FACTOR = 1.5;
export const CHUNK_POINT_ANGLE_RANDOM_FACTOR = 0.5;
export const CHUNK_VELOCITY_DAMPING_FACTOR = 0.995;
export const CHUNK_ANGULAR_VELOCITY_DAMPING_FACTOR = 0.99;



// --- Ship Constants ---

export const SHIP_SIZE_PX = 12.5; // UPDATED to be RADIUS, matches server (was 25)

export const SHIP_COLOR = '#00FF00'; // Default/Local player ship color, will be overridden for individual players

export const SHIP_TURN_RATE_RAD_FRAME = 0.06;

export const SHIP_FINE_TURN_RATE_RAD_FRAME = 0.015;

export const SHIP_INITIAL_X_OFFSET_PX = 0;

export const SHIP_INITIAL_Y_OFFSET_PX = -150; // Relative to world center for the *local* player if spawning first

export const SHIP_PROJECTILE_MUZZLE_OFFSET_FACTOR = 1.1;

export const SHIP_FIRE_RATE_FRAMES = 10;



// --- Projectile Constants ---

export const PROJECTILE_SIZE_PX = 5;

export const PROJECTILE_COLOR = '#FFFF00';

export const PROJECTILE_TRAIL_COLOR = '#FFA500'; // Orange

export const PROJECTILE_MAX_PATH_POINTS = 5000;

export const PROJECTILE_TRAIL_PERSIST_DURATION_FRAMES = 1800;

export const MAX_PROJECTILE_SPEED_HUD = 9999; // Max value in HUD input

export const PROJECTILE_SPEED_HUD_SCALE_FACTOR = 0.01; // HUD 100 = 1.0 internal

export const MIN_PROJECTILE_SPEED_INTERNAL = 0.01;

export const MAX_PROJECTILE_SPEED_INTERNAL = MAX_PROJECTILE_SPEED_HUD * PROJECTILE_SPEED_HUD_SCALE_FACTOR;

export const PROJECTILE_SPEED_STEP_INTERNAL = 0.01; // For Arrow Key adjustment

export const PROJECTILE_DEFAULT_MASS_KG = 50;

export const PROJECTILE_MIN_MASS_KG = 1;



// --- Planet Generation Constants ---

// Note: Planet generation is server-side. These are for reference/UI limits.

export const DEFAULT_PLANET_COUNT = 6;

export const MAX_PLANET_COUNT_UI = 50;

export const MIN_PLANET_RADIUS_RANGE_PX = 20;

export const MAX_PLANET_RADIUS_RANGE_PX = 200;

export const PLANET_SPAWN_BORDER_FACTOR = 1.1;

export const MIN_PLANET_SEPARATION_FACTOR = 2.2;

export const MAX_PLANET_SPAWN_ATTEMPTS = 50;

export const DEFAULT_DESTRUCTION_CHUNK_COUNT = 40;

export const DEFAULT_DESTRUCTION_PARTICLE_COUNT = 150;



// --- Black Hole Visual Particle Effects ---

export const BHPARTICLE_INITIAL_SPEED_BASE_MIN = 0.8;

export const BHPARTICLE_INITIAL_SPEED_BASE_RANDOM_RANGE = 1.7;

export const BHPARTICLE_COLORS = ['#FFFFFF', '#FFFFEE', '#E0FFFF', '#FFEEFF'];

export const BHPARTICLE_TRAIL_LENGTH_MULTIPLIER = 15;

export const BHPARTICLE_TRAIL_MIN_LENGTH_THRESHOLD_SQ = 0.5 * 0.5;

export const BHPARTICLE_TRAIL_END_ALPHA = 0.0;

export const BHPARTICLE_TRAIL_MID_ALPHA = 0.2;

export const BHPARTICLE_TRAIL_HEAD_ALPHA = 0.6;

export const BHPARTICLE_TRAIL_WIDTH_FACTOR = 0.8;

export const BHPARTICLE_TRAIL_GLOBAL_ALPHA = 0.7;



// --- Explosion Particle Effects ---

export const PARTICLE_RADIUS_MIN = 1;

export const PARTICLE_RADIUS_RANDOM_RANGE = 3;

export const PARTICLE_SPEED_MIN = 2;

export const PARTICLE_SPEED_RANDOM_RANGE = 5;

export const PARTICLE_LIFESPAN_DECAY_RATE = 0.02;

export const PARTICLE_RADIUS_SHRINK_RATE = 0.98;

export const PARTICLE_VELOCITY_DAMPING_FACTOR = 0.99;

export const PARTICLE_COLOR_R_MIN = 200; export const PARTICLE_COLOR_R_RANDOM_RANGE = 55;

export const PARTICLE_COLOR_G_MIN = 100; export const PARTICLE_COLOR_G_RANDOM_RANGE = 50;

export const PARTICLE_COLOR_B_MIN = 0;   export const PARTICLE_COLOR_B_RANDOM_RANGE = 50;



// --- HUD Scaling Factors ---

export const PLANET_GRAVITY_HUD_SCALE_FACTOR = 1000000.0; // HUD 1.0 = 1M internal



// --- Default Initial Settings ---

// These are used by gameState.js if no overriding value is provided from HUD on reset/init

// For values scaled for HUD, the HUD value is listed in comments.

export const defaultPlanetCount = DEFAULT_PLANET_COUNT;

export const defaultBaseDamageRadius = 100;

export const defaultCameraZoom = 0.2;

export const defaultPersistentChunkDrift = true;

export const defaultChunkLifespan = 400;

export const defaultChunkMaxSpeed = 100;

export const defaultCoreExplosionDuration = 45;

export const defaultCoreImplosionDuration = 22;

export const defaultProjectileSpeed = 600.0; // HUD Value

export const defaultProjectileMass = PROJECTILE_DEFAULT_MASS_KG;

export const defaultBHMaxParticles = 400;

export const defaultBHSpawnRadiusMinFactor = 0.85;

export const defaultBHSpawnRadiusMaxFactor = 1.00;

export const defaultBHParticleMinSize = 0.2;

export const defaultBHParticleMaxSize = 0.7;

export const defaultBHInitialInwardFactor = 0.5;

export const defaultBHInitialAngularFactor = 0.8;

export const defaultBHParticleLifeFactor = 1.0;

export const defaultBHParticleSpeedFactor = 1.0;

export const defaultBHParticleSpawnRate = 3;

export const defaultBHDragZoneMultiplier = BH_DRAG_ZONE_MULTIPLIER;

export const defaultBHDragCoefficientMax = BH_DRAG_COEFFICIENT_MAX;

export const DEFAULT_SHIP_ZOOM_ATTRACT_FACTOR = 0.25;

export const DEFAULT_PLANET_ZOOM_ATTRACT_FACTOR = 0.25;

export const defaultBHGravityFactor = 5.0;

export const DEFAULT_BH_EVENT_HORIZON_RADIUS = 30;

export const defaultCraterScalingC = CRATER_SCALING_C;

export const defaultKEToMassEjectEta = KE_TO_MASS_EJECT_ETA;

export const defaultBHEnergyMultiplier = BH_ENERGY_MULTIPLIER;

export const defaultPlanetGravityMultiplier = 15.0; // HUD Value



// --- Input Range Limits ---

// These are primarily for validating HUD inputs.

export const minPlanetCount = 1; export const maxPlanetCount = MAX_PLANET_COUNT_UI;

export const minDamageRadius = 1; export const maxDamageRadius = 100;

export const minZoom = 0.1; export const maxZoom = 3.0; // Note: HTML input has min 0.2, max 3.0

export const MIN_SHIP_ZOOM_ATTRACT_FACTOR = 0.0; export const MAX_SHIP_ZOOM_ATTRACT_FACTOR = 1.0;

export const MIN_PLANET_ZOOM_ATTRACT_FACTOR = 0.0; export const MAX_PLANET_ZOOM_ATTRACT_FACTOR = 1.0;

export const minChunkLifespan = 1; export const maxChunkLifespan = 9999;

export const minChunkMaxSpeed = 1; export const maxChunkMaxSpeed = 9999;

export const minCoreExplosionDuration = 1; export const maxCoreExplosionDuration = 999;

export const minCoreImplosionDuration = 1; export const maxCoreImplosionDuration = 999;

export const minBHMaxParticles = 0; export const maxBHMaxParticles = 99999;

export const minBHSpawnRadiusFactor = 0.01; export const maxBHSpawnRadiusFactor = 10.0;

export const minBHParticleSize = 0.1; export const maxBHParticleSize = 10.0;

export const minBHInitialInwardFactor = 0.0; export const maxBHInitialInwardFactor = 10.0;

export const minBHInitialAngularFactor = 0.0; export const maxBHInitialAngularFactor = 10.0;

export const minBHGravityFactor = 0.1;

export const maxBHGravityFactor = 999.0;

export const minBHEventHorizon = 0; // Max is effectively limited by practical use

export const minBHDragZoneMultiplier = 1.1;

export const maxBHDragZoneMultiplier = 10.0;

export const minBHDragCoefficientMax = 0.0;

export const maxBHDragCoefficientMax = 0.99;


export const minProjectileMass = PROJECTILE_MIN_MASS_KG; // Max is effectively unlimited by input step

export const minCraterScalingC = 0; // Max is effectively unlimited by input step

export const minKEToMassEjectEta = 0; // Max is effectively unlimited by input step

export const minBHEnergyMultiplier = 1.01; // Max is effectively unlimited by input step

export const minPlanetGravityMultiplier = 0.0; // Max is effectively unlimited by input step (HUD for this has no max)



// --- \"Magic Number\" Placeholders ---

// These are extensive and define detailed visual appearances for planets and effects.

// They are directly copied from your original config.js.

export const PLANET_VISUALS = { GENERAL: { BASE_LINE_WIDTH_ZOOM_INDEPENDENT: 0.8, COLOR_VARIATION_RANGE: 20, }, ICY: { FROST_DOT_DENSITY_FACTOR: 0.04, FROST_DOT_SIZE_BASE_LINE_WIDTH_FACTOR_MIN: 0.4, FROST_DOT_SIZE_BASE_LINE_WIDTH_FACTOR_RANDOM: 0.6, FROST_DOT_ALPHA_MIN: 0.02, FROST_DOT_ALPHA_RANDOM: 0.07, FROST_DOT_GREY_SHIFT_RANDOM: 25, STREAK_COUNT_MIN: 1, STREAK_COUNT_RANDOM: 5, STREAK_MAX_ANGLE_DEVIATION_DEG: 12.5, STREAK_ALPHA_MIN: 0.03, STREAK_ALPHA_RANDOM: 0.15, STREAK_GREY_SHIFT_BASE: 230, STREAK_GREY_SHIFT_RANDOM: 25, STREAK_WIDTH_FACTOR_MIN: 0.08, STREAK_WIDTH_FACTOR_RANDOM: 0.4, STREAK_START_END_DISTANCE_FACTOR: 1.1, STREAK_CONTROL_POINT_DISTANCE_FACTOR_MIN: 0.1, STREAK_CONTROL_POINT_DISTANCE_FACTOR_RANDOM: 0.7, POLAR_CAP_ALPHA_MIN: 0.5, POLAR_CAP_ALPHA_RANDOM: 0.4, POLAR_CAP_HEIGHT_FACTOR_MIN: 0.06, POLAR_CAP_HEIGHT_FACTOR_RANDOM: 0.28, POLAR_CAP_NUM_POINTS_BASE: 20, POLAR_CAP_NUM_POINTS_RANDOM: 10, POLAR_CAP_POINT_RADIUS_FACTOR_MIN: 0.88, POLAR_CAP_POINT_RADIUS_FACTOR_RANDOM: 0.17, CRACK_SWIRL_COUNT_MIN: 35, CRACK_SWIRL_COUNT_RANDOM: 40, CRACK_SWIRL_START_POINT_RADIUS_FACTOR: 1.1, CRACK_SWIRL_LENGTH_FACTOR_MIN: 0.1, CRACK_SWIRL_LENGTH_FACTOR_RANDOM: 1.8, CRACK_SWIRL_SEGMENTS_MIN: 5, CRACK_SWIRL_SEGMENTS_RANDOM: 9, CRACK_SWIRL_LINE_WIDTH_FACTOR_MIN: 0.2, CRACK_SWIRL_LINE_WIDTH_FACTOR_RANDOM: 2.5, CRACK_SWIRL_GREY_SHIFT_RANDOM: 55, CRACK_SWIRL_BLUE_BASE: 190, CRACK_SWIRL_BLUE_RANDOM: 65, CRACK_SWIRL_ALPHA_MIN: 0.08, CRACK_SWIRL_ALPHA_RANDOM: 0.4, CRACK_SWIRL_BRANCH_PROBABILITY: 0.3, CRACK_SWIRL_BRANCH_MAX_LENGTH_FACTOR: 0.9, CRACK_SWIRL_BRANCH_LINE_WIDTH_FACTOR_MIN: 0.3, CRACK_SWIRL_BRANCH_LINE_WIDTH_FACTOR_RANDOM: 0.5, CRACK_SWIRL_BRANCH_GREY_SHIFT_RANDOM: 40, CRACK_SWIRL_BRANCH_BLUE_BASE: 200, CRACK_SWIRL_BRANCH_BLUE_RANDOM: 55, CRACK_SWIRL_BRANCH_ALPHA_MIN: 0.04, CRACK_SWIRL_BRANCH_ALPHA_RANDOM: 0.25, CRACK_SWIRL_BRANCH_ANGLE_FACTOR_MIN: 0.6, CRACK_SWIRL_BRANCH_ANGLE_FACTOR_RANDOM: 1.0, CRACK_SWIRL_BRANCH_LENGTH_FACTOR_MIN: 0.05, CRACK_SWIRL_BRANCH_LENGTH_FACTOR_RANDOM: 0.6, CRACK_SWIRL_BRANCH_SEGMENTS_MIN: 2, CRACK_SWIRL_BRANCH_SEGMENTS_RANDOM: 4, }, ROCKY: { WATER_BODY_COLOR_R_BASE: 40, WATER_BODY_COLOR_R_RANDOM: 30, WATER_BODY_COLOR_G_BASE: 80, WATER_BODY_COLOR_G_RANDOM: 50, WATER_BODY_COLOR_B_BASE: 180, WATER_BODY_COLOR_B_RANDOM: 50, WATER_BODY_ALPHA_MIN: 0.6, WATER_BODY_ALPHA_RANDOM: 0.3, WATER_BODY_COUNT_MIN: 4, WATER_BODY_COUNT_RANDOM: 6, WATER_BODY_RADIUS_FACTOR_MIN: 0.05, WATER_BODY_RADIUS_FACTOR_RANDOM: 0.25, WATER_BODY_CENTER_RADIUS_FACTOR: 0.8, WATER_BODY_NUM_POINTS_BASE: 15, WATER_BODY_NUM_POINTS_RANDOM: 10, WATER_BODY_CHAOS_FACTOR_MIN: 0.7, WATER_BODY_CHAOS_FACTOR_RANDOM: 0.5, VEG_PATCH_COUNT_MIN: 20, VEG_PATCH_COUNT_RANDOM: 25, VEG_PATCH_COLOR_R_BASE: 20, VEG_PATCH_COLOR_R_RANDOM: 60, VEG_PATCH_COLOR_G_BASE: 70, VEG_PATCH_COLOR_G_RANDOM: 120, VEG_PATCH_COLOR_B_BASE: 20, VEG_PATCH_COLOR_B_RANDOM: 60, VEG_PATCH_ALPHA_MIN: 0.4, VEG_PATCH_ALPHA_RANDOM: 0.5, VEG_PATCH_RADIUS_FACTOR_MIN: 0.008, VEG_PATCH_RADIUS_FACTOR_RANDOM: 0.07, VEG_PATCH_CENTER_RADIUS_FACTOR: 0.96, }, METALLIC: { SHEEN_COUNT_MIN: 12, SHEEN_COUNT_RANDOM: 12, SHEEN_COLOR_OFFSET: 20, SHEEN_ALPHA_MIN: 0.04, SHEEN_ALPHA_RANDOM: 0.12, SHEEN_LINE_WIDTH_FACTOR_MIN: 1.2, SHEEN_LINE_WIDTH_FACTOR_RANDOM: 3.0, SHEEN_DIST_FACTOR: 0.8, SHEEN_LENGTH_FACTOR_MIN: 0.7, SHEEN_LENGTH_FACTOR_RANDOM: 1.0, PLATE_COLOR_OFFSET: -60, PLATE_ALPHA_MIN: 0.25, PLATE_ALPHA_RANDOM: 0.35, PLATE_COUNT_MIN: 5, PLATE_COUNT_RANDOM: 6, PLATE_LINE_WIDTH_FACTOR_MIN: 0.5, PLATE_LINE_WIDTH_FACTOR_RANDOM: 1.1, PLATE_START_POINT_RADIUS_FACTOR: 0.9, PLATE_SEGMENTS_MIN: 5, PLATE_SEGMENTS_RANDOM: 7, PLATE_SEGMENT_LENGTH_FACTOR_MIN: 0.1, PLATE_SEGMENT_LENGTH_FACTOR_RANDOM: 0.7, FINE_SCRATCH_COUNT_MIN: 70, FINE_SCRATCH_COUNT_RANDOM: 80, FINE_SCRATCH_COLOR_OFFSET: -30, FINE_SCRATCH_ALPHA_MIN: 0.1, FINE_SCRATCH_ALPHA_RANDOM: 0.4, FINE_SCRATCH_LINE_WIDTH_FACTOR_MIN: 0.1, FINE_SCRATCH_LINE_WIDTH_FACTOR_RANDOM: 0.5, FINE_SCRATCH_LENGTH_FACTOR_MIN: 0.005, FINE_SCRATCH_LENGTH_FACTOR_RANDOM: 0.2, SMUDGE_COUNT_MIN: 12, SMUDGE_COUNT_RANDOM: 18, SMUDGE_COLOR_OFFSET: -80, SMUDGE_ALPHA_MIN: 0.08, SMUDGE_ALPHA_RANDOM: 0.2, SMUDGE_CENTER_RADIUS_FACTOR: 0.9, SMUDGE_RADIUS_FACTOR_MIN: 0.02, SMUDGE_RADIUS_FACTOR_RANDOM: 0.12, SMUDGE_NUM_POINTS_BASE: 10, SMUDGE_NUM_POINTS_RANDOM: 10, SMUDGE_CHAOS_FACTOR: 0.8, GLINT_COUNT_MIN: 4, GLINT_COUNT_RANDOM: 8, GLINT_ALPHA_MIN: 0.3, GLINT_ALPHA_RANDOM: 0.6, GLINT_SIZE_FACTOR_MIN: 0.2, GLINT_SIZE_FACTOR_RANDOM: 0.6, } };

export const EFFECT_PARAMETERS = { GENERAL_GLOW: { RADIUS_SIN_MULTIPLIER: 0.1, GRADIENT_STOP_0_ALPHA_FACTOR: 0.4, GRADIENT_STOP_1_ALPHA_FACTOR: 0.15, FILL_SIZE_FACTOR: 2.4, }, IMPLOSION_EFFECTS: { ACCRETION_COLLAPSE_POWER: 1.5, ACCRETION_OPACITY_SIN_PI_MULTIPLIER: 0.9, ACCRETION_BASE_SPEED: 0.03, ACCRETION_ACCELERATION_FACTOR: 25, ACCRETION_RING_1_BASE_RADIUS_FACTOR: 1.0, ACCRETION_RING_1_SPEED_FACTOR: 0.9, ACCRETION_RING_1_NUM_PARTICLES: 60, ACCRETION_RING_1_SIZE: 1.5, ACCRETION_RING_2_BASE_RADIUS_FACTOR: 0.7, ACCRETION_RING_2_SPEED_FACTOR: 1.2, ACCRETION_RING_2_NUM_PARTICLES: 50, ACCRETION_RING_2_SIZE: 1.2, ACCRETION_RING_3_BASE_RADIUS_FACTOR: 0.4, ACCRETION_RING_3_SPEED_FACTOR: 1.6, ACCRETION_RING_3_NUM_PARTICLES: 40, ACCRETION_RING_3_SIZE: 1.0, ARC_NUM_ARCS: 5, ARC_LINE_WIDTH_BASE: 1, ARC_LINE_WIDTH_INTENSITY_MULTIPLIER: 2, ARC_ALPHA_INTENSITY_MULTIPLIER: 0.6, ARC_ANGLE_LENGTH_MIN: 0.2 * Math.PI, ARC_ANGLE_LENGTH_RANDOM: 0.5 * Math.PI, ARC_RANDOM_RADIUS_OFFSET: 20, LIGHTNING_NUM_BOLTS_BASE: 3, LIGHTNING_NUM_BOLTS_INTENSITY_MULTIPLIER: 6, LIGHTNING_LINE_WIDTH_BASE: 1, LIGHTNING_ALPHA_INTENSITY_MULTIPLIER: 0.8, LIGHTNING_OUTER_RADIUS_FACTOR: 1.1, LIGHTNING_TARGET_OUTER_RADIUS_OFFSET: 15, LIGHTNING_START_RADIUS_VARIATION_FACTOR: 0.1, LIGHTNING_END_RADIUS_RANDOM_OFFSET: 5, LIGHTNING_MIDPOINT_OFFSET_FACTOR: 30, }, SHOCKWAVES: { PRIMARY_SPEED_RADIUS_FACTOR: 3.0, PRIMARY_BASE_OPACITY: 0.4, PRIMARY_INITIAL_MAX_LINE_WIDTH: 30, SECONDARY_SPEED_FACTOR: 0.5, SECONDARY_BASE_OPACITY: 0.6, SECONDARY_INITIAL_MAX_LINE_WIDTH: 15, SECONDARY_IMPLOSION_RADIUS_POW_FACTOR: 0.7, SECONDARY_IMPLOSION_OPACITY_POW_FACTOR: 1.5, SECONDARY_IMPLOSION_LINE_WIDTH_POW_FACTOR: 1.5, SECONDARY_EXPANSION_FADE_DURATION_FACTOR: 0.9, }, SHATTER_CRACKS: { NUM_MAJOR_CRACKS_BASE: 7, NUM_MAJOR_CRACKS_RANDOM: 3, CRACK_LENGTH_MAX_RADIUS_FACTOR: 1.8, CRACK_OPACITY_PROGRESS_POWER: 2, CRACK_LINE_WIDTH_BASE: 1, CRACK_LINE_WIDTH_PROGRESS_MULTIPLIER: 2, CRACK_SEGMENT_LENGTH_BASE: 15, CRACK_SEGMENT_LENGTH_RANDOM: 10, CRACK_JAGGEDNESS_BASE: 8, } };