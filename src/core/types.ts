export interface LayerConfig {
    id: string;
    name: string; // User-friendly name
    sourceUrl: string;
    visible: boolean;
    color: [number, number, number];
    opacity: number;
    colorMode?: 'solid' | 'elevation';
    elevationAggregation?: 'max' | 'avg' | 'min';
}

export interface VoxelViewerLocale {
    // Core (Tooltip)
    tooltipDiffPrefix: string;
    tooltipDiffSuffix: string;

    // UI - Legend
    legendTitleElevation: string;
    legendTitleDiff: string;
    legendDiffVoxelPrefix: string;
    legendDiffVoxelSuffix: string;
    legendDiffNone: string;
}

export const enLocale: VoxelViewerLocale = {
    tooltipDiffPrefix: 'Diff: ',
    tooltipDiffSuffix: ' voxels',

    legendTitleElevation: 'Elevation (m)',
    legendTitleDiff: 'Voxel Diff',
    legendDiffVoxelPrefix: '',
    legendDiffVoxelSuffix: ' voxels',
    legendDiffNone: '0 (No diff)'
};

export const jaLocale: VoxelViewerLocale = {
    tooltipDiffPrefix: 'Diff: ',
    tooltipDiffSuffix: ' ボクセル',

    legendTitleElevation: '標高 (m)',
    legendTitleDiff: 'ボクセル高低差',
    legendDiffVoxelPrefix: '',
    legendDiffVoxelSuffix: ' ボクセル',
    legendDiffNone: '0 (差分なし)'
};
