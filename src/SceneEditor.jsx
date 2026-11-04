import React, { useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useStoryStore, assetStorage } from './store';
import { readFullResolutionImage } from './utils/imageCompressor';
import {
  X, Trash2, Plus, Image as ImageIcon, Loader2, Zap, GitBranch, ArrowUp, ArrowDown, Archive,
  Play, Film, GitFork, Flag, Sparkles, MessageSquare
} from 'lucide-react';

export default function SceneEditor({ nodeId, onClose, onSelectNode, onPlayFromNode }) {
  const {
    nodes, edges, updateNodeData, deleteNode, trashNodes, stashNode, addConnectedScene,
    updateEdgeData, deleteEdge, onConnect,
    characters, groups, variables, showToast
  } = useStoryStore();

  const node = nodes.find((n) => n.id === nodeId);
  const fileInputRef = useRef(null);

  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newBranchLabel, setNewBranchLabel] = useState('');
  const [newBranchTargetId, setNewBranchTargetId] = useState('__new__');

  if (!node) return null;

  const label = node.data?.label || '';
  const nodeType = node.data?.type || 'scene';
  const notes = node.data?.notes || '';
  const image = node.data?.imageId
    ? assetStorage.getAsset(node.data.imageId)
    : node.data?.image || null;
  const dialogue = node.data?.dialogue || [];
  const effects = node.data?.effects || [];
  const outgoingEdges = edges.filter((e) => e.source === nodeId);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Пожалуйста, выберите файл изображения', 'error');
      return;
    }
    try {
      setIsLoadingMedia(true);
      const originalDataUrl = await readFullResolutionImage(file);
      const imageId = assetStorage.registerAsset(originalDataUrl);
      updateNodeData(nodeId, { imageId });
      showToast('Фон сцены загружен в 100% оригинальном разрешении', 'success');
    } catch {
      showToast('Ошибка при чтении файла изображения', 'error');
    } finally {
      setIsLoadingMedia(false);
      if (e.target) e.target.value = '';
    }
  };

  const addLine = () => {
    const defaultCharId = characters[0]?.id || '';
    updateNodeData(nodeId, {
      dialogue: [...dialogue, { charId: defaultCharId, text: '' }]
    });
  };

  const updateLine = (idx, key, val) => {
    updateNodeData(nodeId, {
      dialogue: dialogue.map((line, i) => (i === idx ? { ...line, [key]: val } : line))
    });
  };

  const moveLine = (idx, dir) => {
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= dialogue.length) return;
    const copy = [...dialogue];
    const [item] = copy.splice(idx, 1);
    copy.splice(targetIdx, 0, item);
    updateNodeData(nodeId, { dialogue: copy });
  };

  const deleteLine = (idx) => {
    updateNodeData(nodeId, {
      dialogue: dialogue.filter((_, i) => i !== idx)
    });
  };

  const addEffect = () => {
    if (variables.length === 0) {
      showToast('Сначала создайте переменную в разделе «Переменные»', 'info');
      return;
    }
    const firstVar = variables[0];
    const newEf = {
      id: `ef-${uuidv4()}`,
      varId: firstVar.id,
      action: firstVar.type === 'boolean' ? 'set' : 'add',
      value: firstVar.type === 'boolean' ? true : 1
    };
    updateNodeData(nodeId, { effects: [...effects, newEf] });
  };

  const updateEffect = (efId, patch) => {
    updateNodeData(nodeId, {
      effects: effects.map((ef) => {
        if (ef.id !== efId) return ef;
        const merged = { ...ef, ...patch };
        if (patch.varId) {
          const v = variables.find((x) => x.id === patch.varId);
          if (v?.type === 'boolean') {
            merged.action = 'set';
            merged.value = true;
          } else {
            merged.action = 'add';
            merged.value = 1;
          }
        }
        return merged;
      })
    });
  };

  const removeEffect = (efId) => {
    updateNodeData(nodeId, {
      effects: effects.filter((ef) => ef.id !== efId)
    });
  };

  const handleCreateBranch = () => {
    const choiceText = newBranchLabel.trim() || 'Далее';
    if (newBranchTargetId === '__new__') {
      addConnectedScene(nodeId, choiceText, 'scene');
      showToast('Создана новая связанная сцена', 'success');
    } else {
      onConnect({ source: nodeId, target: newBranchTargetId, label: choiceText });
      showToast('Переход добавлен', 'success');
    }
    setNewBranchLabel('');
  };

  const nodeTypeOptions = [
    { id: 'start', title: 'Старт', Icon: Play, color: '#10b981' },
    { id: 'scene', title: 'Сцена', Icon: Film, color: '#3b82f6' },
    { id: 'decision', title: 'Развилка', Icon: GitFork, color: '#f59e0b' },
    { id: 'ending', title: 'Финал', Icon: Flag, color: '#a855f7' },
    { id: 'custom', title: 'Кастом', Icon: Sparkles, color: '#06b6d4' }
  ];

  return (
    <aside className="sa-scene-editor-drawer" style={styles.drawer}>
      {/* Шапка инспектора в едином коде с UnifiedHeader */}
      <div style={styles.header}>
        <div style={{ flex: 1, minWidth: 0, marginRight: 10 }}>
          <input
            value={label}
            onChange={(e) => updateNodeData(nodeId, { label: e.target.value })}
            className="sa-mitory-field"
            style={styles.titleInput}
            placeholder="Название сцены..."
          />
          <div style={{ fontSize: '0.69rem', color: '#64748b', marginTop: 4, paddingLeft: 2 }}>
            Изменения сохраняются автоматически
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {onPlayFromNode && (
            <button
              type="button"
              onClick={() => onPlayFromNode(nodeId)}
              className="sa-mitory-action-btn"
              style={{
                background: 'rgba(16, 185, 129, 0.14)',
                borderColor: 'rgba(16, 185, 129, 0.4)',
                color: '#34d399'
              }}
              title="Запустить плеер с этой сцены"
            >
              <Play size={12} fill="#10b981" />
              <span>Играть отсюда</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            style={styles.closeBtn}
            title="Закрыть инспектор"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Контент инспектора */}
      <div style={styles.content}>
        {/* 1. Тип узла */}
        <div style={styles.section}>
          <label style={styles.label}>Тип узла в графе</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 5 }}>
            {nodeTypeOptions.map(({ id, title, Icon, color }) => {
              const isActive = nodeType === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => updateNodeData(nodeId, { type: id })}
                  style={{
                    ...styles.typeBtn,
                    ...(isActive
                      ? {
                          borderColor: '#3b82f6',
                          background: 'rgba(59, 130, 246, 0.18)',
                          color: '#f8fafc'
                        }
                      : {})
                  }}
                >
                  {React.createElement(Icon, { size: 13, color: isActive ? '#60a5fa' : color })}
                  <span>{title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Фон сцены (100% оригинальное разрешение без сжатия) */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <label style={{ ...styles.label, marginBottom: 0 }}>Иллюстрация / Фон сцены</label>
            <button
              type="button"
              onClick={() => !isLoadingMedia && fileInputRef.current?.click()}
              className="sa-mitory-action-btn"
              style={styles.actionBtn}
            >
              {isLoadingMedia ? <Loader2 size={13} className="spin" /> : <ImageIcon size={13} color="#38bdf8" />}
              <span>{image ? 'Заменить фон' : 'Загрузить фон'}</span>
            </button>
          </div>

          {image ? (
            <div style={styles.imagePreviewWrap}>
              <img
                src={image}
                alt="Scene background"
                style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }}
              />
              <button
                type="button"
                onClick={() => updateNodeData(nodeId, { imageId: null, image: null })}
                style={styles.removeImgBtn}
                title="Удалить иллюстрацию"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ) : (
            <div
              onClick={() => !isLoadingMedia && fileInputRef.current?.click()}
              style={{
                ...styles.uploadPlaceholder,
                opacity: isLoadingMedia ? 0.6 : 1,
                cursor: isLoadingMedia ? 'wait' : 'pointer'
              }}
            >
              <ImageIcon size={18} color="#64748b" />
              <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                Нажмите для загрузки фона (100% исходное качество)
              </span>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
        </div>

        {/* 3. Описание локации / Ремарка автора */}
        <div style={styles.section}>
          <label style={styles.label}>Описание локации / Ремарка автора</label>
          <textarea
            value={notes}
            onChange={(e) => updateNodeData(nodeId, { notes: e.target.value })}
            className="sa-mitory-field"
            style={styles.notesArea}
            placeholder="Опишите атмосферу, окружение или заметки к сцене..."
          />
        </div>

        {/* 4. Эффекты при входе в сцену */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionTitle}>
              <Zap size={14} color="#f59e0b" />
              <span>Эффекты при входе ({effects.length})</span>
            </span>
            <button
              type="button"
              onClick={addEffect}
              className="sa-mitory-action-btn"
              style={styles.actionBtn}
            >
              <Sparkles size={13} color="#f59e0b" />
              <span>+ Эффект</span>
            </button>
          </div>
          {effects.map((ef) => {
            const v = variables.find((x) => x.id === ef.varId);
            return (
              <div key={ef.id} style={styles.effectRow}>
                <select
                  value={ef.varId}
                  onChange={(e) => updateEffect(ef.id, { varId: e.target.value })}
                  className="sa-mitory-field"
                  style={{ ...styles.select, flex: 1 }}
                >
                  {variables.map((variable) => (
                    <option key={variable.id} value={variable.id}>
                      {variable.name}
                    </option>
                  ))}
                </select>
                {v?.type === 'boolean' ? (
                  <select
                    value={String(ef.value)}
                    onChange={(e) => updateEffect(ef.id, { action: 'set', value: e.target.value === 'true' })}
                    className="sa-mitory-field"
                    style={styles.select}
                  >
                    <option value="true">= Истина (Да)</option>
                    <option value="false">= Ложь (Нет)</option>
                  </select>
                ) : (
                  <>
                    <select
                      value={ef.action || 'add'}
                      onChange={(e) => updateEffect(ef.id, { action: e.target.value })}
                      className="sa-mitory-field"
                      style={styles.select}
                    >
                      <option value="add">+ Прибавить</option>
                      <option value="sub">- Вычесть</option>
                      <option value="set">= Задать</option>
                    </select>
                    <input
                      type="number"
                      value={ef.value}
                      onChange={(e) => updateEffect(ef.id, { value: Number(e.target.value) })}
                      className="sa-mitory-field"
                      style={{ ...styles.select, width: 64 }}
                    />
                  </>
                )}
                <button type="button" onClick={() => removeEffect(ef.id)} style={styles.iconActionBtn} title="Удалить эффект">
                  <Trash2 size={13} color="#f87171" />
                </button>
              </div>
            );
          })}
        </div>

        {/* 5. Реплики и диалоги */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionTitle}>
              <MessageSquare size={14} color="#3b82f6" />
              <span>Реплики и диалоги ({dialogue.length})</span>
            </span>
            <button
              type="button"
              onClick={addLine}
              className="sa-mitory-action-btn"
              style={styles.actionBtn}
            >
              <Plus size={13} color="#3b82f6" />
              <span>+ Добавить реплику</span>
            </button>
          </div>

          {dialogue.map((line, idx) => {
            const char = characters.find((c) => c.id === line.charId) || {};
            return (
              <div
                key={idx}
                style={{
                  ...styles.lineRow,
                  borderLeft: `3px solid ${char.color || '#475569'}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 6 }}>
                  <select
                    value={line.charId}
                    onChange={(e) => updateLine(idx, 'charId', e.target.value)}
                    className="sa-mitory-field"
                    style={styles.charSelect}
                  >
                    <option value="">От автора (Рассказчик)</option>
                    {groups.map((g) => {
                      const groupChars = characters.filter((c) => c.groupId === g.id);
                      if (groupChars.length === 0) return null;
                      return (
                        <optgroup key={g.id} label={g.name}>
                          {groupChars.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                  <div style={{ display: 'flex', gap: 2 }}>
                    <button type="button" onClick={() => moveLine(idx, -1)} style={styles.iconActionBtn} title="Переместить выше">
                      <ArrowUp size={13} />
                    </button>
                    <button type="button" onClick={() => moveLine(idx, 1)} style={styles.iconActionBtn} title="Переместить ниже">
                      <ArrowDown size={13} />
                    </button>
                    <button type="button" onClick={() => deleteLine(idx)} style={styles.iconActionBtn} title="Удалить реплику">
                      <Trash2 size={13} color="#f87171" />
                    </button>
                  </div>
                </div>
                <textarea
                  value={line.text}
                  onChange={(e) => updateLine(idx, 'text', e.target.value)}
                  className="sa-mitory-field"
                  style={styles.lineText}
                  placeholder="Введите текст реплики..."
                />
              </div>
            );
          })}

          <button
            type="button"
            onClick={addLine}
            className="sa-mitory-action-btn"
            style={styles.fullWidthActionBtn}
          >
            <Plus size={13} color="#60a5fa" />
            <span>+ Добавить реплику</span>
          </button>
        </div>

        {/* 6. Выходы и варианты выбора */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionTitle}>
              <GitBranch size={14} color="#3b82f6" />
              <span>Выходы и варианты выбора ({outgoingEdges.length})</span>
            </span>
          </div>

          {outgoingEdges.map((edge) => {
            const targetNode = nodes.find((n) => n.id === edge.target);
            return (
              <div key={edge.id} style={styles.branchItem}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <input
                    value={edge.label || ''}
                    onChange={(e) => updateEdgeData(edge.id, e.target.value, edge.data?.conditions || edge.data?.condition)}
                    placeholder="Текст варианта выбора..."
                    className="sa-mitory-field"
                    style={styles.branchInput}
                  />
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 5 }}>
                    Ведёт в:{' '}
                    <span
                      style={{ color: '#60a5fa', fontWeight: 700, cursor: 'pointer' }}
                      onClick={() => targetNode && onSelectNode && onSelectNode(targetNode.id)}
                    >
                      {targetNode?.data?.label || 'Удалённая сцена'}
                    </span>
                  </div>
                </div>
                <button type="button" onClick={() => deleteEdge(edge.id)} style={styles.iconActionBtn} title="Удалить переход">
                  <Trash2 size={14} color="#f87171" />
                </button>
              </div>
            );
          })}

          <div style={styles.newBranchBox}>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>
              Добавить вариант выбора / переход:
            </div>
            <input
              value={newBranchLabel}
              onChange={(e) => setNewBranchLabel(e.target.value)}
              placeholder="Текст ответа игрока (напр. Открыть тайник)"
              className="sa-mitory-field"
              style={{ ...styles.branchInput, marginBottom: 6 }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <select
                value={newBranchTargetId}
                onChange={(e) => setNewBranchTargetId(e.target.value)}
                className="sa-mitory-field"
                style={{ ...styles.select, flex: 1 }}
              >
                <option value="__new__">+ Создать новую связанную сцену</option>
                {nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.id === nodeId ? `↻ В эту же сцену (${n.data?.label})` : `→ ${n.data?.label}`}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleCreateBranch}
                className="sa-mitory-action-btn"
                style={{
                  ...styles.actionBtn,
                  background: '#2563eb',
                  borderColor: '#3b82f6',
                  color: '#ffffff'
                }}
              >
                <Plus size={13} />
                <span>+ Вариант выбора</span>
              </button>
            </div>
          </div>
        </div>

        {/* 7. Сдержанный блок действий внизу (Убрать в карман / Удалить сцену) */}
        <div style={styles.footerActions}>
          {stashNode && (
            <button
              type="button"
              onClick={() => {
                stashNode(nodeId);
                onClose();
              }}
              className="sa-mitory-subtle-btn"
            >
              <Archive size={13} />
              <span>Убрать в карман</span>
            </button>
          )}

          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="sa-mitory-danger-subtle"
            >
              <Trash2 size={13} />
              <span>Удалить сцену</span>
            </button>
          ) : (
            <div style={styles.confirmRow}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#fca5a5' }}>
                Переместить сцену в корзину?
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => {
                    if (trashNodes) trashNodes([nodeId]);
                    else deleteNode(nodeId);
                    onClose();
                  }}
                  style={styles.confirmDangerBtn}
                >
                  Да, удалить
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="sa-mitory-action-btn"
                  style={styles.actionBtn}
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

const styles = {
  drawer: {
    position: 'fixed',
    right: 0,
    top: 42,
    bottom: 0,
    width: 'min(440px, 100vw)',
    background: '#0f172a',
    color: '#f8fafc',
    boxShadow: '-12px 0 36px rgba(0, 0, 0, 0.45)',
    borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 45
  },
  header: {
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#0f172a'
  },
  titleInput: {
    fontSize: '0.94rem',
    fontWeight: 700,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    background: '#1e293b',
    color: '#f8fafc',
    width: '100%',
    borderRadius: 7,
    padding: '6px 10px',
    boxSizing: 'border-box'
  },
  closeBtn: {
    width: 28,
    height: 28,
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    cursor: 'pointer',
    color: '#cbd5e1',
    borderRadius: 6,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  content: {
    padding: '14px 16px 64px 16px',
    overflowY: 'auto',
    flex: 1
  },
  section: {
    marginBottom: 18
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  sectionTitle: {
    fontWeight: 700,
    fontSize: '0.82rem',
    color: '#e2e8f0',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6
  },
  label: {
    display: 'block',
    marginBottom: 6,
    fontSize: '0.76rem',
    fontWeight: 700,
    color: '#94a3b8',
    letterSpacing: '0.01em'
  },
  typeBtn: {
    padding: '6px 4px',
    borderRadius: 7,
    border: '1px solid rgba(255, 255, 255, 0.08)',
    background: '#1e293b',
    color: '#cbd5e1',
    fontSize: '0.72rem',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    transition: 'all 0.15s'
  },
  notesArea: {
    width: '100%',
    height: 70,
    background: '#1e293b',
    color: '#f8fafc',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: '8px 10px',
    fontFamily: 'inherit',
    resize: 'vertical',
    boxSizing: 'border-box',
    fontSize: '0.82rem',
    lineHeight: 1.45
  },
  effectRow: {
    display: 'flex',
    gap: 6,
    alignItems: 'center',
    marginBottom: 6,
    background: 'rgba(30, 41, 59, 0.45)',
    padding: 7,
    borderRadius: 8,
    border: '1px solid rgba(255, 255, 255, 0.08)'
  },
  select: {
    padding: '5px 8px',
    borderRadius: 6,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    background: '#1e293b',
    color: '#f8fafc',
    fontSize: '0.78rem'
  },
  lineRow: {
    marginBottom: 8,
    background: 'rgba(30, 41, 59, 0.4)',
    padding: 9,
    borderRadius: 8,
    border: '1px solid rgba(255, 255, 255, 0.08)'
  },
  charSelect: {
    flex: 1,
    padding: '5px 8px',
    borderRadius: 6,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    background: '#1e293b',
    color: '#f8fafc',
    fontSize: '0.78rem',
    fontWeight: 600
  },
  lineText: {
    width: '100%',
    minHeight: 54,
    resize: 'vertical',
    padding: '7px 9px',
    borderRadius: 6,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    background: '#1e293b',
    color: '#f8fafc',
    fontFamily: 'inherit',
    fontSize: '0.82rem',
    lineHeight: 1.45,
    boxSizing: 'border-box'
  },
  iconActionBtn: {
    width: 26,
    height: 26,
    background: 'transparent',
    border: '1px solid transparent',
    color: '#94a3b8',
    borderRadius: 6,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0
  },
  actionBtn: {
    height: 27,
    padding: '0 9px',
    borderRadius: 6,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    background: '#1e293b',
    color: '#e2e8f0',
    fontSize: '0.74rem',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5
  },
  fullWidthActionBtn: {
    width: '100%',
    height: 32,
    padding: '0 10px',
    background: '#1e293b',
    border: '1px dashed rgba(255, 255, 255, 0.14)',
    color: '#cbd5e1',
    borderRadius: 7,
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    fontWeight: 600,
    fontSize: '0.78rem'
  },
  branchItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: 9,
    borderRadius: 8,
    background: 'rgba(30, 41, 59, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    marginBottom: 7
  },
  branchInput: {
    width: '100%',
    padding: '6px 9px',
    borderRadius: 6,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    background: '#1e293b',
    color: '#f8fafc',
    fontSize: '0.8rem',
    boxSizing: 'border-box'
  },
  newBranchBox: {
    padding: 10,
    borderRadius: 8,
    background: 'rgba(30, 41, 59, 0.3)',
    border: '1px dashed rgba(255, 255, 255, 0.12)'
  },
  imagePreviewWrap: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    background: '#1e293b'
  },
  uploadPlaceholder: {
    border: '1px dashed rgba(255, 255, 255, 0.14)',
    borderRadius: 8,
    padding: '14px 12px',
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    background: '#1e293b'
  },
  removeImgBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    background: 'rgba(15, 23, 42, 0.85)',
    border: '1px solid rgba(239, 68, 68, 0.45)',
    color: '#f87171',
    borderRadius: 6,
    padding: 5,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  footerActions: {
    marginTop: 22,
    paddingTop: 14,
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8
  },
  confirmRow: {
    gridColumn: '1 / -1',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 10px',
    borderRadius: 8,
    background: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.35)'
  },
  confirmDangerBtn: {
    height: 27,
    padding: '0 10px',
    borderRadius: 6,
    border: '1px solid rgba(239, 68, 68, 0.5)',
    background: 'rgba(239, 68, 68, 0.2)',
    color: '#fca5a5',
    fontWeight: 700,
    fontSize: '0.75rem',
    cursor: 'pointer'
  }
};
