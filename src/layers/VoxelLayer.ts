import { SimpleMeshLayer } from '@deck.gl/mesh-layers';
import { CubeGeometry } from '@luma.gl/engine';
import { type VoxelBounds } from '../utils/spatialId';

interface VoxelLayerProps {
    voxels: VoxelBounds[];
    layerProps?: any; // Relaxed type to allow custom props like 'wireframe' and 'offset'
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
    const layer = new SimpleMeshLayer<VoxelBounds>({
        id: `voxel-layer-${Date.now()}-${Math.random()}`,
        data: voxels,
        mesh: new CubeGeometry(),
        getPosition: (d: VoxelBounds) => [d.center.lng, d.center.lat, d.center.alt],
        // Scale: [width, depth, height] (meters) 
        // Note: SimpleMeshLayer sizeScale is 1 by default. We need to scale geometry.
        // But getOrientation/getScale ? 
        // SimpleMeshLayer doesn't support non-uniform scaling per instance easily in V8 without attribute transition?
        // Actually it does via getScale: [x, y, z] if we use a unit cube.
        getScale: (d: VoxelBounds) => [d.size.width, d.size.depth, d.size.height],
        getColor: layerProps?.getColor || [255, 255, 255],
        opacity: layerProps?.opacity ?? 1.0,
        pickable: true,
        wireframe: layerProps?.wireframe || false,
        getTranslation: layerProps?.offset || [0, 0, 0], // For z-fighting prevention
        parameters: { depthTest: true, polygonOffset: [1, 1] }, // Use normal depth testing
        ...layerProps
    });

    return [layer];
}
