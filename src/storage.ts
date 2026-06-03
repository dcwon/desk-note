import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { DeskNoteData, WindowSize } from "./state";

const BROWSER_STORAGE_KEY = "desk-note:data";

const isTauri = (): boolean => "__TAURI_INTERNALS__" in window;

export const loadPersistedData = async (): Promise<unknown> => {
  if (!isTauri()) {
    const raw = window.localStorage.getItem(BROWSER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  const raw = await invoke<string | null>("load_data");
  return raw ? JSON.parse(raw) : null;
};

export const savePersistedData = async (data: DeskNoteData): Promise<void> => {
  const serialized = JSON.stringify(data);
  if (!isTauri()) {
    window.localStorage.setItem(BROWSER_STORAGE_KEY, serialized);
    return;
  }

  await invoke("save_data", { data: serialized });
};

export const readCurrentWindowSize = async (): Promise<WindowSize> => {
  if (!isTauri()) {
    return {
      width: Math.max(280, Math.round(window.innerWidth)),
      height: Math.max(240, Math.round(window.innerHeight))
    };
  }

  const size = await getCurrentWindow().outerSize();
  return {
    width: size.width,
    height: size.height
  };
};

export const enterCompactWindow = async (): Promise<void> => {
  if (isTauri()) {
    await invoke("set_compact_window");
  }
};

export const restoreExpandedWindow = async (size: WindowSize): Promise<void> => {
  if (isTauri()) {
    await invoke("restore_window", {
      width: size.width,
      height: size.height
    });
  }
};

export const startNativeDrag = async (): Promise<void> => {
  if (isTauri()) {
    await getCurrentWindow().startDragging();
  }
};
