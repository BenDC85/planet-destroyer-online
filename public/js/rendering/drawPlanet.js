/* File: public/js/rendering/drawPlanet.js */
// js/rendering/drawPlanet.js



import * as config from '../config.js';

import { getState } from '../state/gameState.js'; // Needed for cameraZoom in shatter cracks

import * as utils from '../utils.js';



// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=drawPlanetFileContent##



// --- Simple Seedable PRNG (Mulberry32) ---

function mulberry32(seed) {

    return function() {
      var t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}



// Helper: Random point within circle

function getRandomPointInCircle(rng, cx, cy, R_factor, planetRadius) {
    const angle = rng() * Math.PI * 2;
    const dist = Math.sqrt(rng()) * planetRadius * R_factor; // R_factor is % of planetRadius
    return { x: cx + Math.cos(angle) * dist, y: cy + Math.sin(angle) * dist };
}



// Helper: Generate jagged path

function generateWobblyPath(rng, cx, cy, baseRadius, numPoints, chaosFactorMin, chaosFactorRandom) {
    const points = [];
    const angleStep = (Math.PI * 2) / numPoints;
    let lastAngle = rng() * angleStep; // Initial random offset
    for (let i = 0; i < numPoints; i++) {
        const angle = lastAngle + angleStep * (0.7 + rng() * 0.6); // Slight variation in angle step
        const chaos = chaosFactorMin + rng() * chaosFactorRandom;
        const radiusVariation = baseRadius * chaos * (rng() - 0.5) * 2.0; // Allow wider variation
        const currentRadius = Math.max(baseRadius * 0.1, baseRadius + radiusVariation); // Prevent negative/too small
        points.push({ x: cx + Math.cos(angle) * currentRadius, y: cy + Math.sin(angle) * currentRadius });
        lastAngle = angle;
    }
    return points;
}



// Helper: Draw path with lineTo, optionally fill

function drawJaggedPath(ctx, points, closePath = false, fill = false, stroke = true) {
     if (!points || points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
         ctx.lineTo(points[i].x, points[i].y);
    }
     if (closePath) {
         ctx.closePath();
         if(fill) ctx.fill();
     }
     if(stroke) ctx.stroke();
}



// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=renderPlanetStateFunction##

export function renderPlanetState(ctx, planet) {

    // This function is now DEPRECATED and its logic is moved to the main renderer.
    // It is no longer called directly. You can safely remove its contents or the entire function.
    // For clarity, let's empty it.
    return;
}

// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=renderPlanetStateFunction##



// --- Internal Helpers ---



// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=drawStaticCrateredPlanetInternal##

export function drawStaticCrateredPlanetInternal(ctx, planet) {
     if (!planet || !planet.originalRadius || planet.originalRadius <= 0 || !planet.type || !config.PLANET_TYPES[planet.type]) { return; }


    const viz = config.PLANET_VISUALS;
    const planetTypeData = config.PLANET_TYPES[planet.type];
    const baseColorRGB = planetTypeData.baseColor;
    const radius = planet.originalRadius; // UPDATED: Use originalRadius for consistent visual boundary
    const x = planet.x;
    const y = planet.y;
    
    const baseLineWidth = viz.GENERAL.BASE_LINE_WIDTH_ZOOM_INDEPENDENT;
    const rng = mulberry32(parseInt(planet.id.split('_').pop(), 10)); // Consistent PRNG per planet ID

    const colorVariation = Math.floor((rng() - 0.5) * viz.GENERAL.COLOR_VARIATION_RANGE);
    const planetR = Math.max(0, Math.min(255, baseColorRGB[0] + colorVariation));
    const planetG = Math.max(0, Math.min(255, baseColorRGB[1] + colorVariation));
    const planetB = Math.max(0, Math.min(255, baseColorRGB[2] + colorVariation));
    const planetColor = `rgb(${planetR}, ${planetG}, ${planetB})`;


    ctx.save();


    // 1. Draw Base Color Circle
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fillStyle = planetColor; ctx.fill();


    // --- Clip subsequent details to the planet's boundary ---\\\n    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.clip();
    // ---------------------------------------------------------\n    ctx.lineCap = 'round';


    switch (planet.type) {
        case 'icy':
            const icyViz = viz.ICY;
            // Layer 1: Frost texture
            const numFrostDots = Math.floor(radius * radius * icyViz.FROST_DOT_DENSITY_FACTOR);
            for (let i = 0; i < numFrostDots; i++) {
                 const frostPt = getRandomPointInCircle(rng, x, y, 1.0, radius);
                 const frostSize = baseLineWidth * (icyViz.FROST_DOT_SIZE_BASE_LINE_WIDTH_FACTOR_MIN + rng() * icyViz.FROST_DOT_SIZE_BASE_LINE_WIDTH_FACTOR_RANDOM);
                 const frostAlpha = icyViz.FROST_DOT_ALPHA_MIN + rng() * icyViz.FROST_DOT_ALPHA_RANDOM;
                 const greyShift = Math.floor(rng() * icyViz.FROST_DOT_GREY_SHIFT_RANDOM);
                 ctx.fillStyle = `rgba(${225 + greyShift}, ${225 + greyShift}, ${240 + greyShift}, ${frostAlpha})`;
                 ctx.beginPath(); ctx.arc(frostPt.x, frostPt.y, frostSize, 0, Math.PI*2); ctx.fill();
            }


            // Layer 2: Broad Cloud Streaks
            const numStreaks = icyViz.STREAK_COUNT_MIN + Math.floor(rng() * icyViz.STREAK_COUNT_RANDOM);
            const baseStreakAngle = rng() * Math.PI * 2;
            const maxDeviationRad = (icyViz.STREAK_MAX_ANGLE_DEVIATION_DEG * Math.PI / 180);
            ctx.lineCap = 'butt';
            for (let i = 0; i < numStreaks; i++) {
                 const streakAlpha = icyViz.STREAK_ALPHA_MIN + rng() * icyViz.STREAK_ALPHA_RANDOM;
                 const greyShift = icyViz.STREAK_GREY_SHIFT_BASE + Math.floor(rng() * icyViz.STREAK_GREY_SHIFT_RANDOM);
                 ctx.strokeStyle = `rgba(${greyShift}, ${greyShift}, ${greyShift}, ${streakAlpha})`;
                 ctx.lineWidth = radius * (icyViz.STREAK_WIDTH_FACTOR_MIN + rng() * icyViz.STREAK_WIDTH_FACTOR_RANDOM);


                 const angleDeviation = (rng() - 0.5) * 2 * maxDeviationRad; 
                 const currentStreakAngle = baseStreakAngle + angleDeviation;
                 const startAngle = currentStreakAngle - Math.PI / 2 + (rng() - 0.5) * 0.6;
                 const startDist = radius * icyViz.STREAK_START_END_DISTANCE_FACTOR;
                 const startX = x + Math.cos(startAngle) * startDist; 
                 const startY = y + Math.sin(startAngle) * startDist;
                 const endAngle = currentStreakAngle + Math.PI / 2 + (rng() - 0.5) * 0.6;
                 const endDist = radius * icyViz.STREAK_START_END_DISTANCE_FACTOR;
                 const endX = x + Math.cos(endAngle) * endDist; 
                 const endY = y + Math.sin(endAngle) * endDist;
                 const cp1Angle = currentStreakAngle + (rng() - 0.5) * 1.2;
                 const cp1Dist = radius * (icyViz.STREAK_CONTROL_POINT_DISTANCE_FACTOR_MIN + rng() * icyViz.STREAK_CONTROL_POINT_DISTANCE_FACTOR_RANDOM);
                 const cp1X = x + Math.cos(cp1Angle) * cp1Dist; 
                 const cp1Y = y + Math.sin(cp1Angle) * cp1Dist;
                 const cp2Angle = currentStreakAngle + (rng() - 0.5) * 1.2;
                 const cp2Dist = radius * (icyViz.STREAK_CONTROL_POINT_DISTANCE_FACTOR_MIN + rng() * icyViz.STREAK_CONTROL_POINT_DISTANCE_FACTOR_RANDOM);
                 const cp2X = x + Math.cos(cp2Angle) * cp2Dist; 
                 const cp2Y = y + Math.sin(cp2Angle) * cp2Dist;
                 ctx.beginPath(); ctx.moveTo(startX, startY); ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, endX, endY); ctx.stroke();
            }
            ctx.lineCap = 'round';


            // Layer 3: Polar Caps (Jagged)
             ctx.fillStyle = `rgba(255, 255, 255, ${icyViz.POLAR_CAP_ALPHA_MIN + rng()*icyViz.POLAR_CAP_ALPHA_RANDOM})`;
             const capHeightFactor = icyViz.POLAR_CAP_HEIGHT_FACTOR_MIN + rng() * icyViz.POLAR_CAP_HEIGHT_FACTOR_RANDOM;
             const capPoints = icyViz.POLAR_CAP_NUM_POINTS_BASE + Math.floor(rng()*icyViz.POLAR_CAP_NUM_POINTS_RANDOM);
             // Top Cap
             let topCapPath = [{x: x, y: y - radius}]; 
             for(let i=0; i<=capPoints; i++) { 
                 let angle = Math.PI * (1.5 - capHeightFactor) + (i/capPoints) * (2 * capHeightFactor * Math.PI); // Angle spans across the cap width
                 let rPoint = radius * (icyViz.POLAR_CAP_POINT_RADIUS_FACTOR_MIN + rng()*icyViz.POLAR_CAP_POINT_RADIUS_FACTOR_RANDOM);
                 topCapPath.push({x: x + Math.cos(angle)*rPoint, y: y + Math.sin(angle)*rPoint}); 
             } 
             topCapPath.push({x: x, y: y - radius}); 
             ctx.beginPath(); ctx.moveTo(topCapPath[0].x, topCapPath[0].y); for(let i=1; i<topCapPath.length; i++) ctx.lineTo(topCapPath[i].x, topCapPath[i].y); ctx.closePath(); ctx.fill();
             // Bottom Cap
             let botCapPath = [{x: x, y: y + radius}]; 
             for(let i=0; i<=capPoints; i++) { 
                 let angle = Math.PI * (0.5 - capHeightFactor) + (i/capPoints) * (2 * capHeightFactor * Math.PI);
                 let rPoint = radius * (icyViz.POLAR_CAP_POINT_RADIUS_FACTOR_MIN + rng()*icyViz.POLAR_CAP_POINT_RADIUS_FACTOR_RANDOM);
                 botCapPath.push({x: x + Math.cos(angle)*rPoint, y: y + Math.sin(angle)*rPoint}); 
             } 
             botCapPath.push({x: x, y: y + radius}); 
             ctx.beginPath(); ctx.moveTo(botCapPath[0].x, botCapPath[0].y); for(let i=1; i<botCapPath.length; i++) ctx.lineTo(botCapPath[i].x, botCapPath[i].y); ctx.closePath(); ctx.fill();


            // Layer 4: More chaotic cracks/swirls
            const numCracks = icyViz.CRACK_SWIRL_COUNT_MIN + Math.floor(rng() * icyViz.CRACK_SWIRL_COUNT_RANDOM);
            for (let i = 0; i < numCracks; i++) {
                const startPt = getRandomPointInCircle(rng, x, y, icyViz.CRACK_SWIRL_START_POINT_RADIUS_FACTOR, radius); 
                const crackLength = radius * (icyViz.CRACK_SWIRL_LENGTH_FACTOR_MIN + rng() * icyViz.CRACK_SWIRL_LENGTH_FACTOR_RANDOM); 
                let currentX = startPt.x; let currentY = startPt.y; let currentLen = 0; 
                let angle = rng() * Math.PI * 2; 
                const segments = icyViz.CRACK_SWIRL_SEGMENTS_MIN + Math.floor(rng() * icyViz.CRACK_SWIRL_SEGMENTS_RANDOM);
                
                ctx.lineWidth = baseLineWidth * (icyViz.CRACK_SWIRL_LINE_WIDTH_FACTOR_MIN + rng() * icyViz.CRACK_SWIRL_LINE_WIDTH_FACTOR_RANDOM); 
                const crackGrey = Math.floor(rng()*icyViz.CRACK_SWIRL_GREY_SHIFT_RANDOM); 
                const crackBlue = icyViz.CRACK_SWIRL_BLUE_BASE + Math.floor(rng()*icyViz.CRACK_SWIRL_BLUE_RANDOM); 
                ctx.strokeStyle = `rgba(${crackGrey + 190}, ${crackGrey + 200}, ${crackBlue}, ${icyViz.CRACK_SWIRL_ALPHA_MIN + rng() * icyViz.CRACK_SWIRL_ALPHA_RANDOM})`;
                
                ctx.beginPath(); ctx.moveTo(currentX, currentY);
                for (let j = 0; j < segments && currentLen < crackLength; j++) {
                    const segLen = (crackLength / segments) * (0.6 + rng()*0.8);
                    angle += (rng() - 0.5) * 2.5; 
                    currentX += Math.cos(angle) * segLen; currentY += Math.sin(angle) * segLen; 
                    ctx.lineTo(currentX, currentY); currentLen += segLen;
                    
                    if (rng() < icyViz.CRACK_SWIRL_BRANCH_PROBABILITY && currentLen < crackLength * icyViz.CRACK_SWIRL_BRANCH_MAX_LENGTH_FACTOR) {
                        ctx.save(); 
                        ctx.lineWidth *= (icyViz.CRACK_SWIRL_BRANCH_LINE_WIDTH_FACTOR_MIN + rng() * icyViz.CRACK_SWIRL_BRANCH_LINE_WIDTH_FACTOR_RANDOM); 
                        const branchGrey = Math.floor(rng()*icyViz.CRACK_SWIRL_BRANCH_GREY_SHIFT_RANDOM); 
                        const branchBlue = icyViz.CRACK_SWIRL_BRANCH_BLUE_BASE + Math.floor(rng()*icyViz.CRACK_SWIRL_BRANCH_BLUE_RANDOM); 
                        ctx.strokeStyle = `rgba(${branchGrey + 180}, ${branchGrey + 190}, ${branchBlue}, ${icyViz.CRACK_SWIRL_BRANCH_ALPHA_MIN + rng() * icyViz.CRACK_SWIRL_BRANCH_ALPHA_RANDOM})`; 
                        ctx.beginPath(); ctx.moveTo(currentX, currentY); 
                        let branchAngle = angle + (rng() > 0.5 ? 1.1 : -1.1) * (icyViz.CRACK_SWIRL_BRANCH_ANGLE_FACTOR_MIN + rng() * icyViz.CRACK_SWIRL_BRANCH_ANGLE_FACTOR_RANDOM); 
                        const branchLength = crackLength * (icyViz.CRACK_SWIRL_BRANCH_LENGTH_FACTOR_MIN + rng() * icyViz.CRACK_SWIRL_BRANCH_LENGTH_FACTOR_RANDOM); 
                        const branchSegments = icyViz.CRACK_SWIRL_BRANCH_SEGMENTS_MIN + Math.floor(rng() * icyViz.CRACK_SWIRL_BRANCH_SEGMENTS_RANDOM); 
                        let branchX = currentX; let branchY = currentY;
                        for (let k=0; k < branchSegments; k++) { 
                            branchAngle += (rng() - 0.5) * 2.0;
                            branchX += Math.cos(branchAngle) * (branchLength / branchSegments); 
                            branchY += Math.sin(branchAngle) * (branchLength / branchSegments); 
                            ctx.lineTo(branchX, branchY); 
                        }
                        ctx.stroke(); ctx.restore();
                    }
                }
                ctx.stroke();
            }
            break;


        case 'rocky':
            const rockyViz = viz.ROCKY;
             // Layer 1: Multiple Smaller, Filled Water Bodies
             const waterBodyColR = rockyViz.WATER_BODY_COLOR_R_BASE + Math.floor(rng()*rockyViz.WATER_BODY_COLOR_R_RANDOM);
             const waterBodyColG = rockyViz.WATER_BODY_COLOR_G_BASE + Math.floor(rng()*rockyViz.WATER_BODY_COLOR_G_RANDOM);
             const waterBodyColB = rockyViz.WATER_BODY_COLOR_B_BASE + Math.floor(rng()*rockyViz.WATER_BODY_COLOR_B_RANDOM);
             ctx.fillStyle = `rgba(${waterBodyColR}, ${waterBodyColG}, ${waterBodyColB}, ${rockyViz.WATER_BODY_ALPHA_MIN + rng()*rockyViz.WATER_BODY_ALPHA_RANDOM})`;
             const numWaterBodies = rockyViz.WATER_BODY_COUNT_MIN + Math.floor(rng() * rockyViz.WATER_BODY_COUNT_RANDOM);


             for (let i = 0; i < numWaterBodies; i++) {
                 const bodyRadius = radius * (rockyViz.WATER_BODY_RADIUS_FACTOR_MIN + rng() * rockyViz.WATER_BODY_RADIUS_FACTOR_RANDOM);
                 const bodyCenter = getRandomPointInCircle(rng, x, y, rockyViz.WATER_BODY_CENTER_RADIUS_FACTOR, radius);
                 const bodyPoints = generateWobblyPath(
                     rng, bodyCenter.x, bodyCenter.y, bodyRadius,
                     rockyViz.WATER_BODY_NUM_POINTS_BASE + Math.floor(rng()*rockyViz.WATER_BODY_NUM_POINTS_RANDOM),
                     rockyViz.WATER_BODY_CHAOS_FACTOR_MIN, rockyViz.WATER_BODY_CHAOS_FACTOR_RANDOM
                 );
                 ctx.beginPath();
                 ctx.moveTo(bodyPoints[0].x, bodyPoints[0].y);
                 for(let k=1; k<bodyPoints.length; k++) ctx.lineTo(bodyPoints[k].x, bodyPoints[k].y);
                 ctx.closePath();
                 ctx.fill();
             }


             // Layer 2: Vegetation Patches
             const numVegPatches = rockyViz.VEG_PATCH_COUNT_MIN + Math.floor(rng() * rockyViz.VEG_PATCH_COUNT_RANDOM);
             for (let i = 0; i < numVegPatches; i++) {
                 const vegR = rockyViz.VEG_PATCH_COLOR_R_BASE + Math.floor(rng()*rockyViz.VEG_PATCH_COLOR_R_RANDOM);
                 const vegG = rockyViz.VEG_PATCH_COLOR_G_BASE + Math.floor(rng()*rockyViz.VEG_PATCH_COLOR_G_RANDOM);
                 const vegB = rockyViz.VEG_PATCH_COLOR_B_BASE + Math.floor(rng()*rockyViz.VEG_PATCH_COLOR_B_RANDOM);
                 const vegAlpha = rockyViz.VEG_PATCH_ALPHA_MIN + rng() * rockyViz.VEG_PATCH_ALPHA_RANDOM;
                 ctx.fillStyle = `rgba(${vegR}, ${vegG}, ${vegB}, ${vegAlpha})`;


                 const vegRadius = radius * (rockyViz.VEG_PATCH_RADIUS_FACTOR_MIN + rng() * rockyViz.VEG_PATCH_RADIUS_FACTOR_RANDOM);
                 const vegCenter = getRandomPointInCircle(rng, x, y, rockyViz.VEG_PATCH_CENTER_RADIUS_FACTOR, radius);
                 ctx.beginPath();
                 ctx.arc(vegCenter.x, vegCenter.y, vegRadius, 0, Math.PI * 2);
                 ctx.fill();
             }
            break;


        case 'metallic':
            const metalViz = viz.METALLIC;
             ctx.lineCap = 'butt';
             let numSheen = metalViz.SHEEN_COUNT_MIN + Math.floor(rng()*metalViz.SHEEN_COUNT_RANDOM); 
             let sheenColR = Math.max(0, Math.min(255, planetR + metalViz.SHEEN_COLOR_OFFSET));
             let sheenColG = Math.max(0, Math.min(255, planetG + metalViz.SHEEN_COLOR_OFFSET));
             let sheenColB = Math.max(0, Math.min(255, planetB + metalViz.SHEEN_COLOR_OFFSET));
             ctx.strokeStyle = `rgba(${sheenColR}, ${sheenColG}, ${sheenColB}, ${metalViz.SHEEN_ALPHA_MIN + rng() * metalViz.SHEEN_ALPHA_RANDOM})`;
             for (let i = 0; i < numSheen; i++) { 
                 ctx.lineWidth = baseLineWidth * (metalViz.SHEEN_LINE_WIDTH_FACTOR_MIN + rng() * metalViz.SHEEN_LINE_WIDTH_FACTOR_RANDOM); 
                 ctx.beginPath(); 
                 const angle = rng() * Math.PI * 2; 
                 const dist = Math.sqrt(rng()) * radius * metalViz.SHEEN_DIST_FACTOR; 
                 const length = radius * (metalViz.SHEEN_LENGTH_FACTOR_MIN + rng() * metalViz.SHEEN_LENGTH_FACTOR_RANDOM); 
                 const startX = x + Math.cos(angle) * dist; const startY = y + Math.sin(angle) * dist; 
                 ctx.moveTo(startX, startY); 
                 const streakAngle = angle + (rng() - 0.5) * 0.4;
                 const endX = startX + Math.cos(streakAngle) * length; const endY = startY + Math.sin(streakAngle) * length; 
                 const cpX = startX + Math.cos(streakAngle + (rng()-0.5)*0.4) * length * (0.2+rng()*0.6);
                 const cpY = startY + Math.sin(streakAngle + (rng()-0.5)*0.4) * length * (0.2+rng()*0.6); 
                 ctx.quadraticCurveTo(cpX, cpY, endX, endY); ctx.stroke(); 
            }


             let plateColR = Math.max(0, Math.min(255, planetR + metalViz.PLATE_COLOR_OFFSET));
             let plateColG = Math.max(0, Math.min(255, planetG + metalViz.PLATE_COLOR_OFFSET));
             let plateColB = Math.max(0, Math.min(255, planetB + metalViz.PLATE_COLOR_OFFSET));
             ctx.strokeStyle = `rgba(${plateColR}, ${plateColG}, ${plateColB}, ${metalViz.PLATE_ALPHA_MIN + rng() * metalViz.PLATE_ALPHA_RANDOM})`; 
             let numPlates = metalViz.PLATE_COUNT_MIN + Math.floor(rng()*metalViz.PLATE_COUNT_RANDOM);
              for (let i = 0; i < numPlates; i++) { 
                  ctx.lineWidth = baseLineWidth * (metalViz.PLATE_LINE_WIDTH_FACTOR_MIN + rng()*metalViz.PLATE_LINE_WIDTH_FACTOR_RANDOM); 
                  const plateStart = getRandomPointInCircle(rng, x, y, metalViz.PLATE_START_POINT_RADIUS_FACTOR, radius); 
                  const platePoints = [plateStart]; 
                  const plateSegments = metalViz.PLATE_SEGMENTS_MIN + Math.floor(rng()*metalViz.PLATE_SEGMENTS_RANDOM); 
                  let currentAngle = rng() * Math.PI * 2; let currentPt = plateStart; 
                  for(let j=0; j<plateSegments; j++) { 
                      currentAngle += (rng() - 0.5) * 2.2; 
                      const segLen = radius * (metalViz.PLATE_SEGMENT_LENGTH_FACTOR_MIN + rng() * metalViz.PLATE_SEGMENT_LENGTH_FACTOR_RANDOM); 
                      const nextPt = { x: currentPt.x + Math.cos(currentAngle) * segLen, y: currentPt.y + Math.sin(currentAngle) * segLen }; 
                      const distSq = utils.distanceSq(nextPt, {x,y}); 
                      if(distSq > radius*radius * 1.05) { // Allow slightly outside before cutting off
                          const intersection = utils.lineSegmentCircleIntersection(currentPt, nextPt, {x,y}, radius); 
                          if(intersection.length > 0) { platePoints.push(intersection[0]); } break; 
                      } else { platePoints.push(nextPt); } currentPt = nextPt; 
                  } 
                  drawJaggedPath(ctx, platePoints, false, false, true); 
            }


             let scratchColR = Math.max(0, Math.min(255, planetR + metalViz.FINE_SCRATCH_COLOR_OFFSET));
             let scratchColG = Math.max(0, Math.min(255, planetG + metalViz.FINE_SCRATCH_COLOR_OFFSET));
             let scratchColB = Math.max(0, Math.min(255, planetB + metalViz.FINE_SCRATCH_COLOR_OFFSET));
             let numFineScratches = metalViz.FINE_SCRATCH_COUNT_MIN + Math.floor(rng()*metalViz.FINE_SCRATCH_COUNT_RANDOM); 
             ctx.strokeStyle = `rgba(${scratchColR}, ${scratchColG}, ${scratchColB}, ${metalViz.FINE_SCRATCH_ALPHA_MIN + rng() * metalViz.FINE_SCRATCH_ALPHA_RANDOM})`;
             for (let i = 0; i < numFineScratches; i++) { 
                 ctx.lineWidth = baseLineWidth * (metalViz.FINE_SCRATCH_LINE_WIDTH_FACTOR_MIN + rng() * metalViz.FINE_SCRATCH_LINE_WIDTH_FACTOR_RANDOM); 
                 ctx.beginPath(); 
                 const startPt = getRandomPointInCircle(rng, x, y, 1.0, radius); 
                 ctx.moveTo(startPt.x, startPt.y); 
                 const scratchAngle = rng() * Math.PI * 2; 
                 const scratchLength = radius * (metalViz.FINE_SCRATCH_LENGTH_FACTOR_MIN + rng() * metalViz.FINE_SCRATCH_LENGTH_FACTOR_RANDOM); 
                 ctx.lineTo( startPt.x + Math.cos(scratchAngle) * scratchLength, startPt.y + Math.sin(scratchAngle) * scratchLength ); 
                 ctx.stroke(); 
            }


             let smudgeColR = Math.max(0, Math.min(255, planetR + metalViz.SMUDGE_COLOR_OFFSET));
             let smudgeColG = Math.max(0, Math.min(255, planetG + metalViz.SMUDGE_COLOR_OFFSET));
             let smudgeColB = Math.max(0, Math.min(255, planetB + metalViz.SMUDGE_COLOR_OFFSET));
             let numSmudges = metalViz.SMUDGE_COUNT_MIN + Math.floor(rng()*metalViz.SMUDGE_COUNT_RANDOM); 
             ctx.fillStyle = `rgba(${smudgeColR}, ${smudgeColG}, ${smudgeColB}, ${metalViz.SMUDGE_ALPHA_MIN + rng() * metalViz.SMUDGE_ALPHA_RANDOM})`;
             for(let i=0; i < numSmudges; i++) { 
                 const smudgeCenter = getRandomPointInCircle(rng, x, y, metalViz.SMUDGE_CENTER_RADIUS_FACTOR, radius); 
                 const smudgeRadius = radius * (metalViz.SMUDGE_RADIUS_FACTOR_MIN + rng()*metalViz.SMUDGE_RADIUS_FACTOR_RANDOM); 
                 const smudgePoints = generateWobblyPath(rng, smudgeCenter.x, smudgeCenter.y, smudgeRadius, 
                                                        metalViz.SMUDGE_NUM_POINTS_BASE+Math.floor(rng()*metalViz.SMUDGE_NUM_POINTS_RANDOM), 
                                                        metalViz.SMUDGE_CHAOS_FACTOR, 0);
                 ctx.beginPath(); ctx.moveTo(smudgePoints[0].x, smudgePoints[0].y); 
                 for(let k=1; k<smudgePoints.length; k++) ctx.lineTo(smudgePoints[k].x, smudgePoints[k].y); 
                 ctx.closePath(); ctx.fill(); 
            }


             let numGlints = metalViz.GLINT_COUNT_MIN + Math.floor(rng()*metalViz.GLINT_COUNT_RANDOM); 
             ctx.fillStyle = `rgba(255, 255, 255, ${metalViz.GLINT_ALPHA_MIN + rng()*metalViz.GLINT_ALPHA_RANDOM})`;
             for(let i=0; i < numGlints; i++) { 
                 const glintCenter = getRandomPointInCircle(rng, x, y, 0.98, radius); 
                 const glintSize = baseLineWidth * (metalViz.GLINT_SIZE_FACTOR_MIN + rng()*metalViz.GLINT_SIZE_FACTOR_RANDOM); 
                 ctx.fillRect(glintCenter.x - glintSize/2, glintCenter.y - glintSize/2, glintSize, glintSize); 
            }
            break;
    }
    ctx.restore(); // Restore from main save (unclip base circle)


    // 3. Clip out Craters (destination-out)
    ctx.save(); 
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.clip(); 
    ctx.globalCompositeOperation = 'destination-out';
    if (planet.craters && planet.craters.length > 0) {
        planet.craters.forEach(crater => { 
            if (crater.radius > 0) { 
                ctx.beginPath(); 
                ctx.arc(crater.x, crater.y, crater.radius, 0, 2 * Math.PI); 
                ctx.fillStyle = 'black'; // Color doesn't matter for destination-out
                ctx.fill(); 
            } 
        });
    }
    ctx.restore(); // Restore from crater clip & composite operation
}

// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=drawStaticCrateredPlanetInternal##



// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=drawShatterCracksInternal##

export function drawShatterCracksInternal(ctx, planet, progress) {
     if (!planet || !planet.lastImpactPoint || !planet.originalRadius || planet.originalRadius <= 0 || progress <= 0) return;
     
     const cracksViz = config.EFFECT_PARAMETERS.SHATTER_CRACKS;
     // Use Math.random for non-critical breakup visuals to avoid sync issues if rng seed differs client/server slightly
     const numMajorCracks = cracksViz.NUM_MAJOR_CRACKS_BASE + Math.floor(Math.random()*cracksViz.NUM_MAJOR_CRACKS_RANDOM);
     const crackLengthMax = planet.originalRadius * cracksViz.CRACK_LENGTH_MAX_RADIUS_FACTOR;
     const crackLength = crackLengthMax * progress; 
     const crackOpacity = Math.max(0, 1.0 - Math.pow(progress, cracksViz.CRACK_OPACITY_PROGRESS_POWER)); 
     
     if (crackOpacity <= 0.01) return; 
     
     ctx.save(); 
     ctx.strokeStyle = `rgba(255, 255, 255, ${crackOpacity * 0.8})`;
     
     const currentZoom = getState()?.settings?.cameraZoom ?? 1.0;
     const safeZoom = Math.max(0.1, currentZoom);
     ctx.lineWidth = (cracksViz.CRACK_LINE_WIDTH_BASE + (1 - progress) * cracksViz.CRACK_LINE_WIDTH_PROGRESS_MULTIPLIER) / safeZoom;


     const rngBreakup = Math.random; // Use non-seeded random for visual variety during breakup


     for (let i = 0; i < numMajorCracks; i++) { 
         ctx.beginPath(); 
         ctx.moveTo(planet.lastImpactPoint.x, planet.lastImpactPoint.y); 
         const angle = (i / numMajorCracks) * 2 * Math.PI + (rngBreakup() - 0.5) * 0.4;
         let currentX = planet.lastImpactPoint.x; 
         let currentY = planet.lastImpactPoint.y; 
         let currentLength = 0; 
         const segmentLength = cracksViz.CRACK_SEGMENT_LENGTH_BASE + rngBreakup() * cracksViz.CRACK_SEGMENT_LENGTH_RANDOM; 
         const jaggedness = cracksViz.CRACK_JAGGEDNESS_BASE * (1 - progress) * (0.5 + rngBreakup());
         
         while (currentLength < crackLength) { 
             const nextLength = Math.min(segmentLength, crackLength - currentLength); 
             const segmentAngle = angle + (rngBreakup() - 0.5) * 0.5 * progress;
             const nextX = currentX + Math.cos(segmentAngle) * nextLength + (rngBreakup() - 0.5) * jaggedness; 
             const nextY = currentY + Math.sin(segmentAngle) * nextLength + (rngBreakup() - 0.5) * jaggedness; 
             ctx.lineTo(nextX, nextY); 
             currentX = nextX; currentY = nextY; currentLength += nextLength; 
         } 
         ctx.stroke(); 
     } 
     ctx.restore();
}

// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=drawShatterCracksInternal##



// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=drawPlanetFileContent##