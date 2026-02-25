import React, { useState, useEffect } from 'react';
import { VoxelViewerCore, type LayerConfig } from 'spatial-id-terrain-voxelizer';
import { type UILocaleType } from './locale';

interface LayerManagerProps {
    core: VoxelViewerCore;
    locale: UILocaleType;
}

export const LayerManager: React.FC<LayerManagerProps> = ({ core, locale }) => {
    // レイヤーが変更されたときに再レンダリングするため、coreの状態をサブスクライブします
    const [state, setState] = useState(() => core.getState());
    const [activeTab, setActiveTab] = useState<'layers' | 'compare'>('layers');
    const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);

    const [modalForm, setModalForm] = useState<Partial<LayerConfig>>({});

    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const unsubscribe = core.onUpdate((newState: any) => {
            setState({ ...newState });
        });
        return unsubscribe;
    }, [core]);

    const handleDragStart = (e: React.DragEvent, index: number) => {
        e.dataTransfer.setData('text/plain', index.toString());
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        const dragIndexStr = e.dataTransfer.getData('text/plain');
        if (!dragIndexStr) return;
        const dragIndex = parseInt(dragIndexStr, 10);
        if (dragIndex !== dropIndex) {
            core.reorderLayer(dragIndex, dropIndex);
        }
    };

    const openModal = (layer?: LayerConfig) => {
        if (layer) {
            setEditingLayerId(layer.id);
            setModalForm({ ...layer });
        } else {
            setEditingLayerId(null);
            setModalForm({
                name: 'New Layer',
                sourceUrl: 'https://cyberjapandata.gsi.go.jp/xyz/dem_png/{z}/{x}/{y}.png',
                opacity: 0.5,
                color: [255, 150, 100],
                colorMode: 'solid',
                elevationAggregation: 'max'
            });
        }
        setShowModal(true);
    };

    const saveModal = () => {
        if (!modalForm.name || !modalForm.sourceUrl) {
            alert(locale.modalAlertRequired);
            return;
        }

        if (editingLayerId) {
            core.updateLayer(editingLayerId, modalForm);
        } else {
            const newId = 'layer-' + Math.random().toString(36).substr(2, 9);
            core.addLayer({
                ...(modalForm as unknown as LayerConfig),
                id: newId,
                visible: true
            });
        }
        setShowModal(false);
    };

    const updateModalField = (field: keyof LayerConfig, value: unknown) => {
        setModalForm((prev: Partial<LayerConfig>) => ({ ...prev, [field]: value }));
    };

    const updateColor = (index: number, value: number) => {
        const currentColor = modalForm.color || [255, 255, 255];
        const newColor = [...currentColor] as [number, number, number];
        newColor[index] = value;
        setModalForm((prev: Partial<LayerConfig>) => ({ ...prev, color: newColor }));
    };

    return (
        <div style={{
            position: 'absolute', top: 10, left: 10, width: 320,
            background: 'white', borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            zIndex: 1000, fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column',
            maxHeight: 'calc(100vh - 20px)'
        }}>
            <div style={{ display: 'flex', borderBottom: '1px solid #eee' }}>
                <button
                    onClick={() => {
                        setActiveTab('layers');
                        if (state.isCompareMode) core.setCompareMode(false);
                    }}
                    style={{ flex: 1, padding: '10px', background: activeTab === 'layers' ? 'white' : '#f5f5f5', border: 'none', borderBottom: activeTab === 'layers' ? '2px solid #007bff' : '2px solid transparent', fontWeight: activeTab === 'layers' ? 'bold' : 'normal', cursor: 'pointer', borderRadius: '8px 0 0 0' }}
                >
                    {locale.tabLayers}
                </button>
                <button
                    onClick={() => setActiveTab('compare')}
                    style={{ flex: 1, padding: '10px', background: activeTab === 'compare' ? 'white' : '#f5f5f5', border: 'none', borderBottom: activeTab === 'compare' ? '2px solid #007bff' : '2px solid transparent', fontWeight: activeTab === 'compare' ? 'bold' : 'normal', cursor: 'pointer', borderRadius: '0 8px 0 0' }}
                >
                    {locale.tabCompare}
                </button>
            </div>

            <div style={{ padding: '10px 15px', borderBottom: '1px dashed #ddd' }}>
                <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.85em', marginBottom: '4px', color: '#555' }} title={locale.resolutionOffsetTitle}>
                    {locale.resolutionOffsetLabel}
                </label>
                <select
                    value={state.resolutionOffset}
                    onChange={(e) => core.setResolutionOffset(parseInt(e.target.value, 10))}
                    style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.9em' }}
                >
                    <option value={0}>Lowest (+0)</option>
                    <option value={2}>Low (+2)</option>
                    <option value={4}>Standard (+4)</option>
                    <option value={6}>High (+6)</option>
                    <option value={8}>Highest (+8)</option>
                </select>
            </div>

            <div style={{ padding: '15px', overflowY: 'auto', flex: 1 }}>
                {activeTab === 'layers' && (
                    <div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px' }}>
                            {[...state.layers].reverse().map((layer, reverseIdx) => {
                                const idx = state.layers.length - 1 - reverseIdx;
                                return (
                                    <div
                                        key={layer.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, idx)}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, idx)}
                                        style={{ display: 'flex', alignItems: 'center', background: '#f8f9fa', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', cursor: 'move' }}
                                    >
                                        <div style={{ padding: '0 8px', color: '#999' }}>⋮⋮</div>
                                        <input
                                            type="checkbox"
                                            checked={layer.visible}
                                            onChange={(e) => core.updateLayer(layer.id, { visible: e.target.checked })}
                                            style={{ cursor: 'pointer', marginRight: '8px' }}
                                        />
                                        <div
                                            style={{ flex: 1, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', fontSize: '0.9em', cursor: 'pointer' }}
                                            onDoubleClick={() => openModal(layer)}
                                        >
                                            {layer.name}
                                        </div>
                                        <button
                                            onClick={() => openModal(layer)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}
                                        >
                                            ⚙️
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                        <button
                            onClick={() => openModal()}
                            style={{ width: '100%', padding: '8px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            {locale.addLayerBtn}
                        </button>
                    </div>
                )}

                {activeTab === 'compare' && (
                    <div>
                        <div style={{ marginBottom: '15px', padding: '10px', background: state.isCompareMode ? '#e8f4fd' : '#f8f9fa', borderRadius: '4px', border: state.isCompareMode ? '1px solid #b8daff' : '1px solid #ddd' }}>
                            <div style={{ marginBottom: '10px' }}>
                                <label style={{ display: 'block', fontSize: '0.85em', fontWeight: 'bold', marginBottom: '4px', color: '#555' }}>Base Layer (Before)</label>
                                <select
                                    style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
                                    value={state.baseLayerId || ''}
                                    onChange={(e) => core.setBaseLayerId(e.target.value)}
                                    disabled={state.isCompareMode}
                                >
                                    {state.layers.map((l: LayerConfig) => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                            </div>
                            <div style={{ marginBottom: '10px' }}>
                                <label style={{ display: 'block', fontSize: '0.85em', fontWeight: 'bold', marginBottom: '4px', color: '#555' }}>Target Layer (After)</label>
                                <select
                                    style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
                                    value={state.targetLayerId || ''}
                                    onChange={(e) => core.setTargetLayerId(e.target.value)}
                                    disabled={state.isCompareMode}
                                >
                                    {state.layers.map((l: LayerConfig) => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                            </div>
                            <button
                                onClick={() => core.setCompareMode(!state.isCompareMode)}
                                style={{
                                    width: '100%', padding: '8px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold',
                                    background: state.isCompareMode ? '#dc3545' : '#28a745', color: 'white'
                                }}
                            >
                                {state.isCompareMode ? locale.compareModeEndBtn : locale.compareModeStartBtn}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {showModal && (
                <div
                    onClick={() => setShowModal(false)}
                    style={{
                        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                        background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center'
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{ background: 'white', padding: '20px', borderRadius: '8px', width: '400px', maxWidth: '90%', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
                    >
                        <h3 style={{ marginTop: 0, borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
                            {locale.modalTitleProperties}
                        </h3>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.9em', marginBottom: '4px' }}>{locale.modalLabelName}</label>
                            <input
                                type="text"
                                value={modalForm.name || ''}
                                onChange={(e) => updateModalField('name', e.target.value)}
                                style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                            />
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.9em', marginBottom: '4px' }}>{locale.modalLabelURL}</label>
                            <input
                                type="text"
                                value={modalForm.sourceUrl || ''}
                                onChange={(e) => updateModalField('sourceUrl', e.target.value)}
                                style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.8em', boxSizing: 'border-box' }}
                            />
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.9em', marginBottom: '4px' }}>{locale.modalLabelColorMode}</label>
                            <select
                                value={modalForm.colorMode || 'solid'}
                                onChange={(e) => updateModalField('colorMode', e.target.value)}
                                style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
                            >
                                <option value="solid">{locale.modalColorModeSolid}</option>
                                <option value="elevation">{locale.modalColorModeElevation}</option>
                            </select>
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.9em', marginBottom: '4px' }}>{locale.modalLabelAggregation}</label>
                            <select
                                value={modalForm.elevationAggregation || 'max'}
                                onChange={(e) => updateModalField('elevationAggregation', e.target.value)}
                                style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
                            >
                                <option value="max">{locale.modalAggMax}</option>
                                <option value="avg">{locale.modalAggAvg}</option>
                                <option value="min">{locale.modalAggMin}</option>
                            </select>
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9em', fontWeight: 'bold', marginBottom: '4px' }}>
                                <label>{locale.modalLabelOpacity}</label>
                                <span>{Math.round((modalForm.opacity || 0) * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0" max="1" step="0.1"
                                value={modalForm.opacity || 0}
                                onChange={(e) => updateModalField('opacity', parseFloat(e.target.value))}
                                style={{ width: '100%' }}
                            />
                        </div>

                        {modalForm.colorMode !== 'elevation' && (
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.9em', marginBottom: '4px' }}>{locale.modalLabelColor}</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <div style={{ flex: 1 }}><div style={{ fontSize: '0.8em', textAlign: 'center', color: '#666' }}>R</div><input type="number" value={modalForm.color?.[0] || 0} onChange={(e) => updateColor(0, parseInt(e.target.value))} min="0" max="255" style={{ width: '100%', padding: '4px', textAlign: 'center', boxSizing: 'border-box' }} /></div>
                                    <div style={{ flex: 1 }}><div style={{ fontSize: '0.8em', textAlign: 'center', color: '#666' }}>G</div><input type="number" value={modalForm.color?.[1] || 0} onChange={(e) => updateColor(1, parseInt(e.target.value))} min="0" max="255" style={{ width: '100%', padding: '4px', textAlign: 'center', boxSizing: 'border-box' }} /></div>
                                    <div style={{ flex: 1 }}><div style={{ fontSize: '0.8em', textAlign: 'center', color: '#666' }}>B</div><input type="number" value={modalForm.color?.[2] || 0} onChange={(e) => updateColor(2, parseInt(e.target.value))} min="0" max="255" style={{ width: '100%', padding: '4px', textAlign: 'center', boxSizing: 'border-box' }} /></div>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid #ccc' }}>
                            {editingLayerId ? (
                                <button
                                    onClick={() => {
                                        if (confirm(locale.modalConfirmDelete)) {
                                            core.removeLayer(editingLayerId);
                                            setShowModal(false);
                                        }
                                    }}
                                    style={{ padding: '8px 16px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                >
                                    {locale.modalBtnDelete}
                                </button>
                            ) : (
                                <div></div>
                            )}
                            <div>
                                <button
                                    onClick={() => setShowModal(false)}
                                    style={{ padding: '8px 16px', background: '#e0e0e0', color: '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '8px' }}
                                >
                                    {locale.modalBtnCancel}
                                </button>
                                <button
                                    onClick={saveModal}
                                    style={{ padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                >
                                    {locale.modalBtnSave}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
