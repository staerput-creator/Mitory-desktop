import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { storageService } from './services/storage';
import { isTauri } from './services/runtime';
import { connectEditorBridge } from './services/editorBridge';
import React, { lazy, Suspense, useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import {
  ReactFlow,
  Background,
  Handle,
  Position,
  useUpdateNodeInternals,
  useReactFlow,
  useOnViewportChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import CustomEdge from './components/StoryCustomEdge';
import ConditionsEditor from './components/ConditionsEditor';
import StoryPlayer from './components/StoryPlayer';
import LeftNodePalette from './components/LeftNodePalette';
import { MitoryLogo } from './components/MitoryLogo';
import TrashDropZone from './components/TrashDropZone';
import { TOOLBAR_SLOTS, TOOLBAR_ITEM_INFO } from './store';
import CanvasContextMenu from './components/CanvasContextMenu';
import StoryRegionNode from './components/StoryRegionNode';
import { getTranslation } from './i18n/translations';
import { getConditions } from './graph/conditions';
import { useStore } from 'zustand';
import { useStoryStore, assetStorage, isNodeInsideRegion } from './store';

const EncyclopediaModal = lazy(() => import('./components/EncyclopediaModal'));
const ChapterNavigator = lazy(() => import('./components/ChapterNavigator'));
const OnboardingTour = lazy(() => import('./components/OnboardingTour'));
const UnsavedChangesModal = lazy(() => import('./components/UnsavedChangesModal'));
const CharacterManager = lazy(() => import('./CharacterManager'));
const SceneEditor = lazy(() => import('./SceneEditor'));
const StorageManager = lazy(() => import('./StorageManager'));
const VariablesManager = lazy(() => import('./VariablesManager'));

import {
  Sun, Moon, Coffee, GitFork, PlusSquare, Save, Users,
  Cloud, Trash2, X, Undo2, Redo2, Database, AlertCircle, CheckCircle, Info,
  Play, LayoutGrid, Search, ShieldAlert, Flag, Layers, Map as MapIcon,
  Film, MessageSquare, Zap, Settings, Globe, Cpu, Download, FileCode, Sparkles, Compass,
  Minus, Square, BookOpen, MoreHorizontal, FolderOpen, GraduationCap, Lock, RefreshCw, ChevronDown, ChevronUp, Sliders, RotateCcw, Maximize2, Minimize2,
  Swords, ShoppingBag, Puzzle, Skull, Eye, Shield
} from 'lucide-react';

// Палитра цветов и векторных иконок для кастомных нод (+ Кастомная...)
const CUSTOM_NODE_COLORS = [
  '#06b6d4',
  '#ef4444',
  '#f59e0b',
  '#10b981',
  '#8b5cf6',
  '#ec4899',
  '#3b82f6',
  '#64748b'
];

const CUSTOM_NODE_ICONS = [
  'film',
  'swords',
  'shopping-bag',
  'puzzle',
  'skull',
  'sparkles',
  'eye',
  'shield'
];

const CUSTOM_ICON_MAP = {
  film: Film,
  swords: Swords,
  'shopping-bag': ShoppingBag,
  puzzle: Puzzle,
  skull: Skull,
  sparkles: Sparkles,
  eye: Eye,
  shield: Shield
};

function resolveCustomNodeIcon(iconKey, FallbackIcon = Sparkles) {
  if (!iconKey) return FallbackIcon;
  return CUSTOM_ICON_MAP[iconKey] || FallbackIcon;
}

function hexToRgba(hex, alpha = 0.16) {
  const clean = String(hex || '').replace('#', '').trim();
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }
  return `rgba(6, 182, 212, ${alpha})`;
}

// --- 1. КАСТОМНАЯ КАРТОЧКА УЗЛА НА ПОЛОТНЕ (ВСТРОЕНА В APP.JSX) ---
const TYPE_META = {
  start: { key: 'start', color: '#16a34a', bg: 'rgba(22, 163, 74, 0.14)', Icon: Play },
  scene: { key: 'scene', color: '#2563eb', bg: 'rgba(37, 99, 235, 0.14)', Icon: Film },
  decision: { key: 'decision', color: '#d97706', bg: 'rgba(217, 119, 6, 0.16)', Icon: GitFork },
  ending: { key: 'ending', color: '#9333ea', bg: 'rgba(147, 51, 234, 0.15)', Icon: Flag },
  custom: { key: 'custom', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.16)', Icon: Sparkles }
};

const EMPTY_CHOICES = [];

const CustomNode = memo(function CustomNode({ id, data, selected }) {
  const language = useStoryStore((s) => s.language || 'ru');
  const t = getTranslation(language);
  const updateNodeInternals = useUpdateNodeInternals();

  const choices = Array.isArray(data?.choices) ? data.choices : EMPTY_CHOICES;
  const choicePortSignature = useMemo(
    () => (choices.length > 0 ? choices.map((c) => c.id).join('|') : ''),
    [choices]
  );

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, choicePortSignature, updateNodeInternals]);

  const nodeType = data?.type || 'scene';
  const baseMeta = TYPE_META[nodeType] || TYPE_META.scene;
  const customColor = data?.customColor || baseMeta.color;
  const meta =
    nodeType === 'custom' || data?.customColor
      ? {
          ...baseMeta,
          color: customColor,
          bg: hexToRgba(customColor, 0.16)
        }
      : baseMeta;
  const Icon = data?.customIcon ? CUSTOM_ICON_MAP[data.customIcon] || meta.Icon : meta.Icon;
  const typeLabel =
    (nodeType === 'custom' && data?.customBadgeLabel) ||
    data?.customBadgeLabel ||
    t.nodes[meta.key] ||
    t.nodes.scene;

  const dialogue = Array.isArray(data?.dialogue) ? data.dialogue.filter(Boolean) : [];
  const effects = Array.isArray(data?.effects) ? data.effects.filter(Boolean) : [];
  const imageSrc = data?.imageId ? assetStorage.getAsset(data.imageId) : data?.image || null;
  const choiceHandleStyle = {
    width: 12,
    height: 12,
    right: -7,
    background: meta.color,
    border: '2px solid var(--node-bg)'
  };

  const uniqueChars = Array.isArray(data?.resolvedCharacters) ? data.resolvedCharacters : EMPTY_CHOICES;

  return (
    <div
      style={{
        width: 240,
        minHeight: Math.max(150, choices.length * 28 + 80),
        borderRadius: nodeType === 'decision' ? 18 : 12,
        background: 'var(--node-bg)',
        color: 'var(--text-color)',
        border: selected ? `2px solid ${meta.color}` : '1px solid var(--node-border)',
        boxShadow: selected
          ? `0 0 0 3px ${meta.bg}, 0 10px 25px rgba(0,0,0,0.25)`
          : '0 6px 16px rgba(0,0,0,0.12)',
        overflow: 'visible',
        transition: 'box-shadow 0.15s, border-color 0.15s',
        fontFamily: 'inherit',
        textAlign: 'left'
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ width: 11, height: 11, background: meta.color, border: '2px solid var(--node-bg)' }}
      />

      {imageSrc && (
        <div style={{ width: '100%', height: 84, overflow: 'hidden', position: 'relative' }}>
          <img
            src={imageSrc}
            alt={data?.label || ''}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      )}

      <div style={{ padding: '10px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.7rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              padding: '2px 8px',
              borderRadius: 999,
              background: meta.bg,
              color: meta.color
            }}
          >
            <Icon size={11} />
            <span>{typeLabel}</span>
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', opacity: 0.75 }}>
            {effects.length > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: '#eab308', fontWeight: 600 }}>
                <Zap size={12} /> {effects.length}
              </span>
            )}
            {dialogue.length > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <MessageSquare size={11} /> {dialogue.length}
              </span>
            )}
          </div>
        </div>

        <div
          style={{
            fontWeight: 700,
            fontSize: '0.92rem',
            marginBottom: 4,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {data?.label || t.nodes.untitled}
        </div>

        {(data?.notes || dialogue[0]?.text) && (
          <div
            style={{
              fontSize: '0.76rem',
              opacity: 0.68,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.35,
              marginBottom: uniqueChars.length > 0 ? 8 : 2
            }}
          >
            {data?.notes || `«${dialogue[0]?.text}»`}
          </div>
        )}

        {uniqueChars.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
            {uniqueChars.slice(0, 3).map((c) => (
              <span
                key={c.id}
                style={{
                  fontSize: '0.68rem',
                  padding: '1px 6px',
                  borderRadius: 4,
                  background: 'var(--panel-bg)',
                  borderLeft: `3px solid ${c.color}`,
                  maxWidth: 95,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {c.name}
              </span>
            ))}
            {uniqueChars.length > 3 && (
              <span style={{ fontSize: '0.68rem', opacity: 0.6 }}>+{uniqueChars.length - 3}</span>
            )}
          </div>
        )}
      </div>

      {choices.map((choice, index) => (
        <Handle
          key={choice.id}
          id={choice.id}
          type="source"
          position={Position.Right}
          title={choice.label || t.nodes.choiceDefault}
          style={{ ...choiceHandleStyle, top: 54 + index * 28 }}
        />
      ))}
      <Handle
        id="choice-add"
        type="source"
        position={Position.Right}
        title={t.nodes.addChoiceTooltip}
        style={{
          ...choiceHandleStyle,
          width: 19,
          height: 19,
          right: -11,
          top: 'calc(100% - 20px)',
          background: '#16a34a',
          borderRadius: 6,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 15,
          fontWeight: 800
        }}
      >
        +
      </Handle>
    </div>
  );
});

const CanvasCoordsWidget = memo(function CanvasCoordsWidget({ nodes }) {
  const { fitView } = useReactFlow();
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });

  useOnViewportChange({
    onChange: useCallback((vp) => setViewport(vp), [])
  });

  const areAllNodesOffScreen = useMemo(() => {
    if (!nodes || nodes.length === 0) return false;
    const w = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const h = typeof window !== 'undefined' ? window.innerHeight : 800;
    const { x, y, zoom } = viewport;
    return !nodes.some((n) => {
      const nx = Number(n.position?.x) || 0;
      const ny = Number(n.position?.y) || 0;
      const nw = 240;
      const nh = 150;
      const sx = nx * zoom + x;
      const sy = ny * zoom + y;
      return sx + nw * zoom >= 0 && sx <= w && sy + nh * zoom >= 0 && sy <= h;
    });
  }, [nodes, viewport]);

  return (
    <div className="sa-coords-hud">
      <span>
        X: {Math.round(viewport.x)} · Y: {Math.round(viewport.y)} · {Math.round(viewport.zoom * 100)}%
      </span>
      <button
        type="button"
        onClick={() => fitView?.({ duration: 500, padding: 0.2 })}
        className={`sa-compass-btn ${areAllNodesOffScreen ? 'pulse-blue' : ''}`}
        title={areAllNodesOffScreen ? 'Все ноды вне экрана! Нажмите, чтобы вернуться к сюжету' : 'К сюжету'}
        aria-label="К сюжету"
      >
        <Compass size={15} />
      </button>
    </div>
  );
});

// --- 4. ГЛАВНЫЙ КОМПОНЕНЕНТ ПРИЛОЖЕНИЯ ---
export default function App() {
  const {
    projectMeta, nodes, edges, regions = [], characters = [], currentTheme, language = 'ru', variables, toast,
    currentFilePath, isDirty,
    onNodesChange, onEdgesChange, onConnect,
    addNode, addRegion, stashNodes, restoreFromStash, unstashNode, saveProject, saveProjectAs, setTheme, setLanguage,
    updateEdgeData, deleteEdge, getSerializableData,
    loadProject, importProject, updateProjectMeta, autoLayout, validateStory, showToast, clearToast,
    trashNodes, restoreFromTrash,
    toolbarItems, moveToolbarItem, toggleItemVisibility, resetToolbar
  } = useStoryStore();

  const t = getTranslation(language);

  const { undo, redo } = useStoryStore.temporal.getState();
  const hasPast = useStore(useStoryStore.temporal, (state) => state.pastStates.length > 0);
  const hasFuture = useStore(useStoryStore.temporal, (state) => state.futureStates.length > 0);

  const rfHook = useReactFlow();
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const activeRfInstance = reactFlowInstance || rfHook;

  const getCenterSpawnPos = useCallback(() => {
    const instance = activeRfInstance;
    if (typeof window === 'undefined' || !instance?.screenToFlowPosition) return null;
    return instance.screenToFlowPosition({
      x: Math.round(window.innerWidth * 0.5) - 120,
      y: Math.round(window.innerHeight * 0.5) - 75
    });
  }, [activeRfInstance]);

  const lastMouseClientPosRef = useRef({
    x: typeof window !== 'undefined' ? Math.round(window.innerWidth * 0.5) : 640,
    y: typeof window !== 'undefined' ? Math.round(window.innerHeight * 0.5) : 400
  });

  const [tactileDragState, setTactileDragState] = useState(null);
  const [isPaletteCollapsed, setPaletteCollapsed] = useState(false);

  // Состояния модальных окон, адаптивного меню «Ещё» и онбординг-тура
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isEncyclopediaOpen, setEncyclopediaOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
  const [pendingGuardMode, setPendingGuardMode] = useState('exit');
  const pendingGuardActionRef = useRef(null);
  const trashZoneRef = useRef(null);

  useEffect(() => {
    if (!isTauri()) return;
    getCurrentWindow()
      .isFullscreen()
      .then((val) => setIsFullscreen(Boolean(val)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const titleText = projectMeta?.title || 'Новое полотно истории';
    const fileLabel = currentFilePath ? ` (${currentFilePath.split(/[\\/]/).pop()})` : '';
    const fullTitle = `${titleText}${isDirty ? ' *' : ''}${fileLabel} — Mitory: Story Builder`;
    if (typeof document !== 'undefined') document.title = fullTitle;
    if (isTauri()) getCurrentWindow().setTitle(fullTitle).catch(() => {});
  }, [projectMeta?.title, currentFilePath, isDirty]);

  useEffect(() => {
    if (!isTauri()) return undefined;
    let disposed = false;
    let unlistenClose;
    getCurrentWindow().onCloseRequested((event) => {
      if (useStoryStore.getState().isDirty) {
        event.preventDefault();
        setPendingGuardMode('exit');
        setShowUnsavedChangesModal(true);
      }
    }).then((unlisten) => {
      if (disposed) unlisten();
      else unlistenClose = unlisten;
    }).catch((error) => console.error('Close guard setup failed:', error));
    return () => {
      disposed = true;
      unlistenClose?.();
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (isTauri()) {
      try {
        const win = getCurrentWindow();
        const current = await win.isFullscreen();
        const next = !current;
        await win.setFullscreen(next);
        setIsFullscreen(next);
      } catch (err) {
        console.warn('Fullscreen toggle error:', err);
      }
    } else if (typeof document !== 'undefined') {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
          setIsFullscreen(true);
        } else {
          await document.exitFullscreen();
          setIsFullscreen(false);
        }
      } catch (err) {
        console.warn('Browser fullscreen error:', err);
      }
    }
  }, []);

  const isPointInTrashZone = useCallback((clientX, clientY) => {
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return false;
    const rect = trashZoneRef.current?.getBoundingClientRect();
    if (rect && rect.width > 0 && rect.height > 0) {
      return (
        clientX >= rect.left - 18 &&
        clientX <= rect.right + 18 &&
        clientY >= rect.top - 18 &&
        clientY <= rect.bottom + 18
      );
    }
    if (typeof window !== 'undefined') {
      return clientX >= window.innerWidth - 260 && clientY >= window.innerHeight - 96;
    }
    return false;
  }, []);
  const [isTourOpen, setTourOpen] = useState(() => {
    try {
      return typeof localStorage !== 'undefined' && localStorage.getItem('hasSeenTour') !== 'true';
    } catch {
      return true;
    }
  });

  // Проверка обновлений (Tauri Updater v2)
  const [updaterStatus, setUpdaterStatus] = useState(null); // null | 'checking' | 'available' | 'up-to-date' | 'error' | 'browser'
  const [updateVersion, setUpdateVersion] = useState('');

  const handleCheckForUpdates = useCallback(async () => {
    if (!isTauri()) {
      setUpdaterStatus('browser');
      return;
    }
    setUpdaterStatus('checking');
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();
      if (update?.available) {
        setUpdateVersion(update.version || '');
        setUpdaterStatus('available');
      } else {
        setUpdaterStatus('up-to-date');
      }
    } catch (err) {
      console.warn('Updater check error:', err);
      setUpdaterStatus('error');
    }
  }, []);
  const [isMoreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef(null);
  const [isNodeMenuOpen, setNodeMenuOpen] = useState(false);
  const nodeMenuRef = useRef(null);
  const [playerStartNodeId, setPlayerStartNodeId] = useState(null);
  const connectingNodeRef = useRef(null);
  const didConnectRef = useRef(false);
  const [dropConnectMenu, setDropConnectMenu] = useState(null);
  const [windowWidth, setWindowWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1440
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isNodeMenuOpen) return undefined;
    const handleOutsideClick = (e) => {
      if (nodeMenuRef.current && !nodeMenuRef.current.contains(e.target)) {
        setNodeMenuOpen(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape') setNodeMenuOpen(false);
    };
    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isNodeMenuOpen]);

  useEffect(() => {
    if (!isMoreMenuOpen) return undefined;
    const handleOutsideClick = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setMoreMenuOpen(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape') setMoreMenuOpen(false);
    };
    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isMoreMenuOpen]);

  // Поповер/модалка создания кастомной ноды (+ Кастомная...)
  const [isCustomNodeModalOpen, setCustomNodeModalOpen] = useState(false);
  const [customSpawnPos, setCustomSpawnPos] = useState(null);
  const [customBadgeInput, setCustomBadgeInput] = useState('');
  const [customTitleInput, setCustomTitleInput] = useState('');
  const [customColorInput, setCustomColorInput] = useState(CUSTOM_NODE_COLORS[0]);
  const [customIconInput, setCustomIconInput] = useState(CUSTOM_NODE_ICONS[0]);

  const openCustomNodeModal = useCallback(
    (pos = null) => {
      const preset = t.customNodeModal.presets[0];
      setCustomSpawnPos(pos);
      setCustomBadgeInput(preset?.badge || (language === 'en' ? 'Cutscene' : 'Кат-сцена'));
      setCustomTitleInput(preset?.title || (language === 'en' ? 'Cinematic Cutscene' : 'Кинематографическая кат-сцена'));
      setCustomColorInput(preset?.color || CUSTOM_NODE_COLORS[0]);
      setCustomIconInput(preset?.icon || CUSTOM_NODE_ICONS[0]);
      setCustomNodeModalOpen(true);
    },
    [language, t.customNodeModal.presets]
  );

  // Интеграция ИИ (MCP) внутри единого окна настроек
  const [mcpTokenInput, setMcpTokenInput] = useState('');
  const [activeMcpToken, setActiveMcpToken] = useState('');
  const [mcpStatus, setMcpStatus] = useState('');

  useEffect(() => {
    if (!activeMcpToken) return;
    return connectEditorBridge(useStoryStore, activeMcpToken, setMcpStatus);
  }, [activeMcpToken]);

  const mcpState = useMemo(() => {
    if (!activeMcpToken || mcpStatus.includes('Отказ') || mcpStatus.includes('недоступен')) {
      return 'disconnected';
    }
    if (mcpStatus.includes('Подключение') || mcpStatus.includes('Генерация')) {
      return 'active';
    }
    if (mcpStatus.includes('Подключено')) {
      return 'connected';
    }
    return activeMcpToken ? 'connected' : 'disconnected';
  }, [activeMcpToken, mcpStatus]);

  const nodeTypes = useMemo(
    () => ({ storyNode: CustomNode, regionNode: StoryRegionNode }),
    []
  );
  const edgeTypes = useMemo(() => ({ default: CustomEdge, storyEdge: CustomEdge }), []);

  const canvasNodes = useMemo(() => {
    const sortedRegions = [...(regions || [])].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0)
    );
    const regionFlowNodes = sortedRegions.map((reg, idx) => {
      const rx = Number(reg.x) || 0;
      const ry = Number(reg.y) || 0;
      const rw = Math.max(250, Number(reg.width) || 400);
      const rh = Math.max(150, Number(reg.height) || 300);
      const enclosedCount = (nodes || []).filter((n) =>
        isNodeInsideRegion(n, { x: rx, y: ry, width: rw, height: rh })
      ).length;

      return {
        id: reg.id,
        type: 'regionNode',
        dragHandle: '.sa-region-header',
        position: { x: rx, y: ry },
        style: {
          width: rw,
          height: rh,
          zIndex: 0
        },
        zIndex: 0,
        selected: Boolean(reg.selected),
        dragging: Boolean(reg.dragging),
        resizing: Boolean(reg.resizing),
        data: {
          title: reg.title || `${t.regions.defaultTitle} ${idx + 1}`,
          order: idx + 1,
          color: reg.color || '#3b82f6',
          x: rx,
          y: ry,
          width: rw,
          height: rh,
          sceneCount: enclosedCount,
          notes: reg.notes || ''
        }
      };
    });
    const charById = new Map((characters || []).map((c) => [c.id, c]));
    const connectedBySource = new Map();
    for (let i = 0; i < (edges || []).length; i++) {
      const edge = edges[i];
      if (!edge?.source) continue;
      let list = connectedBySource.get(edge.source);
      if (!list) {
        list = [];
        connectedBySource.set(edge.source, list);
      }
      list.push({
        id: edge.sourceHandle || edge.data?.choiceId,
        label: edge.label || t.nodes.choiceDefault
      });
    }

    const storyFlowNodes = (nodes || []).map((n) => {
      const existingChoices = Array.isArray(n.data?.choices) ? n.data.choices : EMPTY_CHOICES;
      const connectedChoices = connectedBySource.get(n.id) || EMPTY_CHOICES;
      let mergedChoices = existingChoices;
      if (connectedChoices.length > 0) {
        const byId = new Map();
        for (const ch of existingChoices) {
          if (ch?.id) byId.set(ch.id, ch);
        }
        for (const ch of connectedChoices) {
          if (ch?.id && !byId.has(ch.id)) byId.set(ch.id, ch);
        }
        mergedChoices = Array.from(byId.values());
      }

      const dialogue = Array.isArray(n.data?.dialogue) ? n.data.dialogue : EMPTY_CHOICES;
      const seenCharIds = new Set();
      const resolvedCharacters = [];
      for (let i = 0; i < dialogue.length; i++) {
        const cid = dialogue[i]?.charId;
        if (cid && !seenCharIds.has(cid)) {
          seenCharIds.add(cid);
          const chObj = charById.get(cid);
          if (chObj) resolvedCharacters.push(chObj);
        }
      }

      return {
        ...n,
        zIndex: 10,
        data: {
          ...n.data,
          choices: mergedChoices,
          resolvedCharacters
        }
      };
    });
    return [...regionFlowNodes, ...storyFlowNodes];
  }, [regions, nodes, edges, characters, t.regions.defaultTitle, t.nodes.choiceDefault]);

  const [isCharManagerOpen, setCharManagerOpen] = useState(false);
  const [isVarManagerOpen, setVarManagerOpen] = useState(false);
  const [isStorageOpen, setStorageOpen] = useState(false);
  const [isPlayerOpen, setPlayerOpen] = useState(false);
  const [isValidatorOpen, setValidatorOpen] = useState(false);
  const [isChapterNavOpen, setChapterNavOpen] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [mobileViewMode, setMobileViewMode] = useState('canvas');
  const [isCanvasDragOver, setIsCanvasDragOver] = useState(false);
  const [activeFileHandle, setActiveFileHandle] = useState(null);

  const [editingEdge, setEditingEdge] = useState(null);
  const [edgeLabelInput, setEdgeLabelInput] = useState('');
  const [edgeConditions, setEdgeConditions] = useState([]);

  useEffect(() => {
    let disposed = false, unlisten;
    if (!isTauri()) return;
    listen('desktop-menu', async ({ payload }) => {
      const state = useStoryStore.getState();
      try {
        if (payload === 'open') {
          if (state.isDirty) {
            pendingGuardActionRef.current = () => state.openProjectFile();
            setPendingGuardMode('new');
            setShowUnsavedChangesModal(true);
          } else {
            await state.openProjectFile();
          }
        } else if (payload === 'new') {
          if (state.isDirty) {
            pendingGuardActionRef.current = () => state.resetProject('blank', false);
            setPendingGuardMode('new');
            setShowUnsavedChangesModal(true);
          } else {
            storageService.startNewProject();
            await state.resetProject('blank', false);
          }
        } else if (payload === 'save') {
          await state.saveProject();
        } else if (payload === 'save-as') {
          await state.saveProjectAs();
        } else if (payload === 'export') {
          await storageService.exportStandaloneHtml(state.getSerializableData());
        } else if (payload === 'undo' || payload === 'redo') {
          useStoryStore.temporal.getState()[payload]();
        } else if (['dark', 'light', 'soft'].includes(payload)) {
          state.setTheme(payload);
        } else if (payload === 'zoom-in') {
          activeRfInstance?.zoomIn?.({ duration: 200 });
        } else if (payload === 'zoom-out') {
          activeRfInstance?.zoomOut?.({ duration: 200 });
        }
      } catch (error) {
        state.showToast(String(error), 'error');
      }
    })
      .then((fn) => {
        if (disposed) fn();
        else unlisten = fn;
      })
      .catch((error) => useStoryStore.getState().showToast(String(error), 'error'));
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [activeRfInstance]);

  useEffect(() => {
    let cancelled = false;
    const initialize = async () => {
      await loadProject();
      if (cancelled || !isTauri()) return;
      const startupFile = await storageService.getStartupFile?.();
      if (!cancelled && startupFile) await useStoryStore.getState().openProjectFile(startupFile);
    };
    initialize();
    return () => { cancelled = true; };
  }, [loadProject]);

  useEffect(() => {
    if (!isTauri()) return undefined;
    let disposed = false;
    let unlisten;
    listen('open-file', async ({ payload }) => {
      const state = useStoryStore.getState();
      if (state.isDirty) {
        pendingGuardActionRef.current = () => state.openProjectFile(payload);
        setPendingGuardMode('new');
        setShowUnsavedChangesModal(true);
      } else {
        await state.openProjectFile(payload);
      }
    }).then((stop) => {
      if (disposed) stop();
      else unlisten = stop;
    }).catch((error) => useStoryStore.getState().showToast(String(error), 'error'));
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    const handleGlobalPointer = (e) => {
      if (e && Number.isFinite(e.clientX) && Number.isFinite(e.clientY)) {
        lastMouseClientPosRef.current = { x: e.clientX, y: e.clientY };
      }
    };
    window.addEventListener('pointermove', handleGlobalPointer, { passive: true });
    window.addEventListener('mousemove', handleGlobalPointer, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handleGlobalPointer);
      window.removeEventListener('mousemove', handleGlobalPointer);
    };
  }, []);

  useEffect(() => {
    document.body.className = `theme-${currentTheme}`;
  }, [currentTheme]);

  const handleQuickSave = useCallback(async () => {
    if (isTauri()) {
      await saveProject();
      return;
    }
    if (activeFileHandle) {
      try {
        const data = useStoryStore.getState().getSerializableData();
        const writable = await activeFileHandle.createWritable();
        await writable.write(JSON.stringify(data, null, 2));
        await writable.close();
        await saveProject(true);
        showToast(`Сохранено в локальный файл «${activeFileHandle.name}»`, 'success');
        return;
      } catch (err) {
        console.warn('File handle write error:', err);
        showToast('Нет доступа к локальному файлу, сохранено в браузер', 'info');
      }
    }

    await saveProject(false);
  }, [activeFileHandle, saveProject, showToast]);

  const handleSaveAndContinue = useCallback(async () => {
    const saved = await useStoryStore.getState().saveProject();
    if (!saved) return;
    setShowUnsavedChangesModal(false);
    if (pendingGuardMode === 'exit') {
      if (isTauri()) await getCurrentWindow().destroy();
      return;
    }
    await pendingGuardActionRef.current?.();
    pendingGuardActionRef.current = null;
  }, [pendingGuardMode]);

  const handleDiscardAndContinue = useCallback(async () => {
    setShowUnsavedChangesModal(false);
    if (pendingGuardMode === 'exit') {
      if (isTauri()) await getCurrentWindow().destroy();
      return;
    }
    await pendingGuardActionRef.current?.();
    pendingGuardActionRef.current = null;
  }, [pendingGuardMode]);

  const handleCancelGuard = useCallback(() => {
    setShowUnsavedChangesModal(false);
    pendingGuardActionRef.current = null;
  }, []);

  const handleExportHtmlFromSettings = async () => {
    const data = getSerializableData();
    const result = await storageService.exportStandaloneHtml(data);
    if (result && !result.success) return;
    showToast(
      language === 'en'
        ? 'Standalone HTML game exported!'
        : 'Готовая автономная HTML-игра экспортирована!',
      'success'
    );
  };

  const handleExportJsonFromSettings = async () => {
    const data = getSerializableData();
    const result = await storageService.exportJson(data);
    if (result && !result.success) {
      if (!result.cancelled) showToast(result.error || 'Export error', 'error');
      return;
    }
    showToast(
      language === 'en'
        ? 'Project JSON backup exported!'
        : 'Бэкап проекта (.story.json) экспортирован!',
      'success'
    );
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target?.tagName;
      const isEditable =
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || Boolean(e.target?.isContentEditable);
      if (isEditable && !((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's')) return;

      const modifier = e.metaKey || e.ctrlKey;
      if (modifier && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        const state = useStoryStore.getState();
        if (state.isDirty) {
          pendingGuardActionRef.current = () => state.resetProject('blank', false);
          setPendingGuardMode('new');
          setShowUnsavedChangesModal(true);
        } else {
          storageService.startNewProject?.();
          state.resetProject('blank', false);
        }
        return;
      }
      if (modifier && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        const state = useStoryStore.getState();
        if (state.isDirty) {
          pendingGuardActionRef.current = () => state.openProjectFile();
          setPendingGuardMode('new');
          setShowUnsavedChangesModal(true);
        } else {
          state.openProjectFile();
        }
        return;
      }
      if (modifier && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveProjectAs();
        return;
      }

      if (!modifier && !e.altKey && (e.key === 'c' || e.key === 'C' || e.key === 'с' || e.key === 'С')) {
        e.preventDefault();
        const cursorFlowPos = activeRfInstance.screenToFlowPosition({
          x: lastMouseClientPosRef.current.x,
          y: lastMouseClientPosRef.current.y
        });
        addRegion(cursorFlowPos);
        return;
      }

      // F1: Открыть / закрыть Кодекс сценариста (Энциклопедия Mitory)
      if (e.key === 'F1') {
        e.preventDefault();
        setEncyclopediaOpen((v) => !v);
        return;
      }

      // F11: Переключение полноэкранного режима без панели задач Windows
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
        return;
      }

      // Оверлей поиска и проверки сюжета: Ctrl + F
      if (modifier && !e.altKey && (e.key.toLowerCase() === 'f' || e.key.toLowerCase() === 'а')) {
        e.preventDefault();
        setValidatorOpen(true);
        return;
      }

      if (isTauri() && modifier) return;

      if (modifier && (e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'я')) {
        e.preventDefault();
        if (e.shiftKey) {
          if (hasFuture) redo();
        } else if (hasPast) {
          undo();
        }
      } else if (modifier && (e.key.toLowerCase() === 'y' || e.key.toLowerCase() === 'н')) {
        e.preventDefault();
        if (hasFuture) redo();
      } else if (modifier && (e.key.toLowerCase() === 's' || e.key.toLowerCase() === 'ы')) {
        e.preventDefault();
        handleQuickSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeRfInstance, addRegion, hasPast, hasFuture, handleQuickSave, language, redo, saveProjectAs, showToast, toggleFullscreen, undo]);

  const handleConnect = useCallback(
    (params) => {
      didConnectRef.current = true;
      setDropConnectMenu(null);
      onConnect(params);
    },
    [onConnect]
  );

  const onConnectStart = useCallback((event, { nodeId, handleId, handleType }) => {
    didConnectRef.current = false;
    setDropConnectMenu(null);
    const point = 'changedTouches' in event ? event.changedTouches[0] : event;
    connectingNodeRef.current = {
      nodeId,
      handleId,
      handleType,
      startX: point?.clientX ?? 0,
      startY: point?.clientY ?? 0
    };
  }, []);

  const onConnectEnd = useCallback(
    (event, connectionState) => {
      const pending = connectingNodeRef.current;
      connectingNodeRef.current = null;

      // Если связь успешно попала в существующий хэндл/ноду — ничего не создавать!
      if (
        didConnectRef.current ||
        connectionState?.isValid ||
        connectionState?.toNode ||
        connectionState?.toHandle
      ) {
        didConnectRef.current = false;
        return;
      }

      if (!pending || pending.handleType === 'target') return;

      // Защита от клика по элементам ноды, хэндла или ребра
      const targetEl = event?.target instanceof Element ? event.target : null;
      const targetIsHandle = targetEl?.closest('.react-flow__handle');
      const targetIsNode = targetEl?.closest('.react-flow__node');
      const targetIsEdge =
        targetEl?.closest('.react-flow__edge') || targetEl?.closest('.edge-label-pill');
      if (targetIsHandle || targetIsNode || targetIsEdge) return;

      // Проверяем, что бросок действительно произошёл в чистую плоскость холста
      const isDirectPane = targetEl?.classList?.contains('react-flow__pane');
      if (!isDirectPane || !activeRfInstance) return;

      const point = 'changedTouches' in event ? event.changedTouches[0] : event;
      const clientX = point?.clientX ?? 0;
      const clientY = point?.clientY ?? 0;
      if (Math.hypot(clientX - pending.startX, clientY - pending.startY) < 28) return;

      const flowPos = activeRfInstance.screenToFlowPosition({
        x: clientX,
        y: clientY
      });

      // Открываем контекстное мини-меню создания Сцены / Развилки в точке курсора
      setDropConnectMenu({
        clientX,
        clientY,
        flowPos,
        sourceNodeId: pending.nodeId,
        sourceHandleId: pending.handleId || null
      });
    },
    [activeRfInstance]
  );

  const handleSpawnFromDropMenu = useCallback(
    (nodeType) => {
      if (!dropConnectMenu) return;
      const { flowPos, sourceNodeId, sourceHandleId } = dropConnectMenu;
      setDropConnectMenu(null);
      const newNodeId = addNode(nodeType, flowPos);
      if (newNodeId) {
        onConnect({
          source: sourceNodeId,
          sourceHandle: sourceHandleId,
          target: newNodeId,
          targetHandle: null
        });
        setSelectedNodeId(newNodeId);
        setEditingNodeId(newNodeId);
      }
    },
    [addNode, dropConnectMenu, onConnect]
  );

  const handleNodeContextMenu = useCallback((event, node) => {
    event.preventDefault();
    setSelectedNodeId(node.id);
    setContextMenu({
      clientX: event.clientX,
      clientY: event.clientY,
      targetNodeId: node.id
    });
  }, []);

    const handleCanvasDrop = (e) => {
    const types = Array.from(e.dataTransfer?.types || []);
    if (
      types.includes('application/stash-node-id') ||
      types.includes('application/reactflow-stash-id') ||
      types.includes('application/reactflow-type')
    ) {
      return;
    }
    e.preventDefault();
    setIsCanvasDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      showToast('Перетащите файл проекта в формате .json', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        await importProject(parsed);
      } catch {
        showToast('Ошибка чтения JSON файла', 'error');
      }
    };
    reader.readAsText(file);
  };

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const stashIdsRaw =
        event.dataTransfer.getData('application/stash-node-ids') ||
        event.dataTransfer.getData('application/story-node-ids');
      const stashId =
        event.dataTransfer.getData('application/stash-node-id') ||
        event.dataTransfer.getData('application/reactflow-stash-id');
      const type = event.dataTransfer.getData('application/reactflow-type');
      if (!stashIdsRaw && !stashId && !type) return;

      event.stopPropagation();
      const instance = reactFlowInstance || rfHook;
      const position = instance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      if (stashIdsRaw) {
        try {
          const ids = JSON.parse(stashIdsRaw);
          if (Array.isArray(ids) && ids.length > 0) {
            const restoreMultiple = useStoryStore.getState().restoreMultipleFromStash;
            if (restoreMultiple) {
              const restoredIds = restoreMultiple(ids, position);
              if (restoredIds.length > 0) setSelectedNodeId(restoredIds[0]);
              return;
            }
          }
        } catch {
          // ignore malformed json
        }
      }

      if (stashId) {
        const restoreFn = restoreFromStash || unstashNode;
        const restoredId = restoreFn(stashId, position);
        if (restoredId) setSelectedNodeId(restoredId);
        return;
      }

      if (type === 'region') {
        addRegion(position, { ignoreSelection: true, width: 400, height: 300 });
      } else if (type) {
        const newId = addNode(type, position);
        if (newId) setSelectedNodeId(newId);
      }
    },
    [reactFlowInstance, rfHook, addNode, addRegion, restoreFromStash, unstashNode]
  );

  const rafDragIdRef = useRef(null);

  const handleNodeDragStart = useCallback(
    (event, node) => {
      if (!node || node.type === 'regionNode') return;
      const selectedList = nodes.filter((n) => n.selected);
      const draggedGroup =
        selectedList.length > 0 && selectedList.some((n) => n.id === node.id)
          ? selectedList
          : [node];
      const clientX = Number.isFinite(event?.clientX) ? event.clientX : lastMouseClientPosRef.current.x;
      const clientY = Number.isFinite(event?.clientY) ? event.clientY : lastMouseClientPosRef.current.y;

      const dropLimit = isPaletteCollapsed ? 190 : 265;

      setTactileDragState({
        nodes: draggedGroup,
        clientX,
        clientY,
        vx: 0,
        vy: 0,
        isNearLeftPanel: clientX <= 420,
        isPeekingPocket: clientX <= 190,
        isStashDropActive: clientX <= dropLimit,
        isTrashDropActive: isPointInTrashZone(clientX, clientY)
      });
    },
    [nodes, isPaletteCollapsed, isPointInTrashZone]
  );

  const handleNodeDrag = useCallback(
    (event, node) => {
      if (!node || node.type === 'regionNode') return;
      const clientX = Number.isFinite(event?.clientX) ? event.clientX : lastMouseClientPosRef.current.x;
      const clientY = Number.isFinite(event?.clientY) ? event.clientY : lastMouseClientPosRef.current.y;
      const prevX = lastMouseClientPosRef.current.x;
      const prevY = lastMouseClientPosRef.current.y;
      const vx = clientX - prevX;
      const vy = clientY - prevY;
      lastMouseClientPosRef.current = { x: clientX, y: clientY };

      if (rafDragIdRef.current) return;
      rafDragIdRef.current = requestAnimationFrame(() => {
        rafDragIdRef.current = null;
        const selectedList = nodes.filter((n) => n.selected);
        const draggedGroup =
          selectedList.length > 0 && selectedList.some((n) => n.id === node.id)
            ? selectedList
            : [node];
        const dropLimit = isPaletteCollapsed ? 190 : 265;

        setTactileDragState({
          nodes: draggedGroup,
          clientX,
          clientY,
          vx,
          vy,
          isNearLeftPanel: clientX <= 420,
          isPeekingPocket: clientX <= 190,
          isStashDropActive: clientX <= dropLimit,
          isTrashDropActive: isPointInTrashZone(clientX, clientY)
        });
      });
    },
    [nodes, isPaletteCollapsed, isPointInTrashZone]
  );

  const handleNodeDragStop = useCallback(
    (event, node) => {
      if (rafDragIdRef.current) {
        cancelAnimationFrame(rafDragIdRef.current);
        rafDragIdRef.current = null;
      }
      if (!node || node.type === 'regionNode') {
        setTactileDragState(null);
        return;
      }
      const clientX = Number.isFinite(event?.clientX) ? event.clientX : tactileDragState?.clientX ?? 999;
      const clientY = Number.isFinite(event?.clientY) ? event.clientY : tactileDragState?.clientY ?? 999;
      const dropLimit = isPaletteCollapsed ? 190 : 265;
      const isDroppedInPocket = clientX <= dropLimit || Boolean(tactileDragState?.isStashDropActive);
      const isDroppedInTrash =
        isPointInTrashZone(clientX, clientY) || Boolean(tactileDragState?.isTrashDropActive);

      const selectedList = nodes.filter((n) => n.selected);
      const draggedGroup =
        selectedList.length > 0 && selectedList.some((n) => n.id === node.id)
          ? selectedList
          : tactileDragState?.nodes?.length
          ? tactileDragState.nodes
          : [node];

      if (isDroppedInTrash) {
        const idsToTrash = draggedGroup.map((n) => n.id);
        trashNodes(idsToTrash);
        setSelectedNodeId(null);
        setEditingNodeId(null);
      } else if (isDroppedInPocket) {
        const idsToStash = draggedGroup.map((n) => n.id);
        stashNodes(idsToStash);
        setSelectedNodeId(null);
        setEditingNodeId(null);
      }

      setTactileDragState(null);
    },
    [nodes, stashNodes, trashNodes, tactileDragState, isPaletteCollapsed, isPointInTrashZone]
  );

  const handleContextMenu = (event) => {
    event.preventDefault();
    setContextMenu({
      clientX: event.clientX,
      clientY: event.clientY,
      targetNodeId: selectedNodeId
    });
  };

  const onEdgeClick = (evt, edge) => {
    evt.stopPropagation();
    setEditingEdge(edge);
    const rawLabel = (edge.label || '').replace(/\s*\[[^\]]*\]/g, '').trim();
    setEdgeLabelInput(rawLabel);
    setEdgeConditions(getConditions(edge.data));
  };

  const handleEdgeSave = () => {
    if (!editingEdge) return;
    updateEdgeData(editingEdge.id, edgeLabelInput.trim() || t.edgeModal.defaultNext, edgeConditions);
    setEditingEdge(null);
  };

  const handleEdgeDelete = () => {
    if (editingEdge) {
      deleteEdge(editingEdge.id);
      setEditingEdge(null);
    }
  };

  const handleCreateCustomNodeSubmit = (e) => {
    e.preventDefault();
    const newId = addNode('custom', customSpawnPos, {
      label: customTitleInput.trim() || customBadgeInput.trim() || t.nodes.custom,
      customBadgeLabel: customBadgeInput.trim() || t.nodes.custom,
      customColor: customColorInput,
      customIcon: customIconInput
    });
    if (newId) setSelectedNodeId(newId);
    setCustomNodeModalOpen(false);
    setCustomSpawnPos(null);
  };

  const validationIssues = useMemo(() => {
    if (!isValidatorOpen) return EMPTY_CHOICES;
    return validateStory(nodes, edges);
  }, [isValidatorOpen, nodes, edges, validateStory]);

  const filteredNodes = useMemo(() => {
    if (!isValidatorOpen) return EMPTY_CHOICES;
    if (!searchQuery.trim()) return nodes;
    const q = searchQuery.toLowerCase();
    return nodes.filter(
      (n) =>
        (n.data?.label || '').toLowerCase().includes(q) ||
        (n.data?.notes || '').toLowerCase().includes(q) ||
        (n.data?.dialogue || []).some((d) => (d.text || '').toLowerCase().includes(q))
    );
  }, [isValidatorOpen, nodes, searchQuery]);

  // --- МОДУЛЬНЫЙ КОНФИГУРАТОР ТУЛБАРА ---
  const renderToolbarItem = (itemId, slot = 'top') => {
    const isBottomDock = slot === 'bottom-bar';
    switch (itemId) {
      case 'project-title':
        return (
          <div key="project-title" className="sa-unified-title-wrap">
            <input
              value={projectMeta?.title || ''}
              onChange={(e) => updateProjectMeta({ title: e.target.value })}
              placeholder={t.toolbar.projectTitlePlaceholder}
              className="sa-unified-project-title"
              title={t.toolbar.projectTitleTooltip}
            />
            {isDirty && (
              <span className="sa-unified-dirty-mark" title="Есть несохранённые изменения">*</span>
            )}
            {mcpState !== 'disconnected' && (
              <button
                type="button"
                className={`sa-mcp-led-dot ${mcpState}`}
                onClick={() => setSettingsOpen(true)}
                title={`ИИ-мост MCP: ${mcpStatus || 'Подключено'}`}
                aria-label="Статус ИИ-моста MCP"
              />
            )}
          </div>
        );

      case 'history-actions':
        return (
          <div key="history-actions" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <button
              type="button"
              className="sa-unified-btn"
              onClick={() => undo()}
              disabled={!hasPast}
              style={{ opacity: hasPast ? 1 : 0.35, padding: '0 6px' }}
              title={t.toolbar.undo}
            >
              <Undo2 size={14} />
            </button>
            <button
              type="button"
              className="sa-unified-btn"
              onClick={() => redo()}
              disabled={!hasFuture}
              style={{ opacity: hasFuture ? 1 : 0.35, padding: '0 6px' }}
              title={t.toolbar.redo}
            >
              <Redo2 size={14} />
            </button>
          </div>
        );

      case 'node-create':
        return (
          <div key="node-create" ref={nodeMenuRef} className="sa-unified-split-wrap">
            <button
              type="button"
              className="sa-unified-btn sa-unified-split-main"
              onClick={() => {
                const newId = addNode('scene', getCenterSpawnPos());
                if (newId) setSelectedNodeId(newId);
              }}
              title={t.toolbar.addSceneTooltip}
            >
              <PlusSquare size={14} color="#3b82f6" />
              <span>{language === 'en' ? '+ Node' : '+ Нода'}</span>
            </button>
            <button
              type="button"
              className={`sa-unified-btn sa-unified-split-arrow ${isNodeMenuOpen ? 'is-active' : ''}`}
              onClick={() => setNodeMenuOpen((v) => !v)}
              title="Выбрать тип создаваемого узла"
              aria-expanded={isNodeMenuOpen}
            >
              {isBottomDock ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {isNodeMenuOpen && (
              <div className="sa-unified-node-menu dropdown-menu sa-modal-card" role="menu">
                <button
                  type="button"
                  className="sa-hud-menu-item"
                  onClick={() => {
                    const newId = addNode('start', getCenterSpawnPos());
                    if (newId) setSelectedNodeId(newId);
                    setNodeMenuOpen(false);
                  }}
                >
                  <Play size={14} color="#10b981" fill="#10b981" />
                  <span>{t.toolbar.addStart}</span>
                </button>
                <button
                  type="button"
                  className="sa-hud-menu-item"
                  onClick={() => {
                    const newId = addNode('scene', getCenterSpawnPos());
                    if (newId) setSelectedNodeId(newId);
                    setNodeMenuOpen(false);
                  }}
                >
                  <PlusSquare size={14} color="#3b82f6" />
                  <span>{t.toolbar.addScene}</span>
                </button>
                <button
                  type="button"
                  className="sa-hud-menu-item"
                  onClick={() => {
                    const newId = addNode('decision', getCenterSpawnPos());
                    if (newId) setSelectedNodeId(newId);
                    setNodeMenuOpen(false);
                  }}
                >
                  <GitFork size={14} color="#f59e0b" />
                  <span>{t.toolbar.addDecision}</span>
                </button>
                <button
                  type="button"
                  className="sa-hud-menu-item"
                  onClick={() => {
                    const newId = addNode('ending', getCenterSpawnPos());
                    if (newId) setSelectedNodeId(newId);
                    setNodeMenuOpen(false);
                  }}
                >
                  <Flag size={14} color="#8b5cf6" />
                  <span>{t.toolbar.addEnding}</span>
                </button>
                <button
                  type="button"
                  className="sa-hud-menu-item"
                  onClick={() => {
                    openCustomNodeModal(getCenterSpawnPos());
                    setNodeMenuOpen(false);
                  }}
                >
                  <Sparkles size={14} color="#06b6d4" />
                  <span>{t.toolbar.addCustom}</span>
                </button>
              </div>
            )}
          </div>
        );

      case 'chips-counters':
        return (
          <div key="chips-counters" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <button
              type="button"
              onClick={() => setCharManagerOpen(true)}
              className={`sa-unified-chip ${isCharManagerOpen ? 'is-active' : ''}`}
              title={t.toolbar.charactersTooltip}
            >
              <Users size={13} color="#3b82f6" />
              {windowWidth >= 1180 && (
                <span className="sa-chip-label">{t.toolbar.characters}</span>
              )}
              <span className="sa-unified-count">{characters.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setVarManagerOpen(true)}
              className={`sa-unified-chip ${isVarManagerOpen ? 'is-active' : ''}`}
              title={t.toolbar.variablesTooltip}
            >
              <Database size={13} color="#f59e0b" />
              {windowWidth >= 1180 && (
                <span className="sa-chip-label">{t.toolbar.variables}</span>
              )}
              <span className="sa-unified-count">{variables.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setChapterNavOpen((v) => !v)}
              className={`sa-unified-chip ${isChapterNavOpen ? 'is-active' : ''}`}
              title={t.toolbar.chaptersTooltip}
            >
              <MapIcon size={13} color="#10b981" />
              {windowWidth >= 1180 && (
                <span className="sa-chip-label">{t.toolbar.chapters}</span>
              )}
              <span className="sa-unified-count">{regions.length}</span>
            </button>
          </div>
        );

      case 'search-action':
        return (
          <button
            key="search-action"
            type="button"
            className="sa-unified-btn"
            onClick={() => setValidatorOpen(true)}
            title="Поиск и проверка сюжета (Ctrl+F)"
            aria-label="Поиск (Ctrl+F)"
          >
            <Search size={14} color="#38bdf8" />
          </button>
        );

      case 'save-action':
        return (
          <button
            key="save-action"
            type="button"
            className="sa-unified-btn"
            onClick={handleQuickSave}
            title={t.toolbar.quickSave}
            aria-label={t.toolbar.quickSave}
          >
            <Save size={14} color="#10b981" />
          </button>
        );

      case 'play-action':
        return (
          <button
            key="play-action"
            type="button"
            data-tour="play-btn"
            className="sa-unified-play-btn"
            onClick={() => {
              setPlayerStartNodeId(null);
              setPlayerOpen(true);
            }}
            title={t.toolbar.playTooltip}
          >
            <Play size={13} fill="white" />
            <span>{t.toolbar.play}</span>
          </button>
        );

      case 'encyclopedia-action':
        return (
          <button
            key="encyclopedia-action"
            type="button"
            className="sa-unified-btn"
            onClick={() => setEncyclopediaOpen(true)}
            title={t.settings.encyclopediaTooltip || "Кодекс Mitory: Энциклопедия сценариста (F1)"}
            aria-label="Кодекс Mitory (F1)"
          >
            <BookOpen size={14} color="#38bdf8" />
          </button>
        );

      case 'settings-action':
        return (
          <button
            key="settings-action"
            type="button"
            className="sa-unified-btn"
            onClick={() => setSettingsOpen(true)}
            title={t.toolbar.settingsTooltip}
            aria-label={t.toolbar.settings}
          >
            <Settings size={14} />
          </button>
        );

      default:
        return null;
    }
  };

  const activeToolbar = Array.isArray(toolbarItems) ? toolbarItems : [];
  const topLeftItems = activeToolbar.filter((it) => it.slot === 'top-left' && it.visible !== false).map((it) => it.id);
  const topCenterItems = activeToolbar.filter((it) => it.slot === 'top-center' && it.visible !== false).map((it) => it.id);
  const topRightItems = activeToolbar.filter((it) => it.slot === 'top-right' && it.visible !== false).map((it) => it.id);
  const bottomBarItems = activeToolbar.filter((it) => it.slot === 'bottom-bar' && it.visible !== false).map((it) => it.id);

  const showStackOverlay =
    Boolean(tactileDragState) &&
    Array.isArray(tactileDragState.nodes) &&
    tactileDragState.nodes.length > 1;

  return (
    <Suspense fallback={null}>
    <div
      style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}
      onMouseMove={(e) => {
        lastMouseClientPosRef.current = { x: e.clientX, y: e.clientY };
      }}
      onDragOver={(e) => {
        if (e.dataTransfer?.types?.includes('Files')) {
          e.preventDefault();
          setIsCanvasDragOver(true);
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setIsCanvasDragOver(false);
        }
      }}
      onDrop={handleCanvasDrop}
    >
      {/* ЕДИНАЯ МОНОЛИТНАЯ ШАПКА MITORY (UNIFIED HEADER 42px) */}
      <header
        className="sa-unified-header"
        data-tauri-drag-region
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          if (e.target.closest('button, input, select, textarea, .sa-unified-btn, .sa-window-controls, .sa-unified-chip, .sa-unified-play-btn')) {
            return;
          }
          try {
            getCurrentWindow().startDragging();
          } catch (err) {
            console.warn('Failed to start dragging window:', err);
          }
        }}
        onDoubleClick={(e) => {
          if (e.target.closest('button, input, select, textarea, .sa-unified-btn, .sa-window-controls, .sa-unified-chip, .sa-unified-play-btn')) {
            return;
          }
          try {
            getCurrentWindow().toggleMaximize();
          } catch (err) {
            console.warn('Failed to toggle maximize window:', err);
          }
        }}
      >
        {/* Левая зона слота top-left */}
        <div className="sa-unified-left" data-tauri-drag-region>
          <div className="sa-unified-branding" data-tauri-drag-region>
            <MitoryLogo size={16} />
            <span data-tauri-drag-region>Mitory</span>
          </div>
          {topLeftItems.length > 0 && <div className="sa-unified-divider" />}
          {topLeftItems.map((id, index) => (
            <React.Fragment key={id}>
              {index > 0 && <div className="sa-unified-divider" />}
              {renderToolbarItem(id, 'top-left')}
            </React.Fragment>
          ))}
        </div>

        {/* Центральная зона слота top-center */}
        <div className="sa-unified-center" data-tauri-drag-region>
          {topCenterItems.map((id, index) => (
            <React.Fragment key={id}>
              {index > 0 && <div className="sa-unified-divider" />}
              {renderToolbarItem(id, 'top-center')}
            </React.Fragment>
          ))}
        </div>

        {/* Правая зона слота top-right + Полноэкранный режим + Системные кнопки окна */}
        <div className="sa-unified-right" data-tauri-drag-region>
          {topRightItems.map((id) => renderToolbarItem(id, 'top-right'))}

          <button
            type="button"
            className="sa-unified-btn"
            onClick={toggleFullscreen}
            title={language === 'en' ? 'Toggle Fullscreen (F11)' : 'Полноэкранный режим (F11)'}
            aria-label="Полноэкранный режим (F11)"
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>

          <div className="sa-unified-divider" />

          <div className="sa-window-controls" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="sa-win-btn sa-win-min"
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                try {
                  await getCurrentWindow().minimize();
                } catch (err) {
                  console.error('Minimize error:', err);
                }
              }}
              title="Свернуть"
              aria-label="Свернуть окно"
            >
              <Minus size={13} style={{ pointerEvents: 'none' }} />
            </button>
            <button
              type="button"
              className="sa-win-btn sa-win-max"
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                try {
                  await getCurrentWindow().toggleMaximize();
                } catch (err) {
                  console.error('Toggle maximize error:', err);
                }
              }}
              title="Развернуть / Восстановить"
              aria-label="Развернуть окно"
            >
              <Square size={11} style={{ pointerEvents: 'none' }} />
            </button>
            <button
              type="button"
              className="sa-win-btn sa-win-close"
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                try {
                  await getCurrentWindow().close();
                } catch (err) {
                  console.error('Close error:', err);
                }
              }}
              title="Закрыть"
              aria-label="Закрыть окно"
            >
              <X size={14} style={{ pointerEvents: 'none' }} />
            </button>
          </div>
        </div>
      </header>

      {/* ПЛАВАЮЩИЙ НИЖНИЙ ДОК ДЛЯ ЭЛЕМЕНТОВ СЛОТА bottom-bar (С ПОДДЕРЖКОЙ DROPUP) */}
      {bottomBarItems.length > 0 && (
        <div className="sa-bottom-dock bottom-dock">
          {bottomBarItems.map((id, index) => (
            <React.Fragment key={id}>
              {index > 0 && <div className="sa-unified-divider" />}
              {renderToolbarItem(id, 'bottom-bar')}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* КАРМАН СЦЕН (SCENE POCKET) С ПЛАВАЮЩИМ ТАБ-ЯЗЫЧКОМ НА ПРАВОМ КРАЮ */}
      {mobileViewMode === 'canvas' && (
        <LeftNodePalette
          collapsed={isPaletteCollapsed}
          onToggleCollapse={setPaletteCollapsed}
          onQuickSpawn={(type) => {
            const centerPos = getCenterSpawnPos();
            const newId = addNode(type, centerPos);
            if (newId) setSelectedNodeId(newId);
          }}
          selectedNodeId={selectedNodeId || editingNodeId}
          isPeekingPocket={Boolean(tactileDragState?.isPeekingPocket)}
          isStashDropActive={Boolean(tactileDragState?.isStashDropActive)}
          draggedNodesCount={tactileDragState?.nodes?.length || 0}
          onClearSelection={() => {
            setSelectedNodeId(null);
            setEditingNodeId(null);
          }}
          onRestoreFromTrash={(nodeId) => {
            const restoredId = restoreFromTrash(nodeId, getCenterSpawnPos());
            if (restoredId) setSelectedNodeId(restoredId);
          }}
        />
      )}

      {/* ИНТЕРАКТИВНАЯ ЗОНА УДАЛЕНИЯ В КОРЗИНУ (DRAG-TO-TRASH, ПРАВЫЙ НИЖНИЙ УГОЛ) */}
      {mobileViewMode === 'canvas' && (
        <TrashDropZone
          zoneRef={trashZoneRef}
          isDragging={Boolean(tactileDragState)}
          isOver={Boolean(tactileDragState?.isTrashDropActive)}
          draggedCount={tactileDragState?.nodes?.length || 1}
          language={language}
        />
      )}

      {/* КАСТОМНЫЙ DRAG-СЛОЙ АНИМАЦИИ СТОПКИ (APPLE / SAMSUNG STACK STYLE) */}
      {showStackOverlay &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="sa-tactile-stack-layer"
            style={{
              transform: `translate3d(${Number.isFinite(tactileDragState?.clientX) ? tactileDragState.clientX - 105 : 500}px, ${Number.isFinite(tactileDragState?.clientY) ? tactileDragState.clientY - 35 : 300}px, 0)`
            }}
          >
            {tactileDragState.nodes.slice(0, 4).map((item, idx) => {
              const itemType = item.data?.type || 'scene';
              const itemMeta = TYPE_META[itemType] || TYPE_META.scene;
              const badgeColor = item.data?.customColor || itemMeta.color;
              const badgeBg = hexToRgba(badgeColor, 0.18);
              const badgeLabel = item.data?.customBadgeLabel || t.nodes[itemMeta.key] || t.nodes.scene;

              const vx = Number.isFinite(tactileDragState.vx) ? tactileDragState.vx : 0;
              const vy = Number.isFinite(tactileDragState.vy) ? tactileDragState.vy : 0;
              const lagX = -Math.max(-40, Math.min(40, vx * idx * 0.4));
              const lagY = -Math.max(-40, Math.min(40, vy * idx * 0.4));
              const tilt = Math.max(-12, Math.min(12, vx * 0.6 + (idx % 2 === 0 ? 3 : -3)));
              const cardTransform = idx === 0
                ? 'translate(0px, 0px) rotate(0deg)'
                : `translate(${lagX + idx * 4}px, ${lagY + idx * 4}px) rotate(${tilt}deg)`;
              const cardTransition = `transform ${0.08 + idx * 0.05}s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.2s ease`;

              return (
                <div
                  key={item.id}
                  className="sa-tactile-stack-card"
                  style={{
                    transform: cardTransform,
                    transition: cardTransition,
                    zIndex: 4 - idx,
                    opacity: idx === 0 ? 0.98 : Math.max(0.65, 0.92 - idx * 0.1)
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span
                      style={{
                        fontSize: '0.66rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        padding: '1px 6px',
                        borderRadius: 999,
                        background: badgeBg,
                        color: badgeColor
                      }}
                    >
                      {badgeLabel}
                    </span>
                    <span style={{ fontSize: '0.68rem', opacity: 0.65 }}>
                      {t.palette.linesCount}: {item.data?.dialogue?.length || 0}
                    </span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '0.84rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.data?.label || t.nodes.scene}
                  </div>
                </div>
              );
            })}
            <div className="sa-tactile-stack-badge">
              {tactileDragState.nodes.length}
            </div>
          </div>,
          document.body
        )}

      {/* НАВИГАТОР ГЛАВ И ХРОНИКА СЮЖЕТА */}
      <ChapterNavigator
        isOpen={isChapterNavOpen}
        onClose={() => setChapterNavOpen(false)}
        dockedAtBottom={bottomBarItems.includes('chips-counters')}
      />

      {/* МИНИ-МЕНЮ DROP-TO-CREATE ПРИ БРОСКЕ СВЯЗИ В ПУСТОЕ ПРОСТРАНСТВО ХОЛСТА */}
      {dropConnectMenu && (
        <div
          className="sa-modal-card"
          style={{
            position: 'fixed',
            left: Math.min(dropConnectMenu.clientX, (typeof window !== 'undefined' ? window.innerWidth : 1280) - 210),
            top: Math.min(dropConnectMenu.clientY, (typeof window !== 'undefined' ? window.innerHeight : 800) - 160),
            zIndex: 3300,
            minWidth: 196,
            padding: 6,
            borderRadius: 12,
            background: '#0f172a',
            border: '1px solid rgba(59, 130, 246, 0.45)',
            boxShadow: '0 16px 38px rgba(0, 0, 0, 0.55)',
            display: 'flex',
            flexDirection: 'column',
            gap: 3
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 8px 4px 8px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.04em' }}>
              {language === 'en' ? 'Create & Connect' : 'Создать и связать'}
            </span>
            <button
              type="button"
              onClick={() => setDropConnectMenu(null)}
              style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: 2, display: 'inline-flex' }}
              title="Отмена"
            >
              <X size={13} />
            </button>
          </div>
          <button
            type="button"
            className="sa-hud-menu-item"
            onClick={() => handleSpawnFromDropMenu('scene')}
          >
            <PlusSquare size={14} color="#3b82f6" />
            <span>{language === 'en' ? '+ New Scene' : '+ Новая Сцена'}</span>
          </button>
          <button
            type="button"
            className="sa-hud-menu-item"
            onClick={() => handleSpawnFromDropMenu('decision')}
          >
            <GitFork size={14} color="#f59e0b" />
            <span>{language === 'en' ? '+ New Decision' : '+ Новая Развилка'}</span>
          </button>
          <button
            type="button"
            className="sa-hud-menu-item"
            onClick={() => handleSpawnFromDropMenu('ending')}
          >
            <Flag size={14} color="#a855f7" />
            <span>{language === 'en' ? '+ New Ending' : '+ Новый Финал'}</span>
          </button>
        </div>
      )}

      {/* КОНТЕКСТНОЕ МЕНЮ ПО ПРАВОЙ КНОПКЕ МЫШИ */}
      <CanvasContextMenu
        menu={contextMenu}
        onClose={() => setContextMenu(null)}
        onSpawnNode={(type, pos) => {
          const newId = addNode(type, pos);
          if (newId) setSelectedNodeId(newId);
        }}
        onOpenCustomNodeModal={(pos) => openCustomNodeModal(pos)}
        onSpawnRegion={(pos) => addRegion(pos)}
        onAutoLayout={() => autoLayout('LR')}
        onSaveProject={handleQuickSave}
        onOpenVariables={() => setVarManagerOpen(true)}
        onPlayFromNode={(nodeId) => {
          setPlayerStartNodeId(nodeId);
          setPlayerOpen(true);
        }}
      />

      {/* ОСНОВНОЕ ПОЛОТНО С ВЬЮПОРТ-ВИРТУАЛИЗАЦИЕЙ (ZERO-LAG 1000+ NODES) */}
      {mobileViewMode === 'canvas' ? (
        <ReactFlow
          nodes={canvasNodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{ type: 'default' }}
          onlyRenderVisibleElements={true}
          elevateNodesOnSelect={false}
          selectionMode="partial"
          onInit={setReactFlowInstance}
          onMoveEnd={(_, viewport) => useStoryStore.setState({ viewport })}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
          onNodeContextMenu={handleNodeContextMenu}
          onNodeClick={(_, node) => {
            if (node.type === 'regionNode') return;
            setSelectedNodeId(node.id);
            setEditingNodeId(node.id);
          }}
          onNodeDragStart={handleNodeDragStart}
          onNodeDrag={handleNodeDrag}
          onNodeDragStop={handleNodeDragStop}
          onPaneClick={() => {
            setSelectedNodeId(null);
            setContextMenu(null);
            setDropConnectMenu(null);
          }}
          onPaneContextMenu={handleContextMenu}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onEdgeClick={onEdgeClick}
          onEdgeDoubleClick={onEdgeClick}
          proOptions={{ hideAttribution: true }}
          fitView
        >
          <Background gap={20} color="var(--dots-color)" />
        </ReactFlow>
      ) : (
        <div style={styles.mobileListContainer}>
          <div style={styles.mobileListInner}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem' }}>
                {t.nodes.scene} ({nodes.length})
              </h3>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => addNode('scene')} style={styles.smallAddBtn}>
                  {t.toolbar.addScene}
                </button>
                <button onClick={() => addNode('decision')} style={styles.smallAddBtn}>
                  {t.toolbar.addDecision}
                </button>
              </div>
            </div>

            {nodes.map((n) => {
              const out = edges.filter((e) => e.source === n.id);
              return (
                <div key={n.id} onClick={() => setEditingNodeId(n.id)} style={styles.mobileSceneCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.96rem' }}>{n.data?.label}</span>
                    <span style={styles.mobileTypeBadge}>{n.data?.type || 'scene'}</span>
                  </div>
                  {n.data?.notes && (
                    <div style={{ fontSize: '0.82rem', opacity: 0.75, marginTop: 4 }}>{n.data.notes}</div>
                  )}
                  <div style={{ fontSize: '0.75rem', opacity: 0.65, marginTop: 8 }}>
                    {t.palette.linesCount}: {n.data?.dialogue?.length || 0} • {out.length}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* МОБИЛЬНАЯ НИЖНЯЯ ПАНЕЛЬ НАВИГАЦИИ */}
      <nav className="sa-mobile-bottom-nav" style={styles.mobileBottomBar}>
        <button
          onClick={() => setMobileViewMode(mobileViewMode === 'canvas' ? 'list' : 'canvas')}
          style={styles.mobileNavBtn}
        >
          {mobileViewMode === 'canvas' ? <Layers size={19} /> : <MapIcon size={19} />}
          <span>{mobileViewMode === 'canvas' ? 'Список' : 'Полотно'}</span>
        </button>
        <button
          onClick={() => {
            const newId = addNode('scene');
            setEditingNodeId(newId);
          }}
          style={styles.mobileNavBtn}
        >
          <PlusSquare size={19} color="#2563eb" />
          <span>{t.toolbar.addScene}</span>
        </button>
        <button onClick={() => setCharManagerOpen(true)} style={styles.mobileNavBtn}>
          <Users size={19} />
          <span>Герои</span>
        </button>
        <button onClick={() => setVarManagerOpen(true)} style={styles.mobileNavBtn}>
          <Database size={19} color="#d97706" />
          <span>Статы</span>
        </button>
        <button onClick={() => setSettingsOpen(true)} style={styles.mobileNavBtn}>
          <Settings size={19} color="#16a34a" />
          <span>{t.toolbar.settings}</span>
        </button>
      </nav>

      {/* ОВЕРЛЕЙ DRAG & DROP НА ХОЛСТ */}
      {isCanvasDragOver && (
        <div style={styles.dragOverlay}>
          <div style={styles.dragBox}>
            <Cloud size={48} color="#2563eb" />
            <div style={{ fontWeight: 800, fontSize: '1.25rem', marginTop: 10 }}>
              Отпустите .json файл, чтобы загрузить полотно
            </div>
          </div>
        </div>
      )}

      {/* МОДАЛКА / ПОПОВЕР СОЗДАНИЯ КАСТОМНОЙ НОДЫ (+ Кастомная...) */}
      {isCustomNodeModalOpen && (
        <div style={styles.overlay} onClick={() => setCustomNodeModalOpen(false)}>
          <div
            className="sa-modal-card"
            role="dialog"
            aria-modal="true"
            aria-label={t.customNodeModal.title}
            style={{ ...styles.modal, width: 'min(440px, 95vw)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>{t.customNodeModal.title}</h3>
                <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: 2 }}>{t.customNodeModal.subtitle}</div>
              </div>
              <button
                type="button"
                onClick={() => setCustomNodeModalOpen(false)}
                style={styles.iconBtn}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomNodeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, opacity: 0.8, marginBottom: 6 }}>
                  {t.customNodeModal.presetsPrompt}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {t.customNodeModal.presets.map((preset) => {
                    const PresetIcon = resolveCustomNodeIcon(preset.icon);
                    return (
                      <button
                        key={preset.badge}
                        type="button"
                        onClick={() => {
                          setCustomBadgeInput(preset.badge);
                          setCustomTitleInput(preset.title);
                          setCustomColorInput(preset.color);
                          setCustomIconInput(preset.icon);
                        }}
                        style={{
                          height: 32,
                          padding: '0 10px',
                          borderRadius: 8,
                          border: `1px solid ${preset.color}`,
                          background: hexToRgba(preset.color, 0.14),
                          color: 'var(--text-color)',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <PresetIcon size={13} color={preset.color} />
                        <span>{preset.badge}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={styles.fieldLabel}>{t.customNodeModal.badgeLabelPrompt}</label>
                <input
                  value={customBadgeInput}
                  onChange={(e) => setCustomBadgeInput(e.target.value)}
                  placeholder={t.customNodeModal.badgeLabelPlaceholder}
                  style={{ ...styles.input, width: '100%' }}
                  autoFocus
                />
              </div>

              <div>
                <label style={styles.fieldLabel}>{t.customNodeModal.nodeTitlePrompt}</label>
                <input
                  value={customTitleInput}
                  onChange={(e) => setCustomTitleInput(e.target.value)}
                  placeholder={t.customNodeModal.nodeTitlePlaceholder}
                  style={{ ...styles.input, width: '100%' }}
                />
              </div>

              <div>
                <label style={styles.fieldLabel}>{t.customNodeModal.colorPrompt}</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {CUSTOM_NODE_COLORS.map((hex) => {
                    const active = hex.toLowerCase() === customColorInput.toLowerCase();
                    return (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setCustomColorInput(hex)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: hex,
                          border: active ? '2.5px solid #ffffff' : '1px solid rgba(255,255,255,0.25)',
                          boxShadow: active ? `0 0 0 2px ${hex}` : 'none',
                          cursor: 'pointer'
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={styles.fieldLabel}>{t.customNodeModal.iconPrompt}</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {CUSTOM_NODE_ICONS.map((ico) => {
                    const active = ico === customIconInput;
                    const IcoComponent = resolveCustomNodeIcon(ico);
                    return (
                      <button
                        key={ico}
                        type="button"
                        onClick={() => setCustomIconInput(ico)}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          background: active ? hexToRgba(customColorInput, 0.22) : 'var(--bg-color)',
                          border: active ? `1.5px solid ${customColorInput}` : '1px solid var(--node-border)',
                          color: active ? customColorInput : 'var(--text-color)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <IcoComponent size={16} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setCustomNodeModalOpen(false)}
                  style={styles.secondaryFormBtn}
                >
                  {t.customNodeModal.cancel}
                </button>
                <button
                  type="submit"
                  style={{ ...styles.primaryBtn, background: customColorInput }}
                >
                  <Sparkles size={15} />
                  <span>{t.customNodeModal.create}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО НАСТРОЕК */}
            {/* ЭНЦИКЛОПЕДИЯ СЦЕНАРИСТА («КОДЕКС MITORY») */}
      <EncyclopediaModal
        isOpen={isEncyclopediaOpen}
        onClose={() => setEncyclopediaOpen(false)}
      />

      {isSettingsOpen && (
        <div style={styles.overlay} onClick={() => setSettingsOpen(false)}>
          <div
            className="sa-modal-card"
            role="dialog"
            aria-modal="true"
            aria-label={t.settings.title}
            style={{ ...styles.modal, width: 'min(540px, 95vw)', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <Settings size={19} color="#3b82f6" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800 }}>{t.settings.title}</h3>
                  <div style={{ fontSize: '0.76rem', opacity: 0.7, marginTop: 2 }}>{t.settings.subtitle}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                style={styles.iconBtn}
                title={t.settings.close}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* 1. Язык интерфейса: Русский / English */}
              <div style={styles.settingsCard}>
                <div style={styles.settingsSectionHeader}>
                  <Globe size={15} color="#3b82f6" />
                  <span>{t.settings.languageSection}</span>
                </div>
                <div style={styles.settingsHint}>{t.settings.languageHint}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <button
                    type="button"
                    onClick={() => setLanguage('ru')}
                    style={{
                      ...styles.segmentBtn,
                      ...(language === 'ru' ? styles.segmentBtnActive : {})
                    }}
                  >
                    <Globe size={14} />
                    <span>{t.settings.ru}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('en')}
                    style={{
                      ...styles.segmentBtn,
                      ...(language === 'en' ? styles.segmentBtnActive : {})
                    }}
                  >
                    <Globe size={14} />
                    <span>{t.settings.en}</span>
                  </button>
                </div>
              </div>

              {/* КОНФИГУРАТОР ПАНЕЛИ ИНСТРУМЕНТОВ */}
              <div style={styles.settingsCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={styles.settingsSectionHeader}>
                    <Sliders size={15} color="#38bdf8" />
                    <span>{t.settings.toolbarSection || 'Панель инструментов и кнопки'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      resetToolbar();
                      showToast(language === 'en' ? 'Toolbar reset to defaults' : 'Панель сброшена по умолчанию', 'info');
                    }}
                    style={{
                      ...styles.segmentBtn,
                      padding: '3px 8px',
                      fontSize: '0.72rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                    title="Сбросить расположение кнопок"
                  >
                    <RotateCcw size={12} />
                    <span>{t.settings.resetToolbarBtn || 'Сброс'}</span>
                  </button>
                </div>
                <div style={styles.settingsHint}>
                  {t.settings.toolbarHint || 'Настройте размещение элементов между слотами шапки и плавающего дока'}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                  {(toolbarItems || []).map((item) => {
                    const info = TOOLBAR_ITEM_INFO[item.id] || { labelRu: item.id, labelEn: item.id };
                    const itemLabel = language === 'en' ? info.labelEn : info.labelRu;
                    const isItemActive = Boolean(item.visible && item.slot !== 'hidden');
                    const itemIconMap = {
                      'project-title': <FileCode size={14} color="#3b82f6" />,
                      'history-actions': <Undo2 size={14} color="#94a3b8" />,
                      'node-create': <PlusSquare size={14} color="#3b82f6" />,
                      'chips-counters': <Users size={14} color="#10b981" />,
                      'search-action': <Search size={14} color="#38bdf8" />,
                      'save-action': <Save size={14} color="#10b981" />,
                      'play-action': <Play size={14} color="#3b82f6" />,
                      'encyclopedia-action': <BookOpen size={14} color="#38bdf8" />,
                      'settings-action': <Settings size={14} color="#94a3b8" />
                    };
                    const pillOptions = [
                      { id: 'top-left', label: language === 'en' ? 'Left' : 'Слева' },
                      { id: 'top-center', label: language === 'en' ? 'Center' : 'Центр' },
                      { id: 'top-right', label: language === 'en' ? 'Right' : 'Справа' },
                      { id: 'bottom-bar', label: language === 'en' ? 'Dock ⬇' : 'Док ⬇' }
                    ];

                    return (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          flexWrap: 'wrap',
                          padding: '7px 10px',
                          borderRadius: 9,
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid var(--panel-border, rgba(51, 65, 85, 0.4))',
                          opacity: isItemActive ? 1 : 0.55
                        }}
                      >
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 7,
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            minWidth: 0,
                            flex: 1
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isItemActive}
                            onChange={() => toggleItemVisibility(item.id)}
                            style={{ cursor: 'pointer', accentColor: '#2563eb' }}
                          />
                          <span style={{ display: 'inline-flex', flexShrink: 0 }}>
                            {itemIconMap[item.id] || <Sliders size={14} />}
                          </span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {itemLabel}
                          </span>
                        </label>

                        <div className="sa-seg-pill-group" role="group" aria-label={itemLabel}>
                          {pillOptions.map((pill) => {
                            const isPillSelected = isItemActive && item.slot === pill.id;
                            return (
                              <button
                                key={pill.id}
                                type="button"
                                className={`sa-seg-pill-btn ${isPillSelected ? 'is-active' : ''}`}
                                onClick={() => moveToolbarItem(item.id, pill.id)}
                              >
                                {pill.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

                            {/* 2. Оформление: Тёмная / Светлая / Сепия */}
              <div style={styles.settingsCard}>
                <div style={styles.settingsSectionHeader}>
                  <Sun size={15} color="#f59e0b" />
                  <span>{t.settings.themeSection}</span>
                </div>
                <div style={styles.settingsHint}>{t.settings.themeHint}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    style={{
                      ...styles.segmentBtn,
                      ...(currentTheme === 'dark' ? styles.segmentBtnActive : {})
                    }}
                  >
                    <Moon size={14} /> {t.settings.themeDark}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    style={{
                      ...styles.segmentBtn,
                      ...(currentTheme === 'light' ? styles.segmentBtnActive : {})
                    }}
                  >
                    <Sun size={14} /> {t.settings.themeLight}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('soft')}
                    style={{
                      ...styles.segmentBtn,
                      ...(currentTheme === 'soft' ? styles.segmentBtnActive : {})
                    }}
                  >
                    <Coffee size={14} /> {t.settings.themeSoft}
                  </button>
                </div>
              </div>

              {/* 3. Интеграция ИИ (MCP): статус моста, токен и порт */}
              <div style={styles.settingsCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                  <div style={styles.settingsSectionHeader}>
                    <Cpu size={15} color="#10b981" />
                    <span>{t.settings.mcpSection}</span>
                  </div>
                  <span style={styles.portPill}>
                    {t.settings.mcpPortLabel} <code>{t.settings.mcpPortValue}</code>
                  </span>
                </div>
                <div style={styles.settingsHint}>{t.settings.mcpHint}</div>

                <div style={{ fontSize: '0.79rem', fontWeight: 700, marginTop: 4 }}>
                  {t.settings.mcpStatusLabel}{' '}
                  <span style={{ color: activeMcpToken ? '#10b981' : '#94a3b8' }}>
                    {mcpStatus || t.settings.mcpDisconnected}
                  </span>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!mcpTokenInput.trim()) return;
                    setActiveMcpToken(mcpTokenInput.trim());
                    setMcpTokenInput('');
                  }}
                  style={{ display: 'flex', gap: 8, marginTop: 6 }}
                >
                  <input
                    type="password"
                    value={mcpTokenInput}
                    disabled={Boolean(activeMcpToken)}
                    onChange={(e) => setMcpTokenInput(e.target.value)}
                    placeholder={t.settings.mcpTokenPlaceholder}
                    style={{ ...styles.input, flex: 1 }}
                  />
                  {!activeMcpToken ? (
                    <button type="submit" style={styles.primaryBtn}>
                      {t.settings.mcpConnect}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMcpToken('');
                        setMcpStatus(t.settings.mcpDisconnected);
                      }}
                      style={styles.dangerBtn}
                    >
                      {t.settings.mcpDisconnect}
                    </button>
                  )}
                </form>
              </div>

              {/* 4. Экспорт и хранение + инструменты проекта */}
              <div style={styles.settingsCard}>
                <div style={styles.settingsSectionHeader}>
                  <Download size={15} color="#3b82f6" />
                  <span>{t.settings.exportSection}</span>
                </div>
                <div style={styles.settingsHint}>{t.settings.exportHint}</div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                  <button
                    type="button"
                    onClick={handleExportHtmlFromSettings}
                    style={{ ...styles.primaryBtn, background: '#16a34a', flex: 1 }}
                  >
                    <FileCode size={15} />
                    <span>{t.settings.exportHtmlBtn}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportJsonFromSettings}
                    style={{ ...styles.primaryBtn, flex: 1 }}
                  >
                    <Download size={15} />
                    <span>{t.settings.exportJsonBtn}</span>
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSettingsOpen(false);
                      setStorageOpen(true);
                    }}
                    style={styles.secondaryFormBtn}
                  >
                    <FolderOpen size={14} color="#3b82f6" />
                    <span>{t.settings.openStorageBtn}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSettingsOpen(false);
                      setValidatorOpen(true);
                    }}
                    style={styles.secondaryFormBtn}
                  >
                    <Search size={14} color="#3b82f6" />
                    <span>{t.settings.openValidatorBtn}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      autoLayout('LR');
                      setSettingsOpen(false);
                    }}
                    style={styles.secondaryFormBtn}
                  >
                    <LayoutGrid size={14} color="#60a5fa" />
                    <span>{t.settings.autoLayoutBtn}</span>
                  </button>
                </div>
              </div>

              {/* 5. Обучение: Запустить интерактивный тур */}
              <div style={styles.settingsCard}>
                <div style={styles.settingsSectionHeader}>
                  <GraduationCap size={15} color="#8b5cf6" />
                  <span>{t.settings.onboardingSection}</span>
                </div>
                <div style={styles.settingsHint}>{t.settings.onboardingHint}</div>
                <button
                  type="button"
                  onClick={() => {
                    setSettingsOpen(false);
                    setTourOpen(true);
                  }}
                  style={styles.tourTriggerBtn}
                >
                  <GraduationCap size={15} />
                  <span>{t.settings.startTourBtn}</span>
                </button>
              </div>

              {/* 6. О программе: Mitory: Story Builder v0.2.0 и обновления по воздуху (Tauri Updater v2) */}
              <div style={styles.settingsCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <MitoryLogo size={40} />
                    <div>
                      <div style={{ ...styles.settingsSectionHeader, marginBottom: 2 }}>
                        <span>Mitory: Story Builder v0.2.0</span>
                      </div>
                      <div style={{ ...styles.settingsHint, margin: 0 }}>
                        {t.settings.aboutSubtitle || 'Local-first студия визуальных новелл и интерактивных историй'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCheckForUpdates}
                    disabled={updaterStatus === 'checking'}
                    style={styles.secondaryFormBtn}
                  >
                    <RefreshCw size={13} className={updaterStatus === 'checking' ? 'spin' : ''} />
                    <span>
                      {updaterStatus === 'checking'
                        ? (t.settings.checkingUpdates || 'Проверка...')
                        : (t.settings.checkUpdatesBtn || 'Проверить обновления')}
                    </span>
                  </button>
                </div>

                {updaterStatus === 'up-to-date' && (
                  <div style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                    <CheckCircle size={14} />
                    <span>{t.settings.upToDate || 'У вас установлена последняя версия Mitory'}</span>
                  </div>
                )}
                {updaterStatus === 'available' && (
                  <div style={{ fontSize: '0.78rem', color: '#3b82f6', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                    <Sparkles size={14} />
                    <span>{t.settings.updateAvailable || 'Доступна новая версия'}: {updateVersion}</span>
                  </div>
                )}
                {updaterStatus === 'error' && (
                  <div style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                    <AlertCircle size={14} />
                    <span>{t.settings.updateError || 'Ошибка проверки обновлений'}</span>
                  </div>
                )}
                {updaterStatus === 'browser' && (
                  <div style={{ fontSize: '0.78rem', opacity: 0.7, marginTop: 4 }}>
                    {t.settings.updateDesktopOnly || 'Проверка обновлений доступна в десктопной версии Mitory'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* НЕБЛОКИРУЮЩЕЕ ПЛАВАЮЩЕЕ ОБУЧЕНИЕ В ПРАВОМ НИЖНЕМ УГЛУ (ONBOARDING TOUR) */}
      <OnboardingTour isOpen={isTourOpen} onClose={() => setTourOpen(false)} />

      {/* МОДАЛЬНЫЕ ОКНА И ПАНЕЛИ */}
      <UnsavedChangesModal
        isOpen={showUnsavedChangesModal}
        mode={pendingGuardMode}
        onClose={handleCancelGuard}
        onSaveAndContinue={handleSaveAndContinue}
        onDiscardAndContinue={handleDiscardAndContinue}
      />
      {isCharManagerOpen && <CharacterManager onClose={() => setCharManagerOpen(false)} />}
      {isVarManagerOpen && <VariablesManager onClose={() => setVarManagerOpen(false)} />}
      {isStorageOpen && (
        <StorageManager
          onClose={() => setStorageOpen(false)}
          fileHandle={activeFileHandle}
          onFileHandleChange={setActiveFileHandle}
        />
      )}
      {isPlayerOpen && <StoryPlayer initialNodeId={playerStartNodeId} onClose={() => { setPlayerOpen(false); setPlayerStartNodeId(null); }} />}
      {editingNodeId && (
        <SceneEditor
          nodeId={editingNodeId}
          onClose={() => setEditingNodeId(null)}
          onSelectNode={(id) => setEditingNodeId(id)}
          onPlayFromNode={(nodeId) => {
            setPlayerStartNodeId(nodeId);
            setPlayerOpen(true);
          }}
        />
      )}

      {/* ОКНО ПОИСКА И ПРОВЕРКИ СЮЖЕТА */}
      {isValidatorOpen && (
        <div style={styles.overlay} onClick={() => setValidatorOpen(false)}>
          <div
            className="sa-modal-card"
            style={{ ...styles.modal, width: 'min(520px, 94vw)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Search size={18} color="#2563eb" /> {t.validatorModal.title}
              </h3>
              <button onClick={() => setValidatorOpen(false)} style={styles.iconBtn}>
                <X size={20} />
              </button>
            </div>

            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.validatorModal.searchPlaceholder}
              style={{ ...styles.input, width: '100%', marginBottom: 14, boxSizing: 'border-box' }}
              autoFocus
            />

            <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 16 }}>
              {filteredNodes.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    if (activeRfInstance && n?.position) {
                      activeRfInstance.setCenter(n.position.x + 120, n.position.y + 60, {
                        zoom: 1.1,
                        duration: 500
                      });
                    }
                    setSelectedNodeId(n.id);
                    setEditingNodeId(n.id);
                    setValidatorOpen(false);
                  }}
                  style={styles.searchResultRow}
                >
                  <span style={{ fontWeight: 600 }}>{n.data?.label}</span>
                  <span style={{ fontSize: '0.75rem', opacity: 0.65 }}>
                    {t.validatorModal.linesCount}: {n.data?.dialogue?.length || 0}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid var(--node-border)', paddingTop: 12 }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldAlert size={16} color="#d97706" /> {t.validatorModal.integrityHeader} ({validationIssues.length})
              </div>
              {validationIssues.length === 0 ? (
                <div style={{ fontSize: '0.84rem', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle size={15} color="#16a34a" />
                  <span>{t.validatorModal.noIssues}</span>
                </div>
              ) : (
                <div style={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {validationIssues.map((iss, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        if (iss.nodeId) {
                          setEditingNodeId(iss.nodeId);
                          setValidatorOpen(false);
                        }
                      }}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 8,
                        background: 'var(--bg-color)',
                        borderLeft: `3px solid ${iss.type === 'error' ? '#ef4444' : '#d97706'}`,
                        fontSize: '0.8rem',
                        cursor: iss.nodeId ? 'pointer' : 'default'
                      }}
                    >
                      {iss.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ОКНО НАСТРОЙКИ СВЯЗИ (ПЕРЕХОДА) */}
      {editingEdge && (
        <div style={styles.overlay} onClick={() => setEditingEdge(null)}>
          <div
            className="sa-modal-card"
            style={{ ...styles.modal, width: 'min(460px, 95vw)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <h3 style={{ margin: 0 }}>{t.edgeModal.title}</h3>
              <button onClick={() => setEditingEdge(null)} style={styles.iconBtn}>
                <X size={20} />
              </button>
            </div>

            <label style={{ display: 'block', marginBottom: 5, fontSize: '0.84rem', fontWeight: 600 }}>
              {t.edgeModal.labelPrompt}
            </label>
            <input
              value={edgeLabelInput}
              onChange={(e) => setEdgeLabelInput(e.target.value)}
              style={{ ...styles.input, width: '100%', marginBottom: 15, boxSizing: 'border-box' }}
              placeholder={t.edgeModal.labelPlaceholder}
            />

            <div style={styles.condBox}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: '0.84rem', fontWeight: 700, color: '#f59e0b' }}>
                <Lock size={14} color="#f59e0b" />
                <span>{t.edgeModal.conditionPrompt}</span>
              </label>
              <ConditionsEditor conditions={edgeConditions} onChange={setEdgeConditions} variables={variables} />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={handleEdgeDelete} style={styles.dangerBtn}>
                <Trash2 size={15} /> {t.edgeModal.deleteEdge}
              </button>
              <button onClick={handleEdgeSave} style={styles.primaryBtn}>
                {t.edgeModal.saveEdge}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          style={{
            ...styles.toast,
            pointerEvents: toast.action ? 'auto' : 'none',
            background:
              toast.type === 'success' ? '#16a34a' : toast.type === 'error' ? '#dc2626' : '#2563eb'
          }}
        >
          {toast.type === 'success' && <CheckCircle size={18} />}
          {toast.type === 'error' && <AlertCircle size={18} />}
          {toast.type === 'info' && <Info size={18} />}
          <span>{toast.text}</span>
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action.onClick?.();
                clearToast?.();
              }}
              style={{
                marginLeft: 6,
                padding: '3px 9px',
                borderRadius: 999,
                border: '1px solid rgba(255, 255, 255, 0.45)',
                background: 'rgba(255, 255, 255, 0.18)',
                color: '#ffffff',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}

      {/* ВИДЖЕТ КООРДИНАТ И КОМПАС ВОЗВРАТА К ГРАФУ */}
      <CanvasCoordsWidget nodes={nodes} />
    </div>
    </Suspense>
  );
}

const styles = {
  toolbar: {
    position: 'absolute',
    top: 44,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 24,
    display: 'flex',
    gap: 6,
    background: 'var(--panel-bg)',
    padding: '6px 10px',
    borderRadius: 14,
    boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
    border: '1px solid var(--panel-border, #334155)',
    alignItems: 'center',
    maxWidth: 'calc(100vw - 24px)',
    boxSizing: 'border-box',
    whiteSpace: 'nowrap'
  },
  projectTitleInput: {
    width: 'clamp(115px, 13vw, 170px)',
    height: 34,
    boxSizing: 'border-box',
    border: '1px solid var(--node-border)',
    background: 'var(--bg-color)',
    color: 'var(--text-color)',
    fontWeight: 700,
    fontSize: '0.82rem',
    padding: '0 10px',
    borderRadius: 8
  },
  group: { display: 'flex', gap: 6, alignItems: 'center' },
  sep: { width: 1, height: 22, background: 'var(--node-border)', margin: '0 2px' },
  btn: {
    height: 36,
    boxSizing: 'border-box',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '0 10px',
    cursor: 'pointer',
    border: '1px solid var(--node-border)',
    borderRadius: 8,
    background: 'var(--bg-color)',
    color: 'var(--text-color)',
    fontWeight: 600,
    fontSize: '0.8rem'
  },
  playBtn: {
    height: 34,
    boxSizing: 'border-box',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '0 15px',
    cursor: 'pointer',
    border: 'none',
    borderRadius: 8,
    background: 'linear-gradient(135deg, #059669, #10b981)',
    color: '#ffffff',
    fontWeight: 800,
    fontSize: '0.83rem',
    boxShadow: '0 0 16px rgba(16, 185, 129, 0.4)'
  },
  iconBtn: {
    width: 36,
    height: 36,
    boxSizing: 'border-box',
    background: 'none',
    border: '1px solid transparent',
    cursor: 'pointer',
    color: 'var(--text-color)',
    padding: 0,
    borderRadius: 8,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  fieldLabel: {
    display: 'block',
    fontSize: '0.78rem',
    fontWeight: 700,
    marginBottom: 5,
    opacity: 0.85
  },
  settingsCard: {
    padding: '12px 14px',
    borderRadius: 12,
    background: 'var(--bg-color)',
    border: '1px solid var(--node-border)',
    display: 'flex',
    flexDirection: 'column',
    gap: 4
  },
  settingsSectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    fontWeight: 800,
    fontSize: '0.88rem'
  },
  settingsHint: {
    fontSize: '0.76rem',
    opacity: 0.72,
    lineHeight: 1.35
  },
  segmentBtn: {
    flex: 1,
    height: 36,
    boxSizing: 'border-box',
    padding: '0 12px',
    borderRadius: 8,
    border: '1px solid var(--node-border)',
    background: 'var(--panel-bg)',
    color: 'var(--text-color)',
    fontWeight: 600,
    fontSize: '0.82rem',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  segmentBtnActive: {
    borderColor: '#2563eb',
    background: 'rgba(37, 99, 235, 0.16)',
    color: '#60a5fa',
    fontWeight: 700
  },
  portPill: {
    fontSize: '0.72rem',
    padding: '3px 8px',
    borderRadius: 8,
    background: 'var(--panel-bg)',
    border: '1px solid var(--node-border)',
    opacity: 0.85
  },
  secondaryFormBtn: {
    height: 36,
    boxSizing: 'border-box',
    padding: '0 10px',
    borderRadius: 8,
    border: '1px solid var(--node-border)',
    background: 'var(--panel-bg)',
    color: 'var(--text-color)',
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5
  },
  tourTriggerBtn: {
    marginTop: 6,
    height: 36,
    boxSizing: 'border-box',
    padding: '0 14px',
    borderRadius: 8,
    border: '1px solid rgba(139, 92, 246, 0.45)',
    background: 'rgba(139, 92, 246, 0.16)',
    color: '#c4b5fd',
    fontWeight: 700,
    fontSize: '0.84rem',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  mobileBottomBar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: 62,
    background: 'var(--panel-bg)',
    borderTop: '1px solid var(--node-border)',
    zIndex: 30,
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: '0 6px'
  },
  mobileNavBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-color)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
    fontSize: '0.7rem',
    fontWeight: 600,
    cursor: 'pointer',
    padding: '6px 10px'
  },
  mobileListContainer: {
    width: '100%',
    height: '100%',
    overflowY: 'auto',
    padding: '74px 14px 80px 14px',
    boxSizing: 'border-box',
    background: 'var(--bg-color)'
  },
  mobileListInner: {
    maxWidth: 600,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 10
  },
  mobileSceneCard: {
    padding: 14,
    borderRadius: 12,
    background: 'var(--panel-bg)',
    border: '1px solid var(--node-border)',
    cursor: 'pointer'
  },
  mobileTypeBadge: {
    fontSize: '0.7rem',
    padding: '2px 8px',
    borderRadius: 999,
    background: 'rgba(37, 99, 235, 0.15)',
    color: '#2563eb',
    fontWeight: 700,
    textTransform: 'uppercase'
  },
  smallAddBtn: {
    height: 36,
    boxSizing: 'border-box',
    padding: '0 10px',
    borderRadius: 8,
    border: 'none',
    background: '#2563eb',
    color: '#fff',
    fontWeight: 600,
    fontSize: '0.78rem',
    cursor: 'pointer'
  },
  dragOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(37, 99, 235, 0.18)',
    backdropFilter: 'blur(4px)',
    zIndex: 3500,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none'
  },
  dragBox: {
    padding: '32px 48px',
    borderRadius: 16,
    background: 'var(--panel-bg)',
    border: '3px dashed #2563eb',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.68)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2400,
    padding: 12
  },
  modal: {
    width: 'min(380px, 95vw)',
    background: 'var(--panel-bg)',
    color: 'var(--text-color)',
    padding: 20,
    borderRadius: 16,
    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
    border: '1px solid var(--node-border)'
  },
  searchResultRow: {
    padding: '8px 10px',
    borderRadius: 8,
    background: 'var(--bg-color)',
    border: '1px solid var(--node-border)',
    marginBottom: 6,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    fontSize: '0.86rem'
  },
  condBox: {
    background: 'var(--bg-color)',
    padding: 12,
    borderRadius: 12,
    border: '1px solid var(--node-border)',
    marginBottom: 18
  },
  input: {
    height: 36,
    boxSizing: 'border-box',
    padding: '0 10px',
    borderRadius: 8,
    border: '1px solid var(--node-border)',
    background: 'var(--bg-color)',
    color: 'var(--text-color)',
    fontFamily: 'inherit'
  },
  primaryBtn: {
    height: 36,
    boxSizing: 'border-box',
    padding: '0 16px',
    background: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  dangerBtn: {
    height: 36,
    boxSizing: 'border-box',
    padding: '0 14px',
    background: 'rgba(239, 68, 68, 0.12)',
    color: '#ef4444',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    borderRadius: 8,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    fontWeight: 600
  },
  toast: {
    position: 'fixed',
    bottom: 74,
    left: '50%',
    transform: 'translateX(-50%)',
    color: 'white',
    padding: '10px 18px',
    borderRadius: 30,
    boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    zIndex: 3000,
    fontSize: '0.88rem',
    fontWeight: 600,
    pointerEvents: 'none',
    animation: 'fadeIn 0.2s ease-out'
  }
};
