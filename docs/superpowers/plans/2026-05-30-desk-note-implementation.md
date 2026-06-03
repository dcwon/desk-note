# Desk Note Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a lightweight Windows desktop sticky-note todo app with multiple pages, completed lists, drag ordering, local persistence, compact mode, always-on-top windowing, and tray integration.

**Architecture:** Use Tauri for native Windows executable, tray, persistence, and window controls. Use a Vite TypeScript frontend with a pure state module that is covered by Vitest before wiring the UI.

**Tech Stack:** Tauri v2, Rust, Vite, TypeScript, Vitest, HTML/CSS.

---

## File Structure

- Create `package.json`: npm scripts and frontend dependencies.
- Create `index.html`: Vite entry HTML.
- Create `src/state.ts`: pure state model and operations.
- Create `src/state.test.ts`: Vitest coverage for app behavior.
- Create `src/storage.ts`: Tauri command wrappers.
- Create `src/main.ts`: DOM rendering, drag/drop, Tauri integration, autosave.
- Create `src/styles.css`: sticky-note UI styling.
- Create `src-tauri/Cargo.toml`: Rust package and Tauri dependencies.
- Create `src-tauri/build.rs`: Tauri build hook.
- Create `src-tauri/src/main.rs`: app entrypoint.
- Create `src-tauri/src/lib.rs`: Tauri commands, tray, window events.
- Create `src-tauri/tauri.conf.json`: app/bundle/window config.
- Create `src-tauri/icons/icon.svg`: simple generated app icon source.

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/build.rs`
- Create: `src-tauri/src/main.rs`
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/icons/icon.svg`

- [ ] **Step 1: Create minimal Tauri/Vite structure**

Create package scripts for `npm test`, `npm run build`, and `npm run tauri`. Configure Tauri to start a 420x560 always-on-top resizable window that is hidden from the taskbar.

- [ ] **Step 2: Run dependency install**

Run: `npm install`
Expected: dependencies install and `package-lock.json` is created.

## Task 2: State Model With TDD

**Files:**
- Create: `src/state.test.ts`
- Create: `src/state.ts`

- [ ] **Step 1: Write failing state tests**

Add tests for default data, page creation, todo creation, completion, completed deletion, reordering, page deletion, and sanitize behavior.

- [ ] **Step 2: Run tests to verify RED**

Run: `npm test -- --run`
Expected: FAIL because `src/state.ts` does not exist or exports are missing.

- [ ] **Step 3: Implement state module**

Create typed data model helpers and immutable operations:

- `createDefaultData`
- `ensureValidData`
- `addPage`
- `renamePage`
- `deletePage`
- `addTodo`
- `updateTodo`
- `completeTodo`
- `deleteCompleted`
- `reorderTodo`
- `getActivePage`

- [ ] **Step 4: Run tests to verify GREEN**

Run: `npm test -- --run`
Expected: PASS.

## Task 3: Tauri Commands And Native Windowing

**Files:**
- Create: `src-tauri/src/lib.rs`
- Modify: `src-tauri/src/main.rs`
- Modify: `src-tauri/Cargo.toml`

- [ ] **Step 1: Implement Rust commands**

Add `load_data`, `save_data`, `set_compact_window`, `restore_window`, and `show_main_window` commands. Store JSON under the app data directory.

- [ ] **Step 2: Implement tray and close behavior**

Add tray menu entries for show/hide and quit. Intercept close requests to hide the window instead of exiting unless quit was selected.

- [ ] **Step 3: Check Rust code**

Run: `cargo fmt --manifest-path src-tauri/Cargo.toml --check`
Run: `cargo check --manifest-path src-tauri/Cargo.toml`
Expected: both exit 0.

## Task 4: Frontend Storage And UI

**Files:**
- Create: `src/storage.ts`
- Create: `src/main.ts`
- Create: `src/styles.css`

- [ ] **Step 1: Add storage wrapper**

Wrap Tauri `invoke` calls for `load_data`, `save_data`, `set_compact_window`, `restore_window`, and `show_main_window`.

- [ ] **Step 2: Render UI**

Implement page tabs, active todo list, completed list, add input, inline edit, complete/delete controls, drag/drop reorder, compact/expand controls, and save status text.

- [ ] **Step 3: Style UI**

Use sans-serif typography, compact modern controls, subtle shadows and borders, fixed control dimensions, and responsive layout for compact and expanded windows.

## Task 5: Verification And Review

**Files:**
- Modify as needed from earlier tasks only.

- [ ] **Step 1: Run frontend tests**

Run: `npm test -- --run`
Expected: PASS.

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Run Rust checks**

Run: `cargo fmt --manifest-path src-tauri/Cargo.toml --check`
Run: `cargo check --manifest-path src-tauri/Cargo.toml`
Expected: PASS if Tauri dependencies are available.

- [ ] **Step 4: Run independent review agent**

Dispatch a separate agent to compare `Requirements.md` against implemented files and report coverage gaps.

## Plan Self-Review

- Spec coverage: each requirement maps to project scaffold, state behavior, native Tauri commands, UI wiring, or verification.
- Placeholder scan: no TBD or implementation-later placeholders remain.
- Type consistency: data model names match the design spec and state module task.
