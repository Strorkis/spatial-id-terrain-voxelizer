import { type IControl, Map as MapGL } from 'maplibre-gl';
import { VoxelViewerCore, getUnitHeight } from 'spatial-id-terrain-voxelizer';

export interface ElevationLegendControlOptions {
    core: VoxelViewerCore;
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export class ElevationLegendControl implements IControl {
    private core: VoxelViewerCore;
    private container: HTMLDivElement;
    private unsubscribe: (() => void) | null = null;

    constructor(options: ElevationLegendControlOptions) {
        this.core = options.core;
        this.container = document.createElement('div');
        this.container.className = 'maplibregl-ctrl maplibregl-ctrl-group elevation-legend-control';
        this.container.style.cssText = `
            background: rgba(255, 255, 255, 0.9);
            padding: 10px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            font-family: sans-serif;
            pointer-events: auto;
        `;
    }

    public onAdd(_map: MapGL): HTMLElement {
        this.unsubscribe = this.core.onUpdate(() => this.render());
        return this.container;
    }

    public onRemove(): void {
        if (this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        if (this.unsubscribe) this.unsubscribe();
    }

    private render() {
        const state = this.core.getState();

        if (state.isCompareMode) {
            const unitHeight = getUnitHeight(state.currentZ);
            const maxDiffMeters = (20 * unitHeight).toFixed(1);

            this.container.innerHTML = `
                <h4 style="margin: 0 0 8px 0; font-size: 14px; text-align: center;">${this.core.locale.legendTitleDiff}</h4>
                <div style="display: flex; align-items: center; justify-content: center;">
                    <div style="width: 15px; height: 150px; background: linear-gradient(to top, rgba(0,0,255,0.8) 0%, rgba(255,255,255,0.8) 50%, rgba(255,0,0,0.8) 100%); margin-right: 10px; border-radius: 2px;"></div>
                    <div style="height: 150px; display: flex; flex-direction: column; justify-content: space-between; font-size: 12px;">
                        <span style="color: red; font-weight: bold;">+20 ${this.core.locale.legendDiffVoxelSuffix} (+${maxDiffMeters}m)</span>
                        <span style="color: #666;">${this.core.locale.legendDiffNone}</span>
                        <span style="color: blue; font-weight: bold;">-20 ${this.core.locale.legendDiffVoxelSuffix} (-${maxDiffMeters}m)</span>
                    </div>
                </div>
            `;
        } else {
            this.container.innerHTML = `
                <h4 style="margin: 0 0 8px 0; font-size: 14px; text-align: center;">${this.core.locale.legendTitleElevation}</h4>
                <div style="display: flex; flex-direction: column-reverse; align-items: center;">
                    <div style="display: flex; align-items: center;">
                        <div style="width: 15px; height: 150px; background: linear-gradient(to top, rgb(0, 100, 255), rgb(255, 100, 0)); margin-right: 10px;"></div>
                        <div style="height: 150px; display: flex; flex-direction: column; justify-content: space-between; font-size: 12px;">
                            <span>4000</span>
                            <span>3000</span>
                            <span>2000</span>
                            <span>1000</span>
                            <span>0</span>
                        </div>
                    </div>
                </div>
            `;
        }
    }
}
