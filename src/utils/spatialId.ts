/**
 * Spatial ID (ZFXY) Utilities
 * Based on unvt/zfxy-spec and IPA Guidelines.
 */

// Constants
const Z_MAX = 25;
const H_CONST = Math.pow(2, Z_MAX); // 2^25
// const EARTH_CIRCUMFERENCE = 40075016.686; // Meters (Unused)
const R0 = 156543.03; // Resolution at equator (m/px) = EARTH_CIRCUMFERENCE / 256

export interface SpatialId {
    z: number;
    f: number;
    x: number;
    y: number;
}

export interface VoxelBounds {
    originalId: SpatialId; // Added for reference
    center: { lng: number; lat: number; alt: number }; // Center coordinates
    size: { width: number; depth: number; height: number }; // Dimensions in meters
    origin: { lng: number; lat: number }; // North-West corner
}

/**
 * Calculates the resolution (meters per pixel/voxel-width) at a specific latitude and zoom level.
 * @param lat Latitude in degrees
 * @param z Zoom level
 */
export function getResolutionAtLat(lat: number, z: number): number {
    const latRad = (lat * Math.PI) / 180;
    return (R0 * Math.cos(latRad)) / Math.pow(2, z);
}

/**
 * Calculates the height of a voxel unit at a specific zoom level.
 * unit_height = 2^25 / 2^z
 */
export function getUnitHeight(z: number): number {
    return H_CONST / Math.pow(2, z);
}

/**
 * Converts Lng to Tile X coordinate at a specific zoom level.
 */
export function lngToTileX(lng: number, z: number): number {
    const n = Math.pow(2, z);
    return Math.floor(n * ((lng + 180) / 360));
}

/**
 * Converts Lat to Tile Y coordinate at a specific zoom level.
 * Uses Web Mercator projection.
 */
export function latToTileY(lat: number, z: number): number {
    const n = Math.pow(2, z);
    const latRad = (lat * Math.PI) / 180;
    return Math.floor(
        (n * (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI)) / 2
    );
}

/**
 * Converts Tile X to Longitude (West edge of the tile).
 */
export function tileXToLng(x: number, z: number): number {
    const n = Math.pow(2, z);
    return (x / n) * 360 - 180;
}

/**
 * Converts Tile Y to Latitude (North edge of the tile).
 * Uses Web Mercator projection inverse.
 */
export function tileYToLat(y: number, z: number): number {
    const n = Math.pow(2, z);
    const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n)));
    return (latRad * 180) / Math.PI;
}

/**
 * Converts Altitude to F index (Floor).
 */
export function altToF(alt: number, z: number): number {
    const n = Math.pow(2, z);
    return Math.floor((n * alt) / H_CONST);
}

/**
 * Converts F index to Altitude (Floor height).
 */
export function fToAlt(f: number, z: number): number {
    const unitHeight = getUnitHeight(z);
    return f * unitHeight;
}

/**
 * Converts coordinates to a Spatial ID object.
 * 
 * @param lng - Longitude in degrees.
 * @param lat - Latitude in degrees.
 * @param alt - Altitude in meters.
 * @param z - Zoom level (Spatial ID Level).
 * @returns SpatialId object.
 */
export function lngLatAltToSpatialId(lng: number, lat: number, alt: number, z: number): SpatialId {
    const x = lngToTileX(lng, z);
    const y = latToTileY(lat, z);
    const f = altToF(alt, z);

    return { z, f, x, y };
}

/**
 * Converts Lng, Lat to Tile Coordinates (x, y) at a specific zoom level.
 */
export function lngLatToTile(lng: number, lat: number, z: number): { x: number, y: number } {
    const x = lngToTileX(lng, z);
    const y = latToTileY(lat, z);
    return { x, y };
}

/**
 * Calculates center coordinates and dimensions for a given Spatial ID.
 *
 * @param id - Target Spatial ID.
 * @returns VoxelBounds object suitable for rendering.
 */
export function spatialIdToVoxel(id: SpatialId): VoxelBounds {
    const { z, f, x, y } = id;
    const unitHeight = getUnitHeight(z);

    // Elevation (center of the voxel)
    // fToAlt returns the floor height, add half height for center
    const alt = fToAlt(f, z) + unitHeight / 2;

    // Center coordinates
    // Use (x + 0.5) and (y + 0.5) for center logic
    const lng = tileXToLng(x + 0.5, z);
    const lat = tileYToLat(y + 0.5, z);

    // Calculate Dimensions based on center latitude
    const res = getResolutionAtLat(lat, z);

    return {
        originalId: id, // Store original SpatialID for reference
        center: { lng, lat, alt },
        size: {
            width: res * 256 * 0.5, // Halve size because CubeGeometry is size 2 (-1 to 1)
            depth: res * 256 * 0.5,
            height: unitHeight * 0.5,
        },
        origin: {
            // Precise NW corner
            lng: tileXToLng(x, z),
            lat: tileYToLat(y, z)
        }
    };
}

/**
 * Generate Spatial ID key string (format: z/f/x/y)
 */
export function getSpatialIdKey(id: SpatialId): string {
    return `${id.z}/${id.f}/${id.x}/${id.y}`;
}
