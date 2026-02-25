import { useControl } from 'react-map-gl/maplibre';
import { MapboxOverlay } from '@deck.gl/mapbox';
import type { Layer } from '@deck.gl/core';

interface MapOverlayProps {
    layers: Layer[];
    tooltip?: any;
}

export function MapOverlay({ layers, tooltip }: MapOverlayProps) {
    const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay({ interleaved: true }));

    overlay.setProps({
        layers,
        getTooltip: tooltip || (({ object }: any) => {
            if (!object) return null;
            // Default generic tooltip if object has originalId
            if (object.originalId) {
                const { z, f, x, y } = object.originalId;
                const { alt } = object.center;
                return {
                    html: `<div><b>ID:</b> ${z}/${f}/${x}/${y}<br/><b>H:</b> ${alt.toFixed(1)}m</div>`,
                    style: { backgroundColor: '#fff', color: '#000', fontSize: '0.8em', padding: '4px' }
                };
            }
            return null;
        })
    });

    return null;
}
