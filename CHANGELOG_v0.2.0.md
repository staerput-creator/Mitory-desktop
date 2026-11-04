# Mitory Story Builder — v0.2.0

**Release date:** 2026-11-04

**Baseline:** annotated `v0.1.0` tag at the initial release commit `7261230` (`feat: initial release - Story Architect Desktop v0.1.0`). Upstream also had three README-only commits after v0.1.0; the v0.2.0 implementation is summarized from the release changes and code inspection.

## Release summary

Version 0.2.0 advances the initial Story Architect desktop baseline into a more complete, local-first narrative editing studio. The product combines a Tauri 2 native shell and Rust file operations with a React 19 / React Flow graph editor. Project workspaces, native dialogs, unsaved-change protection, scene organization, full-resolution media import, a playable HTML export, and a release updater are integrated into the editor.

## Architecture: browser-oriented editor to native desktop studio

- The desktop application uses **Tauri v2** with a Rust backend and **React 19** frontend; graph editing is provided by `@xyflow/react`, state by Zustand, and undo/redo history by Zundo.
- Rust owns native file dialogs, project file reads/writes, file validation, recent-project storage, OS integration and app lifecycle hooks. The frontend owns interactive graph rendering, authoring state, conditions, story preview and standalone HTML generation.
- Native application menu actions are bridged into the editor. Single-instance handling restores/focuses the existing window and forwards supported project-file arguments.

## `.mtrsb` project format and file integration

- The editor serializes projects as JSON with `format: "mtrsb"`, `formatVersion: "1.0.0"`, a schema URL and generator metadata.
- The v0.2.0 payload stores graph nodes/edges/viewport, project and entity metadata, characters, variables, chapters/regions, stash/trash state and an asset map. Root-level compatibility fields accompany the graph/entities representation for existing import paths.
- Tauri registers the `.mtrsb` OS file association. Rust accepts `.mtrsb` plus legacy `.mitory.json`, `.story.json` and `.json` inputs, validates the JSON graph envelope, and enforces a 256 MiB file limit.
- On launch or second-instance invocation, supported existing paths are canonicalized when possible and delivered to the running editor through the startup-file state and `open-file` event.

## Data integrity and recovery

- The editor tracks unsaved state (`isDirty`) and reflects it with an asterisk in the document/window title.
- A close guard intercepts window close when the project is dirty and opens an unsaved-changes dialog. Native menu open/new flows and incoming file-open events also guard against discarding unsaved work.
- Rust saves project JSON by validating it, writing a temporary file in the destination directory, syncing it, then persisting it to the target path. Recent-file history is maintained separately in the application config directory.
- Startup panics are captured by a Rust panic hook and written to `mitory_crash.log` in the first available application/temp/current-directory location.

## Workspace ergonomics and interface

- A custom **UnifiedHeader** replaces the old floating-HUD-style primary header. It is a compact 42 px window title/workspace bar with draggable window region, project title, history and configurable action slots, fullscreen toggle and native window controls.
- Toolbar layout is configurable across top-left, top-center, top-right, bottom dock and hidden slots. Slot/visibility choices persist in localStorage; Settings provides segmented slot controls and reset behavior.
- The floating lower dock supports upward-opening (dropup) node-creation menus.
- The scene pocket (stash) supports drag/drop, grouping into folders and restoration. A Trash tab provides soft-deleted scene restoration, permanent deletion and empty-trash controls.
- A drag-to-trash drop zone appears during canvas drag operations. The canvas has region/chapter nodes, a chapter navigator, context actions, validation/search, onboarding and bilingual UI strings.

## Media and graph behavior

- Scene image ingestion now reads original image bytes with `FileReader.readAsDataURL`; the former forced canvas downscale/lossy JPEG compression path is removed. Images retain their source resolution and format.
- Editor history stores lightweight `imageId` references; image data is held in a separate in-memory/IndexedDB asset pool. Portable `.mtrsb` project saves and standalone HTML exports include referenced asset data inline as Base64, so those files remain self-contained.
- Connection-end handling distinguishes a valid connection from a drag released on the empty React Flow pane. It avoids accidental node creation when dropping on nodes, handles, edges, labels or after a valid connection; an intentional drag to empty pane opens the node-creation menu at the release point.
- Region nodes are assigned z-index 0 (rather than a negative stacking layer), with story nodes above them. Self-connecting edges use an external loop path to keep the curve and its choice label from running through the node body.

## Build, tests and release infrastructure

- Vite uses explicit React, React Flow and icon vendor chunk groups and lazy-loads larger authoring panels. In the verified production build the main app JS is approximately **459.59 kB** (136.57 kB gzip), below Vite's 500 kB chunk warning threshold; editor dialogs/panels are separate chunks.
- The frontend suite is **6/6 passing** and ESLint exits successfully. Rust tests pass (1 unit test covering atomic overwrite and project validation). A local test run may print a WebSocket “port 24678 already in use” diagnostic, but the test runner still reports all six passing.
- Tauri updater configuration points to the GitHub releases `latest.json` endpoint for `staerput-creator/story-architect-desktop` and embeds the freshly generated minisign public key in `src-tauri/mitory.key.pub`. The matching encrypted private key (`src-tauri/mitory-v020.key`) is local-only and ignored by Git.
- Windows x64 NSIS and MSI installers were built with updater artifacts enabled. The NSIS `.exe.sig` and MSI `.msi.sig` files were generated successfully for version 0.2.0 using the fresh keypair. Keep the private key and password outside version control and release assets.
- The generated signatures are in the local `src-tauri/target/release/bundle/{nsis,msi}` output. These build artifacts are ignored and are not included in the source commit; attach the installer and matching `.sig` files to a GitHub release and publish the corresponding `latest.json` separately.
- A successful local bundle build alone does not publish a GitHub release, updater manifest or signed installer; publication requires the release workflow/upload step and a clean-machine update smoke test.

## Notes and limitations

- The `v0.1.0` tag points to the initial release commit; this release finalization creates the annotated `v0.2.0` tag.
- UI behavior is validated by automated tests/static inspection. This changelog does not assert manual testing of installation, OS association registration, updater download/install, or all target operating systems.
- Full-resolution Base64 assets make project files portable but increase memory and file size; the native project size limit is 256 MiB.