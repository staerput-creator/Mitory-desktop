import React, { useState, useRef } from 'react';
import { useStoryStore } from './store';
import { Folder, X, Trash2, Edit2, Check, Plus, Users } from 'lucide-react';

export default function CharacterManager({ onClose }) {
  const {
    groups, characters, addGroup, renameGroup, deleteGroup,
    addCharacter, updateCharacter, deleteCharacter, moveCharacterToGroup, showToast
  } = useStoryStore();

  const [newGroup, setNewGroup] = useState('');
  const [editingCharId, setEditingCharId] = useState(null);
  const [tempName, setTempName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [tempGroupName, setTempGroupName] = useState('');
  const [addingToGroupId, setAddingToGroupId] = useState(null);
  const [newCharName, setNewCharName] = useState('');

  const touchDragState = useRef({ charId: null, startX: 0, startY: 0, moved: false });

  const onDragStart = (e, charId) => {
    e.dataTransfer.setData('charId', charId);
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDragOver = (e) => e.preventDefault();
  const onDrop = (e, groupId) => {
    e.preventDefault();
    const charId = e.dataTransfer.getData('charId');
    if (charId) moveCharacterToGroup(charId, groupId);
  };

  const onTouchStart = (e, charId) => {
    const touch = e.touches[0];
    touchDragState.current = {
      charId,
      startX: touch.clientX,
      startY: touch.clientY,
      moved: false
    };
  };

  const onTouchMove = (e) => {
    if (!touchDragState.current.charId) return;
    const touch = e.touches[0];
    const dist = Math.hypot(
      touch.clientX - touchDragState.current.startX,
      touch.clientY - touchDragState.current.startY
    );
    if (dist > 24) {
      touchDragState.current.moved = true;
    }
  };

  const onTouchEnd = (e) => {
    const { charId, moved } = touchDragState.current;
    touchDragState.current = { charId: null, startX: 0, startY: 0, moved: false };
    if (!charId || !moved) return;

    const touch = e.changedTouches[0];
    const elementUnderFinger = document.elementFromPoint(touch.clientX, touch.clientY);
    const groupElement = elementUnderFinger?.closest('[data-group-id]');
    if (groupElement) {
      const targetGroupId = groupElement.getAttribute('data-group-id');
      moveCharacterToGroup(charId, targetGroupId);
    }
  };

  const startEdit = (char) => {
    setEditingCharId(char.id);
    setTempName(char.name);
  };

  const saveEdit = (id) => {
    if (tempName.trim()) {
      updateCharacter(id, 'name', tempName.trim());
    }
    setEditingCharId(null);
  };

  const handleCreateGroup = () => {
    if (!newGroup.trim()) return;
    addGroup(newGroup.trim());
    setNewGroup('');
    showToast('Фракция создана', 'info');
  };

  const handleAddCharacter = (groupId) => {
    if (!newCharName.trim()) return;
    addCharacter(newCharName.trim(), groupId);
    setNewCharName('');
    setAddingToGroupId(null);
    showToast('Персонаж добавлен', 'success');
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={20} color="#3b82f6" />
            <span>Персонажи и фракции</span>
          </h2>
          <button onClick={onClose} style={styles.iconBtn} title="Закрыть">
            <X size={22} />
          </button>
        </div>

        <div style={styles.controls}>
          <input
            placeholder="Название новой группы или фракции..."
            value={newGroup}
            onChange={(e) => setNewGroup(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
            style={styles.input}
          />
          <button onClick={handleCreateGroup} style={styles.btn}>
            <Plus size={16} />
            <span>Фракция</span>
          </button>
        </div>

        <div style={styles.grid}>
          {groups.map((group) => (
            <div
              key={group.id}
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, group.id)}
              data-group-id={group.id}
              style={styles.groupCard}
            >
              <div style={styles.groupHeader}>
                {editingGroupId === group.id ? (
                  <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                    <input
                      value={tempGroupName}
                      onChange={(e) => setTempGroupName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          renameGroup(group.id, tempGroupName);
                          setEditingGroupId(null);
                        }
                      }}
                      style={{ ...styles.input, padding: '3px 6px', fontSize: '0.85rem' }}
                      autoFocus
                    />
                    <Check
                      size={16}
                      color="#16a34a"
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        renameGroup(group.id, tempGroupName);
                        setEditingGroupId(null);
                      }}
                    />
                  </div>
                ) : (
                  <span
                    style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => {
                      setEditingGroupId(group.id);
                      setTempGroupName(group.name);
                    }}
                    title="Нажмите, чтобы переименовать группу"
                  >
                    <Folder size={16} color="#2563eb" /> {group.name}
                  </span>
                )}

                {group.id !== 'default' && (
                  <Trash2
                    size={15}
                    color="#ef4444"
                    style={{ cursor: 'pointer' }}
                    title="Удалить группу (персонажи перейдут в Общие)"
                    onClick={() => {
                      deleteGroup(group.id);
                      showToast('Группа удалена, персонажи перенесены в «Общие»', 'info');
                    }}
                  />
                )}
              </div>

              <div style={styles.charList}>
                {characters
                  .filter((c) => c.groupId === group.id)
                  .map((char) => (
                    <div
                      key={char.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, char.id)}
                      onTouchStart={(e) => onTouchStart(e, char.id)}
                      onTouchMove={onTouchMove}
                      onTouchEnd={onTouchEnd}
                      style={{ ...styles.charItem, borderLeft: `4px solid ${char.color}` }}
                    >
                      {editingCharId === char.id ? (
                        <div style={{ display: 'flex', gap: 6, flex: 1, alignItems: 'center' }}>
                          <input
                            value={tempName}
                            onChange={(e) => setTempName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && saveEdit(char.id)}
                            style={{ ...styles.input, padding: 4 }}
                            autoFocus
                          />
                          <Check
                            size={18}
                            color="#16a34a"
                            style={{ cursor: 'pointer' }}
                            onClick={() => saveEdit(char.id)}
                          />
                        </div>
                      ) : (
                        <span style={{ flex: 1, fontWeight: 600, fontSize: '0.88rem' }}>{char.name}</span>
                      )}

                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {groups.length > 1 && (
                          <select
                            value={char.groupId}
                            onChange={(e) => moveCharacterToGroup(char.id, e.target.value)}
                            style={styles.groupMiniSelect}
                            title="Переместить в группу"
                          >
                            {groups.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.name}
                              </option>
                            ))}
                          </select>
                        )}
                        <input
                          type="color"
                          value={char.color}
                          onChange={(e) => updateCharacter(char.id, 'color', e.target.value)}
                          style={styles.colorPicker}
                          title="Цвет персонажа"
                        />
                        <Edit2
                          size={14}
                          style={{ cursor: 'pointer', opacity: 0.65 }}
                          onClick={() => startEdit(char)}
                          title="Переименовать"
                        />
                        <Trash2
                          size={14}
                          color="#ef4444"
                          style={{ cursor: 'pointer', opacity: 0.8 }}
                          title="Удалить персонажа"
                          onClick={() => {
                            deleteCharacter(char.id);
                            showToast(`Персонаж «${char.name}» удалён`, 'info');
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </div>

              {addingToGroupId === group.id ? (
                <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                  <input
                    value={newCharName}
                    onChange={(e) => setNewCharName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCharacter(group.id)}
                    placeholder="Имя персонажа..."
                    style={{ ...styles.input, flex: 1, padding: 6, fontSize: '0.85rem' }}
                    autoFocus
                  />
                  <button onClick={() => handleAddCharacter(group.id)} style={styles.smallAddBtn}>
                    <Check size={14} />
                  </button>
                  <button onClick={() => setAddingToGroupId(null)} style={styles.smallCancelBtn}>
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setAddingToGroupId(group.id);
                    setNewCharName('');
                  }}
                  style={styles.addBtn}
                >
                  <Plus size={14} style={{ marginRight: 4 }} /> Персонаж
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.68)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2300,
    padding: 12
  },
  modal: {
    width: 'min(900px, 96vw)',
    height: 'min(650px, 88vh)',
    background: 'var(--panel-bg)',
    color: 'var(--text-color)',
    borderRadius: 16,
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid var(--node-border)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    color: 'inherit',
    cursor: 'pointer',
    padding: 6
  },
  controls: {
    marginBottom: 16,
    display: 'flex',
    gap: 8
  },
  input: {
    padding: 8,
    flex: 1,
    borderRadius: 8,
    border: '1px solid var(--node-border)',
    background: 'var(--bg-color)',
    color: 'var(--text-color)'
  },
  btn: {
    padding: '8px 16px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    background: '#2563eb',
    color: 'white',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6
  },
  grid: {
    display: 'flex',
    gap: 14,
    overflowX: 'auto',
    paddingBottom: 10,
    flex: 1
  },
  groupCard: {
    minWidth: 270,
    maxWidth: 320,
    background: 'var(--bg-color)',
    border: '1px solid var(--node-border)',
    borderRadius: 12,
    padding: 12,
    display: 'flex',
    flexDirection: 'column'
  },
  groupHeader: {
    fontWeight: 700,
    marginBottom: 10,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.95rem'
  },
  charList: {
    flex: 1,
    overflowY: 'auto',
    minHeight: 60
  },
  charItem: {
    background: 'var(--panel-bg)',
    padding: '8px 10px',
    marginBottom: 8,
    borderRadius: 8,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
    cursor: 'grab',
    border: '1px solid var(--node-border)'
  },
  groupMiniSelect: {
    maxWidth: 82,
    padding: '2px 4px',
    fontSize: '0.72rem',
    borderRadius: 4,
    border: '1px solid var(--node-border)',
    background: 'var(--bg-color)',
    color: 'var(--text-color)'
  },
  colorPicker: {
    width: 22,
    height: 22,
    border: 'none',
    borderRadius: 4,
    padding: 0,
    cursor: 'pointer',
    background: 'transparent'
  },
  addBtn: {
    marginTop: 8,
    width: '100%',
    padding: 8,
    cursor: 'pointer',
    background: 'var(--panel-bg)',
    border: '1px dashed var(--node-border)',
    color: 'inherit',
    borderRadius: 8,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '0.85rem',
    fontWeight: 600
  },
  smallAddBtn: {
    padding: '6px 10px',
    background: '#16a34a',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer'
  },
  smallCancelBtn: {
    padding: '6px 10px',
    background: 'transparent',
    color: 'var(--text-color)',
    border: '1px solid var(--node-border)',
    borderRadius: 6,
    cursor: 'pointer'
  }
};
