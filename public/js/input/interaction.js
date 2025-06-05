/* File: public/js/interaction.js */
// js/input/interaction.js



import { getState } from '../state/gameState.js'; 
import * as stateModifiers from '../state/stateModifiers.js';
import * as utils from '../utils.js';
import * as config from '../config.js'; // Import config for destruction thresholds



// Define interaction-specific constants (could also be in config.js if preferred)
const MIN_INTERACTION_SEGMENT_LENGTH_SQ = 1 * 1; // Min click-drag length (squared) to register
const INTERACTION_IMPACT_T_PRECISION = 1e-6; // Precision for comparing t values of intersections
const INTERACTION_IMPACT_POINT_TEST_T_FACTOR = 0.01; // Factor for testing points between intersections



// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=interactionFileContent##



// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=processClickFunction##

export function processClick(secondWorldClickCoords, currentState) {
    // This function handles the second click of a click-drag interaction.
    // In a multiplayer game, this client-side damage/interaction logic is deprecated.
    // All damaging actions (like firing a projectile) are initiated by a request to the server.
    // This function's only remaining job is to reset the visual state (the targeting line).
    
    stateModifiers.setClickState('idle'); // Reset click state, which hides the targeting line.

    // The entire block of code for finding a hit planet and applying local damage has been removed,
    // as it is incorrect for a server-authoritative multiplayer model.
}

// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=processClickFunction##



// ##AI_AUTOMATION::TARGET_ID_DEFINE_START=findInteractionImpactInternalFunction##

// This function is no longer called by processClick but is kept for reference or
// potential future use in a purely client-side tool (e.g., a "ping" or "inspect" feature).
// It does not modify game state.
function findInteractionImpactInternal(p1, p2, planet) {
    // Finds the first point along the line segment p1-p2 that is inside the planet's solid mass.
    if (!planet || utils.distanceSq(p1, p2) < MIN_INTERACTION_SEGMENT_LENGTH_SQ ) {
        return null;
    }


    const planetCenter = { x: planet.x, y: planet.y };
    const planetBoundaryRadius = planet.originalRadius; // Use original radius for interaction boundary
    let allIntersections = [];


    // Intersections with the planet's outer boundary
    const planetIsecs = utils.lineSegmentCircleIntersection(p1, p2, planetCenter, planetBoundaryRadius);
    planetIsecs.forEach((isec) => { 
        allIntersections.push({ t: isec.t, point: { x: isec.x, y: isec.y }, type: 'planet_boundary' });
    });


    // Intersections with crater boundaries
    if (planet.craters) {
        planet.craters.forEach((crater) => {
            if (crater.radius <= 0) return;
            const craterIsecs = utils.lineSegmentCircleIntersection(p1, p2, crater, crater.radius);
            craterIsecs.forEach((isec) => {
                 allIntersections.push({ t: isec.t, point: { x: isec.x, y: isec.y }, type: 'crater_boundary' });
            });
        });
    }
    
    // Add start and end points of the segment to ensure intervals are checked
    allIntersections.push({ t: 0.0, point: {x: p1.x, y: p1.y}, type: 'segment_start_point' });
    allIntersections.push({ t: 1.0, point: {x: p2.x, y: p2.y}, type: 'segment_end_point' });
    allIntersections.sort((a, b) => a.t - b.t); // Sort by 't' (distance along segment)


    // Remove duplicate 't' values, prioritizing non-segment-endpoint types
    let uniqueEvents = [];
    if (allIntersections.length > 0) {
        uniqueEvents.push(allIntersections[0]);
        for (let i = 1; i < allIntersections.length; i++) {
            if (allIntersections[i].t > uniqueEvents[uniqueEvents.length - 1].t + INTERACTION_IMPACT_T_PRECISION) {
                uniqueEvents.push(allIntersections[i]);
            } else { // 't' values are very close, potentially same point
                 // Prefer planet/crater boundaries over segment start/end if t is same
                 if (allIntersections[i].type !== 'segment_start_point' && allIntersections[i].type !== 'segment_end_point') {
                     if (uniqueEvents[uniqueEvents.length-1].type === 'segment_start_point' || uniqueEvents[uniqueEvents.length-1].type === 'segment_end_point') {
                        uniqueEvents[uniqueEvents.length - 1] = allIntersections[i]; // Replace if current is more specific
                     }
                }
            }
        }
    }
    
    // Test midpoints of segments defined by unique intersection events
    for (let i = 0; i < uniqueEvents.length; i++) {
        let tForTest;
        if (i < uniqueEvents.length - 1) { // Test midpoint of [currentEvent, nextEvent]
            const currentEventT = uniqueEvents[i].t;
            const nextEventT = uniqueEvents[i+1].t;
            if (nextEventT <= currentEventT + INTERACTION_IMPACT_T_PRECISION) continue; // Segment too small
            
            tForTest = (currentEventT + nextEventT) / 2.0;
            // Ensure test point is strictly within the segment and not past t=1
            if (tForTest >= 1.0 - INTERACTION_IMPACT_T_PRECISION && currentEventT < 1.0 - INTERACTION_IMPACT_T_PRECISION) {
                tForTest = currentEventT + (1.0 - currentEventT) * INTERACTION_IMPACT_POINT_TEST_T_FACTOR; // Test close to start if end is t=1
            } else if (tForTest >= 1.0 - INTERACTION_IMPACT_T_PRECISION) {
                 continue; // Midpoint is at or beyond end of segment
            }
        } else { // Last event, or only one event; this case shouldn't yield an impact unless p1 itself is an impact
            tForTest = uniqueEvents[i].t; // This typically means we're testing the start point itself
        }
        tForTest = Math.max(0.0, Math.min(1.0, tForTest)); // Clamp t
        const pointToTest = { x: p1.x + tForTest * (p2.x - p1.x), y: p1.y + tForTest * (p2.y - p1.y) };


        const isInsideBoundary = utils.isPointInsideRadius(pointToTest.x, pointToTest.y, planetCenter.x, planetCenter.y, planetBoundaryRadius);
        const isInsideCrater = utils.isPointInsideAnyCrater(pointToTest.x, pointToTest.y, planet);


        if (isInsideBoundary && !isInsideCrater) { // Point is on solid ground
            // The actual impact point is the beginning of this segment, i.e., uniqueEvents[i].point
            let impactT = uniqueEvents[i].t; 
            impactT = Math.max(0.0, Math.min(1.0, impactT)); // Clamp t
            let impactPoint = { x: p1.x + impactT * (p2.x - p1.x), y: p1.y + impactT * (p2.y - p1.y) };
            
            // Final check for the calculated impact point itself
            if (utils.isPointInsideRadius(impactPoint.x, impactPoint.y, planetCenter.x, planetCenter.y, planetBoundaryRadius) &&
                !utils.isPointInsideAnyCrater(impactPoint.x, impactPoint.y, planet)) {
                return { t: impactT, point: impactPoint };
            }
        }
    }
    return null; // No impact point found on solid ground along the segment
}

// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=findInteractionImpactInternalFunction##



// ##AI_AUTOMATION::TARGET_ID_DEFINE_END=interactionFileContent##