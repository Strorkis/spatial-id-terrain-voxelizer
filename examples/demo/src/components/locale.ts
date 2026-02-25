export interface UILocaleType {
    tabLayers: string;
    tabCompare: string;
    addLayerBtn: string;
    compareModeStartBtn: string;
    compareModeEndBtn: string;
    resolutionOffsetLabel: string;
    resolutionOffsetTitle: string;

    layerDem10m: string;
    layerDem5m: string;
    mapAttribution: string;

    modalTitleProperties: string;
    modalTitleNewLayer: string;
    modalLabelName: string;
    modalLabelURL: string;
    modalLabelColorMode: string;
    modalColorModeSolid: string;
    modalColorModeElevation: string;
    modalLabelAggregation: string;
    modalAggMax: string;
    modalAggAvg: string;
    modalAggMin: string;
    modalLabelOpacity: string;
    modalLabelColor: string;
    modalBtnDelete: string;
    modalBtnCancel: string;
    modalBtnSave: string;
    modalConfirmDelete: string;
    modalAlertRequired: string;
}

export const jaUILocale: UILocaleType = {
    tabLayers: 'レイヤー',
    tabCompare: '差分比較',
    addLayerBtn: '+ レイヤーを追加',
    compareModeStartBtn: '比較モードを開始',
    compareModeEndBtn: '比較モードを終了',
    resolutionOffsetLabel: '詳細度 (Zoom Offset)',
    resolutionOffsetTitle: '現在のマップズームに加算する空間IDズームの差分です',

    layerDem10m: '地理院タイル (DEM 10m)',
    layerDem5m: '地理院タイル (DEM 5A 5m)',
    mapAttribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>',

    modalTitleProperties: 'レイヤープロパティ',
    modalTitleNewLayer: '新規レイヤー追加',
    modalLabelName: 'レイヤー名',
    modalLabelURL: 'タイルURL (例: https://.../{z}/{x}/{y}.png)',
    modalLabelColorMode: 'カラーモード',
    modalColorModeSolid: '単色',
    modalColorModeElevation: '標高グラデーション',
    modalLabelAggregation: '標高集約モード',
    modalAggMax: '最大値',
    modalAggAvg: '平均値',
    modalAggMin: '最小値',
    modalLabelOpacity: '不透明度',
    modalLabelColor: '表示色 ※単色モード時',
    modalBtnDelete: 'レイヤー削除',
    modalBtnCancel: 'キャンセル',
    modalBtnSave: '保存',
    modalConfirmDelete: '本当に削除しますか？',
    modalAlertRequired: 'レイヤー名とURLは必須です。',
};

export const enUILocale: UILocaleType = {
    tabLayers: 'Layers',
    tabCompare: 'Compare',
    addLayerBtn: '+ Add Layer',
    compareModeStartBtn: 'Start Compare Mode',
    compareModeEndBtn: 'Exit Compare Mode',
    resolutionOffsetLabel: 'Detail Level (Zoom Offset)',
    resolutionOffsetTitle: 'Zoom offset added to the current map zoom for generating Voxels.',

    layerDem10m: 'GSI Tiles (DEM 10m)',
    layerDem5m: 'GSI Tiles (DEM 5A 5m)',
    mapAttribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">GSI Tiles</a>',

    modalTitleProperties: 'Layer Properties',
    modalTitleNewLayer: 'Add New Layer',
    modalLabelName: 'Layer Name',
    modalLabelURL: 'Tile URL (e.g., https://.../{z}/{x}/{y}.png)',
    modalLabelColorMode: 'Color Mode',
    modalColorModeSolid: 'Solid Color',
    modalColorModeElevation: 'Elevation Gradient',
    modalLabelAggregation: 'Elevation Aggregation',
    modalAggMax: 'Maximum',
    modalAggAvg: 'Average',
    modalAggMin: 'Minimum',
    modalLabelOpacity: 'Opacity',
    modalLabelColor: 'Display Color (Solid Mode)',
    modalBtnDelete: 'Delete Layer',
    modalBtnCancel: 'Cancel',
    modalBtnSave: 'Save',
    modalConfirmDelete: 'Are you sure you want to delete this layer?',
    modalAlertRequired: 'Layer Name and URL are required.',
};
