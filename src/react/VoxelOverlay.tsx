import { useControl } from 'react-map-gl/maplibre';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { type VoxelBounds } from '../utils/spatialId';
import { createVoxelLayers } from '../layers/VoxelLayer';

interface VoxelOverlayProps {
    /** Array of voxel bounds to render */
    voxels: VoxelBounds[];
    /** Deck.gl layer props to override or extend functionality */
    layerProps?: any;
    /** Custom tooltip handler or definition */
    tooltip?: any;
}

/**
 * Deck.gl overlay component for rendering voxels on MapLibre.
 *
 * @param props - Component properties.
 */
export function VoxelOverlay({ voxels, layerProps, tooltip }: VoxelOverlayProps) {
    try {
        const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay({}));

        const layers = createVoxelLayers({
            voxels,
            layerProps
        });

        overlay.setProps({
            layers,
            getTooltip: tooltip || (({ object }: any) => {
                if (!object) return null;
                const { z, f, x, y } = object.originalId;
                const { alt } = object.center;
                return {
                    html: `<div><b>ID:</b> ${z}/${f}/${x}/${y}<br/><b>H:</b> ${alt.toFixed(1)}m</div>`,
                    style: { backgroundColor: '#fff', color: '#000', fontSize: '0.8em', padding: '4px' }
                };
            })
        });
    } catch (e) {
        // Prevent crashes on hot reload or init
    }

    return null;
}
