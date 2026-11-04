import React, { useState, useMemo } from 'react';
import {
  Archive,
  ArrowUpRight,
  Trash2,
  Folder,
  FolderPlus,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  CheckSquare,
  Square,
  Check,
  X,
  Edit2,
  GripVertical,
  Inbox,
  RotateCcw
} from 'lucide-react';
import { useStoryStore } from '../store';
import { getTranslation } from '../i18n/translations';

function LeftNodePalette({
  collapsed: controlledCollapsed,
  onToggleCollapse,
  onClearSelection,
  isPeekingPocket = false,
  isStashDropActive = false,
  draggedNodesCount = 0,
  onRestoreFromTrash = null
}) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [isStashDragOver, setIsStashDragOver] = useState(false);

  const isCollapsed =
    typeof controlledCollapsed === 'boolean' ? controlledCollapsed : internalCollapsed;
  const setCollapsed = (nextVal) => {
    const resolved = typeof nextVal === 'function' ? nextVal(isCollapsed) : Boolean(nextVal);
    setInternalCollapsed(resolved);
    if (onToggleCollapse) onToggleCollapse(resolved);
  };

  const panelTop = 42;
  const language = useStoryStore((s) => s.language || 'ru');
  const t = getTranslation(language);

  const stashedNodes = useStoryStore((s) => s.stash || s.stashedNodes || []);
  const stashNodes = useStoryStore((s) => s.stashNodes);
  const restoreFromStash = useStoryStore((s) => s.restoreFromStash || s.unstashNode);
  const restoreMultipleFromStash = useStoryStore((s) => s.restoreMultipleFromStash);
  const deleteStashedNode = useStoryStore((s) => s.deleteStashedNode);
  const setStashedNodesFolder = useStoryStore((s) => s.setStashedNodesFolder);
  const renameStashFolder = useStoryStore((s) => s.renameStashFolder);
  const deleteStashFolder = useStoryStore((s) => s.deleteStashFolder);
  const customFolders = useStoryStore((s) => s.customFolders || []);
  const createStashFolder = useStoryStore((s) => s.createStashFolder);
  const trashedNodes = useStoryStore((s) => s.trashedNodes || []);
  const restoreFromTrash = useStoryStore((s) => s.restoreFromTrash);
  const deleteTrashedNodeForever = useStoryStore((s) => s.deleteTrashedNodeForever);
  const emptyTrash = useStoryStore((s) => s.emptyTrash);
  const [activeTab, setActiveTab] = useState('stash'); // 'stash' | 'trash'

  const [selectedStashIds, setSelectedStashIds] = useState(new Set());
  const [collapsedFolders, setCollapsedFolders] = useState(new Set());
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolder, setEditingFolder] = useState(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [dragOverFolder, setDragOverFolder] = useState(null);

  const allFolders = useMemo(() => {
    const assigned = Array.from(new Set(stashedNodes.map((n) => n.folder).filter(Boolean)));
    const combined = Array.from(new Set([...customFolders, ...assigned]));
    const hasUnassigned = stashedNodes.some((n) => !n.folder || n.folder === 'Общие');
    if (hasUnassigned || combined.length === 0) {
      return ['Общие', ...combined.filter((f) => f !== 'Общие')];
    }
    return combined;
  }, [customFolders, stashedNodes]);

  const handleStartRenameFolder = (folderName, e) => {
    e.stopPropagation();
    setEditingFolder(folderName);
    setEditingFolderName(folderName);
  };

  const handleSaveRenameFolder = (oldName, e) => {
    e?.preventDefault();
    e?.stopPropagation();
    const trimmed = editingFolderName.trim();
    if (trimmed && trimmed !== oldName) {
      if (renameStashFolder) renameStashFolder(oldName, trimmed);
    }
    setEditingFolder(null);
    setEditingFolderName('');
  };

  const handleDeleteFolder = (folderName, e) => {
    e.stopPropagation();
    if (deleteStashFolder) deleteStashFolder(folderName);
  };

  const handleFolderDragStart = (event, folderName, folderNodes) => {
    const nodeIds = folderNodes.map((n) => n.id);
    if (!nodeIds.length || !event?.dataTransfer) return;

    if (window.getSelection) {
      window.getSelection().removeAllRanges();
    }

    const dragGhost = document.createElement('div');
    dragGhost.style.position = 'absolute';
    dragGhost.style.top = '-9999px';
    dragGhost.style.left = '-9999px';
    dragGhost.style.width = '220px';
    dragGhost.style.padding = '8px 12px';
    dragGhost.style.borderRadius = '10px';
    dragGhost.style.background = '#1e293b';
    dragGhost.style.color = '#f8fafc';
    dragGhost.style.border = '2px solid #3b82f6';
    dragGhost.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
    dragGhost.style.fontSize = '0.84rem';
    dragGhost.style.fontWeight = '800';
    dragGhost.style.pointerEvents = 'none';
    dragGhost.style.zIndex = '99999';
    const titleSpan = document.createElement('span');
    titleSpan.textContent = folderName;
    const badgeSpan = document.createElement('span');
    badgeSpan.style.cssText = 'background:#2563eb;color:#fff;border-radius:999px;padding:2px 7px;font-size:0.7rem;margin-left:6px;';
    badgeSpan.textContent = `${nodeIds.length} сцен`;
    dragGhost.appendChild(titleSpan);
    dragGhost.appendChild(badgeSpan);
    document.body.appendChild(dragGhost);
    event.dataTransfer.setDragImage(dragGhost, 110, 20);
    setTimeout(() => {
      if (document.body.contains(dragGhost)) document.body.removeChild(dragGhost);
    }, 0);

    event.dataTransfer.setData('application/stash-node-id', nodeIds[0]);
    event.dataTransfer.setData('application/reactflow-stash-id', nodeIds[0]);
    event.dataTransfer.setData('application/stash-node-ids', JSON.stringify(nodeIds));
    event.dataTransfer.effectAllowed = 'move';
  };

  const toggleSelect = (id, e) => {
    e?.stopPropagation();
    setSelectedStashIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreateFolder = (e) => {
    e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed) {
      setIsCreatingFolder(false);
      return;
    }
    if (createStashFolder) {
      createStashFolder(trimmed);
    }
    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  const toggleFolderCollapse = (folderName) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderName)) next.delete(folderName);
      else next.add(folderName);
      return next;
    });
  };

  const handleFolderDrop = (folderName, e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolder(null);
    const rawIds = e.dataTransfer?.getData('application/stash-node-ids');
    const singleId = e.dataTransfer?.getData('application/stash-node-id');
    let ids = [];
    if (rawIds) {
      try {
        const parsedIds = JSON.parse(rawIds);
        ids = Array.isArray(parsedIds) ? parsedIds : [];
      } catch {
        ids = [];
      }
    }
    if (!ids.length && singleId) ids = [singleId];
    if (ids.length && setStashedNodesFolder) {
      setStashedNodesFolder(ids, folderName);
    }
  };

  const handleStashItemDragStart = (event, stashedNode) => {
    const id = typeof stashedNode === 'string' ? stashedNode : stashedNode?.id;
    if (!id || !event?.dataTransfer) return;

    if (window.getSelection) {
      window.getSelection().removeAllRanges();
    }

    const idsToDrag = selectedStashIds.has(id) && selectedStashIds.size > 1
      ? Array.from(selectedStashIds)
      : [id];

    const dragGhost = document.createElement('div');
    dragGhost.style.position = 'absolute';
    dragGhost.style.top = '-9999px';
    dragGhost.style.left = '-9999px';
    dragGhost.style.width = '210px';
    dragGhost.style.padding = '8px 12px';
    dragGhost.style.borderRadius = '10px';
    dragGhost.style.background = '#1e293b';
    dragGhost.style.color = '#f8fafc';
    dragGhost.style.border = '1.5px solid #3b82f6';
    dragGhost.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
    dragGhost.style.fontSize = '0.82rem';
    dragGhost.style.fontWeight = '700';
    dragGhost.style.pointerEvents = 'none';
    dragGhost.style.zIndex = '99999';
    const titleSpan = document.createElement('span');
    titleSpan.textContent = stashedNode.data?.label || 'Сцена';
    dragGhost.appendChild(titleSpan);
    if (idsToDrag.length > 1) {
      const badgeSpan = document.createElement('span');
      badgeSpan.style.cssText = 'background:#2563eb;color:#fff;border-radius:999px;padding:2px 7px;font-size:0.7rem;margin-left:6px;';
      badgeSpan.textContent = `+${idsToDrag.length}`;
      dragGhost.appendChild(badgeSpan);
    }
    document.body.appendChild(dragGhost);
    event.dataTransfer.setDragImage(dragGhost, 105, 20);
    setTimeout(() => {
      if (document.body.contains(dragGhost)) document.body.removeChild(dragGhost);
    }, 0);

    event.dataTransfer.setData('application/stash-node-id', id);
    event.dataTransfer.setData('application/reactflow-stash-id', id);
    event.dataTransfer.setData('application/stash-node-ids', JSON.stringify(idsToDrag));
    event.dataTransfer.effectAllowed = 'move';
  };

  const handlePocketDrop = (e) => {
    setIsStashDragOver(false);
    const rawIds = e.dataTransfer?.getData('application/story-node-ids');
    const singleId = e.dataTransfer?.getData('application/story-node-id');
    if (rawIds) {
      e.preventDefault();
      try {
        const parsed = JSON.parse(rawIds);
        if (Array.isArray(parsed) && parsed.length > 0) {
          stashNodes(parsed);
          if (onClearSelection) onClearSelection();
        }
      } catch {
        // ignore malformed json
      }
      return;
    }
    if (singleId) {
      e.preventDefault();
      stashNodes([singleId]);
      if (onClearSelection) onClearSelection(singleId);
    }
  };

  const activeDropHighlight = isStashDropActive || isStashDragOver;
  const showPeeking = isCollapsed && (isPeekingPocket || activeDropHighlight);

  return (
    <>
      <aside
        className="sa-left-palette sa-node-palette header-unified"
        style={{
          ...styles.panel,
          top: panelTop,
          height: `calc(100vh - ${panelTop}px)`,
          bottom: 'auto',
          transform: isCollapsed ? 'translateX(-100%)' : 'translateX(0)'
        }}
        onDragOver={(e) => {
          if (
            e.dataTransfer?.types?.includes('application/story-node-id') ||
            e.dataTransfer?.types?.includes('application/story-node-ids')
          ) {
            e.preventDefault();
            setIsStashDragOver(true);
          }
        }}
        onDragLeave={() => setIsStashDragOver(false)}
        onDrop={handlePocketDrop}
      >
        {/* Плавающий таб-язычок строго на правом краю самой левой панели */}
        <button
          type="button"
          onClick={() => setCollapsed(!isCollapsed)}
          className="sa-left-palette-toggle"
          style={styles.rightEdgeTab}
          title={isCollapsed ? t.palette.expandTooltip : t.palette.collapseTooltip}
          aria-label={isCollapsed ? t.palette.expandTooltip : t.palette.collapseTooltip}
        >
          <Archive size={15} color="#60a5fa" />
          {isCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          {stashedNodes.length > 0 && (
            <span style={styles.tabCountBadge}>{stashedNodes.length}</span>
          )}
        </button>

        {/* Шапка панели «Карман сцен» с табами: Отложенные и Корзина */}
        <div style={{ ...styles.header, flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {activeTab === 'trash' ? (
                <Trash2 size={16} color="#ef4444" />
              ) : (
                <Archive size={16} color="#3b82f6" />
              )}
              <div style={{ fontWeight: 800, fontSize: '0.86rem', letterSpacing: '0.01em' }}>
                {activeTab === 'trash'
                  ? language === 'en' ? 'Scene Trash' : 'Корзина сцен'
                  : t.palette.pocketTitle}
              </div>
            </div>
            {activeTab === 'stash' && (
              <button
                type="button"
                onClick={() => setIsCreatingFolder((v) => !v)}
                style={styles.folderAddBtn}
                title="Создать папку внутри кармана"
              >
                <FolderPlus size={14} />
              </button>
            )}
          </div>

          {/* Переключатель табов: [Отложенные (N)] и [Корзина (M)] */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, background: 'rgba(15, 23, 42, 0.55)', padding: 3, borderRadius: 8, border: '1px solid var(--panel-border, #334155)' }}>
            <button
              type="button"
              onClick={() => setActiveTab('stash')}
              style={{
                padding: '5px 6px',
                borderRadius: 6,
                border: 'none',
                fontSize: '0.73rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: activeTab === 'stash' ? '#2563eb' : 'transparent',
                color: activeTab === 'stash' ? '#ffffff' : 'var(--text-color, #cbd5e1)',
                transition: 'all 0.15s'
              }}
            >
              {language === 'en' ? `Stashed (${stashedNodes.length})` : `Отложенные (${stashedNodes.length})`}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('trash')}
              style={{
                padding: '5px 6px',
                borderRadius: 6,
                border: 'none',
                fontSize: '0.73rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: activeTab === 'trash' ? '#ef4444' : 'transparent',
                color: activeTab === 'trash' ? '#ffffff' : 'var(--text-color, #cbd5e1)',
                transition: 'all 0.15s'
              }}
            >
              {language === 'en' ? `Trash (${trashedNodes.length})` : `Корзина (${trashedNodes.length})`}
            </button>
          </div>
        </div>

        {activeTab === 'stash' && isCreatingFolder && (
          <form onSubmit={handleCreateFolder} style={styles.newFolderRow}>
            <input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Название папки..."
              autoFocus
              style={styles.newFolderInput}
            />
            <button type="submit" style={styles.folderConfirmBtn}>
              <Check size={13} />
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreatingFolder(false);
                setNewFolderName('');
              }}
              style={styles.folderCancelBtn}
            >
              <X size={13} />
            </button>
          </form>
        )}

        {/* Панель массовых действий при выделении нескольких нод */}
        {activeTab === 'stash' && selectedStashIds.size > 0 && (
          <div className="sa-stash-selection-bar" style={styles.selectionBar}>
            <span>Выбрано: {selectedStashIds.size}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                type="button"
                onClick={() => {
                  const ids = Array.from(selectedStashIds);
                  if (restoreMultipleFromStash) restoreMultipleFromStash(ids);
                  else ids.forEach((id) => restoreFromStash(id));
                  setSelectedStashIds(new Set());
                }}
                style={styles.bulkActionBtn}
                title="Вынести все выбранные сцены на холст"
              >
                <ArrowUpRight size={13} /> Вынести
              </button>
              <button
                type="button"
                onClick={() => {
                  selectedStashIds.forEach((id) => deleteStashedNode(id));
                  setSelectedStashIds(new Set());
                }}
                style={{ ...styles.bulkActionBtn, color: '#ef4444' }}
                title="Удалить выбранные сцены"
              >
                <Trash2 size={13} />
              </button>
              <button
                type="button"
                onClick={() => setSelectedStashIds(new Set())}
                style={styles.bulkActionBtn}
                title="Снять выбор"
              >
                <X size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Тело Кармана сцен — вкладка Отложенные или Корзина */}
        <div style={styles.scrollBody}>
          {activeTab === 'trash' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '4px' }}>
              {trashedNodes.length > 0 && (
                <button
                  type="button"
                  onClick={() => emptyTrash()}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: 8,
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    background: 'rgba(239, 68, 68, 0.12)',
                    color: '#f87171',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                >
                  <Trash2 size={13} />
                  <span>{language === 'en' ? 'Empty Trash' : 'Очистить корзину'}</span>
                </button>
              )}

              {trashedNodes.length === 0 ? (
                <div style={styles.emptyStashBox}>
                  {language === 'en'
                    ? 'Trash is empty. Drag nodes to the bottom-right trash zone to delete them safely.'
                    : 'Корзина пуста. Перетащите ненужную ноду в правый нижний угол экрана для удаления.'}
                </div>
              ) : (
                trashedNodes.map((trashedNode) => {
                  const typeKey = trashedNode.data?.type || 'scene';
                  const badgeColor =
                    typeKey === 'start'
                      ? '#10b981'
                      : typeKey === 'decision'
                      ? '#f59e0b'
                      : typeKey === 'ending'
                      ? '#8b5cf6'
                      : '#3b82f6';
                  const dialogueCount = Array.isArray(trashedNode.data?.dialogue)
                    ? trashedNode.data.dialogue.length
                    : 0;
                  const edgesCount = Array.isArray(trashedNode.savedEdges)
                    ? trashedNode.savedEdges.length
                    : 0;

                  return (
                    <div
                      key={trashedNode.id}
                      style={{
                        ...styles.stashCard,
                        borderLeft: `4px solid ${badgeColor}`,
                        cursor: 'default'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '1px 6px',
                              borderRadius: 4,
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              color: '#ffffff',
                              textTransform: 'uppercase',
                              marginBottom: 4,
                              background: badgeColor
                            }}
                          >
                            {t.nodes?.[typeKey] || t.nodes?.scene || 'Сцена'}
                          </span>
                          <div style={{ fontWeight: 700, fontSize: '0.82rem', wordBreak: 'break-word' }}>
                            {trashedNode.data?.label || t.palette?.untitledScene || 'Сцена без названия'}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteTrashedNodeForever(trashedNode.id)}
                          style={styles.miniActionBtn}
                          title={language === 'en' ? 'Delete permanently' : 'Удалить навсегда'}
                        >
                          <Trash2 size={13} color="#ef4444" />
                        </button>
                      </div>

                      {trashedNode.data?.notes && (
                        <div style={styles.stashNotes}>{trashedNode.data.notes}</div>
                      )}

                      <div style={{ fontSize: '0.69rem', opacity: 0.68, marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                        <span>{t.palette.linesCount}: {dialogueCount}</span>
                        <span>{language === 'en' ? `Links: ${edgesCount}` : `Связей: ${edgesCount}`}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (onRestoreFromTrash) {
                            onRestoreFromTrash(trashedNode.id);
                          } else {
                            restoreFromTrash(trashedNode.id);
                          }
                        }}
                        style={{
                          marginTop: 8,
                          width: '100%',
                          padding: '6px 10px',
                          borderRadius: 7,
                          border: '1px solid rgba(59, 130, 246, 0.45)',
                          background: 'rgba(37, 99, 235, 0.16)',
                          color: '#93c5fd',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6
                        }}
                      >
                        <RotateCcw size={13} />
                        <span>{language === 'en' ? 'Restore' : 'Восстановить'}</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
          <div
            className="sa-pocket-dropzone"
            style={{
              ...styles.section,
              padding: activeDropHighlight ? 10 : '4px',
              background: activeDropHighlight ? 'rgba(37, 99, 235, 0.12)' : 'transparent',
              border: activeDropHighlight ? '2px dashed #3b82f6' : '2px dashed transparent',
              borderRadius: 12,
              transition: 'background 0.2s ease, border-color 0.2s ease, padding 0.2s ease'
            }}
          >
            {activeDropHighlight && (
              <div style={styles.activeDropBanner}>
                <Inbox size={14} style={{ flexShrink: 0 }} />
                <span>{t.palette.dropStackBanner(draggedNodesCount)}</span>
              </div>
            )}

            {stashedNodes.length === 0 ? (
              <div
                style={{
                  ...styles.emptyStashBox,
                  borderColor: activeDropHighlight ? '#3b82f6' : 'var(--panel-border, #334155)'
                }}
              >
                {t.palette.emptyPocket}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {allFolders.map((folderName) => {
                  const folderNodes = stashedNodes.filter((n) => (n.folder || 'Общие') === folderName);
                  const isFolderCollapsed = collapsedFolders.has(folderName);
                  const isOver = dragOverFolder === folderName;

                  return (
                    <div key={folderName} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div
                        className={`sa-stash-folder-header ${isOver ? 'is-drag-over' : ''}`}
                        draggable={folderNodes.length > 0 && editingFolder !== folderName}
                        onDragStart={(e) => handleFolderDragStart(e, folderName, folderNodes)}
                        onClick={() => {
                          if (editingFolder !== folderName) toggleFolderCollapse(folderName);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverFolder(folderName);
                        }}
                        onDragLeave={() => setDragOverFolder(null)}
                        onDrop={(e) => handleFolderDrop(folderName, e)}
                        title={folderNodes.length > 0 ? "Перетащите всю папку на холст или кликните для сворачивания" : "Кликните для сворачивания или перетащите сюда сцены"}
                        style={{ cursor: folderNodes.length > 0 ? 'grab' : 'pointer' }}
                      >
                        {editingFolder === folderName ? (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}
                          >
                            <input
                              value={editingFolderName}
                              onChange={(e) => setEditingFolderName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRenameFolder(folderName, e);
                                if (e.key === 'Escape') setEditingFolder(null);
                              }}
                              autoFocus
                              style={styles.folderRenameInput}
                            />
                            <button
                              type="button"
                              onClick={(e) => handleSaveRenameFolder(folderName, e)}
                              style={styles.folderConfirmBtn}
                              title="Сохранить имя"
                            >
                              <Check size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingFolder(null);
                              }}
                              style={styles.folderCancelBtn}
                              title="Отмена"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                            {isFolderCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                            {folderNodes.length > 0 ? (
                              <GripVertical size={13} style={{ opacity: 0.5, flexShrink: 0 }} />
                            ) : (
                              <Folder size={14} color="#3b82f6" />
                            )}
                            <span style={{ fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {folderName}
                            </span>
                            <span style={styles.folderCountBadge}>{folderNodes.length}</span>
                          </div>
                        )}

                        {editingFolder !== folderName && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                            {folderNodes.length > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const ids = folderNodes.map((n) => n.id);
                                  if (restoreMultipleFromStash) restoreMultipleFromStash(ids);
                                  else ids.forEach((id) => restoreFromStash(id));
                                }}
                                style={styles.miniFolderActionBtn}
                                title="Вынести всю папку на холст"
                              >
                                <ArrowUpRight size={13} color="#3b82f6" />
                              </button>
                            )}
                            {folderName !== 'Общие' && (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => handleStartRenameFolder(folderName, e)}
                                  style={styles.miniFolderActionBtn}
                                  title="Переименовать папку"
                                >
                                  <Edit2 size={12} color="#94a3b8" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteFolder(folderName, e)}
                                  style={styles.miniFolderActionBtn}
                                  title="Удалить папку (сцены переместятся в «Общие»)"
                                >
                                  <Trash2 size={12} color="#ef4444" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {!isFolderCollapsed && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, paddingLeft: 6 }}>
                          {folderNodes.length === 0 ? (
                            <div style={styles.emptyFolderHint}>Перетащите сюда сцены</div>
                          ) : (
                            folderNodes.map((stashedNode) => {
                              const dialogueCount = Array.isArray(stashedNode.data?.dialogue)
                                ? stashedNode.data.dialogue.length
                                : 0;
                              const nodeType = stashedNode.data?.type || 'scene';
                              const badgeColor =
                                stashedNode.data?.customColor ||
                                (nodeType === 'decision'
                                  ? '#d97706'
                                  : nodeType === 'ending'
                                  ? '#9333ea'
                                  : nodeType === 'start'
                                  ? '#16a34a'
                                  : '#2563eb');
                              const isSelected = selectedStashIds.has(stashedNode.id);

                              return (
                                <div
                                  key={stashedNode.id}
                                  draggable={true}
                                  onDragStart={(event) => handleStashItemDragStart(event, stashedNode)}
                                  onClick={(e) => {
                                    if (e.ctrlKey || e.metaKey || e.shiftKey) {
                                      toggleSelect(stashedNode.id, e);
                                    }
                                  }}
                                  style={{
                                    ...styles.stashCard,
                                    borderLeft: `3.5px solid ${badgeColor}`,
                                    borderColor: isSelected ? '#3b82f6' : 'var(--panel-border, #334155)',
                                    background: isSelected ? 'rgba(37, 99, 235, 0.16)' : 'var(--bg-color, #0f172a)',
                                    boxShadow: isSelected ? '0 0 0 1px #3b82f6, 0 4px 14px rgba(0,0,0,0.3)' : '0 3px 10px rgba(0, 0, 0, 0.16)'
                                  }}
                                  title="Перетащите на холст (Ctrl/Shift-клик для выбора нескольких)"
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, flex: 1, minWidth: 0 }}>
                                      <button
                                        type="button"
                                        onClick={(e) => toggleSelect(stashedNode.id, e)}
                                        style={styles.checkboxBtn}
                                        title={isSelected ? 'Снять выбор' : 'Выбрать сцену'}
                                      >
                                        {isSelected ? (
                                          <CheckSquare size={14} color="#3b82f6" />
                                        ) : (
                                          <Square size={14} color="#64748b" />
                                        )}
                                      </button>
                                      <div style={{ fontWeight: 700, fontSize: '0.82rem', wordBreak: 'break-word' }}>
                                        {stashedNode.data?.label || t.palette.untitledScene}
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          restoreFromStash(stashedNode.id);
                                          setSelectedStashIds((prev) => {
                                            if (!prev.has(stashedNode.id)) return prev;
                                            const next = new Set(prev);
                                            next.delete(stashedNode.id);
                                            return next;
                                          });
                                        }}
                                        style={styles.miniActionBtn}
                                        title={t.palette.restoreToCanvas}
                                      >
                                        <ArrowUpRight size={14} color="#3b82f6" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          deleteStashedNode(stashedNode.id);
                                          setSelectedStashIds((prev) => {
                                            if (!prev.has(stashedNode.id)) return prev;
                                            const next = new Set(prev);
                                            next.delete(stashedNode.id);
                                            return next;
                                          });
                                        }}
                                        style={styles.miniActionBtn}
                                        title={t.palette.deleteForever}
                                      >
                                        <Trash2 size={13} color="#ef4444" />
                                      </button>
                                    </div>
                                  </div>

                                  {stashedNode.data?.notes && (
                                    <div style={styles.stashNotes}>{stashedNode.data.notes}</div>
                                  )}

                                  <div style={{ fontSize: '0.7rem', opacity: 0.68, marginTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>{t.palette.linesCount}: {dialogueCount}</span>
                                    <span style={{ color: '#60a5fa', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                      <ArrowUpRight size={11} />
                                      <span>{t.palette.dragBackHint}</span>
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          )}
        </div>
      </aside>

      {/* Peeking Pocket: плавно выезжает навстречу при поднесении ноды к левой границе экрана, когда карман свёрнут */}
      {isCollapsed && (
        <div
          className="sa-peeking-pocket"
          onDragOver={(e) => {
            e.preventDefault();
            setIsStashDragOver(true);
          }}
          onDragLeave={() => setIsStashDragOver(false)}
          onDrop={handlePocketDrop}
          style={{
            ...styles.peekingPocket,
            transform: showPeeking ? 'translateX(0)' : 'translateX(-120%)',
            opacity: showPeeking ? 1 : 0,
            pointerEvents: showPeeking ? 'all' : 'none',
            border: activeDropHighlight
              ? '2px dashed #3b82f6'
              : '1.5px dashed rgba(59, 130, 246, 0.65)',
            boxShadow: activeDropHighlight
              ? '0 0 0 4px rgba(59, 130, 246, 0.22), 12px 16px 38px rgba(0, 0, 0, 0.45)'
              : '8px 12px 30px rgba(0, 0, 0, 0.35)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Archive size={16} color="#3b82f6" />
            <span style={{ fontWeight: 800, fontSize: '0.84rem' }}>
              {t.palette.pocketTitle} ({stashedNodes.length})
            </span>
          </div>
          <div style={styles.peekingDropBox}>
            {t.palette.peekingDropHint(draggedNodesCount)}
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  panel: {
    position: 'fixed',
    left: 0,
    top: 70,
    bottom: 16,
    width: 264,
    zIndex: 18,
    background: 'var(--panel-bg, rgba(15, 23, 42, 0.9))',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    borderRight: '1px solid var(--panel-border, #334155)',
    borderTop: '1px solid var(--panel-border, #334155)',
    borderBottom: '1px solid var(--panel-border, #334155)',
    boxShadow: '4px 0 24px rgba(0, 0, 0, 0.35)',
    display: 'flex',
    flexDirection: 'column',
    color: 'var(--text-color, #f8fafc)',
    userSelect: 'none',
    transition: 'transform 0.26s cubic-bezier(0.22, 1, 0.36, 1)'
  },
  rightEdgeTab: {
    position: 'absolute',
    top: 18,
    right: -38,
    width: 38,
    minHeight: 74,
    zIndex: 19,
    background: 'var(--panel-bg, rgba(15, 23, 42, 0.94))',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    color: 'var(--text-color, #f8fafc)',
    border: '1px solid var(--panel-border, #334155)',
    borderLeft: 'none',
    borderRadius: '0 12px 12px 0',
    padding: '10px 6px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    boxShadow: '6px 4px 18px rgba(0, 0, 0, 0.32)',
    pointerEvents: 'auto'
  },
  tabCountBadge: {
    padding: '1px 6px',
    borderRadius: 999,
    background: '#2563eb',
    color: '#ffffff',
    fontSize: '0.68rem',
    fontWeight: 800,
    lineHeight: 1.2
  },
  peekingPocket: {
    position: 'fixed',
    left: 10,
    top: 190,
    width: 236,
    padding: '14px 14px',
    borderRadius: 16,
    zIndex: 25,
    background: 'var(--panel-bg, rgba(15, 23, 42, 0.94))',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    color: 'var(--text-color, #f8fafc)',
    transition: 'transform 0.36s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease, border-color 0.2s ease, box-shadow 0.2s ease'
  },
  peekingDropBox: {
    padding: '16px 12px',
    borderRadius: 12,
    border: '1.5px dashed #3b82f6',
    background: 'rgba(37, 99, 235, 0.12)',
    color: '#93c5fd',
    fontSize: '0.78rem',
    fontWeight: 700,
    textAlign: 'center',
    lineHeight: 1.4
  },
  header: {
    padding: '14px 16px 12px 16px',
    borderBottom: '1px solid var(--panel-border, #334155)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  scrollBody: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 12px 24px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1
  },
  activeDropBanner: {
    marginTop: 2,
    marginBottom: 8,
    padding: '10px 10px',
    borderRadius: 8,
    border: '1.5px dashed #3b82f6',
    background: 'rgba(37, 99, 235, 0.18)',
    color: '#93c5fd',
    fontSize: '0.75rem',
    fontWeight: 700,
    textAlign: 'center',
    lineHeight: 1.35,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  emptyStashBox: {
    marginTop: 4,
    padding: '18px 12px',
    borderRadius: 12,
    border: '1.5px dashed var(--panel-border, #334155)',
    fontSize: '0.75rem',
    opacity: 0.74,
    lineHeight: 1.45,
    textAlign: 'center'
  },
  stashCard: {
    padding: '10px 11px',
    borderRadius: 10,
    background: 'var(--bg-color, #0f172a)',
    border: '1px solid var(--panel-border, #334155)',
    cursor: 'grab',
    boxShadow: '0 3px 10px rgba(0, 0, 0, 0.16)'
  },
  stashNotes: {
    fontSize: '0.72rem',
    opacity: 0.72,
    marginTop: 4,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    lineHeight: 1.3
  },
  miniFolderActionBtn: {
    width: 22,
    height: 22,
    boxSizing: 'border-box',
    background: 'transparent',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0
  },
  folderRenameInput: {
    flex: 1,
    height: 24,
    borderRadius: 4,
    border: '1px solid #3b82f6',
    background: 'var(--panel-bg, #1e293b)',
    color: '#fff',
    fontSize: '0.74rem',
    fontWeight: 700,
    padding: '0 6px',
    boxSizing: 'border-box'
  },
  folderAddBtn: {
    width: 26,
    height: 26,
    boxSizing: 'border-box',
    background: 'rgba(59, 130, 246, 0.15)',
    border: '1px solid rgba(59, 130, 246, 0.35)',
    borderRadius: 6,
    color: '#60a5fa',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0
  },
  newFolderRow: {
    display: 'flex',
    gap: 4,
    padding: '8px 12px',
    background: 'rgba(15, 23, 42, 0.45)',
    borderBottom: '1px solid var(--panel-border, #334155)'
  },
  newFolderInput: {
    flex: 1,
    height: 28,
    borderRadius: 6,
    border: '1px solid #3b82f6',
    background: 'var(--panel-bg, #1e293b)',
    color: '#fff',
    fontSize: '0.76rem',
    padding: '0 6px',
    boxSizing: 'border-box'
  },
  folderConfirmBtn: {
    width: 28,
    height: 28,
    background: '#16a34a',
    border: 'none',
    color: '#fff',
    borderRadius: 6,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0
  },
  folderCancelBtn: {
    width: 28,
    height: 28,
    background: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    color: '#f87171',
    borderRadius: 6,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0
  },
  selectionBar: {
    margin: '8px 12px 0 12px'
  },
  bulkActionBtn: {
    height: 24,
    boxSizing: 'border-box',
    padding: '0 6px',
    borderRadius: 6,
    border: '1px solid rgba(255, 255, 255, 0.2)',
    background: 'rgba(15, 23, 42, 0.65)',
    color: '#fff',
    fontSize: '0.72rem',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3
  },
  folderCountBadge: {
    padding: '1px 6px',
    borderRadius: 999,
    background: 'rgba(15, 23, 42, 0.65)',
    color: '#94a3b8',
    fontSize: '0.68rem',
    fontWeight: 800
  },
  emptyFolderHint: {
    padding: '10px 8px',
    border: '1px dashed var(--panel-border, #334155)',
    borderRadius: 8,
    fontSize: '0.72rem',
    opacity: 0.55,
    textAlign: 'center'
  },
  checkboxBtn: {
    background: 'transparent',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2
  },
  miniActionBtn: {
    width: 28,
    height: 28,
    boxSizing: 'border-box',
    background: 'transparent',
    border: '1px solid var(--panel-border, #334155)',
    borderRadius: 8,
    padding: 0,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
};

export default React.memo(LeftNodePalette);
