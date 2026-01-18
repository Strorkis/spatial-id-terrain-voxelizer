import React, { useState } from 'react';

interface VoxelConfigPanelProps {
    voxelOpacity: number;
    setVoxelOpacity: (opacity: number) => void;
    resolutionOffset: number;
    setResolutionOffset: (offset: number) => void;
}

export const VoxelConfigPanel: React.FC<VoxelConfigPanelProps> = ({
    voxelOpacity,
    setVoxelOpacity,
    resolutionOffset,
    setResolutionOffset,
}) => {
    const [isConfigOpen, setIsConfigOpen] = useState(true);

    return (
        <div className="voxel-config-panel voxel-ui-container">
            <div
                className={`voxel-config-header ${!isConfigOpen ? 'closed' : ''}`}
                onClick={() => setIsConfigOpen(!isConfigOpen)}
            >
                <h3 style={{ margin: 0, fontSize: '16px' }}>
                    ボクセル設定
                </h3>
                <span style={{ fontSize: '12px', userSelect: 'none' }}>
                    {isConfigOpen ? '▼' : '▲'}
                </span>
            </div>

            {isConfigOpen && (
                <>
                    {/* Opacity Slider */}
                    <div className="voxel-control-group">
                        <div className="voxel-control-label">不透明度: {voxelOpacity.toFixed(2)}</div>
                        <input
                            type="range"
                            min="0.1"
                            max="1.0"
                            step="0.1"
                            value={voxelOpacity}
                            onChange={(e) => setVoxelOpacity(parseFloat(e.target.value))}
                            style={{ width: '100%' }}
                        />
                    </div>

                    {/* Resolution Selector */}
                    <div>
                        <div className="voxel-control-label">詳細度 (Zoom Offset)</div>
                        <select
                            value={resolutionOffset}
                            onChange={(e) => setResolutionOffset(parseInt(e.target.value))}
                            style={{ width: '100%', padding: '4px' }}
                        >
                            <option value={0}>最低 (+0)</option>
                            <option value={2}>低 (+2)</option>
                            <option value={4}>標準 (+4)</option>
                            <option value={6}>高 (+6)</option>
                            <option value={8}>最高 (+8)</option>
                        </select>
                    </div>
                </>
            )}
        </div>
    );
};
