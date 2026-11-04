import { getConditions, normalizeEdges } from './graph/conditions';
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import { temporal } from 'zundo';
import { assetStorage } from './services/assetStorage';
import { LANGUAGE_STORAGE_KEY } from './i18n/translations';
import {
  storageService,
  idbGet,
  idbSet,
  STORAGE_KEY,
  buildStandaloneGameHtml
} from './services/storage';
import { layoutNodes } from './services/storyCommands';

export { idbGet, idbSet, STORAGE_KEY, assetStorage, storageService };
export function generateStandaloneGameHtml(projectData) {
  return buildStandaloneGameHtml(projectData);
}

export const TOOLBAR_STORAGE_KEY = 'mitory_toolbar_config_v1';
export const MTRSB_SCHEMA_URL = 'https://mitory.app/schemas/v1.json';
export const MTRSB_FORMAT = 'mtrsb';
export const MTRSB_VERSION = '1.0.0';
export const MTRSB_GENERATOR = 'Mitory: Story Builder';
export const RECENT_FILES_STORAGE_KEY = 'mitory_recent_files_v1';

function getInitialRecentFiles() {
  try {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(RECENT_FILES_STORAGE_KEY) : null;
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed.filter((path) => typeof path === 'string').slice(0, 20) : [];
  } catch {
    return [];
  }
}

export function parseMtrsbProject(raw) {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!parsed || typeof parsed !== 'object') throw new Error('Invalid project data');
  if (!parsed.graph) return parsed;
  const graph = parsed.graph || {};
  const entities = parsed.entities || {};
  const project = parsed.project || {};
  return {
    ...parsed,
    currentTheme: parsed.currentTheme || parsed.settings?.theme || 'dark',
    assetsMap: parsed.assetsMap || parsed.assets || {},
    customFolders: Array.isArray(parsed.customFolders) ? parsed.customFolders : [],
    projectMeta: {
      ...(parsed.projectMeta || {}),
      id: parsed.projectMeta?.id || project.id || `canvas-${Date.now()}`,
      title: parsed.projectMeta?.title || project.title || 'Импортированный проект',
      description: parsed.projectMeta?.description || project.description || '',
      updatedAt: parsed.projectMeta?.updatedAt || project.updatedAt || parsed.updatedAt
    },
    nodes: Array.isArray(parsed.nodes) ? parsed.nodes : (Array.isArray(graph.nodes) ? graph.nodes : []),
    edges: Array.isArray(parsed.edges) ? parsed.edges : (Array.isArray(graph.edges) ? graph.edges : []),
    regions: Array.isArray(parsed.regions) ? parsed.regions : (Array.isArray(entities.chapters) ? entities.chapters : []),
    characters: Array.isArray(parsed.characters) ? parsed.characters : (Array.isArray(entities.characters) ? entities.characters : []),
    variables: Array.isArray(parsed.variables) ? parsed.variables : (Array.isArray(entities.variables) ? entities.variables : []),
    groups: Array.isArray(parsed.groups) ? parsed.groups : (Array.isArray(entities.groups) ? entities.groups : undefined),
    stash: Array.isArray(parsed.stash) ? parsed.stash : (Array.isArray(parsed.stashedNodes) ? parsed.stashedNodes : []),
    viewport: graph.viewport || parsed.viewport || { x: 0, y: 0, zoom: 1 }
  };
}

export const DEFAULT_TOOLBAR_ITEMS = [
  { id: 'project-title', slot: 'top-left', visible: true },
  { id: 'history-actions', slot: 'top-left', visible: true },
  { id: 'node-create', slot: 'top-center', visible: true },
  { id: 'chips-counters', slot: 'top-center', visible: true },
  { id: 'search-action', slot: 'top-right', visible: true },
  { id: 'save-action', slot: 'top-right', visible: true },
  { id: 'play-action', slot: 'top-right', visible: true },
  { id: 'encyclopedia-action', slot: 'top-right', visible: true },
  { id: 'settings-action', slot: 'top-right', visible: true }
];

export const TOOLBAR_SLOTS = [
  { id: 'top-left', labelRu: 'Слева (вверху)', labelEn: 'Top Left' },
  { id: 'top-center', labelRu: 'По центру (вверху)', labelEn: 'Top Center' },
  { id: 'top-right', labelRu: 'Справа (вверху)', labelEn: 'Top Right' },
  { id: 'bottom-bar', labelRu: 'Нижняя панель (Dock)', labelEn: 'Bottom Dock' },
  { id: 'hidden', labelRu: 'Скрыть', labelEn: 'Hidden' }
];

export const TOOLBAR_ITEM_INFO = {
  'project-title': { labelRu: 'Название проекта', labelEn: 'Project Title' },
  'history-actions': { labelRu: 'История (Undo / Redo)', labelEn: 'History (Undo / Redo)' },
  'node-create': { labelRu: 'Создание нод ([+ Нода ▾])', labelEn: 'Node Creation ([+ Node ▾])' },
  'chips-counters': { labelRu: 'Счетчики (Персонажи, Переменные, Главы)', labelEn: 'Counters (Characters, Variables, Chapters)' },
  'search-action': { labelRu: 'Поиск сюжета (Ctrl+F)', labelEn: 'Search & Integrity (Ctrl+F)' },
  'save-action': { labelRu: 'Быстрое сохранение (Ctrl+S)', labelEn: 'Quick Save (Ctrl+S)' },
  'play-action': { labelRu: 'Запуск игры (▶ Играть)', labelEn: 'Player Launch (▶ Play)' },
  'encyclopedia-action': { labelRu: 'Кодекс сценариста (F1)', labelEn: 'Writer Codex (F1)' },
  'settings-action': { labelRu: 'Настройки редактора', labelEn: 'Editor Settings' }
};

function getInitialToolbarItems() {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(TOOLBAR_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const itemMap = new Map(parsed.map((it) => [it.id, it]));
          return DEFAULT_TOOLBAR_ITEMS.map((def) => {
            const found = itemMap.get(def.id);
            return found ? { ...def, ...found } : { ...def };
          });
        }
      }
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_TOOLBAR_ITEMS.map((it) => ({ ...it }));
}

function getInitialLanguage() {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved === 'en' || saved === 'ru') return saved;
    }
  } catch {
    // ignore storage errors
  }
  return 'ru';
}

// 5 пастельных пресетов областей (синий, янтарный, изумрудный, фиолетовый, серый)
export const DEFAULT_REGION_PALETTE = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#64748b'];

/**
 * Вычисляет общий Bounding Box всех выделенных узлов (minX, minY, maxX, maxY)
 * и параметры области с отступами padding (по умолчанию 30px) со всех сторон.
 */
export function computeSelectionBoundingBox(nodes = [], padding = 30) {
  const selected = (Array.isArray(nodes) ? nodes : []).filter(
    (n) => n && n.selected && n.type !== 'regionNode'
  );
  if (selected.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const n of selected) {
    const x = Number(n.position?.x) || 0;
    const y = Number(n.position?.y) || 0;
    const w = Number(n.measured?.width || n.width || n.style?.width) || 240;
    const h = Number(n.measured?.height || n.height || n.style?.height) || 150;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x + w > maxX) maxX = x + w;
    if (y + h > maxY) maxY = y + h;
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    x: Math.round(minX - padding),
    y: Math.round(minY - padding),
    width: Math.max(250, Math.round(maxX - minX + padding * 2)),
    height: Math.max(150, Math.round(maxY - minY + padding * 2))
  };
}

// --- ЭТАП 2. РАСШИРЕННЫЕ СЮЖЕТНЫЕ ШАБЛОНЫ ---

// 1. Расширенный квест «Тайна Старого Замка» (12 сцен, 4 персонажа, 5 переменных, 3 финала)
export const createFantasyCastleState = () => ({
  projectMeta: {
    id: 'canvas-fantasy-castle',
    title: 'Тайна Старого Замка',
    description: 'Нелинейный фэнтези-квест с дипломатией, взломом, катакомбами и тремя концовками (12 сцен)',
    driveFileId: null,
    lastSyncedAt: null,
    updatedAt: new Date().toISOString()
  },
  nodes: [
    {
      id: 'start-scene',
      type: 'storyNode',
      position: { x: 60, y: 300 },
      data: {
        label: 'У ворот Старого Замка',
        type: 'start',
        notes: 'Полночь. Туман окутывает ров древней цитадели. Главные ворота охраняет вооружённый караул, неподалёку мерцает фонарь контрабандиста и темнеет решётка сточных катакомб.',
        imageId: null,
        effects: [],
        dialogue: [
          { charId: 'hero-1', text: 'Артефакт Королей спрятан в цитадели. У меня в кошеле всего 5 золотых, но есть верный клинок и смекалка.' },
          { charId: 'guard-1', text: 'Караул, держать строй! По приказу Лорда замка ни одна душа не войдёт без дозволения!' }
        ]
      }
    },
    {
      id: 'scene-smuggler',
      type: 'storyNode',
      position: { x: 420, y: 60 },
      data: {
        label: 'Тайник Торговца контрабандой',
        type: 'scene',
        notes: 'В руинах старой часовни Рейнджер Эрик встречает давнего знакомого из гильдии теней.',
        imageId: null,
        effects: [
          { id: 'ef-smug-picks', varId: 'var-lockpicks', action: 'set', value: true },
          { id: 'ef-smug-gold', varId: 'var-gold', action: 'add', value: 15 },
          { id: 'ef-smug-rep', varId: 'var-rep', action: 'add', value: 10 }
        ],
        dialogue: [
          { charId: 'merchant-1', text: 'Эрик! Давно не виделись. Говорят, ты за Сердцем Королей? Держи воровские отмычки, 15 золотых авансом и моё рекомендательное кольцо.' },
          { charId: 'hero-1', text: 'Спасибо, дружище. Теперь я могу либо подкупить караул, либо вскрыть боковую дверь башни.' }
        ]
      }
    },
    {
      id: 'scene-guardhouse',
      type: 'storyNode',
      position: { x: 420, y: 280 },
      data: {
        label: 'Караулка у внешней стены',
        type: 'scene',
        notes: 'Пока сменный часовой клюёт носом у жаровни, герой бесшумно проскальзывает в тень арки.',
        imageId: null,
        effects: [
          { id: 'ef-gh-key', varId: 'var-key', action: 'set', value: true },
          { id: 'ef-gh-gold', varId: 'var-gold', action: 'add', value: 10 }
        ],
        dialogue: [
          { charId: 'guard-1', text: 'Хрр-пфф... Ещё пять минут, и сменюсь с поста...' },
          { charId: 'hero-1', text: 'Тихо... Связка ключей стражника и мешочек с 10 золотыми перекочевали ко мне на пояс.' }
        ]
      }
    },
    {
      id: 'scene-catacombs',
      type: 'storyNode',
      position: { x: 420, y: 520 },
      data: {
        label: 'Скрытый проход через катакомбы',
        type: 'scene',
        notes: 'Сырые подземные галереи под замком. Под ногой срабатывает нажимная плита древней ловушки с дротиками!',
        imageId: null,
        effects: [
          { id: 'ef-cat-hp', varId: 'var-hp', action: 'sub', value: 30 },
          { id: 'ef-cat-gold', varId: 'var-gold', action: 'add', value: 10 }
        ],
        dialogue: [
          { charId: 'hero-1', text: 'Проклятье, каменная ловушка задела плечо! Зато у скелета древнего рыцаря нашлось 10 золотых монет.' }
        ]
      }
    },
    {
      id: 'decision-gate',
      type: 'storyNode',
      position: { x: 800, y: 120 },
      data: {
        label: 'Переговоры со стражником у ворот',
        type: 'decision',
        notes: 'Начальник стражи выходит вперёд с алебардой. Как преодолеть главный пост?',
        imageId: null,
        effects: [],
        dialogue: [
          { charId: 'guard-1', text: 'Стой, путник! Назови своё имя и цель визита, или пеняй на себя!' },
          { charId: 'hero-1', text: 'Нужно действовать наверняка: убедить его, заплатить звонкой монетой или обойти через башню.' }
        ],
        className: 'decision-node'
      },
      className: 'decision-node'
    },
    {
      id: 'decision-sidedoor',
      type: 'storyNode',
      position: { x: 800, y: 340 },
      data: {
        label: 'Взлом боковой двери башни',
        type: 'decision',
        notes: 'Узкая кованая дверь восточной башни ведёт прямо во внутреннюю галерею замка.',
        imageId: null,
        effects: [],
        dialogue: [
          { charId: 'hero-1', text: 'Замок сложный, но с отмычками или украденным ключом стражника я открою его за минуту.' }
        ]
      },
      className: 'decision-node'
    },
    {
      id: 'decision-catacombs-trap',
      type: 'storyNode',
      position: { x: 800, y: 550 },
      data: {
        label: 'Обвал подземного моста',
        type: 'decision',
        notes: 'Каменный свод катакомб рушится! Чтобы перепрыгнуть пропасть и выбраться во двор, нужен запас сил (Здоровье >= 50).',
        imageId: null,
        effects: [],
        dialogue: [
          { charId: 'hero-1', text: 'Мост уходит из-под ног! Если хватит здоровья и выносливости — допрыгну до уступа.' }
        ]
      },
      className: 'decision-node'
    },
    {
      id: 'scene-courtyard',
      type: 'storyNode',
      position: { x: 1180, y: 260 },
      data: {
        label: 'Внутренний двор и Галерея',
        type: 'scene',
        notes: 'Эрик внутри крепости! Факелы освещают вход в Тронный зал и винтовой спуск к сокровищнице.',
        imageId: null,
        effects: [
          { id: 'ef-cy-rep', varId: 'var-rep', action: 'add', value: 10 }
        ],
        dialogue: [
          { charId: 'hero-1', text: 'Внешний периметр позади. Впереди — Тронный зал, где ждёт сам Лорд замка.' },
          { charId: 'lord-1', text: '(Голос из-за дверей зала) Стража доложила о госте. Входи же, Рейнджер Эрик!' }
        ]
      }
    },
    {
      id: 'decision-throne',
      type: 'storyNode',
      position: { x: 1540, y: 260 },
      data: {
        label: 'Выбор в Тронном зале',
        type: 'decision',
        notes: 'Кульминация квеста. Лорд замка стоит у пьедестала с древней реликвией.',
        imageId: null,
        effects: [],
        dialogue: [
          { charId: 'lord-1', text: 'Ты прошёл сквозь мою стражу, Эрик. Зачем ты явился: за войной, за сделкой или за королевским союзом?' },
          { charId: 'hero-1', text: 'Всё зависит от моего авторитета, снаряжения и принятого решения.' }
        ]
      },
      className: 'decision-node'
    },
    {
      id: 'ending-victory',
      type: 'storyNode',
      position: { x: 1920, y: 80 },
      data: {
        label: 'Триумф королей (Победа)',
        type: 'ending',
        notes: 'Благородный финал! Благодаря высокой репутации Рейнджер Эрик убеждает Лорда замка объединить земли и вернуть корону законному наследнику.',
        imageId: null,
        effects: [],
        dialogue: [
          { charId: 'lord-1', text: 'Твоя честь безупречна, Эрик. Я передаю тебе Артефакт Королей и присягаю союзу!' },
          { charId: 'hero-1', text: 'Мир восстановлен без лишней крови. Старый Замок снова станет оплотом королевства!' }
        ]
      }
    },
    {
      id: 'ending-escape',
      type: 'storyNode',
      position: { x: 1920, y: 280 },
      data: {
        label: 'Тайный побег с артефактом',
        type: 'ending',
        notes: 'Хитроумный финал! Пока стража отвлечена, Эрик вскрывает витрину реликвии и ускользает по крышам в предрассветный туман.',
        imageId: null,
        effects: [],
        dialogue: [
          { charId: 'merchant-1', text: 'Невероятно! Ты вынес реликвию прямо из-под носа Лорда замка! Лодки уже ждут у пристани.' },
          { charId: 'hero-1', text: 'Артефакт у нас. Пусть ищут ветра в поле!' }
        ]
      }
    },
    {
      id: 'ending-dungeon',
      type: 'storyNode',
      position: { x: 1920, y: 490 },
      data: {
        label: 'Поражение в темнице',
        type: 'ending',
        notes: 'Мрачный финал. Лишённый поддержки и сил, герой попадает в окружение алебардщиков и оказывается в подземном каземате.',
        imageId: null,
        effects: [],
        dialogue: [
          { charId: 'guard-1', text: 'Бросить лазутчика в каземат! Отсюда ты уже не выберешься без чуда.' },
          { charId: 'hero-1', text: 'Я недооценил гарнизон крепости... В следующий раз подготовлюсь лучше.' }
        ]
      }
    }
  ],
  edges: [
    {
      id: 'e-start-smuggler',
      source: 'start-scene',
      target: 'scene-smuggler',
      label: 'Навестить Торговца контрабандой',
      data: { conditions: [], effects: [] }
    },
    {
      id: 'e-start-guardhouse',
      source: 'start-scene',
      target: 'scene-guardhouse',
      label: 'Прокрасться к спящему караульному',
      data: { condition: null, effects: [] }
    },
    {
      id: 'e-start-gate',
      source: 'start-scene',
      target: 'decision-gate',
      label: 'Выйти к главным воротам напрямую',
      data: { condition: null, effects: [] }
    },
    {
      id: 'e-start-catacombs',
      source: 'start-scene',
      target: 'scene-catacombs',
      label: 'Спуститься в катакомбы замка',
      data: { condition: null, effects: [] }
    },
    {
      id: 'e-smuggler-gate',
      source: 'scene-smuggler',
      target: 'decision-gate',
      label: 'Пойти к главным воротам для переговоров',
      data: { condition: null, effects: [] }
    },
    {
      id: 'e-smuggler-sidedoor',
      source: 'scene-smuggler',
      target: 'decision-sidedoor',
      label: 'Направиться к боковой двери башни',
      data: { condition: null, effects: [] }
    },
    {
      id: 'e-guardhouse-sidedoor',
      source: 'scene-guardhouse',
      target: 'decision-sidedoor',
      label: 'Использовать проход у боковой двери',
      data: { condition: null, effects: [] }
    },
    {
      id: 'e-guardhouse-gate',
      source: 'scene-guardhouse',
      target: 'decision-gate',
      label: 'Вернуться к главным воротам',
      data: { condition: null, effects: [] }
    },
    {
      id: 'e-catacombs-trap',
      source: 'scene-catacombs',
      target: 'decision-catacombs-trap',
      label: 'Двигаться по подземному мосту',
      data: { condition: null, effects: [] }
    },
    {
      id: 'e-gate-bribe',
      source: 'decision-gate',
      target: 'scene-courtyard',
      label: 'Подкупить стражника золотом [🔒 Золото >= 15]',
      data: {
        condition: { varId: 'var-gold', operator: '>=', value: 15 },
        effects: [{ id: 'ef-pay-15', varId: 'var-gold', action: 'sub', value: 15 }]
      }
    },
    {
      id: 'e-gate-persuade',
      source: 'decision-gate',
      target: 'scene-courtyard',
      label: 'Убедить стражу именем ордена [🔒 Репутация >= 10]',
      data: {
        condition: { varId: 'var-rep', operator: '>=', value: 10 },
        effects: []
      }
    },
    {
      id: 'e-gate-retreat-side',
      source: 'decision-gate',
      target: 'decision-sidedoor',
      label: 'Отойти в тень к боковой двери',
      data: { condition: null, effects: [] }
    },
    {
      id: 'e-gate-storm-fail',
      source: 'decision-gate',
      target: 'ending-dungeon',
      label: 'Пойти на прямой прорыв без подготовки',
      data: {
        condition: null,
        effects: [{ id: 'ef-storm-dmg', varId: 'var-hp', action: 'sub', value: 60 }]
      }
    },
    {
      id: 'e-side-key',
      source: 'decision-sidedoor',
      target: 'scene-courtyard',
      label: 'Открыть дверь ключом [🔒 Ключ стражника]',
      data: {
        condition: { varId: 'var-key', operator: '==', value: true },
        effects: []
      }
    },
    {
      id: 'e-side-lockpicks',
      source: 'decision-sidedoor',
      target: 'scene-courtyard',
      label: 'Взломать замок отмычками [🔒 Отмычки]',
      data: {
        condition: { varId: 'var-lockpicks', operator: '==', value: true },
        effects: []
      }
    },
    {
      id: 'e-side-to-catacombs',
      source: 'decision-sidedoor',
      target: 'scene-catacombs',
      label: 'Искать обход через катакомбы',
      data: { condition: null, effects: [] }
    },
    {
      id: 'e-trap-survive',
      source: 'decision-catacombs-trap',
      target: 'scene-courtyard',
      label: 'Перепрыгнуть разлом на рывке [🔒 Здоровье >= 50]',
      data: {
        condition: { varId: 'var-hp', operator: '>=', value: 50 },
        effects: []
      }
    },
    {
      id: 'e-trap-fall',
      source: 'decision-catacombs-trap',
      target: 'ending-dungeon',
      label: 'Сорваться в решётку нижнего каземата',
      data: { condition: null, effects: [] }
    },
    {
      id: 'e-courtyard-throne',
      source: 'scene-courtyard',
      target: 'decision-throne',
      label: 'Войти в Тронный зал к Лорду замка',
      data: { condition: null, effects: [] }
    },
    {
      id: 'e-throne-victory',
      source: 'decision-throne',
      target: 'ending-victory',
      label: 'Заключить королевский союз [🔒 Репутация >= 15]',
      data: {
        condition: { varId: 'var-rep', operator: '>=', value: 15 },
        effects: []
      }
    },
    {
      id: 'e-throne-steal',
      source: 'decision-throne',
      target: 'ending-escape',
      label: 'Выкрасть реликвию и уйти по крышам [🔒 Отмычки]',
      data: {
        condition: { varId: 'var-lockpicks', operator: '==', value: true },
        effects: []
      }
    },
    {
      id: 'e-throne-key-escape',
      source: 'decision-throne',
      target: 'ending-escape',
      label: 'Отпереть запасной ход ключом [🔒 Ключ стражника]',
      data: {
        condition: { varId: 'var-key', operator: '==', value: true },
        effects: []
      }
    },
    {
      id: 'e-throne-defeat',
      source: 'decision-throne',
      target: 'ending-dungeon',
      label: 'Бросить открытый вызов гвардии Лорда',
      data: { condition: null, effects: [] }
    }
  ],
  groups: [
    { id: 'default', name: 'Герои и союзники' },
    { id: 'guards', name: 'Гарнизон замка' },
    { id: 'shadows', name: 'Теневой рынок' },
    { id: 'nobles', name: 'Владыки крепости' }
  ],
  characters: [
    { id: 'hero-1', name: 'Рейнджер Эрик', color: '#2563eb', groupId: 'default' },
    { id: 'guard-1', name: 'Начальник стражи', color: '#dc2626', groupId: 'guards' },
    { id: 'merchant-1', name: 'Торговец контрабандой', color: '#d97706', groupId: 'shadows' },
    { id: 'lord-1', name: 'Лорд замка', color: '#9333ea', groupId: 'nobles' }
  ],
  variables: [
    { id: 'var-key', name: 'Ключ стражника', type: 'boolean', initialValue: false },
    { id: 'var-lockpicks', name: 'Отмычки', type: 'boolean', initialValue: false },
    { id: 'var-gold', name: 'Золото', type: 'number', initialValue: 5 },
    { id: 'var-hp', name: 'Здоровье', type: 'number', initialValue: 100 },
    { id: 'var-rep', name: 'Репутация', type: 'number', initialValue: 0 }
  ],
  regions: [
    {
      id: 'region-act-1',
      title: 'Акт I: Подступы к Старому Замку',
      order: 1,
      color: '#3b82f6',
      x: 20,
      y: 20,
      width: 680,
      height: 700,
      notes: 'Разведка у главных ворот, встречи с контрабандистом и часовым.'
    },
    {
      id: 'region-act-2',
      title: 'Акт II: Проникновение и ловушки',
      order: 2,
      color: '#10b981',
      x: 750,
      y: 60,
      width: 700,
      height: 680,
      notes: 'Испытания у ворот, боковой башни и подземного моста.'
    },
    {
      id: 'region-act-3',
      title: 'Финал: Тронный зал и Развязка',
      order: 3,
      color: '#8b5cf6',
      x: 1500,
      y: 20,
      width: 720,
      height: 680,
      notes: 'Кульминация у Лорда замка и три концовки истории.'
    }
  ],
  stash: [],
  stashedNodes: [],
  customFolders: [],
  currentTheme: 'dark'
});

// 2. Второй шаблон (Sci-Fi): «Сигнал с орбитальной станции» (10 сцен)
export const createSciFiOrbitalState = () => ({
  projectMeta: {
    id: 'canvas-scifi-orbital',
    title: 'Сигнал с орбитальной станции',
    description: 'Научно-фантастический квест: исследование заброшенного челнока, перезапуск реактора или эвакуация в капсуле',
    driveFileId: null,
    lastSyncedAt: null,
    updatedAt: new Date().toISOString()
  },
  nodes: [
    {
      id: 'sci-start',
      type: 'storyNode',
      position: { x: 60, y: 260 },
      data: {
        label: 'Стыковочный шлюз «Кронос-9»',
        type: 'start',
        notes: 'Разведывательный челнок пристыковался к замолчавшей орбитальной станции. Аварийные огни мигают багровым светом.',
        imageId: null,
        effects: [],
        dialogue: [
          { charId: 'sci-nova', text: 'Шлюз открыт. Гравитация нестабильна, заряд станции на минимуме — всего 20%.' },
          { charId: 'sci-ai', text: 'Внимание: обнаружено падение мощности главного реактора. Рекомендуется диагностика или немедленная эвакуация.' }
        ]
      }
    },
    {
      id: 'sci-shuttle-bay',
      type: 'storyNode',
      position: { x: 420, y: 100 },
      data: {
        label: 'Отсек заброшенного челнока',
        type: 'scene',
        notes: 'Внутри соседнего исследовательского челнока парят контейнеры со снаряжением и резервный плазменный блок.',
        imageId: null,
        effects: [
          { id: 'ef-sci-cell', varId: 'var-cell', action: 'set', value: true },
          { id: 'ef-sci-oxy1', varId: 'var-oxygen', action: 'sub', value: 15 }
        ],
        dialogue: [
          { charId: 'sci-cortez', text: 'Капитан, я нашёл целую плазменную Энергоячейку в обшивке челнока!' },
          { charId: 'sci-nova', text: 'Отлично, забираем. С ней мы сможем перезапустить ядро реактора.' }
        ]
      }
    },
    {
      id: 'sci-bridge',
      type: 'storyNode',
      position: { x: 420, y: 420 },
      data: {
        label: 'Командная рубка станции',
        type: 'scene',
        notes: 'Голографические экраны хранят последнюю запись вахтенного офицера и криптоключ управления.',
        imageId: null,
        effects: [
          { id: 'ef-sci-code', varId: 'var-code', action: 'set', value: true },
          { id: 'ef-sci-en1', varId: 'var-energy', action: 'add', value: 30 }
        ],
        dialogue: [
          { charId: 'sci-ai', text: 'Криптоключ принят. Резервные конденсаторы переключены на шину (+30 к заряду реактора).' },
          { charId: 'sci-nova', text: 'Теперь у нас есть Код допуска ИИ и дополнительная энергия.' }
        ]
      }
    },
    {
      id: 'sci-decision-hub',
      type: 'storyNode',
      position: { x: 800, y: 260 },
      data: {
        label: 'Центральный узел: Реактор или Капсула?',
        type: 'decision',
        notes: 'Ключевая развилка миссии: попытаться восстановить энергию реактора станции или прорываться к спасательным капсулам.',
        imageId: null,
        effects: [],
        dialogue: [
          { charId: 'sci-cortez', text: 'Капитан Нова, обшивка трещит! Идём в реакторный сектор спасать станцию или к спасательным капсулам?' }
        ]
      },
      className: 'decision-node'
    },
    {
      id: 'sci-reactor-hall',
      type: 'storyNode',
      position: { x: 1160, y: 120 },
      data: {
        label: 'Инженерный сектор реактора',
        type: 'scene',
        notes: 'Магнитные катушки гудят в полумраке. Температура растёт, расходуя запас кислорода скафандра.',
        imageId: null,
        effects: [
          { id: 'ef-sci-en2', varId: 'var-energy', action: 'add', value: 20 },
          { id: 'ef-sci-oxy2', varId: 'var-oxygen', action: 'sub', value: 20 }
        ],
        dialogue: [
          { charId: 'sci-ai', text: 'Готовность к инъекции плазмы. Требуется Энергоячейка или Заряд реактора >= 50%.' }
        ]
      }
    },
    {
      id: 'sci-decision-reactor',
      type: 'storyNode',
      position: { x: 1520, y: 120 },
      data: {
        label: 'Терминал запуска реактора',
        type: 'decision',
        notes: 'Выберите способ стабилизации термоядерного ядра.',
        imageId: null,
        effects: [],
        dialogue: [
          { charId: 'sci-nova', text: 'Вводим плазменную ячейку или запускаем форсаж через командный код!' }
        ]
      },
      className: 'decision-node'
    },
    {
      id: 'sci-decision-pod',
      type: 'storyNode',
      position: { x: 1160, y: 430 },
      data: {
        label: 'Шлюз спасательных капсул',
        type: 'decision',
        notes: 'Автоматика капсулы требует либо Код допуска ИИ, либо достаточный запас кислорода для ручной разгерметизации.',
        imageId: null,
        effects: [],
        dialogue: [
          { charId: 'sci-cortez', text: 'Капсула «Орион-3» на старте! Нужно активировать катапульту!' }
        ]
      },
      className: 'decision-node'
    },
    {
      id: 'sci-end-reactor-win',
      type: 'storyNode',
      position: { x: 1900, y: 60 },
      data: {
        label: 'Станция спасена: Энергия восстановлена',
        type: 'ending',
        notes: 'Триумфальная концовка! Реактор «Кронос-9» выходит на 100% мощности, системы жизнеобеспечения и маяк связи полностью восстановлены.',
        imageId: null,
        effects: [],
        dialogue: [
          { charId: 'sci-ai', text: 'Термоядерный цикл стабилен. Орбита скорректирована. Спасибо, экипаж!' },
          { charId: 'sci-nova', text: 'Мы удержали станцию и сохранили все научные архивы экспедиции!' }
        ]
      }
    },
    {
      id: 'sci-end-pod-escape',
      type: 'storyNode',
      position: { x: 1900, y: 270 },
      data: {
        label: 'Эвакуация через спасательную капсулу',
        type: 'ending',
        notes: 'Успешная эвакуация. Спасательная капсула отстреливается от станции и ложится на курс к кораблю-носителю.',
        imageId: null,
        effects: [],
        dialogue: [
          { charId: 'sci-cortez', text: 'Отстыковка прошла штатно! Мы унесли бортовой журнал с данными сигнала.' },
          { charId: 'sci-nova', text: 'Главное — экипаж жив. Флот разберётся с тем, что осталось на орбите.' }
        ]
      }
    },
    {
      id: 'sci-end-void',
      type: 'storyNode',
      position: { x: 1900, y: 480 },
      data: {
        label: 'Дрейф в открытом космосе (Поражение)',
        type: 'ending',
        notes: 'Трагический финал. Без энергоячейки и кодов доступа системы блокируются, оставляя челнок в холодном безмолвии орбиты.',
        imageId: null,
        effects: [],
        dialogue: [
          { charId: 'sci-ai', text: 'Критическое падение энергии... Переход в режим глубокой консервации...' },
          { charId: 'sci-nova', text: 'Нам не хватило ресурсов для перезапуска. Передаю последний маяк...' }
        ]
      }
    }
  ],
  edges: [
    {
      id: 'e-sci-1',
      source: 'sci-start',
      target: 'sci-shuttle-bay',
      label: 'Обыскать заброшенный челнок',
      data: { condition: null, effects: [] }
    },
    {
      id: 'e-sci-2',
      source: 'sci-start',
      target: 'sci-bridge',
      label: 'Подняться в командную рубку',
      data: { condition: null, effects: [] }
    },
    {
      id: 'e-sci-3',
      source: 'sci-start',
      target: 'sci-decision-hub',
      label: 'Сразу пройти к центральному распределителю',
      data: { condition: null, effects: [] }
    },
    {
      id: 'e-sci-4',
      source: 'sci-shuttle-bay',
      target: 'sci-bridge',
      label: 'Перейти из челнока в командную рубку',
      data: { condition: null, effects: [] }
    },
    {
      id: 'e-sci-5',
      source: 'sci-shuttle-bay',
      target: 'sci-decision-hub',
      label: 'Двигаться к центральному узлу',
      data: { condition: null, effects: [] }
    },
    {
      id: 'e-sci-6',
      source: 'sci-bridge',
      target: 'sci-decision-hub',
      label: 'Спуститься к центральному узлу выбора',
      data: { condition: null, effects: [] }
    },
    {
      id: 'e-sci-7',
      source: 'sci-decision-hub',
      target: 'sci-reactor-hall',
      label: 'Направиться к реактору для восстановления энергии',
      data: { condition: null, effects: [] }
    },
    {
      id: 'e-sci-8',
      source: 'sci-decision-hub',
      target: 'sci-decision-pod',
      label: 'Эвакуироваться к спасательным капсулам',
      data: { condition: null, effects: [] }
    },
    {
      id: 'e-sci-9',
      source: 'sci-reactor-hall',
      target: 'sci-decision-reactor',
      label: 'Подойти к пульту управления ядром',
      data: { condition: null, effects: [] }
    },
    {
      id: 'e-sci-10',
      source: 'sci-decision-reactor',
      target: 'sci-end-reactor-win',
      label: 'Установить плазменную ячейку [🔒 Энергоячейка]',
      data: {
        condition: { varId: 'var-cell', operator: '==', value: true },
        effects: []
      }
    },
    {
      id: 'e-sci-11',
      source: 'sci-decision-reactor',
      target: 'sci-end-reactor-win',
      label: 'Форсировать шину реактора [🔒 Заряд реактора >= 50]',
      data: {
        condition: { varId: 'var-energy', operator: '>=', value: 50 },
        effects: []
      }
    },
    {
      id: 'e-sci-12',
      source: 'sci-decision-reactor',
      target: 'sci-decision-pod',
      label: 'Аварийное отступление к спасательным капсулам',
      data: { condition: null, effects: [] }
    },
    {
      id: 'e-sci-13',
      source: 'sci-decision-reactor',
      target: 'sci-end-void',
      label: 'Попытаться замкнуть контур вручную без защиты',
      data: { condition: null, effects: [] }
    },
    {
      id: 'e-sci-14',
      source: 'sci-decision-pod',
      target: 'sci-end-pod-escape',
      label: 'Запустить капсулу кодом ИИ [🔒 Код допуска ИИ]',
      data: {
        condition: { varId: 'var-code', operator: '==', value: true },
        effects: []
      }
    },
    {
      id: 'e-sci-15',
      source: 'sci-decision-pod',
      target: 'sci-end-pod-escape',
      label: 'Ручной отстрел шлюза [🔒 Кислород >= 70]',
      data: {
        condition: { varId: 'var-oxygen', operator: '>=', value: 70 },
        effects: []
      }
    },
    {
      id: 'e-sci-16',
      source: 'sci-decision-pod',
      target: 'sci-end-void',
      label: 'Остаться в заблокированном шлюзе',
      data: { condition: null, effects: [] }
    }
  ],
  groups: [
    { id: 'default', name: 'Экипаж разведки' },
    { id: 'station-ai', name: 'Системы станции' }
  ],
  characters: [
    { id: 'sci-nova', name: 'Капитан Нова', color: '#0ea5e9', groupId: 'default' },
    { id: 'sci-cortez', name: 'Инженер Кортес', color: '#f59e0b', groupId: 'default' },
    { id: 'sci-ai', name: 'Бортовой ИИ «Гелиос»', color: '#10b981', groupId: 'station-ai' }
  ],
  variables: [
    { id: 'var-cell', name: 'Энергоячейка', type: 'boolean', initialValue: false },
    { id: 'var-code', name: 'Код допуска ИИ', type: 'boolean', initialValue: false },
    { id: 'var-energy', name: 'Заряд реактора', type: 'number', initialValue: 20 },
    { id: 'var-oxygen', name: 'Кислород', type: 'number', initialValue: 100 }
  ],
  regions: [
    {
      id: 'region-sci-1',
      title: 'Глава 1: Стыковка и Разведка',
      order: 1,
      color: '#3b82f6',
      x: 20,
      y: 40,
      width: 680,
      height: 580,
      notes: 'Прибытие на орбитальную станцию «Кронос-9».'
    },
    {
      id: 'region-sci-2',
      title: 'Глава 2: Реактор или Эвакуация',
      order: 2,
      color: '#f59e0b',
      x: 750,
      y: 60,
      width: 1050,
      height: 570,
      notes: 'Критический выбор маршрута спасения.'
    },
    {
      id: 'region-sci-3',
      title: 'Глава 3: Развязка на орбите',
      order: 3,
      color: '#8b5cf6',
      x: 1850,
      y: 20,
      width: 340,
      height: 660,
      notes: 'Финалы научно-фантастической экспедиции.'
    }
  ],
  stash: [],
  stashedNodes: [],
  customFolders: [],
  currentTheme: 'dark'
});

export const createStarterState = () => createFantasyCastleState();

export const createBlankState = () => ({
  projectMeta: {
    id: `canvas-${Date.now()}`,
    title: 'Новое полотно истории',
    description: '',
    driveFileId: null,
    lastSyncedAt: null,
    updatedAt: new Date().toISOString()
  },
  nodes: [
    {
      id: 'start-scene',
      type: 'storyNode',
      position: { x: 180, y: 180 },
      data: {
        label: 'Начало истории',
        type: 'start',
        notes: 'Опишите стартовую локацию...',
        imageId: null,
        effects: [],
        dialogue: []
      }
    }
  ],
  edges: [],
  groups: [{ id: 'default', name: 'Общие' }],
  characters: [{ id: 'hero-1', name: 'Главный герой', color: '#2563eb', groupId: 'default' }],
  variables: [],
  regions: [],
  stash: [],
  stashedNodes: [],
  customFolders: [],
  currentTheme: 'dark'
});

const normalizeRegions = (regions = [], rawNodes = []) => {
  const fromNodes = (Array.isArray(rawNodes) ? rawNodes : [])
    .filter((n) => n && n.type === 'regionNode')
    .map((n, idx) => ({
      id: n.id || `region-${uuidv4()}`,
      title: n.data?.title || n.data?.label || `Глава ${idx + 1}`,
      order: Number.isFinite(n.data?.order) ? Number(n.data.order) : idx + 1,
      color: n.data?.color || DEFAULT_REGION_PALETTE[idx % DEFAULT_REGION_PALETTE.length],
      x: Number.isFinite(n.position?.x) ? Math.round(n.position.x) : 100,
      y: Number.isFinite(n.position?.y) ? Math.round(n.position.y) : 100,
      width: Math.max(250, Number(n.style?.width || n.width || n.data?.width) || 400),
      height: Math.max(150, Number(n.style?.height || n.height || n.data?.height) || 300),
      notes: n.data?.notes || ''
    }));

  const explicit = (Array.isArray(regions) ? regions : [])
    .filter(Boolean)
    .map((r, idx) => ({
      id: r.id || `region-${uuidv4()}`,
      title: r.title || r.label || `Глава ${idx + 1}`,
      order: Number.isFinite(r.order) ? Number(r.order) : idx + 1,
      color: r.color || DEFAULT_REGION_PALETTE[idx % DEFAULT_REGION_PALETTE.length],
      x: Number.isFinite(r.x) ? Math.round(r.x) : Number.isFinite(r.position?.x) ? Math.round(r.position.x) : 100,
      y: Number.isFinite(r.y) ? Math.round(r.y) : Number.isFinite(r.position?.y) ? Math.round(r.position.y) : 100,
      width: Math.max(250, Number(r.width) || 400),
      height: Math.max(150, Number(r.height) || 300),
      notes: r.notes || ''
    }));

  const merged = [...explicit];
  for (const item of fromNodes) {
    if (!merged.some((r) => r.id === item.id)) merged.push(item);
  }
  return merged
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((r, i) => ({ ...r, order: i + 1 }));
};

const normalizeNodes = (nodes = [], isStash = false) =>
  (Array.isArray(nodes) ? nodes : [])
    .filter((n) => n && n.type !== 'regionNode')
    .map((n, idx) => {
      let imageId = n.data?.imageId || null;
      if (!imageId && n.data?.image && typeof n.data.image === 'string') {
        imageId = assetStorage.registerAsset(n.data.image);
      }
      return {
        ...n,
        type: 'storyNode',
        ...(isStash
          ? {
              folder: n.folder || 'Общие',
              stashedAt: n.stashedAt || new Date().toISOString()
            }
          : {}),
        data: {
          ...n.data,
          label: n.data?.label || 'Сцена',
          type: n.data?.type || (!isStash && idx === 0 ? 'start' : 'scene'),
          notes: n.data?.notes || '',
          imageId,
          choices: Array.isArray(n.data?.choices) ? n.data.choices : [],
          dialogue: Array.isArray(n.data?.dialogue) ? n.data.dialogue : [],
          effects: Array.isArray(n.data?.effects) ? n.data.effects : [],
          ...(n.data?.customBadgeLabel ? { customBadgeLabel: n.data.customBadgeLabel } : {}),
          ...(n.data?.customColor ? { customColor: n.data.customColor } : {}),
          ...(n.data?.customIcon ? { customIcon: n.data.customIcon } : {})
        },
        className: n.data?.type === 'decision' ? 'decision-node' : ''
      };
    });

export function isNodeInsideRegion(node, region) {
  if (!node || !region) return false;
  const nx = Number(node.position?.x);
  const ny = Number(node.position?.y);
  if (!Number.isFinite(nx) || !Number.isFinite(ny)) return false;
  const rx = Number(region.x) || 0;
  const ry = Number(region.y) || 0;
  const rw = Math.max(250, Number(region.width) || 400);
  const rh = Math.max(150, Number(region.height) || 300);
  return nx >= rx && nx <= rx + rw && ny >= ry && ny <= ry + rh;
}

function areNodesTrackedEqual(a = [], b = []) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const na = a[i];
    const nb = b[i];
    if (na === nb) continue;
    if (
      na.id !== nb.id ||
      na.type !== nb.type ||
      na.className !== nb.className ||
      na.folder !== nb.folder ||
      na.position?.x !== nb.position?.x ||
      na.position?.y !== nb.position?.y
    ) {
      return false;
    }
    const da = na.data;
    const db = nb.data;
    if (da === db) continue;
    if (
      da?.label !== db?.label ||
      da?.type !== db?.type ||
      da?.notes !== db?.notes ||
      da?.imageId !== db?.imageId ||
      da?.customBadgeLabel !== db?.customBadgeLabel ||
      da?.customColor !== db?.customColor ||
      da?.customIcon !== db?.customIcon ||
      da?.choices !== db?.choices ||
      da?.dialogue !== db?.dialogue ||
      da?.effects !== db?.effects
    ) {
      return false;
    }
  }
  return true;
}

function areRegionsTrackedEqual(a = [], b = []) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ra = a[i];
    const rb = b[i];
    if (ra === rb) continue;
    if (
      ra.id !== rb.id ||
      ra.title !== rb.title ||
      ra.order !== rb.order ||
      ra.color !== rb.color ||
      ra.x !== rb.x ||
      ra.y !== rb.y ||
      ra.width !== rb.width ||
      ra.height !== rb.height ||
      ra.notes !== rb.notes
    ) {
      return false;
    }
  }
  return true;
}

const activeRegionDragCaptures = new Map();

let toastTimer = null;
let suppressDirtyTracking = false;

export const useStoryStore = create(
  temporal(
    (set, get) => ({
      ...createFantasyCastleState(),
      edges: normalizeEdges(createFantasyCastleState().edges),
      trashedNodes: [],
      currentFilePath: null,
      isDirty: false,
      recentFiles: getInitialRecentFiles(),
      viewport: { x: 0, y: 0, zoom: 1 },
      toolbarItems: getInitialToolbarItems(),

      setToolbarItems: (items) => {
        set({ toolbarItems: items });
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(TOOLBAR_STORAGE_KEY, JSON.stringify(items));
          }
        } catch {
          // ignore storage errors
        }
      },

      moveToolbarItem: (itemId, targetSlot, newIndex) => {
        const items = [...get().toolbarItems];
        const idx = items.findIndex((it) => it.id === itemId);
        if (idx === -1) return;
        const [item] = items.splice(idx, 1);
        item.slot = targetSlot;
        item.visible = targetSlot !== 'hidden';
        if (typeof newIndex === 'number' && newIndex >= 0 && newIndex <= items.length) {
          items.splice(newIndex, 0, item);
        } else {
          items.push(item);
        }
        get().setToolbarItems(items);
      },

      toggleItemVisibility: (itemId) => {
        const items = get().toolbarItems.map((it) => {
          if (it.id === itemId) {
            const nextVisible = !it.visible;
            return {
              ...it,
              visible: nextVisible,
              slot: !nextVisible ? 'hidden' : (it.slot === 'hidden' ? 'top-right' : it.slot)
            };
          }
          return it;
        });
        get().setToolbarItems(items);
      },

      resetToolbar: () => {
        const reset = DEFAULT_TOOLBAR_ITEMS.map((it) => ({ ...it }));
        get().setToolbarItems(reset);
      },
language: getInitialLanguage(),
      user: null,
      toast: null,

      setLanguage: (lang) => {
        const nextLang = lang === 'en' ? 'en' : 'ru';
        set({ language: nextLang });
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLang);
          }
        } catch {
          // ignore storage errors
        }
      },

      showToast: (text, type = 'info', action = null) => {
        if (toastTimer) clearTimeout(toastTimer);
        const id = Date.now() + Math.random();
        set({ toast: { text, type, id, action } });
        toastTimer = setTimeout(() => {
          if (get().toast?.id === id) {
            set({ toast: null });
          }
        }, action ? 5200 : 3200);
      },

      clearToast: () => set({ toast: null }),

      setCurrentFilePath: (path) => set({ currentFilePath: path || null }),

      setRecentFiles: (paths) => {
        const recentFiles = Array.isArray(paths) ? [...new Set(paths)].slice(0, 20) : [];
        set({ recentFiles });
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(RECENT_FILES_STORAGE_KEY, JSON.stringify(recentFiles));
          }
        } catch {
          // ignore storage errors
        }
      },

      markDirty: () => set({ isDirty: true }),

      updateProjectMeta: (patch) =>
        set((state) => ({
          isDirty: true,
          projectMeta: {
            ...state.projectMeta,
            ...patch,
            updatedAt: new Date().toISOString()
          }
        })),

      loadProject: async () => {
        try {
          await assetStorage.initFromStorage();
          const parsed = await storageService.loadProject();

          if (parsed?.graph) Object.assign(parsed, parseMtrsbProject(parsed));
          if (parsed && Array.isArray(parsed.nodes)) {
            assetStorage.hydrateFromProject(parsed);
            const theme = parsed.currentTheme || 'dark';
            const normalizedStash = normalizeNodes(parsed.stash || parsed.stashedNodes || [], true);
            const customFolders = Array.isArray(parsed.customFolders) ? parsed.customFolders : [];
            suppressDirtyTracking = true;
            set({
              projectMeta: parsed.projectMeta || {
                id: 'canvas-loaded',
                title: 'Моё полотно',
                description: '',
                driveFileId: null,
                lastSyncedAt: null,
                updatedAt: parsed.updatedAt || new Date().toISOString()
              },
              nodes: normalizeNodes(parsed.nodes),
              edges: normalizeEdges(parsed.edges || []),
              regions: normalizeRegions(parsed.regions, parsed.nodes),
              stash: normalizedStash,
              stashedNodes: normalizedStash,
              customFolders,
              groups: Array.isArray(parsed.groups) && parsed.groups.length > 0 ? parsed.groups : [{ id: 'default', name: 'Общие' }],
              characters: Array.isArray(parsed.characters) ? parsed.characters : [],
              variables: Array.isArray(parsed.variables) ? parsed.variables : [],
              currentTheme: theme,
              currentFilePath: parsed.currentFilePath || null,
              isDirty: false
            });
            suppressDirtyTracking = false;
            document.body.className = `theme-${theme}`;
            useStoryStore.temporal.getState().clear();
          } else {
            document.body.className = `theme-${get().currentTheme}`;
            useStoryStore.temporal.getState().clear();
          }
        } catch (e) {
          console.error(e);
          get().showToast('Ошибка чтения сохранённого проекта', 'error');
        }
      },

      setTheme: (theme) => {
        set({ currentTheme: theme });
        document.body.className = `theme-${theme}`;
      },

      onNodesChange: (changes) => {
        const currentRegions = get().regions || [];
        const currentNodes = get().nodes || [];
        const regionIds = new Set(currentRegions.map((r) => r.id));
        const regionChanges = changes.filter((c) => regionIds.has(c.id));
        const nodeChanges = changes.filter((c) => !regionIds.has(c.id));

        const groupDeltaByNodeId = new Map();

        let nextRegions = currentRegions;
        if (regionChanges.length > 0) {
          const removedRegionIds = new Set(
            regionChanges.filter((c) => c.type === 'remove').map((c) => c.id)
          );
          for (const remId of removedRegionIds) {
            activeRegionDragCaptures.delete(remId);
          }

          nextRegions = currentRegions
            .filter((r) => !removedRegionIds.has(r.id))
            .map((r) => {
              let updated = r;
              for (const ch of regionChanges) {
                if (ch.id !== r.id) continue;
                if (ch.type === 'position' && ch.position && !updated.resizing) {
                  const nextX = Math.round(ch.position.x);
                  const nextY = Math.round(ch.position.y);
                  const dx = nextX - updated.x;
                  const dy = nextY - updated.y;

                  let capturedSet = activeRegionDragCaptures.get(r.id);
                  if (!capturedSet) {
                    capturedSet = new Set(
                      currentNodes.filter((n) => isNodeInsideRegion(n, updated)).map((n) => n.id)
                    );
                    if (ch.dragging) {
                      activeRegionDragCaptures.set(r.id, capturedSet);
                    }
                  }

                  if (dx !== 0 || dy !== 0) {
                    for (const nodeId of capturedSet) {
                      const prev = groupDeltaByNodeId.get(nodeId) || { dx: 0, dy: 0 };
                      groupDeltaByNodeId.set(nodeId, { dx: prev.dx + dx, dy: prev.dy + dy });
                    }
                  }

                  if (ch.dragging === false) {
                    activeRegionDragCaptures.delete(r.id);
                  }

                  updated = {
                    ...updated,
                    x: nextX,
                    y: nextY,
                    dragging: Boolean(ch.dragging)
                  };
                } else if (ch.type === 'position' && typeof ch.dragging === 'boolean') {
                  if (!ch.dragging) activeRegionDragCaptures.delete(r.id);
                  updated = { ...updated, dragging: ch.dragging };
                } else if (ch.type === 'dimensions' && ch.dimensions) {
                  updated = {
                    ...updated,
                    width: Math.max(250, Math.round(ch.dimensions.width)),
                    height: Math.max(150, Math.round(ch.dimensions.height)),
                    resizing: Boolean(ch.resizing)
                  };
                } else if (ch.type === 'select') {
                  updated = { ...updated, selected: Boolean(ch.selected) };
                }
              }
              return updated;
            });
        }

        const explicitPosChangedNodeIds = new Set(
          nodeChanges.filter((c) => c.type === 'position' && c.position).map((c) => c.id)
        );
        const removedIds = nodeChanges.filter((c) => c.type === 'remove').map((c) => c.id);
        let nextNodes = nodeChanges.length > 0 ? applyNodeChanges(nodeChanges, currentNodes) : currentNodes;

        if (groupDeltaByNodeId.size > 0) {
          nextNodes = nextNodes.map((n) => {
            if (explicitPosChangedNodeIds.has(n.id)) return n;
            const delta = groupDeltaByNodeId.get(n.id);
            if (!delta || (delta.dx === 0 && delta.dy === 0)) return n;
            return {
              ...n,
              position: {
                x: Math.round((Number(n.position?.x) || 0) + delta.dx),
                y: Math.round((Number(n.position?.y) || 0) + delta.dy)
              }
            };
          });
        }

        if (removedIds.length > 0) {
          const nextEdges = get().edges.filter(
            (e) => !removedIds.includes(e.source) && !removedIds.includes(e.target)
          );
          const validHandles = new Set(
            nextEdges.map((e) => `${e.source}:${e.sourceHandle || e.data?.choiceId}`)
          );
          const cleanedNodes = nextNodes.map((n) => ({
            ...n,
            data: {
              ...n.data,
              choices: (n.data?.choices || []).filter((c) => validHandles.has(`${n.id}:${c.id}`))
            }
          }));
          set({ nodes: cleanedNodes, edges: nextEdges, regions: nextRegions });
        } else {
          set({ nodes: nextNodes, regions: nextRegions });
        }
      },

      moveRegion: (regionId, posOrDelta = {}) => {
        const reg = (get().regions || []).find((r) => r.id === regionId);
        if (!reg) return false;
        const nextX =
          Number.isFinite(posOrDelta.x)
            ? Math.round(posOrDelta.x)
            : Math.round(reg.x + (Number(posOrDelta.dx) || 0));
        const nextY =
          Number.isFinite(posOrDelta.y)
            ? Math.round(posOrDelta.y)
            : Math.round(reg.y + (Number(posOrDelta.dy) || 0));
        get().onNodesChange([
          {
            id: regionId,
            type: 'position',
            position: { x: nextX, y: nextY },
            dragging: Boolean(posOrDelta.dragging)
          }
        ]);
        return true;
      },

      onEdgesChange: (changes) => set({ edges: applyEdgeChanges(changes, get().edges) }),

      onConnect: (connection) => {
        const choiceId = connection.sourceHandle === 'choice-add'
          ? `choice-${uuidv4()}`
          : connection.sourceHandle || `choice-${uuidv4()}`;
        const sourceNode = get().nodes.find((node) => node.id === connection.source);
        const choices = Array.isArray(sourceNode?.data?.choices) ? sourceNode.data.choices : [];
        const createdChoice = connection.sourceHandle === 'choice-add' || !choices.some((choice) => choice.id === choiceId);
        const existingLabel = choices.find((choice) => choice.id === choiceId)?.label;
        const choiceLabel = connection.label || existingLabel || `Новый выбор ${choices.length + 1}`;
        const edge = {
          ...connection,
          sourceHandle: choiceId,
          id: `edge-${connection.source}-${choiceId}-${connection.target}-${Date.now()}-${uuidv4().slice(0, 8)}`,
          label: choiceLabel,
          data: { choiceId, conditions: [], effects: [] }
        };
        set((state) => ({
          nodes: createdChoice ? state.nodes.map((node) => node.id === connection.source
            ? { ...node, data: { ...node.data, choices: [...(Array.isArray(node.data?.choices) ? node.data.choices : []), { id: choiceId, label: choiceLabel }] } }
            : node) : state.nodes,
          edges: [...state.edges, edge]
        }));
      },

      addNode: (type = 'scene', customPos = null, customMeta = {}) => {
        if (type === 'region') {
          return get().addRegion(customPos, { ignoreSelection: true, width: 400, height: 300 });
        }
        const existingNodes = get().nodes;
        const isEn = get().language === 'en';
        const labels = isEn
          ? {
              start: 'Story Start',
              scene: `Scene ${existingNodes.length + 1}`,
              decision: 'Decision Hub?',
              ending: 'Story Ending',
              custom: customMeta?.label || customMeta?.title || customMeta?.customBadgeLabel || 'Custom Node'
            }
          : {
              start: 'Начало истории',
              scene: `Сцена ${existingNodes.length + 1}`,
              decision: 'Развилка сюжета?',
              ending: 'Финал истории',
              custom: customMeta?.label || customMeta?.title || customMeta?.customBadgeLabel || 'Кастомная сцена'
            };
        const resolvedLabel =
          (customMeta?.label || customMeta?.title || '').trim() ||
          labels[type] ||
          (isEn ? 'New Scene' : 'Новая сцена');
        const isCustom = type === 'custom' || Boolean(customMeta?.customBadgeLabel || customMeta?.customColor || customMeta?.customIcon);
        const newNode = {
          id: uuidv4(),
          type: 'storyNode',
          position:
            customPos && Number.isFinite(customPos.x) && Number.isFinite(customPos.y)
              ? { x: Math.round(customPos.x), y: Math.round(customPos.y) }
              : existingNodes.length > 0 && existingNodes[existingNodes.length - 1]?.position
              ? {
                  x: Math.round((Number(existingNodes[existingNodes.length - 1].position.x) || 0) + 280),
                  y: Math.round(Number(existingNodes[existingNodes.length - 1].position.y) || 140)
                }
              : {
                  x: Math.round(180 + (existingNodes.length % 4) * 320 + Math.random() * 40),
                  y: Math.round(140 + Math.floor(existingNodes.length / 4) * 220 + Math.random() * 40)
                },
          data: {
            label: resolvedLabel,
            type,
            notes: customMeta?.notes || '',
            imageId: null,
            dialogue: [],
            effects: [],
            ...(isCustom
              ? {
                  customBadgeLabel:
                    (customMeta?.customBadgeLabel || customMeta?.badgeLabel || '').trim() ||
                    (isEn ? 'Custom' : 'Кастомная'),
                  customColor: customMeta?.customColor || customMeta?.color || '#06b6d4',
                  customIcon: customMeta?.customIcon || customMeta?.icon || 'sparkles'
                }
              : {})
          },
          className: type === 'decision' ? 'decision-node' : ''
        };
        set({ nodes: [...existingNodes, newNode] });
        return newNode.id;
      },

      addConnectedScene: (sourceNodeId, choiceLabel = 'Новый выбор', targetType = 'scene') => {
        const state = get();
        const existingNodes = state.nodes;
        const sourceNode = existingNodes.find((n) => n.id === sourceNodeId);
        const pos = sourceNode
          ? { x: sourceNode.position.x + 340, y: sourceNode.position.y + Math.round((Math.random() - 0.5) * 180) }
          : { x: 220, y: 200 };

        const isEn = state.language === 'en';
        const labels = isEn
          ? {
              start: 'Story Start',
              scene: `Scene ${existingNodes.length + 1}`,
              decision: 'Decision Hub?',
              ending: 'Story Ending'
            }
          : {
              start: 'Начало истории',
              scene: `Сцена ${existingNodes.length + 1}`,
              decision: 'Развилка сюжета?',
              ending: 'Финал истории'
            };
        const resolvedLabel = labels[targetType] || (isEn ? 'New Scene' : 'Новая сцена');
        const newTargetId = uuidv4();
        const newNode = {
          id: newTargetId,
          type: 'storyNode',
          position: { x: Math.round(pos.x), y: Math.round(pos.y) },
          data: {
            label: resolvedLabel,
            type: targetType,
            notes: '',
            imageId: null,
            dialogue: [],
            effects: [],
            choices: []
          },
          className: targetType === 'decision' ? 'decision-node' : ''
        };

        const choiceId = `choice-${uuidv4()}`;
        const choice = { id: choiceId, label: choiceLabel };
        const newEdge = {
          id: `edge-${sourceNodeId}-${choiceId}-${newTargetId}-${Date.now()}`,
          source: sourceNodeId,
          sourceHandle: choiceId,
          target: newTargetId,
          label: choiceLabel,
          data: { choiceId, conditions: [], effects: [] }
        };

        set((s) => ({
          nodes: [
            ...s.nodes.map((node) =>
              node.id === sourceNodeId
                ? {
                    ...node,
                    data: {
                      ...node.data,
                      choices: [...(node.data?.choices || []), choice]
                    }
                  }
                : node
            ),
            newNode
          ],
          edges: [...s.edges, newEdge]
        }));
        return newTargetId;
      },

      deleteNode: (nodeId) =>
        set((state) => {
          const deletedNode = state.nodes.find((n) => n.id === nodeId);
          const removedImageId = deletedNode?.data?.imageId;
          const nextEdges = state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId);
          const validHandles = new Set(
            nextEdges.map((e) => `${e.source}:${e.sourceHandle || e.data?.choiceId}`)
          );
          const nextNodes = state.nodes.filter((n) => n.id !== nodeId);
          const cleanedNodes = nextNodes.map((n) => ({
            ...n,
            data: {
              ...n.data,
              choices: (n.data?.choices || []).filter((c) => validHandles.has(`${n.id}:${c.id}`))
            }
          }));
          if (removedImageId) {
            const stillUsed =
              cleanedNodes.some((n) => n.data?.imageId === removedImageId) ||
              (state.stash || state.stashedNodes || []).some((n) => n.data?.imageId === removedImageId);
            if (!stillUsed) {
              assetStorage.removeAsset(removedImageId);
            }
          }
          return {
            nodes: cleanedNodes,
            edges: nextEdges
          };
        }),

      deleteEdge: (edgeId) =>
        set((state) => {
          const deletedEdge = state.edges.find((edge) => edge.id === edgeId);
          const edges = state.edges.filter((edge) => edge.id !== edgeId);
          const choiceId = deletedEdge?.sourceHandle || deletedEdge?.data?.choiceId;
          const choiceStillConnected = choiceId && edges.some((edge) =>
            edge.source === deletedEdge.source && (edge.sourceHandle || edge.data?.choiceId) === choiceId
          );
          return {
            edges,
            nodes: choiceId && !choiceStillConnected
              ? state.nodes.map((node) => node.id === deletedEdge.source
                ? { ...node, data: { ...node.data, choices: (node.data?.choices || []).filter((choice) => choice.id !== choiceId) } }
                : node)
              : state.nodes
          };
        }),

      updateNodeData: (nodeId, newData) =>
        set((state) => {
          let removedImageId = null;
          const nextNodes = state.nodes.map((n) => {
            if (n.id !== nodeId) return n;
            const patch = { ...newData };
            if ('image' in patch) {
              if (patch.image && typeof patch.image === 'string') {
                patch.imageId = assetStorage.registerAsset(patch.image);
              } else if (patch.image === null && !('imageId' in patch)) {
                patch.imageId = null;
              }
              delete patch.image;
            }
            if ('imageId' in patch && patch.imageId === null && n.data?.imageId) {
              removedImageId = n.data.imageId;
            }
            const mergedData = { ...n.data, ...patch };
            delete mergedData.image;
            return {
              ...n,
              data: mergedData,
              className: mergedData.type === 'decision' ? 'decision-node' : ''
            };
          });
          if (removedImageId) {
            const stillUsed =
              nextNodes.some((n) => n.data?.imageId === removedImageId) ||
              (state.stash || state.stashedNodes || []).some((n) => n.data?.imageId === removedImageId);
            if (!stillUsed) {
              assetStorage.removeAsset(removedImageId);
            }
          }
          return { nodes: nextNodes };
        }),

      updateEdgeData: (edgeId, label, condition, effects = null) =>
        set((state) => {
          const targetEdge = state.edges.find((e) => e.id === edgeId);
          const choiceId = targetEdge?.sourceHandle || targetEdge?.data?.choiceId;
          const nextEdges = state.edges.map((e) =>
            e.id === edgeId
              ? {
                  ...e,
                  label,
                  data: {
                    ...e.data,
                    conditions: Array.isArray(condition) ? condition : condition ? [condition] : [],
                    effects: effects !== null ? effects : e.data?.effects || []
                  }
                }
              : e
          );
          const nextNodes = choiceId
            ? state.nodes.map((n) =>
                n.id === targetEdge?.source
                  ? {
                      ...n,
                      data: {
                        ...n.data,
                        choices: (n.data?.choices || []).map((ch) =>
                          ch.id === choiceId ? { ...ch, label } : ch
                        )
                      }
                    }
                  : n
              )
            : state.nodes;
          return {
            edges: nextEdges,
            nodes: nextNodes
          };
        }),

      updateEdgeOffset: (edgeId, customOffset = null) =>
        set((state) => ({
          edges: state.edges.map((e) =>
            e.id === edgeId
              ? {
                  ...e,
                  data: {
                    ...e.data,
                    customOffset:
                      customOffset &&
                      Number.isFinite(customOffset.x) &&
                      Number.isFinite(customOffset.y)
                        ? { x: Math.round(customOffset.x), y: Math.round(customOffset.y) }
                        : null
                  }
                }
              : e
          )
        })),

      setEdgeCustomOffset: (edgeId, customOffset = null) =>
        get().updateEdgeOffset(edgeId, customOffset),

      stashNodes: (nodeIds) => {
        const state = get();
        const idsArray = Array.isArray(nodeIds)
          ? nodeIds
          : nodeIds
          ? [nodeIds]
          : state.nodes.filter((n) => n.selected).map((n) => n.id);
        const idSet = new Set(idsArray.filter(Boolean));
        if (idSet.size === 0) return false;

        const targets = state.nodes.filter((n) => idSet.has(n.id));
        if (targets.length === 0) return false;

        const remainingNodes = state.nodes.filter((n) => !idSet.has(n.id));
        const remainingEdges = state.edges.filter(
          (e) => !idSet.has(e.source) && !idSet.has(e.target)
        );
        const validHandles = new Set(
          remainingEdges.map((e) => `${e.source}:${e.sourceHandle || e.data?.choiceId}`)
        );
        const cleanedNodes = remainingNodes.map((n) => ({
          ...n,
          data: {
            ...n.data,
            choices: (n.data?.choices || []).filter((c) => validHandles.has(`${n.id}:${c.id}`))
          }
        }));
        const nowIso = new Date().toISOString();
        const stashedCopies = targets.map((target) => ({
          ...target,
          selected: false,
          dragging: false,
          stashedAt: nowIso
        }));
        const nextStash = [...(state.stash || state.stashedNodes || []), ...stashedCopies];
        set({
          nodes: cleanedNodes,
          edges: remainingEdges,
          stash: nextStash,
          stashedNodes: nextStash
        });
        if (targets.length === 1) {
          get().showToast(`Сцена «${targets[0].data?.label || 'Сцена'}» убрана в карман`, 'info');
        } else {
          get().showToast(`В карман убрано сцен: ${targets.length}`, 'info');
        }
        return true;
      },

      stashNode: (nodeIdOrIds) => get().stashNodes(nodeIdOrIds),

      unstashNode: (nodeId, customPos = null) => {
        const state = get();
        const stashedList = state.stash || state.stashedNodes || [];
        const item = stashedList.find((n) => n.id === nodeId);
        if (!item) return null;
        const restoredNode = {
          ...item,
          type: 'storyNode',
          position:
            customPos && Number.isFinite(customPos.x) && Number.isFinite(customPos.y)
              ? { x: Math.round(customPos.x), y: Math.round(customPos.y) }
              : item.position || { x: 220, y: 200 },
          selected: false,
          dragging: false
        };
        delete restoredNode.stashedAt;
        delete restoredNode.folder;
        const nextStash = stashedList.filter((n) => n.id !== nodeId);
        set({
          nodes: [...state.nodes, restoredNode],
          stash: nextStash,
          stashedNodes: nextStash
        });
        get().showToast(`Сцена «${restoredNode.data?.label || 'Сцена'}» возвращена на холст`, 'success');
        return restoredNode.id;
      },

      restoreFromStash: (nodeId, customPos = null) => get().unstashNode(nodeId, customPos),

      deleteStashedNode: (nodeId) =>
        set((state) => {
          const currentStash = state.stash || state.stashedNodes || [];
          const deletedNode = currentStash.find((n) => n.id === nodeId);
          const removedImageId = deletedNode?.data?.imageId;
          const nextStash = currentStash.filter((n) => n.id !== nodeId);
          if (removedImageId) {
            const stillUsed =
              state.nodes.some((n) => n.data?.imageId === removedImageId) ||
              nextStash.some((n) => n.data?.imageId === removedImageId);
            if (!stillUsed) {
              assetStorage.removeAsset(removedImageId);
            }
          }
          return {
            stash: nextStash,
            stashedNodes: nextStash
          };
        }),

      trashNodes: (nodeIds) => {
        const state = get();
        const idsArray = Array.isArray(nodeIds)
          ? nodeIds
          : nodeIds
          ? [nodeIds]
          : state.nodes.filter((n) => n.selected).map((n) => n.id);
        const idSet = new Set(idsArray.filter(Boolean));
        if (idSet.size === 0) return false;

        const targets = state.nodes.filter((n) => idSet.has(n.id));
        if (targets.length === 0) return false;

        const connectedEdges = state.edges.filter(
          (e) => idSet.has(e.source) || idSet.has(e.target)
        );
        const remainingNodes = state.nodes.filter((n) => !idSet.has(n.id));
        const remainingEdges = state.edges.filter(
          (e) => !idSet.has(e.source) && !idSet.has(e.target)
        );
        const validHandles = new Set(
          remainingEdges.map((e) => `${e.source}:${e.sourceHandle || e.data?.choiceId}`)
        );
        const cleanedNodes = remainingNodes.map((n) => ({
          ...n,
          data: {
            ...n.data,
            choices: (n.data?.choices || []).filter((c) => validHandles.has(`${n.id}:${c.id}`))
          }
        }));

        const nowIso = new Date().toISOString();
        const trashedCopies = targets.map((target) => ({
          ...target,
          selected: false,
          dragging: false,
          trashedAt: nowIso,
          savedEdges: connectedEdges.filter(
            (e) => e.source === target.id || e.target === target.id
          )
        }));

        const currentTrash = Array.isArray(state.trashedNodes) ? state.trashedNodes : [];
        const existingTrashFiltered = currentTrash.filter((n) => !idSet.has(n.id));
        const nextTrash = [...trashedCopies, ...existingTrashFiltered];

        set({
          nodes: cleanedNodes,
          edges: remainingEdges,
          trashedNodes: nextTrash
        });

        const trashedIdsList = targets.map((t) => t.id);
        const msg =
          targets.length === 1
            ? `Сцена удалена в корзину`
            : `В корзину удалено сцен: ${targets.length}`;
        get().showToast(msg, 'info', {
          label: 'Отменить',
          onClick: () => get().restoreFromTrash(trashedIdsList)
        });
        return true;
      },

      restoreFromTrash: (nodeIdOrIds, customPos = null) => {
        const state = get();
        const idsArray = Array.isArray(nodeIdOrIds) ? nodeIdOrIds : [nodeIdOrIds];
        const idSet = new Set(idsArray.filter(Boolean));
        const trashList = Array.isArray(state.trashedNodes) ? state.trashedNodes : [];
        const itemsToRestore = trashList.filter((n) => idSet.has(n.id));
        if (itemsToRestore.length === 0) return null;

        const restoredNodes = itemsToRestore.map((item, idx) => {
          const copy = {
            ...item,
            type: item.type || 'storyNode',
            position:
              customPos && Number.isFinite(customPos.x) && Number.isFinite(customPos.y)
                ? { x: Math.round(customPos.x) + idx * 36, y: Math.round(customPos.y) + idx * 36 }
                : item.position || { x: 260 + idx * 36, y: 200 + idx * 36 },
            selected: false,
            dragging: false
          };
          delete copy.trashedAt;
          delete copy.savedEdges;
          return copy;
        });

        const nextNodes = [...state.nodes, ...restoredNodes];
        const nodeIdLookup = new Set(nextNodes.map((n) => n.id));
        const existingEdgeIds = new Set(state.edges.map((e) => e.id));
        const restoredEdges = [];

        for (const item of itemsToRestore) {
          for (const edge of item.savedEdges || []) {
            if (
              !existingEdgeIds.has(edge.id) &&
              nodeIdLookup.has(edge.source) &&
              nodeIdLookup.has(edge.target)
            ) {
              existingEdgeIds.add(edge.id);
              restoredEdges.push(edge);
            }
          }
        }

        const nextEdges = normalizeEdges([...state.edges, ...restoredEdges]);
        const validHandles = new Set(
          nextEdges.map((e) => `${e.source}:${e.sourceHandle || e.data?.choiceId}`)
        );
        const syncedNodes = nextNodes.map((n) => {
          const outChoices = nextEdges
            .filter((e) => e.source === n.id)
            .map((e) => ({
              id: e.sourceHandle || e.data?.choiceId || e.id,
              text: e.label || e.data?.label || 'Далее'
            }));
          const existingChoices = Array.isArray(n.data?.choices) ? n.data.choices : [];
          const mergedChoiceMap = new Map();
          existingChoices.forEach((c) => {
            if (validHandles.has(`${n.id}:${c.id}`)) mergedChoiceMap.set(c.id, c);
          });
          outChoices.forEach((c) => {
            if (!mergedChoiceMap.has(c.id)) mergedChoiceMap.set(c.id, c);
          });
          return {
            ...n,
            data: {
              ...n.data,
              choices: Array.from(mergedChoiceMap.values())
            }
          };
        });

        const nextTrash = trashList.filter((n) => !idSet.has(n.id));
        set({
          nodes: syncedNodes,
          edges: nextEdges,
          trashedNodes: nextTrash
        });

        get().showToast(
          restoredNodes.length === 1
            ? `Сцена «${restoredNodes[0].data?.label || 'Сцена'}» восстановлена из корзины`
            : `Восстановлено сцен из корзины: ${restoredNodes.length}`,
          'success'
        );
        return restoredNodes[0]?.id || null;
      },

      deleteTrashedNodeForever: (nodeId) =>
        set((state) => {
          const currentTrash = Array.isArray(state.trashedNodes) ? state.trashedNodes : [];
          const deletedNode = currentTrash.find((n) => n.id === nodeId);
          const removedImageId = deletedNode?.data?.imageId;
          const nextTrash = currentTrash.filter((n) => n.id !== nodeId);
          if (removedImageId) {
            const stillUsed =
              state.nodes.some((n) => n.data?.imageId === removedImageId) ||
              (state.stash || state.stashedNodes || []).some((n) => n.data?.imageId === removedImageId) ||
              nextTrash.some((n) => n.data?.imageId === removedImageId);
            if (!stillUsed) {
              assetStorage.removeAsset(removedImageId);
            }
          }
          return {
            trashedNodes: nextTrash
          };
        }),

      emptyTrash: () => {
        const state = get();
        const currentTrash = Array.isArray(state.trashedNodes) ? state.trashedNodes : [];
        if (currentTrash.length === 0) return;
        for (const item of currentTrash) {
          const imgId = item?.data?.imageId;
          if (imgId) {
            const stillUsed =
              state.nodes.some((n) => n.data?.imageId === imgId) ||
              (state.stash || state.stashedNodes || []).some((n) => n.data?.imageId === imgId);
            if (!stillUsed) {
              assetStorage.removeAsset(imgId);
            }
          }
        }
        set({ trashedNodes: [] });
        get().showToast('Корзина полностью очищена', 'info');
      },

      restoreMultipleFromStash: (nodeIds = [], customPos = null) => {
        const state = get();
        const idSet = new Set(nodeIds);
        const stashedList = state.stash || state.stashedNodes || [];
        const targets = stashedList.filter((n) => idSet.has(n.id));
        if (targets.length === 0) return [];
        const baseX = customPos && Number.isFinite(customPos.x) ? customPos.x : 220;
        const baseY = customPos && Number.isFinite(customPos.y) ? customPos.y : 200;
        const restoredNodes = targets.map((item, idx) => {
          const nodePos = customPos
            ? { x: Math.round(baseX + (idx % 3) * 280), y: Math.round(baseY + Math.floor(idx / 3) * 180) }
            : item.position || { x: 220, y: 200 };
          const copy = { ...item, type: 'storyNode', position: nodePos, selected: true, dragging: false };
          delete copy.stashedAt;
          delete copy.folder;
          return copy;
        });
        const nextStash = stashedList.filter((n) => !idSet.has(n.id));
        set({
          nodes: [...state.nodes, ...restoredNodes],
          stash: nextStash,
          stashedNodes: nextStash
        });
        get().showToast(`Возвращено сцен на холст: ${restoredNodes.length}`, 'success');
        return restoredNodes.map((n) => n.id);
      },

      updateStashedNode: (nodeId, patch) =>
        set((state) => {
          const nextStash = (state.stash || state.stashedNodes || []).map((n) =>
            n.id === nodeId ? { ...n, ...patch } : n
          );
          return { stash: nextStash, stashedNodes: nextStash };
        }),

      createStashFolder: (folderName) =>
        set((state) => {
          const trimmed = (folderName || '').trim();
          if (!trimmed || trimmed === 'Общие' || (state.customFolders || []).includes(trimmed)) return state;
          return { customFolders: [...(state.customFolders || []), trimmed] };
        }),

      setStashedNodesFolder: (nodeIds, folder) =>
        set((state) => {
          const idSet = new Set(Array.isArray(nodeIds) ? nodeIds : [nodeIds]);
          const nextStash = (state.stash || state.stashedNodes || []).map((n) =>
            idSet.has(n.id) ? { ...n, folder } : n
          );
          const nextFolders = (state.customFolders || []).includes(folder) || !folder || folder === 'Общие'
            ? state.customFolders || []
            : [...(state.customFolders || []), folder];
          return { stash: nextStash, stashedNodes: nextStash, customFolders: nextFolders };
        }),

      renameStashFolder: (oldName, newName) =>
        set((state) => {
          const trimmed = (newName || '').trim();
          if (!trimmed) return state;
          const nextStash = (state.stash || state.stashedNodes || []).map((n) =>
            (n.folder || 'Общие') === oldName ? { ...n, folder: trimmed } : n
          );
          const nextFolders = (state.customFolders || []).map((f) => (f === oldName ? trimmed : f));
          return { stash: nextStash, stashedNodes: nextStash, customFolders: nextFolders };
        }),

      deleteStashFolder: (folderName) =>
        set((state) => {
          const nextStash = (state.stash || state.stashedNodes || []).map((n) =>
            (n.folder || 'Общие') === folderName ? { ...n, folder: 'Общие' } : n
          );
          const nextFolders = (state.customFolders || []).filter((f) => f !== folderName);
          return { stash: nextStash, stashedNodes: nextStash, customFolders: nextFolders };
        }),

      addRegion: (customPos = null, preset = {}) => {
        const state = get();
        const existing = state.regions || [];
        const order = existing.length + 1;
        const color =
          preset.color || DEFAULT_REGION_PALETTE[(order - 1) % DEFAULT_REGION_PALETTE.length];

        const selectionBounds =
          !preset.ignoreSelection && preset.width === undefined && preset.height === undefined
            ? computeSelectionBoundingBox(state.nodes, 30)
            : null;

        const x = selectionBounds
          ? selectionBounds.x
          : customPos && Number.isFinite(customPos.x)
          ? Math.round(customPos.x)
          : 120 + ((order - 1) % 3) * 420;

        const y = selectionBounds
          ? selectionBounds.y
          : customPos && Number.isFinite(customPos.y)
          ? Math.round(customPos.y)
          : 100 + Math.floor((order - 1) / 3) * 320;

        const width = selectionBounds
          ? selectionBounds.width
          : Math.max(250, Number(preset.width) || 400);

        const height = selectionBounds
          ? selectionBounds.height
          : Math.max(150, Number(preset.height) || 300);

        const isEn = state.language === 'en';
        const newRegion = {
          id: `region-${uuidv4()}`,
          title: preset.title || (isEn ? `Act ${order}: New Region` : `Акт ${order}: Новая область`),
          order,
          color,
          x,
          y,
          width,
          height,
          notes: preset.notes || ''
        };
        set({ regions: [...existing, newRegion] });
        get().showToast(`Создана сюжетная область «${newRegion.title}»`, 'success');
        return newRegion.id;
      },

      createRegionFromSelection: (cursorPos = null, preset = {}) =>
        get().addRegion(cursorPos, preset),

      updateRegion: (regionId, patch = {}) =>
        set((state) => ({
          regions: (state.regions || []).map((r) =>
            r.id === regionId
              ? {
                  ...r,
                  ...patch,
                  width:
                    patch.width !== undefined
                      ? Math.max(250, Math.round(Number(patch.width) || 250))
                      : r.width,
                  height:
                    patch.height !== undefined
                      ? Math.max(150, Math.round(Number(patch.height) || 150))
                      : r.height
                }
            : r
          )
        })),

      deleteRegion: (regionId) =>
        set((state) => {
          activeRegionDragCaptures.delete(regionId);
          const filtered = (state.regions || [])
            .filter((r) => r.id !== regionId)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map((r, idx) => ({ ...r, order: idx + 1 }));
          return { regions: filtered };
        }),

      reorderRegions: (fromIndex, toIndex) =>
        set((state) => {
          const sorted = [...(state.regions || [])].sort(
            (a, b) => (a.order ?? 0) - (b.order ?? 0)
          );
          if (
            fromIndex < 0 ||
            toIndex < 0 ||
            fromIndex >= sorted.length ||
            toIndex >= sorted.length
          ) {
            return state;
          }
          const [moved] = sorted.splice(fromIndex, 1);
          sorted.splice(toIndex, 0, moved);
          return {
            regions: sorted.map((r, idx) => ({ ...r, order: idx + 1 }))
          };
        }),

      autoLayout: (direction = 'LR') => {
        const { nodes, edges } = get();
        if (nodes.length === 0) return;
        const laidOut = layoutNodes(nodes, edges);
        set({
          nodes: direction === 'LR'
            ? laidOut
            : laidOut.map((n) => ({ ...n, position: { x: n.position.y, y: n.position.x } }))
        });
        get().showToast('Граф автоматически выровнен', 'success');
      },

      validateStory: (customNodes = null, customEdges = null) => {
        const nodes = Array.isArray(customNodes) ? customNodes : get().nodes;
        const edges = Array.isArray(customEdges) ? customEdges : get().edges;
        const issues = [];

        const startNodes = nodes.filter((n) => n.data?.type === 'start');
        if (startNodes.length === 0) {
          issues.push({ type: 'warning', text: 'Не назначена стартовая сцена (тип «Старт»). Игра начнётся с первой сцены в списке.' });
        } else if (startNodes.length > 1) {
          issues.push({ type: 'warning', text: `Найдено несколько стартовых сцен (${startNodes.length}). Рекомендуется оставить одну.` });
        }

        const startId = startNodes[0]?.id || nodes[0]?.id;
        const reachable = new Set();
        if (startId) {
          const q = [startId];
          reachable.add(startId);
          while (q.length > 0) {
            const cur = q.shift();
            edges
              .filter((e) => e.source === cur)
              .forEach((e) => {
                if (!reachable.has(e.target)) {
                  reachable.add(e.target);
                  q.push(e.target);
                }
              });
          }
        }

        nodes.forEach((n) => {
          if (startId && !reachable.has(n.id)) {
            issues.push({
              type: 'error',
              nodeId: n.id,
              text: `Сцена «${n.data?.label}» недостижима со старта (нет входящих путей).`
            });
          }
          const out = edges.filter((e) => e.source === n.id);
          if (out.length === 0 && n.data?.type !== 'ending') {
            issues.push({
              type: 'warning',
              nodeId: n.id,
              text: `Сцена «${n.data?.label}» не имеет выходов и не помечена как «Финал».`
            });
          }
          if ((!n.data?.dialogue || n.data.dialogue.length === 0) && !n.data?.notes?.trim()) {
            issues.push({
              type: 'info',
              nodeId: n.id,
              text: `Сцена «${n.data?.label}» пуста (нет ни описания, ни реплик).`
            });
          }
        });

        return issues;
      },

      addGroup: (name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set((state) => ({ groups: [...state.groups, { id: uuidv4(), name: trimmed }] }));
      },

      renameGroup: (id, name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set((state) => ({
          groups: state.groups.map((g) => (g.id === id ? { ...g, name: trimmed } : g))
        }));
      },

      deleteGroup: (id) =>
        set((state) => {
          if (id === 'default') return state;
          return {
            groups: state.groups.filter((g) => g.id !== id),
            characters: state.characters.map((c) => (c.groupId === id ? { ...c, groupId: 'default' } : c))
          };
        }),

      addCharacter: (name, groupId = 'default', color = '#2563eb') => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set((state) => ({
          characters: [...state.characters, { id: uuidv4(), name: trimmed, color, groupId }]
        }));
      },

      updateCharacter: (id, field, value) =>
        set((state) => ({
          characters: state.characters.map((c) => (c.id === id ? { ...c, [field]: value } : c))
        })),

      deleteCharacter: (id) =>
        set((state) => {
          const cleanDialogue = (n) => ({
            ...n,
            data: {
              ...n.data,
              dialogue: (n.data?.dialogue || []).map((line) =>
                line.charId === id ? { ...line, charId: '' } : line
              )
            }
          });
          const nextNodes = state.nodes.map(cleanDialogue);
          const nextStash = (state.stash || state.stashedNodes || []).map(cleanDialogue);
          return {
            characters: state.characters.filter((c) => c.id !== id),
            nodes: nextNodes,
            stash: nextStash,
            stashedNodes: nextStash
          };
        }),

      moveCharacterToGroup: (charId, groupId) =>
        set((state) => ({
          characters: state.characters.map((c) => (c.id === charId ? { ...c, groupId } : c))
        })),

      addVariable: (name, type = 'boolean', initialValue = false) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set((state) => ({
          variables: [...state.variables, { id: uuidv4(), name: trimmed, type, initialValue }]
        }));
      },

      updateVariable: (id, field, value) =>
        set((state) => ({
          variables: state.variables.map((v) => {
            if (v.id !== id) return v;
            const updated = { ...v, [field]: value };
            if (field === 'type') {
              updated.initialValue = value === 'boolean' ? false : 0;
            }
            return updated;
          })
        })),

      deleteVariable: (id) =>
        set((state) => {
          const nextEdges = state.edges.map((e) => {
            const conditions = getConditions(e.data);
            const hadCond = conditions.some((c) => c.varId === id);
            const remainingConditions = conditions.filter((c) => c.varId !== id);
            let nextLabel = e.label || '';
            if (hadCond) {
              nextLabel = nextLabel.replace(/\s*\[🔒[^\]]*\]/g, '').trim();
            }
            return {
              ...e,
              label: nextLabel,
              data: {
                ...e.data,
                conditions: remainingConditions,
                effects: (e.data?.effects || []).filter((ef) => ef.varId !== id)
              }
            };
          });

          const cleanNodeEffects = (n) => ({
            ...n,
            data: {
              ...n.data,
              effects: (n.data?.effects || []).filter((ef) => ef.varId !== id)
            }
          });

          const nextNodes = state.nodes.map(cleanNodeEffects);
          const nextStash = (state.stash || state.stashedNodes || []).map(cleanNodeEffects);

          return {
            variables: state.variables.filter((v) => v.id !== id),
            nodes: nextNodes,
            edges: nextEdges,
            stash: nextStash,
            stashedNodes: nextStash
          };
        }),

      getSerializableData: () => {
        const state = get();
        const { projectMeta, nodes, edges, regions, stash, stashedNodes, trashedNodes = [], customFolders, groups, characters, variables, currentTheme, viewport = { x: 0, y: 0, zoom: 1 } } = state;
        const stashedList = stash || stashedNodes || [];
        const assets = {
          ...assetStorage.exportAssetsForNodes(nodes),
          ...assetStorage.exportAssetsForNodes(stashedList)
        };
        const normalizedStash = normalizeNodes(stashedList, true);
        const normalizedEdges = normalizeEdges(edges);
        const normalizedRegions = normalizeRegions(regions);
        const updatedAt = projectMeta?.updatedAt || new Date().toISOString();
        return {
          $schema: MTRSB_SCHEMA_URL,
          format: MTRSB_FORMAT,
          formatVersion: MTRSB_VERSION,
          generator: MTRSB_GENERATOR,
          project: {
            id: projectMeta?.id || 'canvas-default',
            title: projectMeta?.title || 'Новое полотно истории',
            description: projectMeta?.description || '',
            updatedAt
          },
          graph: {
            nodes,
            edges: normalizedEdges,
            viewport: {
              x: Number(viewport?.x) || 0,
              y: Number(viewport?.y) || 0,
              zoom: Number(viewport?.zoom) || 1
            }
          },
          entities: {
            characters,
            variables,
            chapters: normalizedRegions,
            groups
          },
          viewport: state.viewport || { x: 0, y: 0, zoom: 1 },
          mtrsbVersion: MTRSB_VERSION,
          version: '0.2.0',
          appName: 'Mitory',
          updatedAt,
          projectMeta: {
            ...projectMeta,
            updatedAt: projectMeta?.updatedAt || '2026-01-01T00:00:00.000Z'
          },
          nodes,
          edges: normalizedEdges,
          regions: normalizedRegions,
          stash: normalizedStash,
          stashedNodes: normalizedStash,
          trashedNodes: Array.isArray(trashedNodes) ? trashedNodes : [],
          customFolders: Array.isArray(customFolders) ? customFolders : [],
          groups,
          characters,
          variables,
          assetsMap: assets,
          currentTheme
        };
      },

      saveProject: async (silent = false) => {
        const data = get().getSerializableData();
        const result = await storageService.saveProject(data);
        if (result.success) {
          if (result.filePath) {
            set({ currentFilePath: result.filePath });
            get().setRecentFiles([result.filePath, ...get().recentFiles]);
          }
          set({ isDirty: false });
          useStoryStore.temporal.getState().clear();
          if (result.id) set((state) => ({projectMeta:{...state.projectMeta,id:result.id,revision:result.revision,storageType:result.storageType,sizeBytes:result.sizeBytes}}));
          if (!silent) get().showToast('Полотно сохранено', 'success');
          return true;
        } else {
          get().showToast(result.error || 'Ошибка сохранения файла.', 'error');
          return false;
        }
      },

      saveProjectAs: async () => {
        const data = get().getSerializableData();
        const result = typeof storageService.saveAs === 'function'
          ? await storageService.saveAs(data)
          : (await storageService.exportJson(data), { success: true });
        if (result?.success) {
          set({ currentFilePath: result.filePath || storageService.filePath || null, isDirty: false });
          if (result.filePath || storageService.filePath) get().setRecentFiles([result.filePath || storageService.filePath, ...get().recentFiles]);
          useStoryStore.temporal.getState().clear();
          get().showToast('Полотно сохранено', 'success');
          return true;
        }
        if (!result?.cancelled) get().showToast(result?.error || 'Ошибка сохранения файла.', 'error');
        return false;
      },

      openProjectFile: async (filePath = null) => {
        const data = await storageService.open(filePath);
        if (!data) return false;
        const loaded = await get().importProject(data, false);
        if (loaded) {
          set({ currentFilePath: storageService.filePath || filePath || null, isDirty: false });
          if (storageService.filePath || filePath) get().setRecentFiles([storageService.filePath || filePath, ...get().recentFiles]);
          useStoryStore.temporal.getState().clear();
        }
        return loaded;
      },

      importProject: async (data, persist = true) => {
        if (!data || typeof data !== 'object') {
          get().showToast('Некорректный формат файла проекта', 'error');
          return false;
        }
        try {
          data = parseMtrsbProject(data);
          assetStorage.hydrateFromProject(data);
          const nodes = normalizeNodes(Array.isArray(data.nodes) ? data.nodes : []);
          const edges = normalizeEdges(data.edges || []);
          const regions = normalizeRegions(data.regions, data.nodes);
          const rawStash = Array.isArray(data.stash)
            ? data.stash
            : Array.isArray(data.stashedNodes)
            ? data.stashedNodes
            : [];
          const normalizedStash = normalizeNodes(rawStash, true);
          const customFolders = Array.isArray(data.customFolders) ? data.customFolders : [];
          const groups =
            Array.isArray(data.groups) && data.groups.length > 0
              ? data.groups
              : [{ id: 'default', name: 'Общие' }];
          const characters = Array.isArray(data.characters) ? data.characters : [];
          const variables = Array.isArray(data.variables) ? data.variables : [];
          const currentTheme = data.currentTheme || get().currentTheme || 'dark';
          const projectMeta = data.projectMeta || {
            id: `canvas-${Date.now()}`,
            title: data.title || 'Импортированное полотно',
            description: data.description || '',
            driveFileId: data.driveFileId || null,
            lastSyncedAt: data.lastSyncedAt || null,
            updatedAt: new Date().toISOString()
          };

          suppressDirtyTracking = true;
          set({
            projectMeta,
            nodes,
            edges,
            regions,
            stash: normalizedStash,
            stashedNodes: normalizedStash,
            trashedNodes: Array.isArray(data.trashedNodes) ? data.trashedNodes : [],
            customFolders,
            groups,
            characters,
            variables,
            currentTheme,
            isDirty: false
          });
          suppressDirtyTracking = false;
          document.body.className = `theme-${currentTheme}`;
          activeRegionDragCaptures.clear();
          useStoryStore.temporal.getState().clear();

          if (persist) {
            const result = await storageService.saveProject(get().getSerializableData());
            if (result?.success) set({ currentFilePath: result.filePath || get().currentFilePath || null, isDirty: false });
          }
          get().showToast(`Полотно «${projectMeta.title}» загружено (${nodes.length} сцен)`, 'success');
          return true;
        } catch (e) {
          console.error(e);
          get().showToast('Ошибка при загрузке полотна', 'error');
          return false;
        }
      },

      resetProject: async (templateMode = 'blank', persist = true) => {
        let next;
        let toastMsg;
        if (templateMode === 'scifi') {
          next = createSciFiOrbitalState();
          toastMsg = 'Загружен шаблон «Sci-Fi: Сигнал с орбитальной станции»';
        } else if (templateMode === true || templateMode === 'demo' || templateMode === 'fantasy') {
          next = createFantasyCastleState();
          toastMsg = 'Загружен шаблон «Фэнтези: Тайна Старого Замка»';
        } else {
          next = createBlankState();
          toastMsg = 'Создано новое чистое полотно';
        }
        next.edges = normalizeEdges(next.edges);
        next.currentTheme = get().currentTheme;
        next.language = get().language;
        next.currentFilePath = null;
        next.isDirty = false;
        activeRegionDragCaptures.clear();
        suppressDirtyTracking = true;
        set(next);
        suppressDirtyTracking = false;
        if (templateMode === 'blank') storageService.startNewProject?.();
        useStoryStore.temporal.getState().clear();
        if (persist) await storageService.saveProject(get().getSerializableData());
        get().showToast(toastMsg, 'info');
      }
    }),
    {
      limit: 50,
      partialize: (state) => {
        const serializedStash = (state.stash || state.stashedNodes || []).map((n) => ({
          id: n.id,
          type: n.type,
          position: n.position,
          folder: n.folder || 'Общие',
          stashedAt: n.stashedAt || null,
          data: {
            label: n.data?.label || '',
            type: n.data?.type || 'scene',
            notes: n.data?.notes || '',
            imageId: n.data?.imageId || null,
            choices: n.data?.choices || [],
            dialogue: n.data?.dialogue || [],
            effects: n.data?.effects || [],
            ...(n.data?.customBadgeLabel ? { customBadgeLabel: n.data.customBadgeLabel } : {}),
            ...(n.data?.customColor ? { customColor: n.data.customColor } : {}),
            ...(n.data?.customIcon ? { customIcon: n.data.customIcon } : {})
          },
          className: n.className
        }));
        return {
          nodes: state.nodes.map((n) => ({
            id: n.id,
            type: n.type,
            position: n.position,
            data: {
              label: n.data?.label || '',
              type: n.data?.type || 'scene',
              notes: n.data?.notes || '',
              imageId: n.data?.imageId || null,
              choices: n.data?.choices || [],
              dialogue: n.data?.dialogue || [],
              effects: n.data?.effects || [],
              ...(n.data?.customBadgeLabel ? { customBadgeLabel: n.data.customBadgeLabel } : {}),
              ...(n.data?.customColor ? { customColor: n.data.customColor } : {}),
              ...(n.data?.customIcon ? { customIcon: n.data.customIcon } : {})
            },
            className: n.className
          })),
          edges: state.edges,
          regions: (state.regions || []).map((r) => ({
            id: r.id,
            title: r.title,
            order: r.order,
            color: r.color,
            x: r.x,
            y: r.y,
            width: r.width,
            height: r.height,
            notes: r.notes || ''
          })),
          stash: serializedStash,
          stashedNodes: serializedStash,
          trashedNodes: Array.isArray(state.trashedNodes) ? state.trashedNodes : [],
          customFolders: state.customFolders || [],
          groups: state.groups,
          characters: state.characters,
          variables: state.variables
        };
      },
      equality: (pastState, currentState) => {
        const storeState = useStoryStore.getState();
        if (storeState.nodes.some((n) => n.dragging)) {
          return true;
        }
        if ((storeState.regions || []).some((r) => r.dragging || r.resizing)) {
          return true;
        }
        if (pastState === currentState) return true;
        if (!pastState || !currentState) return false;
        return (
          pastState.edges === currentState.edges &&
          pastState.groups === currentState.groups &&
          pastState.characters === currentState.characters &&
          pastState.variables === currentState.variables &&
          pastState.customFolders === currentState.customFolders &&
          areNodesTrackedEqual(pastState.nodes, currentState.nodes) &&
          areRegionsTrackedEqual(pastState.regions, currentState.regions) &&
          areNodesTrackedEqual(pastState.stash, currentState.stash)
        );
      }
    }
  )
);

useStoryStore.subscribe((state, previousState) => {
  const documentChanged = state.nodes !== previousState.nodes ||
    state.edges !== previousState.edges ||
    state.regions !== previousState.regions ||
    state.stash !== previousState.stash ||
    state.characters !== previousState.characters ||
    state.variables !== previousState.variables ||
    state.groups !== previousState.groups ||
    state.viewport !== previousState.viewport;
  if (!suppressDirtyTracking && documentChanged && !state.isDirty) useStoryStore.setState({ isDirty: true });
});
