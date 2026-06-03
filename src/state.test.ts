import { describe, expect, it } from "vitest";
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
  restoreCompleted,
  setCompletedVisible,
  updateTodo
} from "./state";

const clock = (() => {
  let time = 1000;
  return () => {
    time += 10;
    return time;
  };
})();

describe("desk note state", () => {
  it("creates a default data set with one active page", () => {
    const data = createDefaultData();

    expect(data.version).toBe(1);
    expect(data.pages).toHaveLength(1);
    expect(data.activePageId).toBe(data.pages[0].id);
    expect(data.pages[0].title).toBe("Todos");
    expect(data.completedVisible).toBe(false);
  });

  it("adds and renames pages while keeping the new page active", () => {
    const data = addPage(createDefaultData(), "Work");
    const renamed = renamePage(data, data.activePageId, "Client Tasks");

    expect(getActivePage(renamed).title).toBe("Client Tasks");
    expect(renamed.pages).toHaveLength(2);
  });

  it("adds, edits, and completes a todo into the completed list", () => {
    const withTodo = addTodo(createDefaultData(), "  Draft proposal  ", clock);
    const page = getActivePage(withTodo);
    const edited = updateTodo(withTodo, page.id, page.todos[0].id, "Send proposal");
    const completed = completeTodo(edited, page.id, page.todos[0].id, clock);
    const activePage = getActivePage(completed);

    expect(activePage.todos).toHaveLength(0);
    expect(activePage.completed).toHaveLength(1);
    expect(activePage.completed[0].text).toBe("Send proposal");
    expect(activePage.completed[0].completedAt).toBeGreaterThan(activePage.completed[0].createdAt);
  });

  it("ignores empty todo text", () => {
    const data = addTodo(createDefaultData(), "   ", clock);

    expect(getActivePage(data).todos).toHaveLength(0);
  });

  it("permanently deletes completed items", () => {
    const withTodo = addTodo(createDefaultData(), "Archive invoice", clock);
    const todoId = getActivePage(withTodo).todos[0].id;
    const completed = completeTodo(withTodo, withTodo.activePageId, todoId, clock);
    const completedId = getActivePage(completed).completed[0].id;
    const deleted = deleteCompleted(completed, completed.activePageId, completedId);

    expect(getActivePage(deleted).completed).toHaveLength(0);
  });

  it("restores completed items to the active todo list", () => {
    const withTodo = addTodo(createDefaultData(), "Follow up", clock);
    const todoId = getActivePage(withTodo).todos[0].id;
    const completed = completeTodo(withTodo, withTodo.activePageId, todoId, clock);
    const completedId = getActivePage(completed).completed[0].id;
    const restored = restoreCompleted(completed, completed.activePageId, completedId);
    const activePage = getActivePage(restored);

    expect(activePage.completed).toHaveLength(0);
    expect(activePage.todos).toHaveLength(1);
    expect(activePage.todos[0].text).toBe("Follow up");
  });

  it("toggles completed visibility without changing todos", () => {
    const withTodo = addTodo(createDefaultData(), "Keep visibility separate", clock);
    const shown = setCompletedVisible(withTodo, true);
    const hidden = setCompletedVisible(shown, false);

    expect(shown.completedVisible).toBe(true);
    expect(hidden.completedVisible).toBe(false);
    expect(getActivePage(hidden).todos).toEqual(getActivePage(withTodo).todos);
  });

  it("reorders active todos by drag source and target index", () => {
    let data = createDefaultData();
    data = addTodo(data, "One", clock);
    data = addTodo(data, "Two", clock);
    data = addTodo(data, "Three", clock);

    const reordered = reorderTodo(data, data.activePageId, 2, 0);

    expect(getActivePage(reordered).todos.map((todo) => todo.text)).toEqual([
      "Three",
      "One",
      "Two"
    ]);
  });

  it("keeps one page available when deleting the last page", () => {
    const data = createDefaultData();
    const deleted = deletePage(data, data.activePageId);

    expect(deleted.pages).toHaveLength(1);
    expect(getActivePage(deleted).todos).toHaveLength(0);
    expect(getActivePage(deleted).completed).toHaveLength(0);
  });

  it("moves active selection to an existing page when deleting the active page", () => {
    const data = addPage(createDefaultData(), "Personal");
    const originalPageId = data.pages[0].id;
    const deleted = deletePage(data, data.activePageId);

    expect(deleted.activePageId).toBe(originalPageId);
    expect(deleted.pages).toHaveLength(1);
  });

  it("sanitizes invalid loaded data into a usable default", () => {
    const data = ensureValidData({
      version: 1,
      activePageId: "missing",
      pages: [
        {
          id: "page-1",
          title: "",
          todos: [{ id: "todo-1", text: "  Keep me  ", createdAt: "bad" }],
          completed: "bad"
        }
      ]
    });

    expect(data.activePageId).toBe("page-1");
    expect(data.pages[0].title).toBe("Untitled");
    expect(data.pages[0].todos[0].text).toBe("Keep me");
    expect(data.pages[0].completed).toEqual([]);
    expect(data.completedVisible).toBe(false);
  });
});
