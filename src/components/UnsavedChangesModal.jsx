import React, { useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { AlertTriangle, Save, Trash2, X } from 'lucide-react';
import { isTauri } from '../services/runtime';
import { useStoryStore } from '../store';

export default function UnsavedChangesModal({
  isOpen = true,
  mode = 'exit', // 'exit' | 'new'
  projectTitle,
  filePath,
  onClose,
  onSaveAndContinue,
  onDiscardAndContinue
}) {
  const storeTitle = useStoryStore((s) => s.projectMeta?.title || 'Новое полотно истории');
  const storeFilePath = useStoryStore((s) => s.currentFilePath);
  const saveProject = useStoryStore((s) => s.saveProject);

  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const resolvedTitle = projectTitle ?? storeTitle ?? 'Новое полотно истории';
  const resolvedPath = filePath !== undefined ? filePath : storeFilePath;
  const isNewProjectFlow = mode === 'new';

  const destroyAppWindow = async () => {
    if (isTauri()) {
      const appWindow = getCurrentWindow();
      await appWindow.destroy();
    }
  };

  const handleSaveAndProceed = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      if (typeof onSaveAndContinue === 'function') {
        const continued = await onSaveAndContinue();
        if (continued === false) return;
        return;
      }
      const saved = await saveProject();
      if (saved) {
        await destroyAppWindow();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardAndProceed = async () => {
    if (isSaving) return;
    if (typeof onDiscardAndContinue === 'function') {
      await onDiscardAndContinue();
      return;
    }
    await destroyAppWindow();
  };

  return (
    <div style={styles.overlay} onClick={() => !isSaving && onClose?.()}>
      <div
        className="sa-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="unsaved-modal-title"
        style={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.header}>
          <div style={styles.iconBadge}>
            <AlertTriangle size={24} color="#f59e0b" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 id="unsaved-modal-title" style={styles.title}>
              {isNewProjectFlow
                ? 'Сохранить изменения перед созданием нового проекта?'
                : 'Сохранить изменения в проекте перед выходом?'}
            </h3>
            <div style={styles.projectBadgeWrap}>
              <span style={styles.projectName}>«{resolvedTitle}»</span>
              {resolvedPath ? (
                <code style={styles.filePathText} title={resolvedPath}>
                  {resolvedPath}
                </code>
              ) : (
                <span style={styles.unsavedPathHint}>Файл ещё не сохранён на диске (.mtrsb)</span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => !isSaving && onClose?.()}
            style={styles.closeIconBtn}
            title="Отмена (Esc)"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        <p style={styles.description}>
          Все несохраненные изменения графа и сценария будут безвозвратно утеряны.
        </p>

        <div style={styles.actions}>
          <button
            type="button"
            onClick={() => !isSaving && onClose?.()}
            disabled={isSaving}
            style={styles.cancelBtn}
          >
            Отмена
          </button>

          <button
            type="button"
            onClick={handleDiscardAndProceed}
            disabled={isSaving}
            style={styles.discardBtn}
          >
            <Trash2 size={15} />
            <span>Не сохранять</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAndProceed}
            disabled={isSaving}
            style={styles.saveExitBtn}
          >
            <Save size={15} />
            <span>{isNewProjectFlow ? 'Сохранить и создать' : 'Сохранить и выйти'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(2, 6, 23, 0.76)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 4500,
    padding: 16
  },
  modal: {
    width: 'min(480px, 95vw)',
    background: '#0f172a',
    color: '#f8fafc',
    borderRadius: 16,
    border: '1px solid rgba(245, 158, 11, 0.45)',
    boxShadow: '0 24px 64px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(59, 130, 246, 0.16)',
    padding: '22px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: 'rgba(245, 158, 11, 0.14)',
    border: '1px solid rgba(245, 158, 11, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  title: {
    margin: 0,
    fontSize: '1.05rem',
    fontWeight: 800,
    lineHeight: 1.35,
    color: '#f8fafc'
  },
  projectBadgeWrap: {
    marginTop: 6,
    display: 'flex',
    flexDirection: 'column',
    gap: 4
  },
  projectName: {
    fontSize: '0.86rem',
    fontWeight: 700,
    color: '#60a5fa'
  },
  filePathText: {
    fontSize: '0.74rem',
    color: '#94a3b8',
    background: 'rgba(30, 41, 59, 0.85)',
    border: '1px solid rgba(71, 85, 105, 0.45)',
    padding: '3px 7px',
    borderRadius: 6,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    display: 'block'
  },
  unsavedPathHint: {
    fontSize: '0.74rem',
    color: '#94a3b8',
    opacity: 0.85
  },
  closeIconBtn: {
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: 4,
    borderRadius: 8,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  description: {
    margin: 0,
    fontSize: '0.86rem',
    lineHeight: 1.5,
    color: '#cbd5e1',
    background: 'rgba(15, 23, 42, 0.6)',
    borderLeft: '3px solid #f59e0b',
    padding: '10px 12px',
    borderRadius: '0 8px 8px 0'
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 4
  },
  cancelBtn: {
    height: 38,
    padding: '0 14px',
    borderRadius: 9,
    border: '1px solid #334155',
    background: '#1e293b',
    color: '#e2e8f0',
    fontWeight: 600,
    fontSize: '0.83rem',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  discardBtn: {
    height: 38,
    padding: '0 14px',
    borderRadius: 9,
    border: '1px solid rgba(239, 68, 68, 0.38)',
    background: 'rgba(239, 68, 68, 0.12)',
    color: '#f87171',
    fontWeight: 700,
    fontSize: '0.83rem',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  saveExitBtn: {
    height: 38,
    padding: '0 16px',
    borderRadius: 9,
    border: '1px solid #3b82f6',
    background: '#2563eb',
    color: '#ffffff',
    fontWeight: 700,
    fontSize: '0.83rem',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    boxShadow: '0 6px 18px rgba(37, 99, 235, 0.35)'
  }
};
