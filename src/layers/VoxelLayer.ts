import { SimpleMeshLayer } from '@deck.gl/mesh-layers';
import { CubeGeometry } from '@luma.gl/engine';
import { type VoxelBounds } from '../utils/spatialId';

interface VoxelLayerProps {
    voxels: VoxelBounds[];
    layerProps?: Partial<SimpleMeshLayer>;
}

/**
 * Creates a standard Deck.gl layer for rendering voxels.
 *
 * @param props - Layer configuration.
 * @param props.voxels - Voxel data.
 * @param props.layerProps - Optional overrides for the SimpleMeshLayer.
 * @returns Array containing the initialized layer.
 */
export function createVoxelLayers({ voxels, layerProps }: VoxelLayerProps) {
    return [
        new SimpleMeshLayer<VoxelBounds>({
            id: 'voxel-layer-3d',
            data: voxels,
            mesh: new CubeGeometry(),
            getPosition: (d: VoxelBounds) => [d.center.lng, d.center.lat, d.center.alt],
            getScale: (d: VoxelBounds) => [d.size.width, d.size.depth, d.size.height],
            getOrientation: [0, 0, 0],
            pickable: true,
            autoHighlight: true,

            // Default coloring if not provided
            getColor: (d: VoxelBounds) => {
                const h = d.center.alt;
                return [h / 4000 * 255, 100, 255 - h / 4000 * 255];
            },

            // User overrides
            ...layerProps
        })
    ];
}
