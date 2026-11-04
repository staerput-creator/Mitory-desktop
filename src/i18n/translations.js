export const LANGUAGE_STORAGE_KEY = 'mitory-lang';
export const HAS_SEEN_TOUR_KEY = 'hasSeenTour';

export const translations = {
  ru: {
    langName: 'Русский',
    toolbar: {
      togglePalette: 'Показать / скрыть Карман сцен',
      projectTitlePlaceholder: 'Название полотна...',
      projectTitleTooltip: 'Название сюжетного полотна',
      undo: 'Отменить (Ctrl+Z)',
      redo: 'Повторить (Ctrl+Y)',
      addStart: 'Старт',
      addStartTooltip: 'Создать стартовую сцену',
      addScene: 'Сцена',
      addSceneTooltip: 'Создать сцену',
      addDecision: 'Развилка',
      addDecisionTooltip: 'Создать развилку сюжета',
      addEnding: 'Финал',
      addEndingTooltip: 'Создать концовку',
      addCustom: 'Кастомная...',
      addCustomTooltip: 'Создать кастомную ноду со своим названием, цветом и иконкой',
      characters: 'Персонажи',
      charactersTooltip: 'Управление персонажами и фракциями',
      variables: 'Переменные',
      variablesTooltip: 'Управление глобальными переменными, предметами и статами',
      validator: 'Проверка',
      validatorTooltip: 'Поиск по сценам и проверка целостности графа',
      autoLayout: 'Выровнять граф',
      autoLayoutTooltip: 'Автоматическое выравнивание узлов на холсте',
      more: 'Ещё',
      moreTooltip: 'Дополнительные инструменты и действия',
      play: 'Играть',
      playTooltip: 'Запустить тестирование игры в реальном времени',
      quickSave: 'Быстрое сохранение (Ctrl+S)',
      chapters: 'Главы',
      chaptersTooltip: 'Навигатор глав и хроника сюжета (Ctrl+1..9)',
      settings: 'Настройки',
      settingsTooltip: 'Открыть настройки интерфейса, темы, ИИ (MCP), экспорта и обучения'
    },
    customNodeModal: {
      title: 'Новая кастомная нода',
      subtitle: 'Задайте название типа, заголовок узла, цвет бейджа и иконку',
      badgeLabelPrompt: 'Тип / бейдж ноды:',
      badgeLabelPlaceholder: 'Напр.: Кат-сцена, Босс-файт, Магазин, Головоломка',
      nodeTitlePrompt: 'Название узла на холсте:',
      nodeTitlePlaceholder: 'Напр.: Встреча с Хранителем',
      colorPrompt: 'Цвет акцента и бейджа:',
      iconPrompt: 'Иконка ноды:',
      presetsPrompt: 'Быстрые пресеты:',
      presets: [
        { badge: 'Кат-сцена', title: 'Кинематографическая кат-сцена', icon: 'film', color: '#06b6d4' },
        { badge: 'Босс-файт', title: 'Схватка с боссом', icon: 'swords', color: '#ef4444' },
        { badge: 'Магазин', title: 'Лавка торговца', icon: 'shopping-bag', color: '#f59e0b' },
        { badge: 'Головоломка', title: 'Древний механизм', icon: 'puzzle', color: '#8b5cf6' }
      ],
      cancel: 'Отмена',
      create: 'Создать ноду'
    },
    settings: {
      toolbarSection: 'Панель инструментов и кнопки',
      toolbarHint: 'Настройте размещение элементов между слотами шапки и плавающего дока',
      resetToolbarBtn: 'Сбросить панель инструментов',
      encyclopediaBtn: 'Кодекс Mitory (F1)',
      encyclopediaTooltip: 'Открыть энциклопедию и руководство сценариста (F1)',
      slotTopLeft: 'Слева (вверху)',
      slotTopCenter: 'По центру (вверху)',
      slotTopRight: 'Справа (вверху)',
      slotBottomBar: 'Нижний док',
      slotHidden: 'Скрыто',
      title: 'Настройки проекта и редактора',
      subtitle: 'Язык интерфейса, тема оформления, мост ИИ (MCP), экспорт и обучение',
      close: 'Закрыть настройки',
      languageSection: '1. Язык интерфейса',
      languageHint: 'Переключается мгновенно без перезагрузки приложения',
      ru: 'Русский',
      en: 'English',
      themeSection: '2. Оформление',
      themeHint: 'Выберите комфортную цветовую палитру холста',
      themeDark: 'Тёмная',
      themeLight: 'Светлая',
      themeSoft: 'Сепия',
      layoutSection: 'Стиль интерфейса',
      layoutHint: 'Выберите компоновку верхней панели инструментов (A/B тест)',
      layoutUnified: 'Монолитный (Unified Pro)',
      layoutFloating: 'Парящий (Classic Zen)',
      layoutUnifiedDesc: 'Компактная шапка 42px, максимум площади холста',
      layoutFloatingDesc: 'Классический парящий HUD над графом',
      mcpSection: '3. Интеграция ИИ (MCP)',
      mcpStatusLabel: 'Статус моста:',
      mcpPortLabel: 'Порт:',
      mcpPortValue: '127.0.0.1:39123',
      mcpTokenPlaceholder: 'Вставьте токен из ~/.mitory/bridge-token...',
      mcpConnect: 'Подключить',
      mcpDisconnect: 'Отключить',
      mcpDisconnected: 'Отключено',
      mcpHint: 'Позволяет внешним ИИ-агентам (Claude / Cline) редактировать граф с поддержкой Undo.',
      exportSection: '4. Экспорт и хранение',
      exportHint: 'Сохраните автономную игру в один файл или сделайте резервную копию проекта',
      exportHtmlBtn: 'Экспорт автономного HTML',
      exportJsonBtn: 'Бэкап JSON (.mitory.json)',
      openStorageBtn: 'Слоты, шаблоны и файлы...',
      projectToolsSection: 'Инструменты сценария',
      openVariablesBtn: 'Переменные',
      openCharactersBtn: 'Персонажи',
      openValidatorBtn: 'Поиск и проверка графа',
      autoLayoutBtn: 'Авто-выравнивание',
      onboardingSection: '5. Обучение',
      onboardingHint: 'Пройдите краткий интерактивный тур по ключевым механикам редактора',
      startTourBtn: 'Запустить интерактивный тур',
      aboutSection: 'О программе: Mitory v0.2.0',
      aboutSubtitle: 'Local-first студия визуальных новелл и интерактивных историй',
      checkUpdatesBtn: 'Проверить обновления',
      checkingUpdates: 'Проверка...',
      upToDate: 'У вас установлена последняя версия Mitory',
      updateAvailable: 'Доступна новая версия',
      updateError: 'Ошибка при проверке обновлений',
      updateDesktopOnly: 'Проверка обновлений доступна только в десктопной версии Mitory'
    },
    palette: {
      headerTitle: 'Карман сцен',
      collapseTooltip: 'Свернуть Карман сцен',
      expandTooltip: 'Развернуть Карман сцен',
      collapsedLabel: 'КАРМАН СЦЕН',
      pocketTitle: 'Карман сцен',
      pocketSubtitle: 'Отложенные сцены (Stash) для быстрого возврата на полотно',
      emptyPocket: 'Перетащите одну или несколько нод с холста сюда (или к левой границе экрана), чтобы временно убрать их в карман.',
      dropStackBanner: (count) =>
        count > 1
          ? `Отпустите стопку [ +${count} ] для сохранения в карман`
          : 'Отпустите ноду здесь для сохранения в карман',
      peekingDropHint: (count) =>
        count > 1
          ? `Отпустите стопку [ +${count} ], чтобы убрать сцены в карман`
          : 'Отпустите ноду здесь, чтобы убрать в карман',
      restoreToCanvas: 'Вернуть на холст',
      deleteForever: 'Удалить заготовку навсегда',
      linesCount: 'Реплик',
      dragBackHint: 'Перетащите на холст',
      untitledScene: 'Сцена без названия'
    },
    nodes: {
      start: 'Старт',
      scene: 'Сцена',
      decision: 'Развилка',
      ending: 'Финал',
      custom: 'Кастомная',
      untitled: 'Без названия',
      choiceDefault: 'Выбор',
      addChoiceTooltip: 'Добавить выбор: проведите связь к сцене'
    },
    regions: {
      defaultTitle: 'Сюжетная область',
      placeholder: 'Например: Акт I: Вход в замок',
      headerTooltip: 'Потяните за шапку, чтобы переместить область вместе со всеми вложенными нодами • Двойной клик по названию — переименовать',
      doubleClickRename: 'Двойной клик для ввода названия области',
      saveTitle: 'Сохранить название',
      renameTooltip: 'Переименовать область',
      paletteTooltip: 'Палитра цветов области',
      deleteTooltip: 'Удалить область',
      sceneCountBadge: (count) => `${count} сцен`,
      colors: {
        blue: 'Синий',
        amber: 'Янтарный',
        emerald: 'Изумрудный',
        purple: 'Фиолетовый',
        gray: 'Серый'
      }
    },
    contextMenu: {
      ariaLabel: 'Контекстное меню холста',
      spawnStart: 'Создать старт здесь',
      spawnScene: 'Создать сцену здесь',
      spawnDecision: 'Создать развилку здесь',
      spawnEnding: 'Создать финал здесь',
      spawnCustom: 'Создать кастомную ноду...',
      spawnRegion: 'Создать область',
      autoLayout: 'Авто-выравнивание графа',
      fitView: 'Центрировать полотно (Fit View)',
      saveProject: 'Сохранить проект (Ctrl+S)',
      openVariables: 'Свойства полотна / Переменные'
    },
    conditions: {
      logicalOpAria: 'Логический оператор',
      variableAria: 'Переменная',
      operatorAria: 'Оператор',
      valueAria: 'Значение',
      yes: 'Да',
      no: 'Нет',
      deleteTooltip: 'Удалить условие',
      addCondition: 'Условие',
      noVariablesHint: 'Создайте переменные для добавления условий'
    },
    edgeModal: {
      title: 'Настройка варианта выбора',
      labelPrompt: 'Текст выбора на кнопке / линии:',
      labelPlaceholder: 'Например: Открыть дверь ключом',
      conditionPrompt: 'Условие доступности выбора:',
      deleteEdge: 'Удалить связь',
      saveEdge: 'Сохранить',
      defaultNext: 'Далее',
      edgeDragTooltip: 'Зажмите ЛКМ и потяните для изгиба дуги • Двойной клик — сброс изгиба'
    },
    validatorModal: {
      title: 'Поиск и диагностика сюжета',
      searchPlaceholder: 'Поиск по названию сцены, описанию или тексту реплики...',
      linesCount: 'Реплик',
      integrityHeader: 'Проверка целостности графа',
      noIssues: 'Ошибок не найдено! Все сцены достижимы и корректны.'
    },
    chapterNav: {
      title: 'Навигатор глав',
      subtitle: 'Клик для полёта камеры • Ctrl+1..9',
      closeTooltip: 'Закрыть навигатор',
      newRegionLabel: 'Новая сюжетная область (Глава):',
      newRegionPlaceholder: 'Напр.: Акт I: Старый Замок',
      createBtn: 'Создать главу',
      emptyHint: 'На полотне пока нет сюжетных областей. Выделите ноды и нажмите C или создайте главу выше.',
      statsFormat: (scenes, decisions) => `[ ${scenes} сцен • ${decisions} развилки ]`,
      flyTooltip: 'Перелететь к главе',
      moveUpTooltip: 'Поднять выше в хронологии',
      moveDownTooltip: 'Опустить ниже в хронологии',
      deleteTooltip: 'Удалить область',
      renamePlaceholder: 'Название главы...'
    },
    tour: {
      badge: (current, total) => `${current}/${total}`,
      stepLabel: (current, total) => `Шаг ${current} из ${total}`,
      closeTour: 'Закрыть обучение',
      skip: 'Закрыть обучение',
      back: 'Назад',
      next: 'Далее',
      finish: 'Готово',
      steps: [
        {
          id: 'canvas',
          title: 'Холст истории',
          description: 'Перемещайтесь зажатием ПКМ или пробела, масштабируйте колесиком мыши. Кликните ПКМ в любом месте для создания нод.',
          selector: '.react-flow'
        },
        {
          id: 'pocket',
          title: 'Карман сцен (Scene Pocket)',
          description: 'Перетащите любую сцену к левому краю в Карман сцен, чтобы отложить её на потом, и перетащите обратно на холст в любой момент.',
          selector: '.sa-left-palette, .sa-left-palette-toggle'
        },
        {
          id: 'edges',
          title: 'Связи и условия',
          description: 'Тяните линии от портов выбора к следующим сценам. Клик по плашке связи открывает редактор условий.',
          selector: '.react-flow__node-storyNode'
        },
        {
          id: 'regions',
          title: 'Области сценария (UE Style)',
          description: 'Выделите несколько сцен и нажмите клавишу C, чтобы объединить их в главу и двигать всю группу за шапку области.',
          selector: '.react-flow__node-regionNode, .sa-top-toolbar'
        },
        {
          id: 'play',
          title: 'Тестирование сюжета',
          description: 'Нажмите зелёную кнопку «Играть» в тулбаре, чтобы пройти созданную новеллу в реальном времени.',
          selector: '[data-tour="play-btn"]'
        }
      ]
    }
  },
  en: {
    langName: 'English',
    toolbar: {
      togglePalette: 'Show / hide Scene Pocket',
      projectTitlePlaceholder: 'Story canvas title...',
      projectTitleTooltip: 'Story canvas title',
      undo: 'Undo (Ctrl+Z)',
      redo: 'Redo (Ctrl+Y)',
      addStart: 'Start',
      addStartTooltip: 'Create start scene node',
      addScene: 'Scene',
      addSceneTooltip: 'Create scene node',
      addDecision: 'Branch',
      addDecisionTooltip: 'Create decision branch node',
      addEnding: 'Ending',
      addEndingTooltip: 'Create ending node',
      addCustom: 'Custom...',
      addCustomTooltip: 'Create custom node with your own badge title, color, and icon',
      characters: 'Characters',
      charactersTooltip: 'Manage characters and factions',
      variables: 'Variables',
      variablesTooltip: 'Manage global variables, items, and stats',
      validator: 'Validate',
      validatorTooltip: 'Search scenes and check graph integrity',
      autoLayout: 'Auto-Layout',
      autoLayoutTooltip: 'Automatically arrange nodes on the canvas',
      more: 'More',
      moreTooltip: 'More tools and actions',
      play: 'Play',
      playTooltip: 'Test your interactive story in real time',
      quickSave: 'Quick Save (Ctrl+S)',
      chapters: 'Chapters',
      chaptersTooltip: 'Chapter Navigator & Story Chronicle (Ctrl+1..9)',
      settings: 'Settings',
      settingsTooltip: 'Open UI language, theme, AI (MCP), export, and onboarding settings'
    },
    customNodeModal: {
      title: 'New Custom Node',
      subtitle: 'Choose a custom badge type, node title, accent color, and icon',
      badgeLabelPrompt: 'Node Type / Badge:',
      badgeLabelPlaceholder: 'E.g.: Cutscene, Boss Fight, Shop, Puzzle',
      nodeTitlePrompt: 'Node Title on Canvas:',
      nodeTitlePlaceholder: 'E.g.: Encounter with the Guardian',
      colorPrompt: 'Accent & Badge Color:',
      iconPrompt: 'Node Icon:',
      presetsPrompt: 'Quick Presets:',
      presets: [
        { badge: 'Cutscene', title: 'Cinematic Cutscene', icon: 'film', color: '#06b6d4' },
        { badge: 'Boss Fight', title: 'Boss Encounter', icon: 'swords', color: '#ef4444' },
        { badge: 'Shop', title: 'Merchant Stall', icon: 'shopping-bag', color: '#f59e0b' },
        { badge: 'Puzzle', title: 'Ancient Mechanism', icon: 'puzzle', color: '#8b5cf6' }
      ],
      cancel: 'Cancel',
      create: 'Create Node'
    },
    settings: {
      toolbarSection: 'Toolbar Customizer',
      toolbarHint: 'Configure placement of elements across header slots and bottom dock',
      resetToolbarBtn: 'Reset Toolbar to Defaults',
      encyclopediaBtn: 'Writer Codex (F1)',
      encyclopediaTooltip: 'Open writer encyclopedia and design guides (F1)',
      slotTopLeft: 'Top Left',
      slotTopCenter: 'Top Center',
      slotTopRight: 'Top Right',
      slotBottomBar: 'Bottom Dock',
      slotHidden: 'Hidden',
      title: 'Project & Editor Settings',
      subtitle: 'Interface language, theme palette, AI bridge (MCP), export, and onboarding tour',
      close: 'Close settings',
      languageSection: '1. Interface Language',
      languageHint: 'Switches instantaneously without reloading the application',
      ru: 'Русский',
      en: 'English',
      themeSection: '2. Appearance & Theme',
      themeHint: 'Choose a comfortable color theme for the canvas',
      themeDark: 'Dark',
      themeLight: 'Light',
      themeSoft: 'Sepia',
      layoutSection: 'Interface Style',
      layoutHint: 'Choose the top toolbar layout style (A/B test)',
      layoutUnified: 'Unified Pro',
      layoutFloating: 'Classic Zen',
      layoutUnifiedDesc: 'Compact 42px monolithic bar, maximized canvas space',
      layoutFloatingDesc: 'Classic floating island HUD over the canvas',
      mcpSection: '3. AI Integration (MCP)',
      mcpStatusLabel: 'Bridge Status:',
      mcpPortLabel: 'Port:',
      mcpPortValue: '127.0.0.1:39123',
      mcpTokenPlaceholder: 'Paste token from ~/.mitory/bridge-token...',
      mcpConnect: 'Connect',
      mcpDisconnect: 'Disconnect',
      mcpDisconnected: 'Disconnected',
      mcpHint: 'Allows external AI agents (Claude / Cline) to edit the story graph with full Undo support.',
      exportSection: '4. Export & Storage',
      exportHint: 'Export a standalone playable HTML game or back up your project JSON',
      exportHtmlBtn: 'Export Standalone HTML',
      exportJsonBtn: 'Backup JSON (.mitory.json)',
      openStorageBtn: 'Slots, Templates & Files...',
      projectToolsSection: 'Story Tools',
      openVariablesBtn: 'Variables',
      openCharactersBtn: 'Characters',
      openValidatorBtn: 'Search & Graph Check',
      autoLayoutBtn: 'Auto-Layout',
      onboardingSection: '5. Onboarding',
      onboardingHint: 'Take a quick interactive tour of the core editor mechanics',
      startTourBtn: 'Start Interactive Tour',
      aboutSection: 'About: Mitory v0.2.0',
      aboutSubtitle: 'Local-first visual novel and interactive narrative studio',
      checkUpdatesBtn: 'Check for Updates',
      checkingUpdates: 'Checking...',
      upToDate: 'You are using the latest version of Mitory',
      updateAvailable: 'New version available',
      updateError: 'Failed to check for updates',
      updateDesktopOnly: 'Update checking is available in desktop app only'
    },
    palette: {
      headerTitle: 'Scene Pocket',
      collapseTooltip: 'Collapse Scene Pocket',
      expandTooltip: 'Expand Scene Pocket',
      collapsedLabel: 'SCENE POCKET',
      pocketTitle: 'Scene Pocket',
      pocketSubtitle: 'Stashed scenes ready to drag back onto the canvas',
      emptyPocket: 'Drag one or more nodes from the canvas here (or to the left screen edge) to stash them for later.',
      dropStackBanner: (count) =>
        count > 1
          ? `Drop stack [ +${count} ] to stash scenes in pocket`
          : 'Drop node here to stash in pocket',
      peekingDropHint: (count) =>
        count > 1
          ? `Drop stack [ +${count} ] to stash scenes in pocket`
          : 'Drop node here to stash in pocket',
      restoreToCanvas: 'Restore to canvas',
      deleteForever: 'Delete stashed scene permanently',
      linesCount: 'Lines',
      dragBackHint: 'Drag to canvas',
      untitledScene: 'Untitled Scene'
    },
    nodes: {
      start: 'Start',
      scene: 'Scene',
      decision: 'Decision',
      ending: 'Ending',
      custom: 'Custom',
      untitled: 'Untitled',
      choiceDefault: 'Choice',
      addChoiceTooltip: 'Add choice: drag connection to target scene'
    },
    regions: {
      defaultTitle: 'Story Region',
      placeholder: 'E.g.: Act I: Castle Entrance',
      headerTooltip: 'Drag by header to move region with all enclosed nodes • Double-click title to rename',
      doubleClickRename: 'Double-click to edit region title',
      saveTitle: 'Save title',
      renameTooltip: 'Rename region',
      paletteTooltip: 'Region color palette',
      deleteTooltip: 'Delete region',
      sceneCountBadge: (count) => `${count} scenes`,
      colors: {
        blue: 'Blue',
        amber: 'Amber',
        emerald: 'Emerald',
        purple: 'Purple',
        gray: 'Gray'
      }
    },
    contextMenu: {
      ariaLabel: 'Canvas context menu',
      spawnStart: 'Create start here',
      spawnScene: 'Create scene here',
      spawnDecision: 'Create decision here',
      spawnEnding: 'Create ending here',
      spawnCustom: 'Create custom node...',
      spawnRegion: 'Create region',
      autoLayout: 'Auto-layout graph',
      fitView: 'Fit View to canvas',
      saveProject: 'Save project (Ctrl+S)',
      openVariables: 'Canvas properties / Variables'
    },
    conditions: {
      logicalOpAria: 'Logical operator',
      variableAria: 'Variable',
      operatorAria: 'Operator',
      valueAria: 'Value',
      yes: 'Yes',
      no: 'No',
      deleteTooltip: 'Remove condition',
      addCondition: 'Condition',
      noVariablesHint: 'Create variables first to add conditions'
    },
    edgeModal: {
      title: 'Choice Branch Settings',
      labelPrompt: 'Choice label on button / edge:',
      labelPlaceholder: 'E.g.: Unlock door with key',
      conditionPrompt: 'Choice availability condition:',
      deleteEdge: 'Delete edge',
      saveEdge: 'Save',
      defaultNext: 'Next',
      edgeDragTooltip: 'Hold LMB and drag to bend curve • Double-click to reset curve'
    },
    validatorModal: {
      title: 'Story Search & Diagnostics',
      searchPlaceholder: 'Search by scene title, notes, or dialogue line...',
      linesCount: 'Lines',
      integrityHeader: 'Graph Integrity Check',
      noIssues: 'No issues found! All scenes are reachable and valid.'
    },
    chapterNav: {
      title: 'Chapter Navigator',
      subtitle: 'Click for camera fly-to • Ctrl+1..9',
      closeTooltip: 'Close navigator',
      newRegionLabel: 'New Story Region (Chapter):',
      newRegionPlaceholder: 'E.g.: Act I: Old Castle',
      createBtn: 'Create chapter',
      emptyHint: 'No story regions on the canvas yet. Select nodes and press C, or create a chapter above.',
      statsFormat: (scenes, decisions) => `[ ${scenes} scenes • ${decisions} branches ]`,
      flyTooltip: 'Fly to chapter',
      moveUpTooltip: 'Move earlier in chronology',
      moveDownTooltip: 'Move later in chronology',
      deleteTooltip: 'Delete region',
      renamePlaceholder: 'Chapter title...'
    },
    tour: {
      badge: (current, total) => `${current}/${total}`,
      stepLabel: (current, total) => `Step ${current} of ${total}`,
      closeTour: 'Close Tour',
      skip: 'Close Tour',
      back: 'Back',
      next: 'Next',
      finish: 'Finish',
      steps: [
        {
          id: 'canvas',
          title: 'Story Canvas',
          description: 'Pan by holding Right-Click or Spacebar, zoom with the wheel, or Right-Click anywhere to spawn nodes.',
          selector: '.react-flow'
        },
        {
          id: 'pocket',
          title: 'Scene Pocket',
          description: 'Drag any scene to the left edge into the Scene Pocket to stash it, and drag it back onto the canvas anytime.',
          selector: '.sa-left-palette, .sa-left-palette-toggle'
        },
        {
          id: 'edges',
          title: 'Connections & Conditions',
          description: 'Drag lines from choice ports to next scenes. Clicking an edge pill opens the condition editor.',
          selector: '.react-flow__node-storyNode'
        },
        {
          id: 'regions',
          title: 'Story Regions (UE Style)',
          description: 'Select multiple scenes and press C to wrap them in a chapter region and move the group by its header.',
          selector: '.react-flow__node-regionNode, .sa-top-toolbar'
        },
        {
          id: 'play',
          title: 'Story Playtesting',
          description: 'Click the green "Play" button in the toolbar to play through your visual novel in real time.',
          selector: '[data-tour="play-btn"]'
        }
      ]
    }
  }
};

export function getTranslation(lang = 'ru') {
  return translations[lang] || translations.ru;
}

export default translations;
