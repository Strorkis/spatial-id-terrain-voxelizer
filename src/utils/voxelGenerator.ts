import { GSI_DEM_URL_TEMPLATE, loadTileImage, getElevationFromRgb } from './demFetcher';
import { lngLatToTile, spatialIdToVoxel, type SpatialId, type VoxelBounds } from './spatialId';

/**
 * Bounds interface compatible with maplibre-gl LngLatBounds
 */
export interface IDEMBounds {
    getWest: () => number;
    getSouth: () => number;
    getEast: () => number;
    getNorth: () => number;
}

/**
 * Generates voxel data for a given map area by fetching and processing DEM tiles.
 *
 * @param bounds - Map bounds to cover.
 * @param resolutionZ - Target Spatial ID zoom level (Z value).
 * @param mapZoom - Current map zoom level (determines which DEM tile to fetch).
 * @param demUrlTemplate - Optional URL template for DEM source (default: GSI).
 * @returns Promise resolving to an array of VoxelBounds.
 */
export async function generateVoxelsForBounds(
    bounds: IDEMBounds,
    resolutionZ: number,
    mapZoom: number,
    demUrlTemplate: string = GSI_DEM_URL_TEMPLATE,
    aggregation: 'max' | 'avg' | 'min' = 'max'
): Promise<VoxelBounds[]> {
    // Use dynamic DEM zoom level to avoid fetching too many small tiles
    // GSI DEM usually goes up to Z14.
    // Ensure we don't go below Z0 or above Z14.
    const demZ = Math.max(0, Math.min(14, Math.floor(mapZoom)));

    const west = bounds.getWest();
    const south = bounds.getSouth();
    const east = bounds.getEast();
    const north = bounds.getNorth();

    const nw = lngLatToTile(west, north, demZ);
    const se = lngLatToTile(east, south, demZ);

    const minX = Math.min(nw.x, se.x);
    const maxX = Math.max(nw.x, se.x);
    const minY = Math.min(nw.y, se.y);
    const maxY = Math.max(nw.y, se.y);

    const tiles: { x: number, y: number }[] = [];

    // Safety limit increased to 400 (approx 20x20 grid)
    const tileCount = (maxX - minX + 1) * (maxY - minY + 1);
    if (tileCount > 400) {
        console.warn(`Too many tiles requested (${tileCount}), skipping voxel generation. Try zooming in.`);
        return [];
    }

    for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
            tiles.push({ x, y });
        }
    }

    console.log(`Fetching ${tiles.length} tiles for bounds (DEM Z${demZ})...`);

    // Fetch in parallel
    const promises = tiles.map(t => processTile(demZ, t.x, t.y, resolutionZ, demUrlTemplate, aggregation));
    const results = await Promise.all(promises);

    // Flatten results
    return results.flat();
}

/**
 * Process a single tile: fetch image -> generate voxels
 */
async function processTile(
    z: number,
    x: number,
    y: number,
    resolutionZ: number,
    urlTemplate: string,
    aggregation: 'max' | 'avg' | 'min'
): Promise<VoxelBounds[]> {
    const tileUrl = urlTemplate
        .replace('{z}', z.toString())
        .replace('{x}', x.toString())
        .replace('{y}', y.toString());

    try {
        const imageData = await loadTileImage(tileUrl);
        const { width, height, data } = imageData;

        const newVoxels: VoxelBounds[] = [];
        const sidZ = resolutionZ;

        // Calculate stride based on resolution difference
        // Base definition: Z_sid = Z_dem + offset
        // Stride = 256 / 2^(Z_sid - Z_dem)
        // If the requested resolution (Z_sid) is higher than the DEM resolution (Z_dem), we use every pixel (stride=1)
        // and repeat values; effectively subsampling is not possible, we just map 1 DEM pixel to multiple voxels?
        // Actually, the current logic calculates stride to SKIP pixels if Z_sid is LOWER than Z_dem (coarser).
        // If Z_sid > Z_dem (finer), unitsPerTile > 256, so stride becomes 0 (math.floor of < 1).
        // Max(1, ...) handles this.
        const zoomDiff = sidZ - z;
        const unitsPerTile = Math.pow(2, zoomDiff);

        // Stride determines how many pixels a spatial ID spans at the DEM zoom level.
        const stride = Math.max(1, Math.floor(256 / unitsPerTile));

        for (let py = 0; py < height; py += stride) {
            for (let px = 0; px < width; px += stride) {
                let maxElevation = -Infinity;
                let minElevation = Infinity;
                let sumElevation = 0;
                let count = 0;

                // Pooling within the stride x stride block
                for (let dy = 0; dy < stride && (py + dy) < height; dy++) {
                    for (let dx = 0; dx < stride && (px + dx) < width; dx++) {
                        const idx = ((py + dy) * width + (px + dx)) * 4;
                        const r = data[idx];
                        const g = data[idx + 1];
                        const b = data[idx + 2];

                        const elevation = getElevationFromRgb(r, g, b);
                        if (elevation !== null) {
                            count++;
                            sumElevation += elevation;
                            if (elevation > maxElevation) maxElevation = elevation;
                            if (elevation < minElevation) minElevation = elevation;
                        }
                    }
                }

                if (count === 0) continue;

                let finalElevation = maxElevation; // default to max
                if (aggregation === 'avg') {
                    finalElevation = sumElevation / count;
                } else if (aggregation === 'min') {
                    finalElevation = minElevation;
                }

                // The Spatial ID (sid_x, sid_y) at Target Z
                // sid_x = tile_x * unitsPerTile + (px / stride)
                const sidX = x * unitsPerTile + Math.floor(px / stride);
                const sidY = y * unitsPerTile + Math.floor(py / stride);

                // Calculate F from final elevation
                const H_CONST = Math.pow(2, 25);
                const n_sid = Math.pow(2, sidZ);
                const f = Math.floor((n_sid * finalElevation) / H_CONST);

                const sid: SpatialId = { z: sidZ, f, x: sidX, y: sidY };
                newVoxels.push(spatialIdToVoxel(sid));
            }
        }
        return newVoxels;

    } catch (e) {
        // Silent fail for missing tiles
        return [];
    }
}


