import React from 'react';

export const ElevationLegend: React.FC = () => {
    return (
        <div className="elevation-legend voxel-ui-container">
            <h4 style={{ margin: '0 0 8px 0' }}>標高 (m)</h4>
            <div style={{
                display: 'flex', flexDirection: 'column-reverse', alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: '15px', height: '150px', background: 'linear-gradient(to top, rgb(0, 100, 255), rgb(255, 100, 0))', marginRight: '5px' }}></div>
                    <div style={{ height: '150px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <span>4000</span>
                        <span>3000</span>
                        <span>2000</span>
                        <span>1000</span>
                        <span>0</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
