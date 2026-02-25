import { useRef, useMemo } from 'react';
import Map, { NavigationControl, ScaleControl, type MapRef } from 'react-map-gl/maplibre';
import maplibregl, { type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import {
    useTerrainVoxelizer,
    MapOverlay,
    type LayerConfig
} from 'spatial-id-terrain-voxelizer/react';
import { type VoxelViewerCore, jaLocale, enLocale } from 'spatial-id-terrain-voxelizer';
import { useControl } from 'react-map-gl/maplibre';
import { LayerManager } from './LayerManager';
import { ElevationLegendControl } from './ElevationLegendControl';
import { type UILocaleType, jaUILocale, enUILocale } from './locale';
import { useState } from 'react';

function VoxelControl({ core }: { core: VoxelViewerCore }) {
    useControl(() => new ElevationLegendControl({ core }), { position: 'bottom-left' });
    return null;
}
import { gsiTerrainProtocol } from '../utils/gsiTerrainProtocol';

if (maplibregl.addProtocol) {
    try {
        if (!maplibregl.addProtocol.toString().includes('gsi-terrain')) {
            maplibregl.addProtocol('gsi-terrain', gsiTerrainProtocol);
        }
    } catch (e) {
        console.warn('Failed to add protocol', e);
    }
}

const INITIAL_VIEW_STATE = {
    longitude: 138.7278,
    latitude: 35.3606,
    zoom: 13,
    pitch: 60,
    bearing: 0
};

// 地理院標準ラスタースタイル (言語に応じて動的に変更)
const getMapStyle = (lang: 'en' | 'ja', uilocale: UILocaleType): StyleSpecification => ({
    version: 8,
    sources: {
        'gsi-std': {
            type: 'raster',
            tiles: [
                lang === 'en'
                    ? 'https://cyberjapandata.gsi.go.jp/xyz/english/{z}/{x}/{y}.png'
                    : 'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution: uilocale.mapAttribution
        }
    },
    layers: [{
        id: 'gsi-std-layer',
        type: 'raster',
        source: 'gsi-std',
        minzoom: 0,
        maxzoom: 18
    }]
});

export default function MapComponent() {
    const [lang, setLang] = useState<'en' | 'ja'>('ja');
    const uilocale = lang === 'en' ? enUILocale : jaUILocale;
    const coreLocale = lang === 'en' ? enLocale : jaLocale;

    const mapRef = useRef<MapRef>(null);

    // 言語変更時にベースレイヤーを動的に更新 (言語変更で再計算)
    const initialLayers: LayerConfig[] = useMemo(() => [
        {
            id: 'gsi-dem-10m',
            name: uilocale.layerDem10m,
            sourceUrl: 'https://cyberjapandata.gsi.go.jp/xyz/dem_png/{z}/{x}/{y}.png',
            visible: true,
            color: [100, 200, 255],
            opacity: 0.5,
            colorMode: 'elevation'
        },
        {
            id: 'gsi-dem-5m',
            name: uilocale.layerDem5m,
            sourceUrl: 'https://cyberjapandata.gsi.go.jp/xyz/dem5a_png/{z}/{x}/{y}.png',
            visible: true,
            color: [255, 150, 100],
            opacity: 0.5,
            colorMode: 'elevation'
        }
    ], [uilocale]);



    // useTerrainVoxelizer フックを使用し、MapLibreの描画状態と同期してボクセルを生成します
    // 戻り値として、状態管理を行う core インスタンスと、手動生成用の関数 generateVoxels を受け取ります
    const { core, generateVoxels } = useTerrainVoxelizer(mapRef, initialLayers, coreLocale);

    const mapStyle = useMemo(() => getMapStyle(lang, uilocale), [lang, uilocale]);

    // 言語トグル変更時にロケールを動的に更新し、イベントを発火させる
    useMemo(() => {
        core.setLocale(coreLocale);
    }, [coreLocale, core]);

    // Core内部の状態から、Deck.glで描画するためのレイヤー群（SolidLayer, ElevationLayer含む）を取得します
    const deckLayers = core.getDeckLayers();

    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
            <Map
                ref={mapRef}
                initialViewState={INITIAL_VIEW_STATE}
                mapStyle={mapStyle}
                style={{ width: '100%', height: '100%' }}
                onMoveEnd={(e) => generateVoxels(e.viewState.zoom)}
                onStyleData={(e) => {
                    const map = e.target;
                    // スタイル変更時（言語切り替え等）に、MapLibreによってカスタムソース/レイヤーが削除されることがあります。
                    // そのため、地形ソースを再追加し、地形を設定し直す必要があります。
                    try {
                        if (!map.getSource('gsi-terrain-source')) {
                            // カスタムプロトコルを使用して地理院地形ソースを追加
                            map.addSource('gsi-terrain-source', {
                                type: 'raster-dem',
                                tiles: ['gsi-terrain://{z}/{x}/{y}.png'],
                                tileSize: 256,
                                attribution: uilocale.mapAttribution,
                                maxzoom: 15
                            });
                        }
                        // スタイル変更時に地形が外れることがあるため、常に地形が適用されることを保証する
                        if (!map.getTerrain()) {
                            map.setTerrain({ source: 'gsi-terrain-source', exaggeration: 1.0 });
                        }
                    } catch {
                        // スタイルの準備が完全に整っていない場合のエラーは無視する
                    }
                }}
                onLoad={(e) => {
                    generateVoxels(e.target.getZoom());
                }}
            >
                <NavigationControl position="top-right" />
                <ScaleControl position="bottom-left" />
                <VoxelControl core={core} />

                <LayerManager core={core} locale={uilocale} />

                <div style={{ position: 'absolute', top: 10, right: 50, zIndex: 1000 }}>
                    <select
                        value={lang}
                        onChange={(e) => {
                            setLang(e.target.value as 'en' | 'ja');
                            // ページをリロードせずにUIを即座に更新するため、
                            // core内の2つのデフォルトレイヤーの名前を個別に更新します。
                            const uilocaleNew = e.target.value === 'en' ? enUILocale : jaUILocale;
                            core.updateLayer('gsi-dem-10m', { name: uilocaleNew.layerDem10m });
                            core.updateLayer('gsi-dem-5m', { name: uilocaleNew.layerDem5m });
                        }}
                        style={{
                            background: 'white',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            padding: '6px 10px',
                            fontSize: '0.9em',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            fontWeight: 'bold'
                        }}
                    >
                        <option value="ja">🇯🇵 JP</option>
                        <option value="en">🇺🇸 EN</option>
                    </select>
                </div>

                <MapOverlay
                    layers={deckLayers}
                    tooltip={(info: Record<string, unknown>) => core.getTooltipHTML((info as { object: unknown }).object)}
                />
            </Map>
        </div>
    );
}
