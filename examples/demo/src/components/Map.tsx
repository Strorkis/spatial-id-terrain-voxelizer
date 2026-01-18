import { useState, useRef } from 'react';
import Map, { NavigationControl, ScaleControl, type MapRef } from 'react-map-gl/maplibre';
import maplibregl, { type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import { useTerrainVoxelizer, VoxelOverlay } from 'spatial-id-terrain-voxelizer/react';

import { ElevationLegend } from './ui/ElevationLegend';
import { VoxelConfigPanel } from './ui/VoxelConfigPanel';
import { gsiTerrainProtocol } from '../utils/gsiTerrainProtocol';

// Register gsi-terrain protocol
if (maplibregl.addProtocol) {
    // Check if implicitly possible to check registration? No direct "hasProtocol" API.
    // addProtocol overwrites easily.
    try {
        maplibregl.addProtocol('gsi-terrain', gsiTerrainProtocol);
    } catch (e) {
        console.warn('Failed to add protocol', e);
    }
}

// Constants
const INITIAL_VIEW_STATE = {
    longitude: 138.7278,
    latitude: 35.3606,
    zoom: 13,
    pitch: 60,
    bearing: 0
};

// GSI Standard Raster Style
const MAP_STYLE: StyleSpecification = {
    version: 8,
    sources: {
        'gsi-std': {
            type: 'raster',
            tiles: ['https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>'
        }
    },
    layers: [{
        id: 'gsi-std-layer',
        type: 'raster',
        source: 'gsi-std',
        minzoom: 0,
        maxzoom: 18
    }]
};

export default function MapComponent() {
    const mapRef = useRef<MapRef>(null);

    const [voxelOpacity, setVoxelOpacity] = useState(0.5);
    const [resolutionOffset, setResolutionOffset] = useState(4);

    const URL_GSI = 'https://cyberjapandata.gsi.go.jp/xyz/dem_png/{z}/{x}/{y}.png';

    const { voxels, generateVoxels } = useTerrainVoxelizer(mapRef, {
        demTileUrl: URL_GSI,
        resolutionOffset
    });

    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
            <Map
                ref={mapRef}
                initialViewState={INITIAL_VIEW_STATE}
                mapStyle={MAP_STYLE}
                style={{ width: '100%', height: '100%' }}
                onMoveEnd={(e) => generateVoxels(e.viewState.zoom)}
                onLoad={(e) => {
                    const map = e.target;

                    // Add GSI Terrain Source using the custom protocol
                    if (!map.getSource('gsi-terrain-source')) {
                        map.addSource('gsi-terrain-source', {
                            type: 'raster-dem',
                            tiles: ['gsi-terrain://{z}/{x}/{y}.png'],
                            tileSize: 256,
                            attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>',
                            maxzoom: 15
                        });
                    }

                    // Set Terrain
                    map.setTerrain({ source: 'gsi-terrain-source', exaggeration: 1.0 });

                    generateVoxels(map.getZoom());
                }}
            >
                <NavigationControl position="top-right" />
                <ScaleControl position="bottom-left" />
                <VoxelOverlay
                    voxels={voxels}
                    layerProps={{
                        opacity: voxelOpacity,
                        visible: true,
                        getColor: (d: any) => {
                            const h = d.center.alt;
                            return [h / 4000 * 255, 100, 255 - h / 4000 * 255];
                        }
                    }}
                    tooltip={({ object }: any) => {
                        if (!object) return null;
                        const { z, f, x, y } = object.originalId;
                        return {
                            html: `<div style="padding:4px; font-size:0.8em">
                                     <b>Spatial ID</b><br/>${z}/${f}/${x}/${y}<br/>
                                     Height: ${object.center.alt.toFixed(1)}m
                                   </div>`
                        };
                    }}
                />
            </Map>

            <div className="overlay-container">
                <VoxelConfigPanel
                    voxelOpacity={voxelOpacity}
                    setVoxelOpacity={setVoxelOpacity}
                    resolutionOffset={resolutionOffset}
                    setResolutionOffset={setResolutionOffset}
                />
                <ElevationLegend />
            </div>
        </div>
    );
}
