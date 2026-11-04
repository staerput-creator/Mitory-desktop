import React from 'react';
import { Trash2, Plus } from 'lucide-react';
import { useStoryStore } from '../store';
import { getTranslation } from '../i18n/translations';

export default function ConditionsEditor({ conditions = [], onChange, variables = [] }) {
  const language = useStoryStore((s) => s.language || 'ru');
  const t = getTranslation(language);

  const patch = (index, value) =>
    onChange(conditions.map((c, i) => (i === index ? { ...c, ...value } : c)));

  return (
    <div className="condition-editor" style={styles.container}>
      {conditions.map((c, i) => {
        const selectedVar = variables.find((v) => v.id === c.varId);
        const isBoolean = selectedVar?.type === 'boolean';

        return (
          <div key={i} style={styles.row}>
            {i > 0 && (
              <select
                aria-label={t.conditions.logicalOpAria}
                value={c.logicalOp || 'AND'}
                onChange={(e) => patch(i, { logicalOp: e.target.value })}
                style={styles.logicalSelect}
              >
                <option value="AND">AND</option>
                <option value="OR">OR</option>
              </select>
            )}

            <select
              aria-label={t.conditions.variableAria}
              value={c.varId}
              onChange={(e) =>
                patch(i, {
                  varId: e.target.value,
                  value:
                    variables.find((v) => v.id === e.target.value)?.type === 'boolean'
                      ? true
                      : 0
                })
              }
              style={{
                ...styles.varSelect,
                borderTopLeftRadius: i > 0 ? 0 : 8,
                borderBottomLeftRadius: i > 0 ? 0 : 8,
                marginLeft: i > 0 ? -1 : 0
              }}
            >
              {variables.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>

            <select
              aria-label={t.conditions.operatorAria}
              value={c.operator}
              onChange={(e) => patch(i, { operator: e.target.value })}
              style={styles.opSelect}
            >
              {['==', '!=', '>=', '>', '<=', '<'].map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>

            {isBoolean ? (
              <select
                aria-label={t.conditions.valueAria}
                value={String(c.value)}
                onChange={(e) => patch(i, { value: e.target.value === 'true' })}
                style={styles.valSelect}
              >
                <option value="true">{t.conditions.yes}</option>
                <option value="false">{t.conditions.no}</option>
              </select>
            ) : (
              <input
                aria-label={t.conditions.valueAria}
                type="number"
                value={c.value}
                onChange={(e) => patch(i, { value: Number(e.target.value) })}
                style={styles.valInput}
              />
            )}

            <button
              type="button"
              onClick={() => onChange(conditions.filter((_, index) => i !== index))}
              title={t.conditions.deleteTooltip}
              aria-label={t.conditions.deleteTooltip}
              style={styles.deleteBtn}
            >
              <Trash2 size={15} />
            </button>
          </div>
        );
      })}

      <button
        type="button"
        disabled={!variables.length}
        onClick={() =>
          onChange([
            ...conditions,
            {
              varId: variables[0].id,
              operator: '==',
              value: variables[0].type === 'boolean' ? true : 0,
              logicalOp: 'AND'
            }
          ])
        }
        style={{
          ...styles.addBtn,
          opacity: variables.length ? 1 : 0.5,
          cursor: variables.length ? 'pointer' : 'not-allowed'
        }}
        title={!variables.length ? t.conditions.noVariablesHint : t.conditions.addCondition}
      >
        <Plus size={15} />
        <span>{t.conditions.addCondition.replace(/^\+\s*/, '')}</span>
      </button>
    </div>
  );
}

const baseFieldStyle = {
  height: 36,
  boxSizing: 'border-box',
  borderRadius: 8,
  border: '1px solid var(--panel-border, #334155)',
  background: 'var(--panel-bg, #1e293b)',
  color: 'var(--text-color, #f8fafc)',
  padding: '0 10px',
  fontSize: '0.82rem',
  fontWeight: 600,
  fontFamily: 'inherit',
  margin: 0
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 0,
    flexWrap: 'nowrap',
    width: '100%'
  },
  logicalSelect: {
    ...baseFieldStyle,
    width: 68,
    padding: '0 6px',
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    flexShrink: 0
  },
  varSelect: {
    ...baseFieldStyle,
    flex: 1,
    minWidth: 0,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0
  },
  opSelect: {
    ...baseFieldStyle,
    width: 64,
    padding: '0 6px',
    textAlign: 'center',
    borderRadius: 0,
    marginLeft: -1,
    flexShrink: 0
  },
  valSelect: {
    ...baseFieldStyle,
    width: 88,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    marginLeft: -1,
    flexShrink: 0
  },
  valInput: {
    ...baseFieldStyle,
    width: 88,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    marginLeft: -1,
    flexShrink: 0
  },
  deleteBtn: {
    width: 36,
    height: 36,
    boxSizing: 'border-box',
    borderRadius: 8,
    background: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    color: '#ef4444',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    marginLeft: 8,
    flexShrink: 0
  },
  addBtn: {
    height: 36,
    boxSizing: 'border-box',
    borderRadius: 8,
    border: '1px dashed rgba(59, 130, 246, 0.45)',
    background: 'rgba(37, 99, 235, 0.1)',
    color: '#60a5fa',
    padding: '0 14px',
    fontSize: '0.82rem',
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'flex-start'
  }
};