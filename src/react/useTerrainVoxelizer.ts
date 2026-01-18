import { useState, useCallback, useEffect, type RefObject } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import { generateVoxelsForBounds, type IDEMBounds } from '../utils/voxelGenerator';
import { type VoxelBounds } from '../utils/spatialId';

// Constants for DEM URLs
const URL_GSI = 'https://cyberjapandata.gsi.go.jp/xyz/dem_png/{z}/{x}/{y}.png';

function adaptBounds(bounds: maplibregl.LngLatBounds): IDEMBounds {
    return {
        getWest: () => bounds.getWest(),
        getSouth: () => bounds.getSouth(),
        getEast: () => bounds.getEast(),
        getNorth: () => bounds.getNorth(),
    };
}

/**
 * React hook to generate terrain voxels from map bounds.
 *
 * @param mapRef - Reference to the MapLibre map instance.
 * @param options - Hook configuration.
 * @param options.demTileUrl - URL template for DEM tiles (default: GSI).
 * @param options.resolutionOffset - Offset for spatial ID resolution (Z_sid = Z_dem + offset).
 * @returns Object containing the current voxels and a generator function.
 */
export function useTerrainVoxelizer(
    mapRef: RefObject<MapRef | null>,
    {
        demTileUrl,
        resolutionOffset
    }: {
        demTileUrl?: string;
        resolutionOffset: number;
    }
) {
    const [voxels, setVoxels] = useState<VoxelBounds[]>([]);

    const generateVoxels = useCallback(async (zoom: number) => {
        if (!mapRef.current) return;

        const map = mapRef.current.getMap();
        const bounds = map.getBounds();

        // Calculate target resolution based on zoom
        const resolutionZ = Math.min(22, Math.floor(zoom) + resolutionOffset);
        // Ensure resolution is at least Z10 (allow broader views)
        const targetZ = Math.max(10, resolutionZ);

        console.log(`Generating voxels for ViewZoom: ${zoom.toFixed(2)} -> Target Resolution: Z${targetZ}`);

        // Select DEM Template based on current state, default to GSI
        const targetUrl = demTileUrl || URL_GSI;

        // Generate voxels (Usage of 3D DEM generation)
        const newVoxels = await generateVoxelsForBounds(adaptBounds(bounds), targetZ, zoom, targetUrl);
        setVoxels(newVoxels);
    }, [mapRef, resolutionOffset, demTileUrl]);

    // Re-generate when inputs change or map moves (handled continuously via map events if desired, 
    // but here we expose the generator to be called on MoveEnd)
    // Actually, in the original code, this useEffect triggered on mount? 
    // No, it triggered when dependencies changed.
    useEffect(() => {
        if (mapRef.current) {
            generateVoxels(mapRef.current.getZoom());
        }
    }, [generateVoxels]);

    return {
        voxels,
        generateVoxels
    };
}
