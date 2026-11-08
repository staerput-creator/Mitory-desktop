<div align="center">

# 📖 Mitory Desktop

**Visual Node-Based Interactive Story, Quest & Dialogue Tree Studio**

*A high-performance, local-first desktop IDE for game writers and quest designers. Built with Tauri v2, Rust, and React 19.*

[![Release](https://img.shields.io/github/v/release/staerput-creator/Mitory-desktop?color=7c3aed&label=Release)](https://github.com/staerput-creator/Mitory-desktop/releases)
[![Tauri](https://img.shields.io/badge/Tauri-v2.0-blue?logo=tauri&logoColor=white)](https://tauri.app/)
[![Rust](https://img.shields.io/badge/Rust-1.75+-orange?logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![ReactFlow](https://img.shields.io/badge/@xyflow/react-v12-ff0072)](https://reactflow.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-slate)](#-prerequisites)

</div>

---

## 🌟 Overview

**Mitory: Story Builder** is an enterprise-grade visual scripting and narrative development environment engineered for narrative designers, visual novel creators, indie game developers, and interactive fiction writers.

It combines an ultra-fast **Rust native backend (Tauri v2)** with a hardware-accelerated **React 19** infinite node graph powered by `@xyflow/react`.

### 🔒 100% Local-First & Sovereign
- **Zero Cloud Lock-in:** No accounts, no subscriptions, no background telemetry, and no mandatory cloud synchronization.
- **Native `.mtrsb` Container:** Atomic, crash-resilient file I/O handled directly by Rust with temp-file swaps and automated schema validation.
- **Air-Gapped Reliability:** Completely functional without an active internet connection.

---

## ✨ Key Capabilities

### 🗺️ Next-Gen Visual Node Canvas
- **Dynamic Choice Ports:** Individual output handles per dialogue choice prevent overlapping Bezier curves even in dense branching hubs.
- **Freeform Arc Curvature:** Interactive control points on connection lines let you route links cleanly around complex story structures.
- **Tactile Stash Pocket:** Dedicated holding zone to park draft scenes off-canvas in a compact stacked card view without cluttering the plot graph.
- **Interactive Drag-to-Trash:** Fluid drag-and-drop node disposal with recovery history to protect against accidental deletions.

### 🛡️ Enterprise Desktop Core (Tauri v2 + Rust)
- **Single-Instance Routing:** Launches pass arguments seamlessly to the running instance via OS file associations (`.mtrsb`).
- **Close Guard:** Intercepts window exit signals to prompt for unsaved modifications when working with modified canvases.
- **Atomic File Serialization:** Every save writes to a validated temporary descriptor before atomic filesystem replacement, preventing corrupted projects on unexpected shutdowns.
- **Cryptographic Auto-Updater:** Built-in signature verification powered by Minisign.

### 🎮 Built-in Visual Novel Stage & Logic Engine
- **Glassmorphism Player:** Instant in-editor playthrough mode with cinematic radial backgrounds, asset crossfades, and keyboard pacing (`Space` / `Enter` / number keys).
- **Dynamic State Engine:** Tracks boolean switches and numeric variables with condition gates (`[🔒 Requires: Gold >= 15]`) and live mutation nodes.

### 🔌 Extensibility & AI Bridge
- **Standalone HTML Export:** Compiles entire story graphs, states, dialogue scripts, and media bundles into an autonomous single-file web runner.
- **Model Context Protocol (MCP):** Embedded local bridge (`127.0.0.1:39123`) allowing AI assistants (Claude, Cursor, custom agents) to inspect lore context and propose story nodes transactionally.

---

## 🛠️ Architecture & Tech Stack

| Layer | Implementation |
| :--- | :--- |
| **Native Runtime** | **Tauri v2**, **Rust** (atomic I/O, OS file associations, system tray/menu, updater) |
| **UI Framework** | **React 19**, **Vite**, CSS Modules / Glassmorphism Design System |
| **Graph Engine** | **`@xyflow/react` v12** (React 19 virtualized infinite viewport) |
| **State Machine** | **Zustand v5** + **Zundo** (optimized memory history snapshots) |
| **Project Schema** | **`.mtrsb` Container** (JSON envelope `v1.0.0` with atomic OS swap) |
| **Agent Protocol** | **Model Context Protocol (MCP)** JSON-RPC bridge |

---

## 🚀 Getting Started

### Prerequisites

* **[Node.js](https://nodejs.org/)** (v20+ or v22 LTS)
* **[Rust](https://rustup.rs/)** (stable toolchain)
* **Platform Dependencies:**
  * **Windows:** Visual Studio 2022 C++ Build Tools & WebView2 (standard on Windows 10/11).
  * **macOS:** Xcode Command Line Tools (`xcode-select --install`).
  * **Linux:** WebKit2GTK and build essentials (`libwebkit2gtk-4.1-dev`, `build-essential`, `libssl-dev`).

### Installation & Development Run

```bash
# Clone the repository
git clone https://github.com/staerput-creator/Mitory-desktop.git

# Enter project root
cd Mitory-desktop

# Install dependencies
npm install

# Launch native desktop development environment
npm run tauri:dev
```

> [!TIP]
> Executing `npm run dev` opens the pure browser UI shell. For full operating system integration (native file dialogs, atomic `.mtrsb` saves, and window lifecycle hooks), always launch via `npm run tauri:dev`.

---

## 🧪 Quality Assurance & Tests

```bash
# Frontend static code analysis
npm run lint

# Execute graph logic and state migration test suites
npm test

# Verify Rust native backend unit tests
cargo test --manifest-path src-tauri/Cargo.toml --lib
```

---

## 📦 Building Platform Binaries

To produce standalone installers and optimized executables:

```bash
npm run tauri:build
```

Generated production artifacts:
* **Windows NSIS Installer:** `src-tauri/target/release/bundle/nsis/Mitory_0.2.0_x64-setup.exe`
* **Windows MSI Package:** `src-tauri/target/release/bundle/msi/Mitory_0.2.0_x64_en-US.msi`

---

## ⌨️ Essential Hotkeys

| Shortcut | Context | Action |
| :--- | :--- | :--- |
| `Ctrl + S` / `Cmd + S` | Global | Save canvas directly to `.mtrsb` file |
| `Ctrl + Z` | Canvas | Undo last graph modification |
| `Ctrl + Y` / `Ctrl + Shift + Z` | Canvas | Redo action |
| `Delete` / `Backspace` | Canvas | Remove selected nodes or connections |
| `Space` / `Enter` | VN Simulator | Advance story dialogue |
| `1`, `2`, `3` ... | VN Simulator | Trigger corresponding branch choice |

---

## 📄 License

Distributed under the **MIT License**. Refer to the [LICENSE](LICENSE) file for complete terms and rights.
