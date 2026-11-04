import React, { useState, useEffect, useRef, useCallback } from 'react';
import { isTauri } from './services/runtime';
import {
  useStoryStore,
  idbGet,
  idbSet,
  storageService
} from './store';
import {
  X, Download, Upload, Database, FolderSync,
  Cloud, Trash2, Gamepad2, FileCode, FilePlus2, Castle, Rocket
} from 'lucide-react';

const SLOTS_KEY_PREFIX = 'story-slot-v4-';

export default function StorageManager({
  onClose,
  fileHandle,
  onFileHandleChange
}) {
  const {
    projectMeta, nodes, characters,
    updateProjectMeta, getSerializableData, importProject, resetProject, showToast
  } = useStoryStore();

  const [activeTab, setActiveTab] = useState('export');
  const [canvasTitle, setCanvasTitle] = useState(projectMeta?.title || 'Моё полотно');
  const [canvasDesc, setCanvasDesc] = useState(projectMeta?.description || '');
  const [slotsData, setSlotsData] = useState({});
  const [isDragOver, setIsDragOver] = useState(false);
  const [confirmResetMode, setConfirmResetMode] = useState(null);
  const fileInputRef = useRef(null);

  const refreshSlots = useCallback(async () => {
    const loaded = {};
    for (let i = 1; i <= 5; i++) {
      const data = await idbGet(`${SLOTS_KEY_PREFIX}${i}`);
      if (data) loaded[i] = data;
    }
    setSlotsData(loaded);
  }, []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) refreshSlots(); });
    return () => { active = false; };
  }, [refreshSlots]);

  const handleDownloadJson = async () => {
    updateProjectMeta({ title: canvasTitle, description: canvasDesc });
    const data = getSerializableData();
    const result = await storageService.exportJson(data);
    if (result && !result.success) { if (!result.cancelled) showToast(result.error || 'Ошибка экспорта', 'error'); return; }
    showToast('Файл полотна (.mitory.json) экспортирован', 'success');
  };

  const handleDownloadPlayableHtml = async () => {
    updateProjectMeta({ title: canvasTitle, description: canvasDesc });
    const data = getSerializableData();
    const result = await storageService.exportStandaloneHtml(data);
    if (result && !result.success) return;
    showToast('Готовая HTML-игра скачана! Откройте её в любом браузере.', 'success');
  };

  const processFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target.result);
        const ok = await importProject(json);
        if (ok) onClose();
      } catch {
        showToast('Не удалось прочитать файл. Убедитесь, что это корректный JSON.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const isFileSystemSupported = isTauri() || (typeof window !== 'undefined' && 'showSaveFilePicker' in window);

  const handleBindLocalFile = async () => {
    if (isTauri()) {
      updateProjectMeta({ title: canvasTitle, description: canvasDesc });
      const result = await storageService.saveAs(getSerializableData());
      if (result.success) showToast('Файл сохранён. Ctrl+S сохраняет прямо в него.', 'success');
      else if (!result.cancelled) showToast(result.error, 'error');
      return;
    }
    if (!isFileSystemSupported) {
      showToast('Прямая запись поддерживается в браузерах Chrome / Edge / Opera', 'info');
      return;
    }
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: `${canvasTitle || 'mitory_project'}.mitory.json`,
        types: [{ description: 'Mitory Project JSON', accept: { 'application/json': ['.json'] } }]
      });
      const writable = await handle.createWritable();
      await writable.write(JSON.stringify(getSerializableData(), null, 2));
      await writable.close();
      if (onFileHandleChange) onFileHandleChange(handle);
      showToast('Файл привязан! Теперь Ctrl+S сохраняет прямо в него.', 'success');
    } catch (err) {
      if (err.name !== 'AbortError') showToast('Ошибка привязки файла', 'error');
    }
  };

  const handleSaveToSlot = async (num) => {
    updateProjectMeta({ title: canvasTitle, description: canvasDesc });
    const data = getSerializableData();
    const ok = await idbSet(`${SLOTS_KEY_PREFIX}${num}`, data);
    if (ok) {
      await refreshSlots();
      showToast(`Полотно сохранено в Слот ${num} (IndexedDB)`, 'success');
    } else {
      showToast('Ошибка сохранения в слот', 'error');
    }
  };

  const handleLoadFromSlot = async (num) => {
    if (slotsData[num]) {
      const ok = await importProject(slotsData[num]);
      if (ok) onClose();
    }
  };

  const handleDeleteSlot = async (num) => {
    await idbSet(`${SLOTS_KEY_PREFIX}${num}`, null);
    await refreshSlots();
    showToast(`Слот ${num} очищен`, 'info');
  };

  const resetLabels = {
    blank: 'Чистое полотно',
    fantasy: 'Фэнтези: Старый Замок (12 сцен)',
    scifi: 'Sci-Fi: Орбита (10 сцен)'
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Cloud size={22} color="#2563eb" />
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Локальные проекты и экспорт</h2>
              <div style={{ fontSize: '0.78rem', opacity: 0.7 }}>
                Файлы на вашем компьютере, локальные слоты и экспорт игры
              </div>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>

        <div style={styles.tabBar}>
          <button
            onClick={() => setActiveTab('slots')}
            style={{ ...styles.tabBtn, ...(activeTab === 'slots' ? styles.tabBtnActive : {}) }}
          >
            <Database size={15} />
            <span>Слоты и Шаблоны</span>
          </button>
          <button
            onClick={() => setActiveTab('export')}
            style={{ ...styles.tabBtn, ...(activeTab === 'export' ? styles.tabBtnActive : {}) }}
          >
            <Gamepad2 size={16} />
            <span>Экспорт и Файлы</span>
          </button>
        </div>

        <div style={styles.content}>
          <div style={{ ...styles.card, marginBottom: 16, display: 'grid', gap: 8 }}>
            <label>Название полотна</label>
            <input value={canvasTitle} onChange={(event) => setCanvasTitle(event.target.value)} />
            <label>Описание</label>
            <textarea value={canvasDesc} onChange={(event) => setCanvasDesc(event.target.value)} />
          </div>
          {activeTab === 'slots' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={styles.card}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <div style={styles.cardTitle}>Очистить / Сбросить полотно (Выбор шаблона)</div>
                    <div style={styles.cardSubtitle}>
                      Выберите чистое полотно или один из готовых нелинейных квестов с условиями и концовками:
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={() => setConfirmResetMode('blank')} style={styles.secondaryBtn}>
                      <FilePlus2 size={15} /> Чистое полотно
                    </button>
                    <button onClick={() => setConfirmResetMode('fantasy')} style={styles.secondaryBtn}>
                      <Castle size={15} color="#d97706" /> Фэнтези: Старый Замок
                    </button>
                    <button onClick={() => setConfirmResetMode('scifi')} style={styles.secondaryBtn}>
                      <Rocket size={15} color="#0ea5e9" /> Sci-Fi: Орбита
                    </button>
                  </div>
                </div>
                {confirmResetMode && (
                  <div style={styles.confirmBox}>
                    <span>
                      Загрузить шаблон <b>«{resetLabels[confirmResetMode]}»</b>? Несохранённые изменения текущего полотна будут заменены.
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={async () => {
                          await resetProject(confirmResetMode);
                          setConfirmResetMode(null);
                          onClose();
                        }}
                        style={styles.loadBtn}
                      >
                        Да, загрузить
                      </button>
                      <button onClick={() => setConfirmResetMode(null)} style={styles.secondaryBtn}>
                        Отмена
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {[1, 2, 3, 4, 5].map((num) => {
                const slot = slotsData[num];
                return (
                  <div key={num} style={styles.slotCard}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                        <Database size={16} color="#d97706" /> Слот #{num}{' '}
                        {slot?.projectMeta?.title ? `— ${slot.projectMeta.title}` : ''}
                      </div>
                      <div style={{ fontSize: '0.78rem', opacity: 0.7, marginTop: 4 }}>
                        {slot
                          ? `Сохранено: ${new Date(slot.updatedAt).toLocaleString('ru-RU')} • Сцен: ${slot.nodes?.length || 0}`
                          : 'Свободный слот (IndexedDB — без лимита 5 МБ)'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => handleSaveToSlot(num)} style={styles.secondaryBtn}>
                        Записать
                      </button>
                      {slot && (
                        <>
                          <button onClick={() => handleLoadFromSlot(num)} style={styles.loadBtn}>
                            Загрузить
                          </button>
                          <button onClick={() => handleDeleteSlot(num)} style={styles.delIconBtn} title="Очистить слот">
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'export' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={styles.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ ...styles.cardTitle, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Gamepad2 size={18} /> Экспорт готовой игры в HTML
                    </div>
                    <div style={styles.cardSubtitle}>
                      Скомпилировать весь сюжет ({nodes.length} сцен, {characters.length} персонажей) в один автономный игровой файл <code>.html</code> для запуска в любом браузере или публикации на itch.io.
                    </div>
                  </div>
                  <button onClick={handleDownloadPlayableHtml} style={styles.successBtn}>
                    <FileCode size={16} /> Скачать игру (.html)
                  </button>
                </div>
              </div>

              <div style={styles.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={styles.cardTitle}>Экспорт файла полотна (.story.json)</div>
                    <div style={styles.cardSubtitle}>
                      Сохранить исходник полотна на устройство для резервной копии или передачи коллегам.
                    </div>
                  </div>
                  <button onClick={handleDownloadJson} style={styles.primaryBtn}>
                    <Download size={16} /> Скачать .mitory.json
                  </button>
                </div>
              </div>

              <div
                style={{ ...styles.dropZone, borderColor: isDragOver ? '#2563eb' : 'var(--node-border)' }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  processFile(e.dataTransfer.files?.[0]);
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={28} color="#2563eb" style={{ marginBottom: 6 }} />
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  Перетащите .json файл сюда или прямо на холст редактора
                </div>
                <div style={{ fontSize: '0.76rem', opacity: 0.65, marginTop: 2 }}>
                  Нажмите, чтобы выбрать файл с устройства
                </div>
                <input
                  type="file"
                  accept=".mitory.json,.story.json,.json,application/json"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={(e) => processFile(e.target.files?.[0])}
                />
              </div>

              {isFileSystemSupported && (
                <div style={styles.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div style={styles.cardTitle}>Прямая привязка к файлу на ПК (Ctrl+S)</div>
                      <div style={styles.cardSubtitle}>
                        {fileHandle
                          ? `Привязан локальный файл: «${fileHandle.name}»`
                          : 'Привяжите локальный файл, чтобы сохранять изменения в один клик без скачивания.'}
                      </div>
                    </div>
                    <button onClick={handleBindLocalFile} style={styles.secondaryBtn}>
                      <FolderSync size={15} /> {fileHandle ? 'Сменить файл' : 'Привязать файл'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
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
    zIndex: 2500,
    padding: 12
  },
  modal: {
    width: 'min(620px, 96vw)',
    maxHeight: '90vh',
    background: 'var(--panel-bg)',
    color: 'var(--text-color)',
    borderRadius: 16,
    boxShadow: '0 25px 60px rgba(0,0,0,0.45)',
    border: '1px solid var(--node-border)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  header: {
    padding: '16px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--node-border)',
    background: 'var(--bg-color)'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-color)',
    cursor: 'pointer',
    padding: 6
  },
  tabBar: {
    display: 'flex',
    borderBottom: '1px solid var(--node-border)',
    background: 'var(--bg-color)'
  },
  tabBtn: {
    flex: 1,
    padding: '12px 10px',
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: 'var(--text-color)',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.86rem',
    opacity: 0.68,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  tabBtnActive: {
    opacity: 1,
    borderBottom: '2px solid #2563eb',
    color: '#2563eb'
  },
  content: {
    padding: 20,
    overflowY: 'auto'
  },
  card: {
    background: 'var(--bg-color)',
    padding: 16,
    borderRadius: 12,
    border: '1px solid var(--node-border)',
    display: 'flex',
    flexDirection: 'column',
    gap: 10
  },
  cardTitle: {
    fontWeight: 700,
    fontSize: '0.95rem'
  },
  cardSubtitle: {
    fontSize: '0.8rem',
    opacity: 0.72,
    marginTop: 2,
    lineHeight: 1.4
  },
  dropZone: {
    border: '2px dashed var(--node-border)',
    borderRadius: 12,
    padding: '22px 16px',
    textAlign: 'center',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: 'var(--bg-color)'
  },
  slotCard: {
    background: 'var(--bg-color)',
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px solid var(--node-border)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap'
  },
  confirmBox: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    fontSize: '0.84rem'
  },
  primaryBtn: {
    padding: '10px 16px',
    background: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    fontWeight: 600
  },
  successBtn: {
    padding: '10px 16px',
    background: '#16a34a',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    fontWeight: 600
  },
  secondaryBtn: {
    padding: '8px 12px',
    background: 'var(--panel-bg)',
    color: 'var(--text-color)',
    border: '1px solid var(--node-border)',
    borderRadius: 8,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontWeight: 500,
    fontSize: '0.84rem'
  },
  loadBtn: {
    padding: '8px 14px',
    background: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.84rem'
  },
  delIconBtn: {
    padding: 8,
    background: 'rgba(239, 68, 68, 0.12)',
    color: '#ef4444',
    border: '1px solid rgba(239, 68, 68, 0.35)',
    borderRadius: 8,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
};
