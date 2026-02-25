import { VoxelBounds } from '../utils/spatialId';
import { generateVoxelsForBounds, type IDEMBounds } from '../utils/voxelGenerator';
import { createVoxelLayers } from '../layers/VoxelLayer';
import { LayerConfig, VoxelViewerLocale, enLocale } from './types';

export interface ViewerCoreState {
    layers: LayerConfig[];
    isCompareMode: boolean;
    baseLayerId: string;
    targetLayerId: string;
    resolutionOffset: number;
    currentZ: number;
}

export type ViewerUpdateCallback = (state: ViewerCoreState) => void;

export class VoxelViewerCore {
    private layers: LayerConfig[] = [];
    private layerVoxels: Record<string, VoxelBounds[]> = {};

    // Compare Mode State
    private isCompareMode: boolean = false;
    private baseLayerId: string = '';
    private targetLayerId: string = '';

    private resolutionOffset: number = 4;
    private currentZ: number = 10;

    // Cache last bounds to automatically fetch data on layer visibility toggle
    private lastBounds: IDEMBounds | null = null;
    private lastZoom: number | null = null;

    // Listeners
    private updateListeners: ViewerUpdateCallback[] = [];

    // Locale
    public locale: VoxelViewerLocale;

    constructor(initialLayers?: LayerConfig[], localeOptions?: Partial<VoxelViewerLocale>) {
        if (initialLayers) {
            this.layers = initialLayers;
            if (this.layers.length > 0) {
                this.baseLayerId = this.layers[0].id;
                this.targetLayerId = this.layers.length > 1 ? this.layers[1].id : this.layers[0].id;
            }
        }
        this.locale = { ...enLocale, ...localeOptions };
    }

    public setLocale(localeOptions: Partial<VoxelViewerLocale>) {
        this.locale = { ...this.locale, ...localeOptions };
        this.emitUpdate();
    }

    public onUpdate(callback: ViewerUpdateCallback) {
        this.updateListeners.push(callback);
        // Initial call
        callback(this.getState());
        return () => {
            this.updateListeners = this.updateListeners.filter(cb => cb !== callback);
        };
    }

    private emitUpdate() {
        const state = this.getState();
        for (const listener of this.updateListeners) {
            listener(state);
        }
    }

    public getState(): ViewerCoreState {
        return {
            layers: [...this.layers],
            isCompareMode: this.isCompareMode,
            baseLayerId: this.baseLayerId,
            targetLayerId: this.targetLayerId,
            resolutionOffset: this.resolutionOffset,
            currentZ: this.currentZ
        };
    }

    public getLayerVoxels() {
        return this.layerVoxels;
    }

    // --- State Updaters ---

    public setLayers(layers: LayerConfig[]) {
        this.layers = layers;
        this.emitUpdate();
    }

    public addLayer(layer: LayerConfig) {
        this.layers.push(layer);
        this.emitUpdate();

        if (layer.visible && this.lastBounds && this.lastZoom !== null) {
            this.generateVoxels(this.lastBounds, this.lastZoom);
        }
    }

    public reorderLayer(fromIndex: number, toIndex: number) {
        if (fromIndex < 0 || fromIndex >= this.layers.length) return;
        if (toIndex < 0 || toIndex >= this.layers.length) return;

        const [moved] = this.layers.splice(fromIndex, 1);
        this.layers.splice(toIndex, 0, moved);
        this.emitUpdate();
    }

    public async updateLayer(id: string, updates: Partial<LayerConfig>) {
        const oldLayer = this.layers.find(l => l.id === id);
        this.layers = this.layers.map(l => l.id === id ? { ...l, ...updates } : l);
        this.emitUpdate();

        if (!oldLayer || !this.lastBounds || this.lastZoom === null) return;

        const isNewlyVisible = updates.visible === true && !oldLayer.visible;
        const urlChanged = updates.sourceUrl !== undefined && updates.sourceUrl !== oldLayer.sourceUrl;
        const aggChanged = updates.elevationAggregation !== undefined && updates.elevationAggregation !== oldLayer.elevationAggregation;
        const formatChanged = updates.demFormat !== undefined && updates.demFormat !== oldLayer.demFormat;

        const isCurrentlyVisible = this.layers.find(l => l.id === id)?.visible;

        if (isNewlyVisible || ((urlChanged || aggChanged || formatChanged) && isCurrentlyVisible)) {
            // Force re-generation
            if (urlChanged || aggChanged || formatChanged) {
                // clear cache for this layer so it fetches fresh data
                delete this.layerVoxels[id];
            }
            await this.generateVoxels(this.lastBounds, this.lastZoom);
        }
    }

    public removeLayer(id: string) {
        this.layers = this.layers.filter(l => l.id !== id);
        // Clean up voxels to save memory
        if (this.layerVoxels[id]) {
            delete this.layerVoxels[id];
        }
        this.emitUpdate();
    }

    public async setCompareMode(enabled: boolean) {
        if (this.isCompareMode === enabled) return;
        this.isCompareMode = enabled;
        this.emitUpdate();
        if (enabled && this.lastBounds && this.lastZoom !== null) {
            await this.generateVoxels(this.lastBounds, this.lastZoom);
        }
    }

    public async setBaseLayerId(id: string) {
        if (this.baseLayerId === id) return;
        this.baseLayerId = id;
        this.emitUpdate();
        if (this.isCompareMode && this.lastBounds && this.lastZoom !== null) {
            await this.generateVoxels(this.lastBounds, this.lastZoom);
        }
    }

    public async setTargetLayerId(id: string) {
        if (this.targetLayerId === id) return;
        this.targetLayerId = id;
        this.emitUpdate();
        if (this.isCompareMode && this.lastBounds && this.lastZoom !== null) {
            await this.generateVoxels(this.lastBounds, this.lastZoom);
        }
    }

    public async setResolutionOffset(offset: number) {
        if (this.resolutionOffset === offset) return;
        this.resolutionOffset = offset;
        this.emitUpdate();
        if (this.lastBounds && this.lastZoom !== null) {
            await this.generateVoxels(this.lastBounds, this.lastZoom);
        }
    }

    // --- Core Logic ---

    public async generateVoxels(bounds: IDEMBounds, zoom: number) {
        this.lastBounds = bounds;
        this.lastZoom = zoom;

        const resolutionZ = Math.min(22, Math.floor(zoom) + this.resolutionOffset);
        const targetZ = Math.max(10, resolutionZ);
        this.currentZ = targetZ;

        console.log(`[VoxelViewerCore] Generating for Zoom: ${zoom.toFixed(2)} -> Z${targetZ}`);

        const newLayerVoxels: Record<string, VoxelBounds[]> = {};

        // Generate for visible layers (or those needed for comparison)
        await Promise.all(this.layers.map(async (layer) => {
            // Include if visible normally, OR if it's the base layer in compare mode (even if visibility is off in UI, we need it to compare)
            const isBaseInCompare = this.isCompareMode && layer.id === this.baseLayerId;
            const needsGeneration = layer.visible || isBaseInCompare;

            if (!needsGeneration) return;

            const voxels = await generateVoxelsForBounds(
                bounds,
                targetZ,
                zoom,
                layer.sourceUrl,
                layer.elevationAggregation || 'max',
                layer.demFormat || 'gsi'
            );
            newLayerVoxels[layer.id] = voxels;
        }));

        this.layerVoxels = newLayerVoxels;
        this.emitUpdate(); // Voxel generation affects deckLayers, so emit
    }

    public getDeckLayers() {
        // Height Map Difference Lookup (using Spatial ID 'f' value)
        let baseFMap: Map<string, number> | null = null;

        if (this.isCompareMode && this.baseLayerId && this.layerVoxels[this.baseLayerId]) {
            baseFMap = new Map<string, number>();
            for (const v of this.layerVoxels[this.baseLayerId]) {
                const { z, x, y, f } = v.originalId;
                const key = `${z}/${x}/${y}`;
                const existingF = baseFMap.get(key);
                if (existingF === undefined || f > existingF) {
                    baseFMap.set(key, f);
                }
            }
        }

        return this.layers.flatMap(layer => {
            if (!layer.visible || !this.layerVoxels[layer.id]) return [];

            const isTarget = this.isCompareMode && layer.id === this.targetLayerId;

            let layerProps: any = {
                opacity: layer.opacity,
                getColor: layer.color
            };

            if (this.isCompareMode) {
                if (isTarget && baseFMap) {
                    // Color map comparing Target vs Base
                    layerProps = {
                        opacity: 0.9,
                        // Custom color logic
                        getColor: (d: any) => {
                            const { z, x, y, f } = d.originalId;
                            const baseF = baseFMap!.get(`${z}/${x}/${y}`); // Need ! because TS doesn't know it's not null here
                            if (baseF === undefined) return [150, 150, 150]; // Gray if no base available

                            const diffSteps = f - baseF;

                            // Emphasize small differences:
                            // We want a diff of 1 to immediately stand out.
                            // We'll use a logarithmic or root-like curve to scale intensity.
                            const maxDiff = 20;
                            const absDiff = Math.abs(diffSteps);

                            if (absDiff > 0) {
                                // Maps 1 to ~0.3 (30%), 20 to 1.0 (100%)
                                const t = Math.min(1.0, Math.log10(absDiff + 1) / Math.log10(maxDiff + 1));
                                const intensity = Math.round(t * 255);

                                if (diffSteps > 0) {
                                    return [255, 255 - intensity, 255 - intensity]; // Red hue
                                } else {
                                    return [255 - intensity, 255 - intensity, 255]; // Blue hue
                                }
                            }
                            // No difference
                            return [240, 240, 240];
                        }
                    };
                } else {
                    // Hide base and other layers to show only the color map
                    return [];
                }
            } else if (layer.colorMode === 'elevation') {
                layerProps = {
                    ...layerProps,
                    getColor: (d: any) => {
                        const h = d.center.alt;
                        // Map 0 - 4000m to rgb(0, 100, 255) -> rgb(255, 100, 0)
                        const t = Math.max(0, Math.min(1, h / 4000));
                        return [
                            Math.round(0 + t * 255),
                            100,
                            Math.round(255 - t * 255)
                        ];
                    }
                };
            }

            return createVoxelLayers({
                voxels: this.layerVoxels[layer.id],
                layerProps
            });
        });
    }

    public getTooltipHTML(object: any): { html: string; style: any } | null {
        if (!object) return null;
        const { z, f, x, y } = object.originalId;
        const { alt } = object.center;

        let diffHtml = '';
        if (this.isCompareMode && this.baseLayerId && this.layerVoxels[this.baseLayerId]) {
            const baseVoxels = this.layerVoxels[this.baseLayerId];
            const baseVoxel = baseVoxels.find(v => v.originalId.x === x && v.originalId.y === y && v.originalId.z === z);

            if (baseVoxel) {
                const diff = f - baseVoxel.originalId.f;
                const diffStr = diff > 0 ? `+${diff}` : `${diff}`;
                const diffColor = diff > 0 ? 'red' : diff < 0 ? 'blue' : 'gray';
                diffHtml = `<br/><span style="color:${diffColor};font-weight:bold;">Diff: ${diffStr} ${this.locale.legendDiffVoxelSuffix}</span>`;
            }
        }

        return {
            html: `<div><b>ID:</b> ${z}/${f}/${x}/${y}<br/><b>H:</b> ${alt.toFixed(1)}m${diffHtml}</div>`,
            style: { backgroundColor: '#fff', color: '#000', fontSize: '0.8em', padding: '4px' }
        };
    }
}
