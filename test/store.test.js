import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

test('real store: parallel edges, regions, stash, customOffset, import, undo/redo, and image isolation', async () => {
  const vite = await createServer({
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
    optimizeDeps: { noDiscovery: true, include: [] }
  });
  try {
    const { useStoryStore: store, assetStorage, computeSelectionBoundingBox, isNodeInsideRegion } =
      await vite.ssrLoadModule('/src/store.js');
    globalThis.document = { body: { className: '' } };
    const node = (id, x = 0, y = 0, selected = false) => ({
      id,
      type: 'storyNode',
      position: { x, y },
      selected,
      data: { label: id, type: 'scene', choices: [] }
    });
    store.setState({ nodes: [node('a'), node('b')], edges: [], regions: [], stash: [], stashedNodes: [] });
    store.temporal.getState().clear();
    const connect = () =>
      store.getState().onConnect({ source: 'a', target: 'b', sourceHandle: 'choice-add' });
    connect();
    connect();
    connect();
    let state = store.getState();
    assert.equal(state.edges.length, 3);
    assert.equal(new Set(state.edges.map((e) => e.id)).size, 3);
    assert.equal(state.nodes[0].data.choices.length, 3);
    assert.ok(state.edges.every((e) => e.sourceHandle === e.data.choiceId));
    const sharedHandle = state.edges[0].sourceHandle;
    state.onConnect({ source: 'a', target: 'b', sourceHandle: sharedHandle });
    assert.equal(store.getState().edges.length, 4, 'same ports must also allow parallel edges');
    store.temporal.getState().undo();
    assert.equal(store.getState().edges.length, 3);
    assert.equal(store.getState().nodes[0].data.choices.length, 3);
    store.temporal.getState().undo();
    assert.equal(store.getState().nodes[0].data.choices.length, 2);
    store.temporal.getState().redo();
    assert.equal(store.getState().nodes[0].data.choices.length, 3);

    // Custom edge offset and reset
    const firstEdgeId = store.getState().edges[0].id;
    store.getState().updateEdgeOffset(firstEdgeId, { x: 45, y: -80 });
    assert.deepEqual(store.getState().edges[0].data.customOffset, { x: 45, y: -80 });
    store.getState().updateEdgeOffset(firstEdgeId, null);
    assert.equal(store.getState().edges[0].data.customOffset, null);

    // Regions creation when nothing is selected -> 400x300 under cursor
    const reg1 = store.getState().addRegion({ x: 100, y: 120 }, { title: 'Замок', color: '#10b981' });
    const reg2 = store.getState().addRegion({ x: 700, y: 120 }, { title: 'Катакомбы', color: '#8b5cf6' });
    assert.equal(store.getState().regions.length, 2);
    assert.equal(store.getState().regions[0].width, 400);
    assert.equal(store.getState().regions[0].height, 300);
    assert.equal(store.getState().regions[0].x, 100);
    assert.equal(store.getState().regions[0].y, 120);
    store.getState().reorderRegions(0, 1);
    assert.equal(store.getState().regions[0].id, reg2);
    assert.equal(store.getState().regions[1].id, reg1);

    // Scene Stash (pocket): single & multi-node tactile stash into store.stash and restoreFromStash
    store.getState().stashNode('b');
    assert.equal(store.getState().nodes.length, 1);
    assert.equal(store.getState().stash.length, 1);
    assert.equal(store.getState().stashedNodes.length, 1);
    store.getState().restoreFromStash('b', { x: 520, y: 310 });
    assert.equal(store.getState().nodes.length, 2);
    assert.equal(store.getState().stash.length, 0);
    assert.equal(store.getState().stashedNodes.length, 0);
    assert.deepEqual(store.getState().nodes.find((n) => n.id === 'b').position, { x: 520, y: 310 });

    // Multi-node stack stash
    store.getState().stashNodes(['a', 'b']);
    assert.equal(store.getState().nodes.length, 0);
    assert.equal(store.getState().stash.length, 2);
    store.getState().restoreFromStash('a', { x: 100, y: 100 });
    store.getState().restoreFromStash('b', { x: 520, y: 310 });
    assert.equal(store.getState().nodes.length, 2);

    // UE5 Comment Box creation around selected nodes (C key / context menu) with 30px padding
    store.setState({
      nodes: [
        { id: 'n1', type: 'storyNode', position: { x: 100, y: 150 }, width: 240, height: 150, selected: true, data: { label: 'N1', type: 'scene', choices: [] } },
        { id: 'n2', type: 'storyNode', position: { x: 460, y: 320 }, width: 240, height: 150, selected: true, data: { label: 'N2', type: 'scene', choices: [] } },
        { id: 'n3', type: 'storyNode', position: { x: 1200, y: 800 }, width: 240, height: 150, selected: false, data: { label: 'N3', type: 'scene', choices: [] } }
      ],
      edges: [],
      regions: []
    });

    const bbox = computeSelectionBoundingBox(store.getState().nodes, 30);
    assert.deepEqual(bbox, {
      minX: 100,
      minY: 150,
      maxX: 700,
      maxY: 470,
      x: 70,
      y: 120,
      width: 660,
      height: 380
    });

    const ueRegId = store.getState().addRegion({ x: 999, y: 999 }, { title: 'Акт I: Вход в замок' });
    const ueReg = store.getState().regions.find((r) => r.id === ueRegId);
    assert.equal(ueReg.x, 70);
    assert.equal(ueReg.y, 120);
    assert.equal(ueReg.width, 660);
    assert.equal(ueReg.height, 380);
    assert.ok(isNodeInsideRegion(store.getState().nodes[0], ueReg));
    assert.ok(isNodeInsideRegion(store.getState().nodes[1], ueReg));
    assert.ok(!isNodeInsideRegion(store.getState().nodes[2], ueReg));

    // UE-Style Group Dragging by header: dragging region moves n1 and n2 by (+80, +50), leaving n3 untouched
    store.getState().onNodesChange([
      { id: ueRegId, type: 'position', position: { x: 150, y: 170 }, dragging: true }
    ]);
    assert.deepEqual(store.getState().nodes.find((n) => n.id === 'n1').position, { x: 180, y: 200 });
    assert.deepEqual(store.getState().nodes.find((n) => n.id === 'n2').position, { x: 540, y: 370 });
    assert.deepEqual(store.getState().nodes.find((n) => n.id === 'n3').position, { x: 1200, y: 800 });

    // Moving a single node inside the region moves ONLY that node
    store.getState().onNodesChange([
      { id: 'n1', type: 'position', position: { x: 210, y: 220 }, dragging: false }
    ]);
    assert.deepEqual(store.getState().nodes.find((n) => n.id === 'n1').position, { x: 210, y: 220 });
    assert.deepEqual(store.getState().nodes.find((n) => n.id === 'n2').position, { x: 540, y: 370 });
    assert.equal(store.getState().regions.find((r) => r.id === ueRegId).x, 150);

    // Restore a & b for import/image tests
    store.setState({ nodes: [node('a'), node('b')], edges: [], regions: store.getState().regions });
    connect();
    connect();
    connect();

    state = store.getState();
    const project = state.getSerializableData();
    assert.equal(project.version, '0.2.0', 'Serializable project version must be 0.2.0');
    assert.equal(project.regions.length, 1);
    assert.equal(await state.importProject(project, false), true);
    assert.equal(store.getState().nodes[0].data.choices.length, 3, 'import must retain choices');
    assert.equal(store.getState().regions.length, 1, 'import must retain regions');

    store.getState().updateNodeData('a', { image: 'data:image/png;base64,first' });
    store.getState().updateNodeData('a', { image: 'data:image/png;base64,second' });
    assert.ok(store.getState().nodes[0].data.imageId);
    assert.equal(store.getState().nodes[0].data.image, undefined);
    assert.ok(!JSON.stringify(store.temporal.getState().pastStates).includes('data:image/'));
    store.temporal.getState().undo();
    assert.equal(assetStorage.getAsset(store.getState().nodes[0].data.imageId), 'data:image/png;base64,first');

    assetStorage.registerAsset('data:image/png;base64,original', 'img_collision');
    const imported = {
      nodes: [{ data: { imageId: 'img_collision' } }],
      assetsMap: { img_collision: 'data:image/png;base64,imported' }
    };
    assetStorage.hydrateFromProject(imported);
    assert.notEqual(imported.nodes[0].data.imageId, 'img_collision');
    assert.equal(assetStorage.getAsset(imported.nodes[0].data.imageId), 'data:image/png;base64,imported');
    assert.equal(assetStorage.getAsset('img_collision'), 'data:image/png;base64,original');
    const { buildStandaloneGameHtml } = await vite.ssrLoadModule('/src/services/storage/BrowserStorageService.js');
    const html = buildStandaloneGameHtml({
      projectMeta: { title: '</title><script>bad()</script>' },
      variables: [],
      nodes: [
        { id: 'start', data: { type: 'start', label: 'Start', dialogue: [{ text: '<img onerror=bad()>' }, { text: 'second' }] } },
        { id: 'end', data: { type: 'ending', label: 'End' } }
      ],
      edges: [{ id: 'e', source: 'start', target: 'end', label: 'Go' }]
    });
    assert.ok(!html.includes('</title><script>bad()'));
    const element = () => ({
      children: [],
      style: {},
      textContent: '',
      append(...items) {
        this.children.push(...items);
      },
      replaceChildren(...items) {
        this.children = items;
      }
    });
    const elements = Object.fromEntries(
      ['hud', 'scene-media', 'scene-title', 'scene-notes', 'dialogue', 'choices'].map((id) => [id, element()])
    );
    const context = vm.createContext({
      document: { getElementById: (id) => elements[id], createElement: element, addEventListener() {} }
    });
    vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], context);
    assert.equal(elements.choices.children.length, 0);
    assert.equal(elements.dialogue.children[0].children[1].textContent, '<img onerror=bad()>');
    vm.runInContext('advanceDialogue()', context);
    assert.equal(elements.dialogue.children[0].children[1].textContent, 'second');
    vm.runInContext('advanceDialogue()', context);
    assert.equal(elements.dialogue.children.length, 0);
    assert.equal(elements.choices.children[0].textContent, 'Go');
    elements.choices.children[0].onclick();
    assert.equal(elements.choices.children[0].textContent, '🏁 Финал истории');
    elements.choices.children[1].onclick();
    assert.equal(elements.choices.children.length, 0);
    store.getState().clearToast();
  } finally {
    await vite.close();
    delete globalThis.document;
  }
});

test('v0.2.0 Regressions Fixed: Pure Scene Pocket DnD, Custom Nodes, UE Region zIndex 0, ConditionsEditor, and Non-Blocking Tour', async () => {
  const vite = await createServer({
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
    optimizeDeps: { noDiscovery: true, include: [] }
  });
  try {
    const lsMap = new Map();
    globalThis.localStorage = {
      getItem: (k) => (lsMap.has(k) ? lsMap.get(k) : null),
      setItem: (k, v) => lsMap.set(k, String(v))
    };

    const { useStoryStore: store, isNodeInsideRegion } = await vite.ssrLoadModule('/src/store.js');
    const { REGION_COLORS } = await vite.ssrLoadModule('/src/graph/regionColors.js');
    const { areEdgePropsEqual } = await vite.ssrLoadModule('/src/graph/edgeComparators.js');
    const { markTourAsSeen, hasSeenOnboardingTour } = await vite.ssrLoadModule('/src/utils/onboarding.js');
    const { translations, getTranslation } = await vite.ssrLoadModule('/src/i18n/translations.js');

    // 1. 5 pastel region color presets with rgba(..., 0.12) and z-index: 0 (no z-index: -1)
    assert.equal(REGION_COLORS.length, 5);
    assert.deepEqual(
      REGION_COLORS.map((c) => c.id),
      ['blue', 'amber', 'emerald', 'purple', 'gray']
    );
    assert.ok(REGION_COLORS.every((c) => c.rgba.includes('0.12')));

    store.setState({
      nodes: [
        { id: 'inside-region', type: 'storyNode', position: { x: 120, y: 140 }, data: { type: 'scene' } },
        { id: 'outside-region', type: 'storyNode', position: { x: 900, y: 900 }, data: { type: 'scene' } }
      ],
      regions: []
    });
    const regionId = store.getState().addRegion(
      { x: 100, y: 100 },
      { title: 'Акт I: Вход в замок', color: '#3b82f6', width: 500, height: 400, ignoreSelection: true }
    );
    let region = store.getState().regions.find((item) => item.id === regionId);
    assert.deepEqual({ x: region.x, y: region.y, width: region.width, height: region.height }, {
      x: 100, y: 100, width: 500, height: 400
    });
    assert.equal(isNodeInsideRegion(store.getState().nodes[0], region), true);
    assert.equal(isNodeInsideRegion(store.getState().nodes[1], region), false);

    store.getState().onNodesChange([
      { id: regionId, type: 'position', position: { x: 150, y: 175 }, dragging: true }
    ]);
    region = store.getState().regions.find((item) => item.id === regionId);
    assert.deepEqual({ x: region.x, y: region.y }, { x: 150, y: 175 });
    assert.deepEqual(store.getState().nodes[0].position, { x: 170, y: 215 });
    assert.deepEqual(store.getState().nodes[1].position, { x: 900, y: 900 });
    store.getState().onNodesChange([
      { id: regionId, type: 'position', position: { x: 150, y: 175 }, dragging: false }
    ]);

    const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
    const regionNodeSource = await readFile(new URL('../src/components/StoryRegionNode.jsx', import.meta.url), 'utf8');
    assert.match(appSource, /type: 'regionNode'[\s\S]*?zIndex: 0/);
    assert.match(regionNodeSource, /zIndex:\s*0/);
    assert.match(regionNodeSource, /border:\s*'2px dashed rgba\(var\(--color\), 0\.5\)'/);
    assert.match(regionNodeSource, /background:\s*'rgba\(var\(--color\), 0\.12\)'/);

    // 2. Pure Scene Pocket (LeftNodePalette): rounded right corners, right-edge tab-tongue, and application/stash-node-id DnD
    store.setState({ nodes: [], edges: [], regions: [], stash: [], stashedNodes: [] });
    const startId = store.getState().addNode('start', { x: 100, y: 120 });
    const customId = store.getState().addNode('custom', { x: 380, y: 220 }, {
      label: 'Схватка с Хранителем',
      customBadgeLabel: 'Босс-файт',
      customColor: '#ef4444',
      customIcon: '⚔️'
    });
    assert.equal(store.getState().nodes.length, 2);
    const customNode = store.getState().nodes.find((n) => n.id === customId);
    assert.equal(customNode.data.type, 'custom');
    assert.equal(customNode.data.customBadgeLabel, 'Босс-файт');
    assert.equal(customNode.data.customColor, '#ef4444');
    assert.equal(customNode.data.customIcon, '⚔️');

    // Stash the custom node into the Scene Pocket
    store.getState().stashNodes([customId]);
    assert.equal(store.getState().nodes.length, 1);
    assert.equal(store.getState().stash.length, 1);

    const paletteSource = await readFile(new URL('../src/components/LeftNodePalette.jsx', import.meta.url), 'utf8');
    assert.match(paletteSource, /borderTopRightRadius:\s*16/);
    assert.match(paletteSource, /borderBottomRightRadius:\s*16/);
    assert.match(paletteSource, /application\/stash-node-id/);
    assert.match(paletteSource, /draggable=\{true\}/);
    assert.match(paletteSource, /activeTab === 'stash'[\s\S]*?stash/);
    assert.equal(store.getState().stash.length, 1, 'Scene Pocket stores only the stashed scene, not duplicate palette nodes');

    const dropPos = { x: 640, y: 360 };
    const restoredId = store.getState().restoreFromStash(customId, dropPos);
    assert.equal(restoredId, customId);
    assert.equal(store.getState().nodes.length, 2);
    assert.equal(store.getState().stash.length, 0);
    assert.deepEqual(store.getState().nodes.find((n) => n.id === customId).position, { x: 640, y: 360 });
    assert.ok(startId);

    // 3. StoryCustomEdge port-level memo comparator
    const baseEdgeProps = {
      id: 'e1',
      source: 'n1',
      target: 'n2',
      sourceX: 100,
      sourceY: 120,
      targetX: 400,
      targetY: 220,
      sourceHandleId: 'c1',
      targetHandleId: null,
      label: 'Вперёд',
      selected: false,
      markerEnd: 'url(#arrow)',
      data: { conditions: [] },
      style: {}
    };
    assert.equal(areEdgePropsEqual(baseEdgeProps, { ...baseEdgeProps }), true);
    assert.equal(areEdgePropsEqual(baseEdgeProps, { ...baseEdgeProps, targetX: 405 }), false);

    // 4. i18n instant RU / EN switching & persistence
    assert.ok(translations.ru && translations.en);
    assert.equal(translations.ru.tour.steps.length, 5);
    assert.equal(translations.en.tour.steps.length, 5);
    store.getState().setLanguage('en');
    assert.equal(store.getState().language, 'en');
    assert.equal(globalThis.localStorage.getItem('mitory-lang'), 'en');
    assert.equal(getTranslation(store.getState().language).toolbar.play, 'Play');
    store.getState().setLanguage('ru');
    assert.equal(store.getState().language, 'ru');
    assert.equal(getTranslation(store.getState().language).toolbar.play, 'Играть');

    // 5. ConditionsEditor 36x36px delete button and monolithic select row
    const conditionsSource = await readFile(new URL('../src/components/ConditionsEditor.jsx', import.meta.url), 'utf8');
    assert.match(conditionsSource, /gap:\s*0/);
    assert.match(conditionsSource, /width:\s*36/);
    assert.match(conditionsSource, /height:\s*36/);
    assert.match(conditionsSource, /borderRadius:\s*8/);
    assert.match(conditionsSource, /rgba\(239, 68, 68, 0\.12\)/);
    assert.match(conditionsSource, /1px solid rgba\(239, 68, 68, 0\.25\)/);
    assert.match(conditionsSource, /color:\s*'#ef4444'/);

    // 6. Non-blocking OnboardingTour floating guide in bottom-right corner & hasSeenTour persistence
    assert.equal(hasSeenOnboardingTour(), false);
    const tourSource = await readFile(new URL('../src/components/OnboardingTour.jsx', import.meta.url), 'utf8');
    assert.match(tourSource, /aria-modal="false"/);
    assert.match(tourSource, /position:\s*'fixed'/);
    assert.match(tourSource, /right:\s*20/);
    assert.match(tourSource, /bottom:\s*20/);
    assert.match(tourSource, /pointerEvents:\s*'auto'/);
    markTourAsSeen();
    assert.equal(hasSeenOnboardingTour(), true);
    assert.equal(globalThis.localStorage.getItem('hasSeenTour'), 'true');

    store.getState().clearToast();
  } finally {
    await vite.close();
    delete globalThis.localStorage;
  }
});
