import { getConditions, evaluateConditions } from '../../graph/conditions';
import { assetStorage } from '../assetStorage';

export const STORAGE_KEY = 'story-architect-v4';
export const PROJECTS_INDEX_KEY = 'story-architect-projects-v4';
const DB_NAME = 'story_architect_v4_db';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('kv')) {
        db.createObjectStore('kv');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function idbGet(key) {
  try {
    const db = await openDB();
    const value = await new Promise((resolve, reject) => {
      const tx = db.transaction('kv', 'readonly');
      const store = tx.objectStore('kv');
      const req = store.get(key);
      tx.oncomplete = () => resolve(req.result ?? null);
      tx.onabort = () => reject(tx.error);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return value;
  } catch {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}

export async function idbSet(key, value) {
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction('kv', 'readwrite');
      const store = tx.objectStore('kv');
      const req = store.put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onabort = () => reject(tx.error);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return true;
  } catch {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }
}

export function buildStandaloneGameHtml(projectData) {
  const assets = {
    ...(projectData.assetsMap || projectData.assets || {}),
    ...assetStorage.exportAssetsForNodes(projectData.nodes || [])
  };
  const enrichedProject = {
    ...projectData,
    assets,
    nodes: (projectData.nodes || []).filter(n => n && n.type !== 'regionNode').map((n) => ({
      ...n,
      data: {
        ...n.data,
        image:
          n.data?.image ||
          (n.data?.imageId ? assets[n.data.imageId] || assetStorage.getAsset(n.data.imageId) : null)
      }
    }))
  };
  const safeJson = JSON.stringify(enrichedProject).replace(/</g, '\\u003c');
  const title = String(projectData.projectMeta?.title || 'Интерактивная история').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title} — Mitory Game</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 16px; }
  .game-card { width: 100%; max-width: 720px; background: #1e293b; border: 1px solid #334155; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
  .hud { padding: 12px 20px; background: #0f172a; border-bottom: 1px solid #334155; display: flex; flex-wrap: wrap; gap: 10px; justify-content: space-between; align-items: center; font-size: 0.85rem; }
  .var-badge { background: #1e293b; border: 1px solid #475569; padding: 4px 10px; border-radius: 999px; display: inline-flex; align-items: center; gap: 6px; }
  .scene-img { width: 100%; max-height: 300px; object-fit: cover; display: block; }
  .content { padding: 24px; }
  .scene-title { font-size: 1.4rem; font-weight: 700; margin-bottom: 8px; color: #f8fafc; }
  .scene-notes { font-size: 0.95rem; color: #94a3b8; margin-bottom: 18px; line-height: 1.5; white-space: pre-wrap; }
  .dialogue-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }
  .line { background: #0f172a; padding: 12px 16px; border-radius: 10px; border-left: 4px solid #3b82f6; line-height: 1.5; }
  .char-name { font-weight: 700; font-size: 0.85rem; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.03em; }
  .choices { display: flex; flex-direction: column; gap: 10px; }
  .choice-btn { width: 100%; text-align: left; padding: 14px 18px; border-radius: 10px; border: 1px solid #3b82f6; background: rgba(37,99,235,0.15); color: #f8fafc; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: 0.2s; }
  .choice-btn:hover:not(:disabled) { background: #2563eb; }
  .choice-btn:disabled { opacity: 0.45; border-color: #475569; background: #0f172a; cursor: not-allowed; }
  .restart-btn { margin-top: 16px; padding: 10px 18px; background: #334155; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; }
  body{padding:0;min-height:100dvh;background:#080b14}
  .game-card{width:100%;max-width:none;min-height:100dvh;border:0;border-radius:0;background:transparent}
  #scene-media{position:fixed;inset:0;z-index:-1;filter:brightness(.45)}
  .scene-img{width:100%;height:100%;max-height:none;object-fit:cover}
  .hud{background:#0f172abb;backdrop-filter:blur(12px)}
  .content{width:min(920px,100%);margin:clamp(30px,15vh,180px) auto 0}
  .line,.choice-btn{background:#0f172acc;backdrop-filter:blur(12px);white-space:pre-wrap}
  .choices{animation:appear .3s ease-out}
  @keyframes appear{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
</style>
</head>
<body>
<div class="game-card">
  <div class="hud" id="hud"></div>
  <div id="scene-media"></div>
  <div class="content">
    <div class="scene-title" id="scene-title"></div>
    <div class="scene-notes" id="scene-notes"></div>
    <div class="dialogue-list" id="dialogue"></div>
    <div class="choices" id="choices"></div>
  </div>
</div>
<script>
const STORY = ${safeJson};
let vars = {};
let currentNodeId = null;
let dialogueIndex = 0;
function initGame() {
  vars = {};
  (STORY.variables || []).forEach(v => { vars[v.id] = v.initialValue; });
  const startNode = (STORY.nodes || []).find(n => n.data?.type === 'start') || (STORY.nodes || [])[0];
  currentNodeId = startNode ? startNode.id : null;
  if (currentNodeId) enterScene(currentNodeId);
}
function applyEffects(effects) {
  (effects || []).forEach(ef => {
    const v = (STORY.variables || []).find(x => x.id === ef.varId);
    if (!v) return;
    if (v.type === 'boolean') {
      if (ef.action === 'toggle') vars[v.id] = !vars[v.id];
      else vars[v.id] = ef.value === true || ef.value === 'true';
    } else {
      const cur = Number.isFinite(Number(vars[v.id])) ? Number(vars[v.id]) : 0;
      const val = Number.isFinite(Number(ef.value)) ? Number(ef.value) : 0;
      if (ef.action === 'add') vars[v.id] = cur + val;
      else if (ef.action === 'sub') vars[v.id] = cur - val;
      else vars[v.id] = val;
    }
  });
}
${getConditions.toString()}
${evaluateConditions.toString()}
function checkCondition(cond) {
  if (!cond || !cond.varId) return true;
  const v = (STORY.variables || []).find(x => x.id === cond.varId);
  if (!v) return false;
  const cur = vars[cond.varId];
  if (v.type === 'boolean') {
    const isTargetTrue = cond.value === true || cond.value === 'true';
    return (cond.operator === '!=') ? Boolean(cur) !== isTargetTrue : Boolean(cur) === isTargetTrue;
  }
  const target = cond.value;
  switch (cond.operator || '==') {
    case '==': return Number(cur) === Number(target);
    case '!=': return Number(cur) !== Number(target);
    case '>=': return Number(cur) >= Number(target);
    case '>': return Number(cur) > Number(target);
    case '<=': return Number(cur) <= Number(target);
    case '<': return Number(cur) < Number(target);
    default: return false;
  }
}
function enterScene(nodeId) {
  currentNodeId = nodeId;
  dialogueIndex = 0;
  const node = (STORY.nodes || []).find(n => n.id === nodeId);
  if (!node) return;
  applyEffects(node.data?.effects);
  render();
}
function render() {
  const node = (STORY.nodes || []).find(n => n.id === currentNodeId);
  if (!node) return;
  const hud = document.getElementById('hud');
  hud.replaceChildren();
  const title = document.createElement('b');
  title.textContent = STORY.projectMeta?.title || 'История';
  hud.append(title);
  for (const variable of STORY.variables || []) {
    const badge = document.createElement('span');
    badge.className = 'var-badge';
    badge.textContent = variable.name + ': ' + (variable.type === 'boolean' ? (vars[variable.id] ? '✅ Да' : '❌ Нет') : vars[variable.id]);
    hud.append(badge);
  }
  const media = document.getElementById('scene-media');
  media.replaceChildren();
  const image = node.data?.image || STORY.assets?.[node.data?.imageId];
  if (image) {
    const img = document.createElement('img');
    img.className = 'scene-img'; img.src = image; img.alt = '';
    media.append(img);
  }
  document.getElementById('scene-title').textContent = node.data?.label || 'Сцена';
  document.getElementById('scene-notes').textContent = node.data?.notes || '';
  const dialogue = document.getElementById('dialogue');
  const choices = document.getElementById('choices');
  dialogue.replaceChildren(); choices.replaceChildren();
  const line = (node.data?.dialogue || [])[dialogueIndex];
  if (line) {
    const character = (STORY.characters || []).find(c => c.id === line.charId);
    const box = document.createElement('div'); box.className = 'line';
    const speaker = document.createElement('div'); speaker.className = 'char-name';
    speaker.textContent = character?.name || 'Рассказчик';
    if (character?.color) { speaker.style.color = character.color; box.style.borderLeftColor = character.color; }
    const text = document.createElement('div'); text.textContent = line.text || '…';
    const next = document.createElement('button'); next.className = 'restart-btn'; next.textContent = 'Далее →';
    next.onclick = advanceDialogue;
    box.append(speaker, text, next); dialogue.append(box);
    return;
  }
  const outgoing = node.data?.type === 'ending' ? [] : (STORY.edges || []).filter(e => e.source === currentNodeId);
  if (!outgoing.length) {
    const banner = document.createElement('p'); banner.textContent = '🏁 Финал истории';
    const restart = document.createElement('button'); restart.className = 'restart-btn';
    restart.textContent = 'Начать заново'; restart.onclick = initGame;
    choices.append(banner, restart);
    return;
  }
  for (const edge of outgoing) {
    const conditions = getConditions(edge.data);
    const target = (STORY.nodes || []).find(n => n.id === edge.target);
    const ok = Boolean(target) && evaluateConditions(conditions, checkCondition);
    const button = document.createElement('button'); button.className = 'choice-btn'; button.disabled = !ok;
    const reasons = conditions.map(c => ((STORY.variables || []).find(v => v.id === c.varId)?.name || c.varId) + ' ' + c.operator + ' ' + c.value).join(' · ');
    const cleanLabel = String(edge.label || '').replace(new RegExp('\\s*\\[🔒[^\\]]*\\]', 'g'), '').trim() || target?.data?.label || 'Далее →';
    button.textContent = cleanLabel + (!ok ? ' (Недоступно: ' + (reasons || 'сцена не найдена') + ')' : '');
    button.onclick = () => {
      if (!target || !evaluateConditions(conditions, checkCondition)) return;
      applyEffects(edge.data?.effects); enterScene(target.id);
    };
    choices.append(button);
  }
}
function advanceDialogue() {
  const node = (STORY.nodes || []).find(n => n.id === currentNodeId);
  if (dialogueIndex < (node?.data?.dialogue || []).length) { dialogueIndex++; render(); }
}
document.addEventListener('keydown', event => {
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.target.closest('button')) return;
  if (event.code === 'Space' || event.key === 'Enter') { event.preventDefault(); advanceDialogue(); }
});

initGame();
</script>
</body>
</html>`;
}

/**
 * Реализация IStorageService для работы в браузере (IndexedDB + LocalStorage + Blob Download)
 */
export class BrowserStorageService {
  async open() {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.mitory.json,.story.json,.json,application/json';
      input.oncancel = () => resolve(null);
      input.onchange = async () => {
        try {
          const file = input.files?.[0];
          resolve(file ? JSON.parse(await file.text()) : null);
        } catch (error) { reject(error); }
      };
      input.click();
    });
  }

  async saveProject(project) {
    try {
      const id = project?.projectMeta?.id || 'canvas-default';
      const now = new Date().toISOString();
      const payload = {
        ...project,
        updatedAt: now,
        projectMeta: {
          ...(project.projectMeta || {}),
          id,
          updatedAt: now
        }
      };

      const ok = await idbSet(STORAGE_KEY, payload);
      await idbSet(`${STORAGE_KEY}:${id}`, payload);

      const list = (await idbGet(PROJECTS_INDEX_KEY)) || [];
      const meta = {
        id,
        title: payload.projectMeta.title || 'Моё полотно',
        description: payload.projectMeta.description || '',
        driveFileId: payload.projectMeta.driveFileId || null,
        lastSyncedAt: payload.projectMeta.lastSyncedAt || null,
        updatedAt: now,
        nodesCount: Array.isArray(payload.nodes) ? payload.nodes.length : 0,
        charactersCount: Array.isArray(payload.characters) ? payload.characters.length : 0
      };
      const idx = list.findIndex((item) => item.id === id);
      const nextList = idx >= 0 ? list.map((item, i) => (i === idx ? meta : item)) : [meta, ...list];
      await idbSet(PROJECTS_INDEX_KEY, nextList);

      return ok
        ? { success: true }
        : { success: false, error: 'Не удалось сохранить проект в IndexedDB/LocalStorage' };
    } catch (err) {
      return { success: false, error: err?.message || 'Ошибка сохранения проекта' };
    }
  }

  async loadProject(id) {
    await assetStorage.initFromStorage();
    if (id) {
      const byId = await idbGet(`${STORAGE_KEY}:${id}`);
      if (byId) {
        assetStorage.hydrateFromProject(byId);
        return byId;
      }
    }
    let parsed = await idbGet(STORAGE_KEY);
    if (!parsed && typeof localStorage !== 'undefined') {
      const rawLegacy = localStorage.getItem('story-architect-v3') || localStorage.getItem(STORAGE_KEY);
      if (rawLegacy) parsed = JSON.parse(rawLegacy);
    }
    if (parsed) {
      assetStorage.hydrateFromProject(parsed);
    }
    return parsed;
  }

  async listProjects() {
    const list = (await idbGet(PROJECTS_INDEX_KEY)) || [];
    return Array.isArray(list) ? list : [];
  }

  async exportJson(project) {
    const jsonString = JSON.stringify(project, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (project?.projectMeta?.title || 'story_canvas').replace(/[^a-zA-Zа-яА-Я0-9_-]/g, '_');
    a.download = `${safeName}.mitory.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async exportStandaloneHtml(project) {
    const htmlContent = buildStandaloneGameHtml(project);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (project?.projectMeta?.title || 'story_game').replace(/[^a-zA-Zа-яА-Я0-9_-]/g, '_');
    a.download = `${safeName}_game.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
