import React, { memo, useState, useMemo } from 'react';
import { NodeResizer } from '@xyflow/react';
import { Palette, Trash2, Check, Edit3, Layers } from 'lucide-react';
import { useStoryStore, isNodeInsideRegion } from '../store';
import { getTranslation } from '../i18n/translations';
import { REGION_COLORS } from '../graph/regionColors';

function hexToRgbTriplet(hex) {
  const clean = String(hex || '').replace('#', '').trim();
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
      return `${r}, ${g}, ${b}`;
    }
  }
  return '59, 130, 246';
}

function getColorMeta(colorHex) {
  const found = REGION_COLORS.find(
    (c) => c.hex.toLowerCase() === String(colorHex || '').toLowerCase()
  );
  if (found) return found;
  const rgb = hexToRgbTriplet(colorHex);
  return {
    id: 'custom',
    label: 'Акцент',
    hex: colorHex || '#3b82f6',
    rgb,
    border: `rgba(${rgb}, 0.5)`,
    rgba: `rgba(${rgb}, 0.12)`,
    headerBg: `linear-gradient(135deg, rgba(${rgb}, 0.92), rgba(${rgb}, 0.82))`
  };
}

const StoryRegionNode = memo(function StoryRegionNode({ id, data, selected }) {
  const updateRegion = useStoryStore((s) => s.updateRegion);
  const deleteRegion = useStoryStore((s) => s.deleteRegion);
  const nodes = useStoryStore((s) => s.nodes || []);
  const regions = useStoryStore((s) => s.regions || []);
  const language = useStoryStore((s) => s.language || 'ru');
  const t = getTranslation(language);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(data?.title || t.regions.defaultTitle);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const colorMeta = getColorMeta(data?.color);
  const regionTitle = data?.title || t.regions.defaultTitle;
  const order = data?.order || 1;

  const enclosedSceneCount = useMemo(() => {
    if (typeof data?.sceneCount === 'number') return data.sceneCount;
    const regObj = regions.find((r) => r.id === id) || {
      x: data?.x ?? 0,
      y: data?.y ?? 0,
      width: data?.width ?? 400,
      height: data?.height ?? 300
    };
    return (Array.isArray(nodes) ? nodes : []).filter((n) => isNodeInsideRegion(n, regObj)).length;
  }, [data?.height, data?.sceneCount, data?.width, data?.x, data?.y, id, nodes, regions]);

  const commitTitle = () => {
    const trimmed = titleInput.trim() || t.regions.defaultTitle;
    setTitleInput(trimmed);
    updateRegion(id, { title: trimmed });
    setIsEditingTitle(false);
  };

  return (
    <div
      className="sa-region-container"
      style={{
        '--color': colorMeta.rgb,
        '--region-color': colorMeta.hex,
        '--region-border': `rgba(${colorMeta.rgb}, 0.5)`,
        width: '100%',
        height: '100%',
        minWidth: 250,
        minHeight: 150,
        zIndex: 0,
        borderRadius: 16,
        border: '2px dashed rgba(var(--color), 0.5)',
        background: 'rgba(var(--color), 0.12)',
        boxShadow: selected
          ? `0 0 0 3px rgba(${colorMeta.rgb}, 0.35), inset 0 0 32px rgba(${colorMeta.rgb}, 0.14)`
          : `inset 0 0 24px rgba(${colorMeta.rgb}, 0.08)`,
        position: 'relative',
        boxSizing: 'border-box',
        pointerEvents: 'none',
        userSelect: 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s'
      }}
    >
      <NodeResizer
        minWidth={250}
        minHeight={150}
        isVisible={selected}
        lineStyle={{
          borderColor: colorMeta.hex,
          borderWidth: 2,
          pointerEvents: 'all'
        }}
        handleStyle={{
          width: 12,
          height: 12,
          borderRadius: 4,
          backgroundColor: colorMeta.hex,
          border: '2px solid #ffffff',
          pointerEvents: 'all'
        }}
        onResize={(_, params) => {
          if (params && Number.isFinite(params.width) && Number.isFinite(params.height)) {
            updateRegion(id, {
              x: Math.round(params.x),
              y: Math.round(params.y),
              width: Math.max(250, Math.round(params.width)),
              height: Math.max(150, Math.round(params.height)),
              resizing: true
            });
          }
        }}
        onResizeEnd={(_, params) => {
          if (params && Number.isFinite(params.width) && Number.isFinite(params.height)) {
            updateRegion(id, {
              x: Math.round(params.x),
              y: Math.round(params.y),
              width: Math.max(250, Math.round(params.width)),
              height: Math.max(150, Math.round(params.height)),
              resizing: false
            });
          }
        }}
      />

      {/* Контрастная сплошная шапка (Header) в стиле UE5 Comment Box */}
      <div
        className="sa-region-header"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          minHeight: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '6px 12px',
          borderRadius: '14px 14px 0 0',
          background: colorMeta.headerBg,
          borderBottom: `2px solid rgba(${colorMeta.rgb}, 0.65)`,
          color: '#ffffff',
          pointerEvents: 'all',
          cursor: 'grab',
          boxSizing: 'border-box',
          zIndex: 2,
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.22)'
        }}
        title={t.regions.headerTooltip}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2px 7px',
              borderRadius: 6,
              background: 'rgba(15, 23, 42, 0.45)',
              color: '#ffffff',
              fontSize: '0.72rem',
              fontWeight: 800,
              letterSpacing: '0.04em',
              flexShrink: 0
            }}
          >
            #{order}
          </span>

          {isEditingTitle ? (
            <div className="nodrag" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flex: 1 }}>
              <input
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') commitTitle();
                  if (e.key === 'Escape') {
                    setTitleInput(regionTitle);
                    setIsEditingTitle(false);
                  }
                }}
                onBlur={commitTitle}
                autoFocus
                placeholder={t.regions.placeholder}
                style={{
                  height: 30,
                  boxSizing: 'border-box',
                  padding: '0 8px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  borderRadius: 8,
                  border: '1px solid #ffffff',
                  background: 'rgba(15, 23, 42, 0.85)',
                  color: '#ffffff',
                  width: '100%',
                  maxWidth: 260
                }}
              />
              <button
                type="button"
                onClick={commitTitle}
                style={{
                  height: 30,
                  width: 30,
                  boxSizing: 'border-box',
                  background: '#ffffff',
                  color: colorMeta.hex,
                  border: 'none',
                  borderRadius: 8,
                  padding: 0,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title={t.regions.saveTitle}
              >
                <Check size={13} />
              </button>
            </div>
          ) : (
            <div
              onDoubleClick={(e) => {
                e.stopPropagation();
                setTitleInput(regionTitle);
                setIsEditingTitle(true);
              }}
              style={{
                fontWeight: 800,
                fontSize: '0.88rem',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flex: 1,
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.35)'
              }}
              title={t.regions.doubleClickRename}
            >
              {regionTitle}
            </div>
          )}

          {/* Счётчик вложенных сцен внутри области */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 999,
              background: 'rgba(15, 23, 42, 0.42)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#ffffff',
              fontSize: '0.71rem',
              fontWeight: 700,
              flexShrink: 0
            }}
          >
            <Layers size={11} />
            {t.regions.sceneCountBadge
              ? t.regions.sceneCountBadge(enclosedSceneCount)
              : `${enclosedSceneCount}`}
          </span>
        </div>

        {/* Палитра из 5 пастельных пресетов и управление */}
        <div className="nodrag" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginRight: 2 }}>
            {REGION_COLORS.map((c) => {
              const isActive = c.hex.toLowerCase() === colorMeta.hex.toLowerCase();
              const colorLabel = t.regions.colors[c.id] || c.label;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateRegion(id, { color: c.hex });
                    setShowColorPicker(false);
                  }}
                  title={colorLabel}
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    padding: 0,
                    background: c.hex,
                    border: isActive ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.45)',
                    boxShadow: isActive ? '0 0 0 2px rgba(15,23,42,0.5)' : 'none',
                    cursor: 'pointer'
                  }}
                />
              );
            })}
          </div>

          {!isEditingTitle && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setTitleInput(regionTitle);
                setIsEditingTitle(true);
              }}
              style={iconBtnStyle}
              title={t.regions.renameTooltip}
            >
              <Edit3 size={13} />
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowColorPicker((v) => !v);
            }}
            style={iconBtnStyle}
            title={t.regions.paletteTooltip}
          >
            <Palette size={13} />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              deleteRegion(id);
            }}
            style={{ ...iconBtnStyle, background: 'rgba(239, 68, 68, 0.25)', color: '#fee2e2' }}
            title={t.regions.deleteTooltip}
          >
            <Trash2 size={13} />
          </button>
        </div>

        {showColorPicker && (
          <div
            className="nodrag"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 8,
              display: 'flex',
              gap: 6,
              padding: '6px 8px',
              borderRadius: 10,
              background: 'var(--panel-bg, #1e293b)',
              border: '1px solid var(--node-border, #334155)',
              boxShadow: '0 10px 25px rgba(0,0,0,0.35)',
              zIndex: 10
            }}
          >
            {REGION_COLORS.map((c) => {
              const colorLabel = t.regions.colors[c.id] || c.label;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    updateRegion(id, { color: c.hex });
                    setShowColorPicker(false);
                  }}
                  title={colorLabel}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: c.hex,
                    border: c.hex.toLowerCase() === colorMeta.hex.toLowerCase() ? '2px solid #ffffff' : '1px solid transparent',
                    cursor: 'pointer'
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

const iconBtnStyle = {
  background: 'rgba(15, 23, 42, 0.3)',
  border: 'none',
  color: '#ffffff',
  cursor: 'pointer',
  padding: 5,
  borderRadius: 8,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center'
};

export default StoryRegionNode;
