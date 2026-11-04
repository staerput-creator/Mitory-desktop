import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import {
  Map as MapIcon,
  Plus,
  X,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Trash2,
  Compass
} from 'lucide-react';
import { useStoryStore } from '../store';
import { getTranslation } from '../i18n/translations';

const REGION_COLORS = [
  { id: 'blue', label: 'Синий', hex: '#3b82f6' },
  { id: 'amber', label: 'Янтарный', hex: '#f59e0b' },
  { id: 'emerald', label: 'Изумрудный', hex: '#10b981' },
  { id: 'purple', label: 'Фиолетовый', hex: '#8b5cf6' },
  { id: 'gray', label: 'Серый', hex: '#64748b' }
];

function countNodesInRegion(region, nodes = []) {
  if (!region) return { scenesCount: 0, decisionsCount: 0, totalCount: 0 };
  const rx1 = Number(region.x) || 0;
  const ry1 = Number(region.y) || 0;
  const rx2 = rx1 + (Number(region.width) || 400);
  const ry2 = ry1 + (Number(region.height) || 300);

  let scenesCount = 0;
  let decisionsCount = 0;

  for (const node of nodes) {
    if (!node || node.type === 'regionNode') continue;
    const nx = Number(node.position?.x) || 0;
    const ny = Number(node.position?.y) || 0;
    if (nx >= rx1 && nx <= rx2 && ny >= ry1 && ny <= ry2) {
      if (node.data?.type === 'decision') {
        decisionsCount += 1;
      } else {
        scenesCount += 1;
      }
    }
  }

  return {
    scenesCount,
    decisionsCount,
    totalCount: scenesCount + decisionsCount
  };
}

export default function ChapterNavigator({ isOpen, onClose, dockedAtBottom = false }) {
  const { fitBounds, screenToFlowPosition } = useReactFlow();
  const regions = useStoryStore((s) => s.regions);
  const nodes = useStoryStore((s) => s.nodes);
  const addRegion = useStoryStore((s) => s.addRegion);
  const updateRegion = useStoryStore((s) => s.updateRegion);
  const deleteRegion = useStoryStore((s) => s.deleteRegion);
  const reorderRegions = useStoryStore((s) => s.reorderRegions);
  const showToast = useStoryStore((s) => s.showToast);
  const language = useStoryStore((s) => s.language || 'ru');
  const t = getTranslation(language);

  const [dragIndex, setDragIndex] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [newColor, setNewColor] = useState(REGION_COLORS[0].hex);

  const sortedRegions = useMemo(
    () => [...(regions || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [regions]
  );

  const focusRegion = useCallback(
    (region) => {
      if (!region) return;
      fitBounds(
        {
          x: Number(region.x) || 0,
          y: Number(region.y) || 0,
          width: Math.max(250, Number(region.width) || 400),
          height: Math.max(150, Number(region.height) || 300)
        },
        { duration: 800, padding: 0.25 }
      );
    },
    [fitBounds]
  );

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (
        event.target instanceof HTMLElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)
      ) {
        return;
      }
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey) {
        if (/^[1-9]$/.test(event.key)) {
          const idx = Number(event.key) - 1;
          const targetRegion = sortedRegions[idx];
          if (targetRegion) {
            event.preventDefault();
            focusRegion(targetRegion);
            showToast(`${idx + 1}. ${targetRegion.title}`, 'info');
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusRegion, showToast, sortedRegions]);

  if (!isOpen) return null;

  const handleCreateChapter = (e) => {
    e.preventDefault();
    const pos = screenToFlowPosition({
      x: Math.round(window.innerWidth * 0.42),
      y: Math.round(window.innerHeight * 0.35)
    });
    const title = newTitle.trim() || `${t.regions.defaultTitle} ${sortedRegions.length + 1}`;
    addRegion(pos, { title, color: newColor });
    setNewTitle('');
  };

  return (
    <aside className="sa-modal-card" style={{ ...styles.drawer, ...(dockedAtBottom ? { top: "auto", bottom: 68 } : { top: 48 }) }} aria-label={t.chapterNav.title}>
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MapIcon size={18} color="#10b981" />
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.94rem' }}>{t.chapterNav.title}</div>
            <div style={{ fontSize: '0.71rem', opacity: 0.65 }}>
              {t.chapterNav.subtitle}
            </div>
          </div>
        </div>
        <button type="button" onClick={onClose} style={styles.iconBtn} title={t.chapterNav.closeTooltip}>
          <X size={18} />
        </button>
      </div>

      {/* Форма быстрого создания новой области/главы */}
      <form onSubmit={handleCreateChapter} style={styles.createBox}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: 6, opacity: 0.85 }}>
          {t.chapterNav.newRegionLabel}
        </div>
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder={t.chapterNav.newRegionPlaceholder}
          style={styles.input}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            {REGION_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setNewColor(c.hex)}
                title={t.regions.colors[c.id] || c.label}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: c.hex,
                  border: newColor === c.hex ? '2px solid #ffffff' : '1px solid transparent',
                  cursor: 'pointer'
                }}
              />
            ))}
          </div>
          <button type="submit" style={styles.addBtn}>
            <Plus size={14} /> {t.chapterNav.createBtn}
          </button>
        </div>
      </form>

      {/* Список глав с поддержкой перетаскивания (drag-to-reorder) */}
      <div style={styles.list}>
        {sortedRegions.length === 0 ? (
          <div style={styles.emptyBox}>
            {t.chapterNav.emptyHint}
          </div>
        ) : (
          sortedRegions.map((region, idx) => {
            const { scenesCount, decisionsCount } = countNodesInRegion(region, nodes || []);
            return (
              <div
                key={region.id}
                draggable
                onDragStart={() => setDragIndex(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIndex !== null && dragIndex !== idx) {
                    reorderRegions(dragIndex, idx);
                  }
                  setDragIndex(null);
                }}
                style={{
                  ...styles.chapterCard,
                  borderLeft: `4px solid ${region.color || '#3b82f6'}`,
                  opacity: dragIndex === idx ? 0.55 : 1
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <div
                    onClick={() => focusRegion(region)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      cursor: 'pointer',
                      flex: 1,
                      minWidth: 0
                    }}
                    title={t.chapterNav.flyTooltip}
                  >
                    <GripVertical size={14} style={{ opacity: 0.45, flexShrink: 0, cursor: 'grab' }} />
                    <span
                      style={{
                        fontWeight: 800,
                        fontSize: '0.84rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {idx + 1}. {region.title}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => focusRegion(region)}
                      style={{ ...styles.miniBtn, color: region.color || '#3b82f6' }}
                      title={`${t.chapterNav.flyTooltip} (Ctrl+${idx + 1})`}
                    >
                      <Compass size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => idx > 0 && reorderRegions(idx, idx - 1)}
                      style={{ ...styles.miniBtn, opacity: idx === 0 ? 0.3 : 0.8 }}
                      title={t.chapterNav.moveUpTooltip}
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === sortedRegions.length - 1}
                      onClick={() => idx < sortedRegions.length - 1 && reorderRegions(idx, idx + 1)}
                      style={{ ...styles.miniBtn, opacity: idx === sortedRegions.length - 1 ? 0.3 : 0.8 }}
                      title={t.chapterNav.moveDownTooltip}
                    >
                      <ArrowDown size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteRegion(region.id)}
                      style={{ ...styles.miniBtn, color: '#ef4444' }}
                      title={t.chapterNav.deleteTooltip}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div
                  onClick={() => focusRegion(region)}
                  style={{
                    marginTop: 6,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.73rem',
                    cursor: 'pointer'
                  }}
                >
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: 'var(--bg-color, #0f172a)',
                      border: '1px solid var(--node-border, #334155)',
                      fontWeight: 600,
                      color: 'var(--text-color)'
                    }}
                  >
                    {t.chapterNav.statsFormat(scenesCount, decisionsCount)}
                  </span>
                  {idx < 9 && (
                    <span style={{ opacity: 0.55, fontSize: '0.68rem', fontWeight: 700 }}>
                      Ctrl+{idx + 1}
                    </span>
                  )}
                </div>

                <input
                  value={region.title}
                  onChange={(e) => updateRegion(region.id, { title: e.target.value })}
                  placeholder={t.chapterNav.renamePlaceholder}
                  style={styles.inlineRenameInput}
                />
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

const styles = {
  drawer: {
    position: 'fixed',
    top: 70,
    right: 16,
    width: 'min(350px, 92vw)',
    maxHeight: 'calc(100vh - 96px)',
    zIndex: 25,
    background: 'var(--panel-bg, rgba(15, 23, 42, 0.92))',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid var(--node-border, #334155)',
    borderRadius: 16,
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
    color: 'var(--text-color, #f8fafc)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  header: {
    padding: '12px 16px',
    borderBottom: '1px solid var(--node-border, #334155)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  iconBtn: {
    width: 36,
    height: 36,
    boxSizing: 'border-box',
    background: 'none',
    border: 'none',
    color: 'var(--text-color)',
    cursor: 'pointer',
    padding: 0,
    borderRadius: 8,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  createBox: {
    padding: '12px 14px',
    borderBottom: '1px solid var(--node-border, #334155)',
    background: 'rgba(15, 23, 42, 0.28)'
  },
  input: {
    width: '100%',
    height: 36,
    boxSizing: 'border-box',
    padding: '0 10px',
    borderRadius: 8,
    border: '1px solid var(--node-border, #334155)',
    background: 'var(--bg-color, #0f172a)',
    color: 'var(--text-color, #f8fafc)',
    fontSize: '0.82rem'
  },
  addBtn: {
    height: 36,
    boxSizing: 'border-box',
    padding: '0 12px',
    borderRadius: 8,
    border: 'none',
    background: '#10b981',
    color: '#ffffff',
    fontWeight: 700,
    fontSize: '0.78rem',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 9
  },
  emptyBox: {
    padding: 16,
    borderRadius: 8,
    border: '1px dashed var(--node-border, #334155)',
    fontSize: '0.78rem',
    opacity: 0.72,
    textAlign: 'center',
    lineHeight: 1.45
  },
  chapterCard: {
    padding: '10px 11px',
    borderRadius: 12,
    background: 'var(--bg-color, #0f172a)',
    border: '1px solid var(--node-border, #334155)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.14)'
  },
  miniBtn: {
    width: 28,
    height: 28,
    boxSizing: 'border-box',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-color)',
    cursor: 'pointer',
    padding: 0,
    borderRadius: 8,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  inlineRenameInput: {
    marginTop: 7,
    width: '100%',
    height: 36,
    boxSizing: 'border-box',
    padding: '0 10px',
    fontSize: '0.78rem',
    borderRadius: 8,
    border: '1px solid var(--node-border, #334155)',
    background: 'var(--panel-bg, #1e293b)',
    color: 'var(--text-color, #f8fafc)'
  }
};
