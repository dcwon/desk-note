import "./styles.css";
import {
  addPage,
  addTodo,
  completeTodo,
  createDefaultData,
  deleteCompleted,
  deletePage,
  ensureValidData,
  getActivePage,
  renamePage,
  reorderTodo,
  setActivePage,
  setCompactState,
  updateTodo,
  type DeskNoteData,
  type TodoPage
} from "./state";
import {
  enterCompactWindow,
  loadPersistedData,
  readCurrentWindowSize,
  restoreExpandedWindow,
  savePersistedData,
  startNativeDrag
} from "./storage";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("missing app root");
}

let data: DeskNoteData = createDefaultData();
let draggedIndex: number | null = null;
let editingTodoId: string | null = null;
let editingPageId: string | null = null;
let statusText = "Loading";

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const activeCountText = (page: TodoPage): string => {
  const count = page.todos.length;
  return `${count} active`;
};

const setStatus = (message: string): void => {
  statusText = message;
  render();
};

const saveNow = async (): Promise<void> => {
  statusText = "Saving";
  render();
  try {
    await savePersistedData(data);
    setStatus("Saved");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Save failed");
  }
};

const updateData = (next: DeskNoteData, save = true): void => {
  data = ensureValidData(next);
  render();
  if (save) {
    void saveNow();
  }
};

const renderPageTabs = (): string =>
  data.pages
    .map((page) => {
      const selected = page.id === data.activePageId ? "true" : "false";
      if (editingPageId === page.id) {
        return `<input class="page-title-input" data-action="page-title-input" data-page-id="${page.id}" value="${escapeHtml(page.title)}" aria-label="Page name" />`;
      }

      return `<button class="page-tab" type="button" data-action="select-page" data-page-id="${page.id}" aria-pressed="${selected}">
        <span>${escapeHtml(page.title)}</span>
      </button>`;
    })
    .join("");

const renderTodos = (page: TodoPage): string => {
  if (page.todos.length === 0) {
    return `<div class="empty-state">No active todos</div>`;
  }

  return page.todos
    .map((todo, index) => {
      const isEditing = editingTodoId === todo.id;
      const content = isEditing
        ? `<input class="edit-input" data-action="edit-input" data-page-id="${page.id}" data-todo-id="${todo.id}" value="${escapeHtml(todo.text)}" />`
        : `<button class="todo-text" type="button" data-action="start-edit" data-page-id="${page.id}" data-todo-id="${todo.id}">${escapeHtml(todo.text)}</button>`;

      return `<li class="todo-row" draggable="true" data-drag-index="${index}">
        <button class="icon-button drag-handle" type="button" aria-label="Drag todo" title="Drag">::</button>
        ${content}
        <button class="icon-button complete-button" type="button" data-action="complete" data-page-id="${page.id}" data-todo-id="${todo.id}" aria-label="Complete todo" title="Complete">✓</button>
      </li>`;
    })
    .join("");
};

const renderCompleted = (page: TodoPage): string => {
  if (page.completed.length === 0) {
    return `<div class="empty-state compact-empty">No completed items</div>`;
  }

  return page.completed
    .map(
      (item) => `<li class="completed-row">
        <span>${escapeHtml(item.text)}</span>
        <button class="icon-button delete-button" type="button" data-action="delete-completed" data-page-id="${page.id}" data-completed-id="${item.id}" aria-label="Delete completed item" title="Delete permanently">×</button>
      </li>`
    )
    .join("");
};

const render = (): void => {
  const page = getActivePage(data);
  document.body.classList.toggle("is-compact", data.compact);

  app.innerHTML = `
    <section class="desk-note-shell">
      <header class="titlebar" data-drag-region>
        <div class="window-title">
          <span class="pin-dot"></span>
          <div>
            <strong>${escapeHtml(page.title)}</strong>
            <span>${activeCountText(page)}</span>
          </div>
        </div>
        <div class="window-actions">
          <button class="icon-button" type="button" data-action="${data.compact ? "expand" : "compact"}" aria-label="${data.compact ? "Expand" : "Collapse"}" title="${data.compact ? "Expand" : "Collapse"}">${data.compact ? "□" : "−"}</button>
        </div>
      </header>

      <nav class="page-strip" aria-label="Todo pages">
        ${renderPageTabs()}
        <button class="icon-button add-page-button" type="button" data-action="add-page" aria-label="Add page" title="Add page">+</button>
      </nav>

      <form class="add-form" data-action="add-todo-form">
        <input class="add-input" name="todo" autocomplete="off" placeholder="Add a todo" />
        <button class="add-button" type="submit">Add</button>
      </form>

      <section class="content-grid">
        <section class="todo-section" aria-label="Active todos">
          <ul class="todo-list">
            ${renderTodos(page)}
          </ul>
        </section>

        <section class="completed-section" aria-label="Completed todos">
          <div class="section-heading">
            <span>Completed</span>
            <small>${page.completed.length}</small>
          </div>
          <ul class="completed-list">
            ${renderCompleted(page)}
          </ul>
        </section>
      </section>

      <footer class="footer-row">
        <button class="text-button" type="button" data-action="rename-page">Rename</button>
        <button class="text-button danger" type="button" data-action="delete-page">Delete page</button>
        <span class="save-status">${escapeHtml(statusText)}</span>
      </footer>
    </section>`;
};

const buttonTarget = (target: EventTarget | null): HTMLButtonElement | null => {
  return target instanceof Element ? target.closest<HTMLButtonElement>("button") : null;
};

const handleAction = async (button: HTMLButtonElement): Promise<void> => {
  const action = button.dataset.action;
  const pageId = button.dataset.pageId;
  const todoId = button.dataset.todoId;
  const completedId = button.dataset.completedId;

  if (action === "select-page" && pageId) {
    editingPageId = null;
    updateData(setActivePage(data, pageId));
    return;
  }

  if (action === "add-page") {
    const next = addPage(data, `Page ${data.pages.length + 1}`);
    editingPageId = next.activePageId;
    updateData(next);
    window.setTimeout(() => {
      app.querySelector<HTMLInputElement>(".page-title-input")?.select();
    });
    return;
  }

  if (action === "rename-page") {
    editingPageId = data.activePageId;
    render();
    window.setTimeout(() => {
      app.querySelector<HTMLInputElement>(".page-title-input")?.select();
    });
    return;
  }

  if (action === "delete-page") {
    updateData(deletePage(data, data.activePageId));
    return;
  }

  if (action === "start-edit" && todoId) {
    editingTodoId = todoId;
    render();
    app.querySelector<HTMLInputElement>(".edit-input")?.focus();
    return;
  }

  if (action === "complete" && pageId && todoId) {
    updateData(completeTodo(data, pageId, todoId));
    return;
  }

  if (action === "delete-completed" && pageId && completedId) {
    updateData(deleteCompleted(data, pageId, completedId));
    return;
  }

  if (action === "compact") {
    const size = await readCurrentWindowSize();
    updateData(setCompactState(data, true, size));
    await enterCompactWindow();
    return;
  }

  if (action === "expand") {
    const size = data.expandedWindowSize ?? { width: 420, height: 560 };
    updateData(setCompactState(data, false));
    await restoreExpandedWindow(size);
  }
};

app.addEventListener("click", (event) => {
  const button = buttonTarget(event.target);
  if (!button) {
    return;
  }
  void handleAction(button);
});

app.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || form.dataset.action !== "add-todo-form") {
    return;
  }

  const input = form.elements.namedItem("todo");
  if (!(input instanceof HTMLInputElement)) {
    return;
  }

  updateData(addTodo(data, input.value));
  input.value = "";
  input.focus();
});

app.addEventListener("focusout", (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) {
    return;
  }

  if (input.dataset.action === "edit-input") {
    editingTodoId = null;
    updateData(
      updateTodo(data, input.dataset.pageId ?? "", input.dataset.todoId ?? "", input.value)
    );
  }

  if (input.dataset.action === "page-title-input") {
    editingPageId = null;
    updateData(renamePage(data, input.dataset.pageId ?? "", input.value));
  }
});

app.addEventListener("keydown", (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) {
    return;
  }

  const isEditingField =
    input.dataset.action === "edit-input" || input.dataset.action === "page-title-input";

  if (event.key === "Enter" && isEditingField) {
    input.blur();
  }

  if (event.key === "Escape" && input.dataset.action === "edit-input") {
    editingTodoId = null;
    render();
  }

  if (event.key === "Escape" && input.dataset.action === "page-title-input") {
    editingPageId = null;
    render();
  }
});

app.addEventListener("dragstart", (event) => {
  const row = event.target instanceof Element ? event.target.closest<HTMLElement>(".todo-row") : null;
  if (!row || row.dataset.dragIndex === undefined) {
    return;
  }

  draggedIndex = Number(row.dataset.dragIndex);
  row.classList.add("is-dragging");
  event.dataTransfer?.setData("text/plain", row.dataset.dragIndex);
  event.dataTransfer?.setDragImage(row, 16, 16);
});

app.addEventListener("dragend", (event) => {
  const row = event.target instanceof Element ? event.target.closest<HTMLElement>(".todo-row") : null;
  row?.classList.remove("is-dragging");
  draggedIndex = null;
});

app.addEventListener("dragover", (event) => {
  if (draggedIndex !== null) {
    event.preventDefault();
  }
});

app.addEventListener("drop", (event) => {
  const row = event.target instanceof Element ? event.target.closest<HTMLElement>(".todo-row") : null;
  if (!row || draggedIndex === null || row.dataset.dragIndex === undefined) {
    return;
  }

  event.preventDefault();
  const targetIndex = Number(row.dataset.dragIndex);
  updateData(reorderTodo(data, data.activePageId, draggedIndex, targetIndex));
});

app.addEventListener("pointerdown", (event) => {
  const target = event.target;
  if (!(target instanceof Element) || !target.closest("[data-drag-region]")) {
    return;
  }

  if (target.closest("button, input")) {
    return;
  }

  void startNativeDrag();
});

const bootstrap = async (): Promise<void> => {
  try {
    const loaded = await loadPersistedData();
    data = ensureValidData(loaded);
    statusText = "Ready";
  } catch (error) {
    data = createDefaultData();
    statusText = error instanceof Error ? error.message : "Loaded default note";
  }

  render();
};

void bootstrap();
