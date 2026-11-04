import React, { useState } from 'react';
import { useStoryStore } from './store';
import { X, Plus, Trash2, ToggleLeft, Hash, Database } from 'lucide-react';

export default function VariablesManager({ onClose }) {
  const { variables, addVariable, updateVariable, deleteVariable, showToast } = useStoryStore();
  const [newVarName, setNewVarName] = useState('');
  const [newVarType, setNewVarType] = useState('boolean');

  const handleAdd = () => {
    if (!newVarName.trim()) return;
    const initialVal = newVarType === 'boolean' ? false : 0;
    addVariable(newVarName.trim(), newVarType, initialVal);
    showToast(`Переменная «${newVarName.trim()}» добавлена`, 'success');
    setNewVarName('');
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Database size={20} color="#d97706" />
              <span>Переменные, предметы и статы</span>
            </h2>
            <div style={{ fontSize: '0.78rem', opacity: 0.7, marginTop: 2 }}>
              Используются для условий на развилках и триггеров в сценах
            </div>
          </div>
          <button onClick={onClose} style={styles.iconBtn} title="Закрыть">
            <X size={22} />
          </button>
        </div>

        <div style={styles.createBlock}>
          <input
            value={newVarName}
            onChange={(e) => setNewVarName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Название (напр. Ключ стражника, Золото, Карма)"
            style={styles.input}
          />
          <select value={newVarType} onChange={(e) => setNewVarType(e.target.value)} style={styles.select}>
            <option value="boolean">Флаг / Предмет (Да/Нет)</option>
            <option value="number">Число / Стат (0, 10...)</option>
          </select>
          <button onClick={handleAdd} style={styles.addBtn} title="Добавить переменную">
            <Plus size={20} />
          </button>
        </div>

        <div style={styles.list}>
          {variables.length === 0 && (
            <div style={{ opacity: 0.6, textAlign: 'center', padding: '30px 10px', fontSize: '0.9rem' }}>
              Пока нет переменных. Добавьте предметы или характеристики героя, чтобы создавать нелинейные условия.
            </div>
          )}

          {variables.map((v) => (
            <div key={v.id} style={styles.item}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                {v.type === 'boolean' ? (
                  <ToggleLeft color="#2563eb" size={20} />
                ) : (
                  <Hash color="#d97706" size={20} />
                )}
                <input
                  value={v.name}
                  onChange={(e) => updateVariable(v.id, 'name', e.target.value)}
                  style={styles.nameInput}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <select
                  value={v.type}
                  onChange={(e) => updateVariable(v.id, 'type', e.target.value)}
                  style={{ ...styles.select, padding: '4px 6px', fontSize: '0.76rem' }}
                  title="Тип переменной"
                >
                  <option value="boolean">Да/Нет</option>
                  <option value="number">Число</option>
                </select>

                <span style={{ fontSize: '0.78rem', opacity: 0.7 }}>Старт:</span>
                {v.type === 'boolean' ? (
                  <input
                    type="checkbox"
                    checked={Boolean(v.initialValue)}
                    onChange={(e) => updateVariable(v.id, 'initialValue', e.target.checked)}
                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                  />
                ) : (
                  <input
                    type="number"
                    value={Number(v.initialValue ?? 0)}
                    onChange={(e) => updateVariable(v.id, 'initialValue', Number(e.target.value))}
                    style={{ width: 64, padding: 4 }}
                  />
                )}
                <button
                  onClick={() => {
                    deleteVariable(v.id);
                    showToast(`Переменная «${v.name}» удалена`, 'info');
                  }}
                  style={styles.delBtn}
                  title="Удалить переменную"
                >
                  <Trash2 size={16} />
                </button>
              </div>
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
    width: 'min(560px, 96vw)',
    height: 'min(580px, 86vh)',
    background: 'var(--panel-bg)',
    color: 'var(--text-color)',
    padding: 20,
    borderRadius: 16,
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
    cursor: 'pointer',
    color: 'inherit',
    padding: 6
  },
  createBlock: {
    display: 'flex',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap'
  },
  input: {
    flex: 1,
    minWidth: 180,
    padding: 8,
    borderRadius: 8,
    border: '1px solid var(--node-border)',
    background: 'var(--bg-color)',
    color: 'var(--text-color)'
  },
  select: {
    padding: 8,
    borderRadius: 8,
    border: '1px solid var(--node-border)',
    background: 'var(--bg-color)',
    color: 'var(--text-color)',
    fontSize: '0.84rem'
  },
  addBtn: {
    background: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    width: 42,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  list: {
    flex: 1,
    overflowY: 'auto'
  },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'var(--bg-color)',
    padding: '8px 12px',
    marginBottom: 8,
    borderRadius: 10,
    border: '1px solid var(--node-border)',
    gap: 8,
    flexWrap: 'wrap'
  },
  nameInput: {
    background: 'transparent',
    border: 'none',
    color: 'inherit',
    fontWeight: 700,
    flex: 1,
    minWidth: 110
  },
  delBtn: {
    background: 'none',
    border: 'none',
    color: '#ef4444',
    cursor: 'pointer',
    padding: 4
  }
};
