# Desk Note Design

## Context

Desk Note is a lightweight Windows desktop sticky-note app for todo lists. The workspace started with `Requirements.md` only and is not a git repository, so the superpowers commit step cannot be completed in this directory.

## Goals

- Run on common Windows 10 and Windows 11 x86_64 systems through a simple executable.
- Keep runtime resource use low enough for an always-on desktop utility.
- Provide multiple todo pages for different categories.
- Let users add, edit, complete, reorder, and delete todo items.
- Persist all data locally and reload quickly after close, kill, or restart.
- Use a modern, minimal, Apple-influenced UI with sans-serif text.
- Keep the app window on top, resizable, draggable, and available through the system tray instead of the taskbar.
- Support compact and expanded window states.

## Architecture

The app uses Tauri because it provides a native Windows executable, a low-overhead WebView UI, first-class tray support, and native window APIs without Electron-level memory cost.

The frontend is a Vite TypeScript app. It owns rendering, interaction, drag-and-drop ordering, and state updates through a small app-state module. The Tauri Rust side owns native integration: window behavior, tray menu, persistence path discovery, and filesystem reads/writes.

## Components

- `src/state.ts`: Pure TypeScript reducer-style state operations for pages, todos, completed items, reordering, deletion, and validation.
- `src/storage.ts`: Thin Tauri command wrapper for loading and saving app data.
- `src/main.ts`: UI bootstrap and event wiring.
- `src/styles.css`: Modern compact desktop UI styling.
- `src-tauri/src/lib.rs`: Tauri commands for loading/saving JSON and native window controls.
- `src-tauri/src/main.rs`: Native app startup.
- `src-tauri/tauri.conf.json`: Windows window defaults, tray icon settings, bundle metadata, and taskbar behavior.

## Data Model

```ts
type DeskNoteData = {
  version: 1;
  activePageId: string;
  pages: TodoPage[];
  compactWindowSize?: { width: number; height: number };
};

type TodoPage = {
  id: string;
  title: string;
  todos: TodoItem[];
  completed: CompletedItem[];
};

type TodoItem = {
  id: string;
  text: string;
  createdAt: number;
};

type CompletedItem = TodoItem & {
  completedAt: number;
};
```

The app guarantees at least one page exists after load. Invalid or missing JSON falls back to a default empty page so the UI can start reliably.

## Storage

Data is stored as JSON under the Tauri app data directory. Every meaningful state change schedules a save. The state module stays pure and testable; storage errors are surfaced through a subtle status message instead of blocking the UI.

## Window And Tray Behavior

The main window starts at sticky-note size, is resizable, always on top, and hidden from the taskbar. It can be moved by dragging a dedicated title area. Compact mode stores the expanded size, then resizes the window to a small input-method-like footprint. Expand restores the previous size.

The tray icon remains visible while the app is running. The tray menu provides show/hide and quit. Closing the window hides it unless the user chooses quit from the tray.

## UI Design

The interface uses a quiet translucent panel, sans-serif fonts, compact controls, subtle borders, and restrained color. Page tabs sit at the top. The main todo list supports keyboard entry, inline editing, completing items, and drag handles for reordering. Completed items appear in a separate section with permanent delete controls.

The compact view keeps only the page title, add input, and a short active count visible so the app can sit on top of the desktop without taking much space.

## Error Handling

- Storage read failure: load a default page and show a status note.
- Storage write failure: keep the in-memory state and show a status note.
- Empty todo text: ignore the add action.
- Deleting a page: if it is the last page, keep it and clear its content instead of leaving the app with no page.
- Deleting completed items: immediately removes them from persisted state on the next save and no recovery path is provided.

## Testing

The pure state module is covered with Vitest tests before implementation. Tests cover default data creation, page creation, todo lifecycle, completed deletion, reordering, page deletion, and data sanitization after invalid load input. A production build verifies TypeScript and bundling. Rust formatting/checks are run when the installed toolchain allows it.

## Spec Self-Review

- Placeholder scan: no placeholders or unresolved TODO items remain.
- Consistency: the architecture, components, and data flow all use Tauri plus a pure TypeScript state layer.
- Scope: this is a single small desktop app and does not need decomposition into separate sub-projects.
- Ambiguity: unspecified UI details are resolved as a modern compact Tauri desktop utility.
