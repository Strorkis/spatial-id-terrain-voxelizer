import { useState, useCallback, useEffect, useRef, type RefObject } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import { VoxelViewerCore, type ViewerCoreState, type LayerConfig, type VoxelViewerLocale } from '../index';
import { type IDEMBounds } from '../utils/voxelGenerator';

export type { LayerConfig };

function adaptBounds(bounds: maplibregl.LngLatBounds): IDEMBounds {
    return {
        getWest: () => bounds.getWest(),
        getSouth: () => bounds.getSouth(),
        getEast: () => bounds.getEast(),
        getNorth: () => bounds.getNorth(),
    };
}

export function useTerrainVoxelizer(
    mapRef: RefObject<MapRef | null>,
    initialLayers: LayerConfig[],
    locale?: Partial<VoxelViewerLocale>
) {
    const coreRef = useRef<VoxelViewerCore>(new VoxelViewerCore(initialLayers, locale));
    const [viewerState, setViewerState] = useState<ViewerCoreState>(() => coreRef.current.getState());

    useEffect(() => {
        const unsubscribe = coreRef.current.onUpdate((newState) => {
            setViewerState(newState);
        });
        return unsubscribe;
    }, []);

    const generateVoxels = useCallback(async (zoom: number) => {
        if (!mapRef.current) return;

        const map = mapRef.current.getMap();
        const bounds = map.getBounds();

        await coreRef.current.generateVoxels(adaptBounds(bounds), zoom);
    }, [mapRef]);

    // Initial generate or when map moves
    useEffect(() => {
        if (mapRef.current) {
            generateVoxels(mapRef.current.getZoom());
        }
    }, [generateVoxels]);

    return {
        core: coreRef.current,
        viewerState,
        generateVoxels
    };
}
