import React, { useEffect, useMemo, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import {
  Play,
  PlusSquare,
  GitFork,
  Flag,
  Sparkles,
  Map as MapIcon,
  LayoutGrid,
  Compass,
  Save,
  Database
} from 'lucide-react';
import { useStoryStore } from '../store';
import { getTranslation } from '../i18n/translations';

export default function CanvasContextMenu({
  menu,
  onClose,
  onSpawnNode,
  onOpenCustomNodeModal,
  onSpawnRegion,
  onAutoLayout,
  onSaveProject,
  onOpenVariables,
  onPlayFromNode
}) {
  const { fitView, screenToFlowPosition } = useReactFlow();
  const language = useStoryStore((s) => s.language || 'ru');
  const t = getTranslation(language);
  const menuRef = useRef(null);

  const coords = useMemo(() => {
    if (!menu) return { x: 0, y: 0 };
    const menuWidth = 278;
    const menuHeight = 408;
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

    return {
      x: Math.max(8, Math.min(menu.clientX, vw - menuWidth - 12)),
      y: Math.max(8, Math.min(menu.clientY, vh - menuHeight - 12))
    };
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    const handlePointerDown = (e) => {
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      onClose();
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    const handleScrollOrWheel = () => onClose();

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleScrollOrWheel, { passive: true });
    window.addEventListener('resize', handleScrollOrWheel);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleScrollOrWheel);
      window.removeEventListener('resize', handleScrollOrWheel);
    };
  }, [menu, onClose]);

  if (!menu) return null;

  const getFlowPosition = () =>
    screenToFlowPosition({
      x: menu.clientX,
      y: menu.clientY
    });

  const handleAction = (fn) => {
    fn();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={t.contextMenu.ariaLabel}
      onContextMenu={(e) => e.preventDefault()}
      className="sa-modal-card"
      style={{
        ...styles.menu,
        left: coords.x,
        top: coords.y
      }}
    >
      {menu?.targetNodeId && onPlayFromNode && (
        <button
          type="button"
          role="menuitem"
          style={{ ...styles.item, background: 'rgba(16, 185, 129, 0.16)', color: '#34d399' }}
          onClick={() => handleAction(() => onPlayFromNode(menu.targetNodeId))}
        >
          <span style={styles.itemLabel}>
            <Play size={14} color="#10b981" fill="#10b981" />
            <span style={{ fontWeight: 700 }}>{language === 'en' ? 'Play from here' : 'Играть отсюда'}</span>
          </span>
        </button>
      )}
      <button
        type="button"
        role="menuitem"
        style={styles.item}
        onClick={() => handleAction(() => onSpawnNode('start', getFlowPosition()))}
      >
        <span style={styles.itemLabel}>
          <Play size={14} color="#10b981" fill="#10b981" />
          <span>{t.contextMenu.spawnStart}</span>
        </span>
      </button>

      <button
        type="button"
        role="menuitem"
        style={styles.item}
        onClick={() => handleAction(() => onSpawnNode('scene', getFlowPosition()))}
      >
        <span style={styles.itemLabel}>
          <PlusSquare size={15} color="#3b82f6" />
          <span>{t.contextMenu.spawnScene}</span>
        </span>
      </button>

      <button
        type="button"
        role="menuitem"
        style={styles.item}
        onClick={() => handleAction(() => onSpawnNode('decision', getFlowPosition()))}
      >
        <span style={styles.itemLabel}>
          <GitFork size={15} color="#f59e0b" />
          <span>{t.contextMenu.spawnDecision}</span>
        </span>
      </button>

      <button
        type="button"
        role="menuitem"
        style={styles.item}
        onClick={() => handleAction(() => onSpawnNode('ending', getFlowPosition()))}
      >
        <span style={styles.itemLabel}>
          <Flag size={15} color="#8b5cf6" />
          <span>{t.contextMenu.spawnEnding}</span>
        </span>
      </button>

      <button
        type="button"
        role="menuitem"
        style={styles.item}
        onClick={() =>
          handleAction(() => {
            const pos = getFlowPosition();
            if (onOpenCustomNodeModal) {
              onOpenCustomNodeModal(pos);
            } else {
              onSpawnNode('custom', pos);
            }
          })
        }
      >
        <span style={styles.itemLabel}>
          <Sparkles size={15} color="#06b6d4" />
          <span>{t.contextMenu.spawnCustom}</span>
        </span>
      </button>

      <button
        type="button"
        role="menuitem"
        style={styles.item}
        onClick={() => handleAction(() => onSpawnRegion(getFlowPosition()))}
      >
        <span style={styles.itemLabel}>
          <MapIcon size={15} color="#10b981" />
          <span>{t.contextMenu.spawnRegion}</span>
        </span>
        <span style={{ opacity: 0.55, fontSize: '0.74rem' }}>C</span>
      </button>

      <div style={styles.divider} />

      <button
        type="button"
        role="menuitem"
        style={styles.item}
        onClick={() => handleAction(() => onAutoLayout())}
      >
        <span style={styles.itemLabel}>
          <LayoutGrid size={15} color="#60a5fa" />
          <span>{t.contextMenu.autoLayout}</span>
        </span>
      </button>

      <button
        type="button"
        role="menuitem"
        style={styles.item}
        onClick={() => handleAction(() => fitView({ duration: 600, padding: 0.2 }))}
      >
        <span style={styles.itemLabel}>
          <Compass size={15} color="#3b82f6" />
          <span>{t.contextMenu.fitView}</span>
        </span>
      </button>

      <button
        type="button"
        role="menuitem"
        style={styles.item}
        onClick={() => handleAction(() => onSaveProject())}
      >
        <span style={styles.itemLabel}>
          <Save size={15} color="#10b981" />
          <span>{t.contextMenu.saveProject}</span>
        </span>
      </button>

      <div style={styles.divider} />

      <button
        type="button"
        role="menuitem"
        style={styles.item}
        onClick={() => handleAction(() => onOpenVariables())}
      >
        <span style={styles.itemLabel}>
          <Database size={15} color="#f59e0b" />
          <span>{t.contextMenu.openVariables}</span>
        </span>
      </button>
    </div>
  );
}

const styles = {
  menu: {
    position: 'fixed',
    zIndex: 3200,
    minWidth: 268,
    padding: 6,
    borderRadius: 16,
    background: 'var(--panel-bg, rgba(15, 23, 42, 0.94))',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid var(--panel-border, #334155)',
    boxShadow: '0 18px 42px rgba(0, 0, 0, 0.45)',
    color: 'var(--text-color, #f8fafc)',
    display: 'flex',
    flexDirection: 'column',
    gap: 2
  },
  item: {
    width: '100%',
    height: 36,
    boxSizing: 'border-box',
    padding: '0 11px',
    borderRadius: 8,
    border: 'none',
    background: 'transparent',
    color: 'var(--text-color, #f8fafc)',
    fontSize: '0.82rem',
    fontWeight: 600,
    textAlign: 'left',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10
  },
  itemLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8
  },
  divider: {
    height: 1,
    background: 'var(--panel-border, #334155)',
    margin: '4px 6px'
  }
};
