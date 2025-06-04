// js/utils.js

export function distanceSq(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return dx * dx + dy * dy;
}

export function distance(p1, p2) {
    return Math.sqrt(distanceSq(p1, p2));
}

export function isPointInsideCircle(px, py, cx, cy, r) {
    if (r <= 0) return false; 
    const dx = px - cx;
    const dy = py - cy; 
    return dx * dx + dy * dy < r * r;
}

export function isPointInsideRadius(px, py, centerX, centerY, radius) {
    if (radius < 0) return false; 
    const dx = px - centerX;
    const dy = py - centerY;
    return dx * dx + dy * dy <= radius * radius;
}

export function lineSegmentCircleIntersection(p1, p2, circleCenter, circleRadius) {
    const intersections = [];
    const d = { x: p2.x - p1.x, y: p2.y - p1.y }; 
    const f = { x: p1.x - circleCenter.x, y: p1.y - circleCenter.y }; 
    const a = d.x * d.x + d.y * d.y; 


    if (a < 1e-9) { 
        return intersections; 
    }


    const b = 2 * (f.x * d.x + f.y * d.y); 
    const c = f.x * f.x + f.y * f.y - circleRadius * circleRadius; 


    let discriminant = b * b - 4 * a * c;
    if (discriminant < -1e-9) { 
        return intersections; 
    }
    if (discriminant < 0) discriminant = 0; 


    discriminant = Math.sqrt(discriminant);


    const t1 = (-b - discriminant) / (2 * a);
    const t2 = (-b + discriminant) / (2 * a);


    const tMin = -1e-9; 
    const tMax = 1 + 1e-9; 


    if (t1 >= tMin && t1 <= tMax) {
        const clampedT1 = Math.max(0, Math.min(1, t1)); 
        intersections.push({ x: p1.x + clampedT1 * d.x, y: p1.y + clampedT1 * d.y, t: clampedT1 });
    }
    
    if (Math.abs(t1 - t2) > 1e-9) { 
        if (t2 >= tMin && t2 <= tMax) {
            const clampedT2 = Math.max(0, Math.min(1, t2));
            let alreadyAdded = false;
            if (intersections.length > 0) {
                 if (Math.abs(intersections[0].t - clampedT2) < 1e-9 && 
                     distanceSq(intersections[0], {x: p1.x + clampedT2 * d.x, y: p1.y + clampedT2 * d.y}) < 1e-9 ) { // Check distanceSq for point equality
                     alreadyAdded = true;
                 }
            }
            if(!alreadyAdded){
                intersections.push({ x: p1.x + clampedT2 * d.x, y: p1.y + clampedT2 * d.y, t: clampedT2 });
            }
        }
    }
    
    intersections.sort((intA, intB) => intA.t - intB.t);
    return intersections;
}

/**
 * Checks if a point is inside any crater from a provided list of craters.
 * @param {number} px - Point X (world coordinates).
 * @param {number} py - Point Y (world coordinates).
 * @param {Array<object>} craterList - An array of crater objects ({x, y, radius}).
 * @returns {boolean} True if the point is inside any crater in the list.
 */
export function isPointInsideAnyCraterUsingList(px, py, craterList) {
    if (!craterList || craterList.length === 0) {
        return false;
    }
    for (const crater of craterList) {
        if (crater.radius <= 0) continue;
        if (isPointInsideCircle(px, py, crater.x, crater.y, crater.radius)) {
            return true;
        }
    }
    return false;
}

/**
 * Checks if a point is inside any crater of a SPECIFIC planet.
 * @param {number} px - Point X (world coordinates).
 * @param {number} py - Point Y (world coordinates).
 * @param {object} planet - The specific planet object to check against.
 * @returns {boolean} True if the point is inside any crater of that planet.
 */
export function isPointInsideAnyCrater(px, py, planet) {
    if (!planet || !planet.craters || planet.craters.length === 0) {
        return false;
    }
    return isPointInsideAnyCraterUsingList(px, py, planet.craters);
}

/**
 * Formats a large number into a human-readable string with metric prefixes (K, M, B, T, Q).
 * @param {number} num - The number to format.
 * @param {number} [digits=2] - The number of decimal places to show.
 * @returns {string} The formatted string.
 */
export function formatLargeNumber(num, digits = 2) {
    if (num === 0) return '0';
    if (!num || !isFinite(num)) return '--';

    const k = 1000;
    const sizes = ['', 'K', 'M', 'B', 'T', 'P', 'E', 'Z', 'Y']; // Kilo, Mega, Giga(Billion), Tera, Peta, Exa...
    // Using G for Giga is common, B for Billion is more friendly for large monetary/mass values.
    // Let's stick to standard SI prefixes where possible, but use 'Billion', 'Trillion' for output.
    const friendlySizes = ['', 'Thousand', 'Million', 'Billion', 'Trillion', 'Quadrillion', 'Quintillion', 'Sextillion', 'Septillion'];

    const i = Math.floor(Math.log(Math.abs(num)) / Math.log(k));

    if (i < 0 || i >= friendlySizes.length) { // Handle very small numbers or numbers too large for defined prefixes
        return num.toExponential(digits);
    }

    const formattedNum = (num / Math.pow(k, i)).toFixed(digits);
    
    // Remove trailing '.00' if digits is 2 and it's an integer result
    if (digits === 2 && formattedNum.endsWith('.00')) {
        return parseFloat(formattedNum).toString() + (i > 0 ? ' ' + friendlySizes[i] : '');
    }
    // Remove trailing '.0' if digits is 1 and it's an integer result
    if (digits === 1 && formattedNum.endsWith('.0')) {
         return parseFloat(formattedNum).toString() + (i > 0 ? ' ' + friendlySizes[i] : '');
    }

    return formattedNum + (i > 0 ? ' ' + friendlySizes[i] : '');
}