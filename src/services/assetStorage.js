// Пул ассетов (Asset Storage Pool) для исключения тяжелых Base64-изображений из истории Undo/Redo (Zundo)

const ASSET_DB_NAME = 'story_architect_v4_assets_db';
const ASSET_DB_VERSION = 1;
const ASSET_STORE_NAME = 'assets';
const LEGACY_ASSETS_LS_KEY = 'story-architect-assets-v4';

// Оперативный пул в памяти процесса (вне дерева состояний Zustand/Zundo)
const memoryAssetPool = new Map();
// Обратный индекс для дедупликации одинаковых Base64-строк
const dataToIdIndex = new Map();

function openAssetDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const request = window.indexedDB.open(ASSET_DB_NAME, ASSET_DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(ASSET_STORE_NAME)) {
        db.createObjectStore(ASSET_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function persistAssetToIDB(imageId, dataUrl) {
  try {
    const db = await openAssetDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(ASSET_STORE_NAME, 'readwrite');
      const store = tx.objectStore(ASSET_STORE_NAME);
      const req = store.put(dataUrl, imageId);
      tx.oncomplete = () => resolve(true);
      tx.onabort = () => reject(tx.error);
      req.onerror = () => reject(req.error);
    });
    db.close();
  } catch {
    try {
      const raw = localStorage.getItem(LEGACY_ASSETS_LS_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      parsed[imageId] = dataUrl;
      localStorage.setItem(LEGACY_ASSETS_LS_KEY, JSON.stringify(parsed));
    } catch {
      // Игнорируем переполнение localStorage, ассет остается в memoryAssetPool
    }
  }
}

async function deleteAssetFromIDB(imageId) {
  try {
    const db = await openAssetDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(ASSET_STORE_NAME, 'readwrite');
      const store = tx.objectStore(ASSET_STORE_NAME);
      const req = store.delete(imageId);
      tx.oncomplete = () => resolve(true);
      tx.onabort = () => reject(tx.error);
      req.onerror = () => reject(req.error);
    });
    db.close();
  } catch {
    // ignore
  }
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(LEGACY_ASSETS_LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && imageId in parsed) {
          delete parsed[imageId];
          localStorage.setItem(LEGACY_ASSETS_LS_KEY, JSON.stringify(parsed));
        }
      }
    }
  } catch {
    // ignore
  }
}

function computeShortHash(str) {
  let h = 2166136261;
  const step = Math.max(1, Math.floor(str.length / 512));
  for (let i = 0; i < str.length; i += step) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export const assetStorage = {
  /**
   * Регистрирует Base64/Blob URL в пуле ассетов и возвращает легкий идентификатор `img_xyz`.
   */
  registerAsset(dataUrl, preferredId = null) {
    if (!dataUrl || typeof dataUrl !== 'string') return null;

    if (!preferredId && dataToIdIndex.has(dataUrl)) {
      return dataToIdIndex.get(dataUrl);
    }

    let imageId =
      preferredId && String(preferredId).startsWith('img_')
        ? String(preferredId)
        : `img_${computeShortHash(dataUrl)}_${ strLengthTag(dataUrl) }`;

    if (memoryAssetPool.has(imageId) && memoryAssetPool.get(imageId) !== dataUrl) imageId = `img_${crypto.randomUUID()}`;
    memoryAssetPool.set(imageId, dataUrl);
    dataToIdIndex.set(dataUrl, imageId);
    persistAssetToIDB(imageId, dataUrl);
    return imageId;
  },

  /**
   * Получает данные изображения по `imageId` синхронно из памяти.
   */
  getAsset(imageId) {
    if (!imageId) return null;
    if (typeof imageId === 'string' && imageId.startsWith('data:image/')) {
      return imageId;
    }
    return memoryAssetPool.get(imageId) || null;
  },

  /**
   * Удаляет ассет из пула.
   */
  removeAsset(imageId) {
    if (!imageId) return;
    const existing = memoryAssetPool.get(imageId);
    if (existing) {
      if (dataToIdIndex.get(existing) === imageId) dataToIdIndex.delete(existing);
      memoryAssetPool.delete(imageId);
    }
    deleteAssetFromIDB(imageId);
  },

  /**
   * Загружает все сохраненные ассеты из IndexedDB в оперативный пул при старте приложения.
   */
  async initFromStorage() {
    try {
      const db = await openAssetDB();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(ASSET_STORE_NAME, 'readonly');
        const store = tx.objectStore(ASSET_STORE_NAME);
        const req = store.openCursor();
        req.onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor) {
            const id = String(cursor.key);
            const val = cursor.value;
            if (typeof val === 'string') {
              memoryAssetPool.set(id, val);
              dataToIdIndex.set(val, id);
            }
            cursor.continue();
          } else {
            resolve(true);
          }
        };
        req.onerror = () => reject(req.error);
      });
      db.close();
    } catch {
      try {
        const raw = localStorage.getItem(LEGACY_ASSETS_LS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          Object.entries(parsed).forEach(([id, val]) => {
            if (typeof val === 'string') {
              memoryAssetPool.set(id, val);
              dataToIdIndex.set(val, id);
            }
          });
        }
      } catch {
        // ignore
      }
    }
  },

  /**
   * Извлекает словарь ассетов `{ [imageId]: base64 }` для переданного списка узлов (для экспорта JSON / сохранения).
   */
  exportAssetsForNodes(nodes = []) {
    const map = {};
    nodes.forEach((n) => {
      const imageId = n?.data?.imageId;
      if (imageId && memoryAssetPool.has(imageId)) {
        map[imageId] = memoryAssetPool.get(imageId);
      }
    });
    return map;
  },

  /**
   * Гидрирует пул ассетов из импортируемого проекта (`project.assets` и/или устаревших `node.data.image`).
   */
  hydrateFromProject(projectData = {}) {
    if ((projectData?.assetsMap || projectData?.assets) && typeof (projectData.assetsMap || projectData.assets) === 'object') {
      const remapped = new Map();
      Object.entries(projectData.assetsMap || projectData.assets).forEach(([id, dataUrl]) => {
        if (typeof dataUrl === 'string' && dataUrl.length > 0) {
          remapped.set(id, this.registerAsset(dataUrl, id));
        }
      });
      for (const node of projectData.nodes || []) {
        if (node?.data && remapped.has(node.data.imageId)) node.data.imageId = remapped.get(node.data.imageId);
      }
    }
  }
};

function strLengthTag(str) {
  return (str.length >>> 0).toString(36);
}

export default assetStorage;
