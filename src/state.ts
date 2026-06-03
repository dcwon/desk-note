export type TodoItem = {
  id: string;
  text: string;
  createdAt: number;
};

export type CompletedItem = TodoItem & {
  completedAt: number;
};

export type TodoPage = {
  id: string;
  title: string;
  todos: TodoItem[];
  completed: CompletedItem[];
};

export type WindowSize = {
  width: number;
  height: number;
};

export type DeskNoteData = {
  version: 1;
  activePageId: string;
  pages: TodoPage[];
  expandedWindowSize?: WindowSize;
  compact: boolean;
  completedVisible: boolean;
};

type Clock = () => number;

let idSeed = 0;

const now: Clock = () => Date.now();

const createId = (prefix: string): string => {
  idSeed += 1;
  return `${prefix}-${Date.now().toString(36)}-${idSeed.toString(36)}`;
};

const defaultPage = (): TodoPage => ({
  id: createId("page"),
  title: "Todos",
  todos: [],
  completed: []
});

export const createDefaultData = (): DeskNoteData => {
  const page = defaultPage();
  return {
    version: 1,
    activePageId: page.id,
    pages: [page],
    compact: false,
    completedVisible: false
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const cleanText = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
};

const cleanTimestamp = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  return now();
};

const sanitizeTodo = (value: unknown): TodoItem | null => {
  if (!isRecord(value)) {
    return null;
  }

  const text = cleanText(value.text);
  if (!text) {
    return null;
  }

  return {
    id: cleanText(value.id) || createId("todo"),
    text,
    createdAt: cleanTimestamp(value.createdAt)
  };
};

const sanitizeCompleted = (value: unknown): CompletedItem | null => {
  const todo = sanitizeTodo(value);
  if (!todo || !isRecord(value)) {
    return null;
  }

  return {
    ...todo,
    completedAt: cleanTimestamp(value.completedAt)
  };
};

const sanitizePage = (value: unknown, index: number): TodoPage | null => {
  if (!isRecord(value)) {
    return null;
  }

  const todos = Array.isArray(value.todos)
    ? value.todos.map(sanitizeTodo).filter((todo): todo is TodoItem => Boolean(todo))
    : [];
  const completed = Array.isArray(value.completed)
    ? value.completed
        .map(sanitizeCompleted)
        .filter((item): item is CompletedItem => Boolean(item))
    : [];

  return {
    id: cleanText(value.id) || createId("page"),
    title: cleanText(value.title) || (index === 0 ? "Untitled" : `Page ${index + 1}`),
    todos,
    completed
  };
};

const sanitizeSize = (value: unknown): WindowSize | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const width = value.width;
  const height = value.height;
  if (
    typeof width !== "number" ||
    typeof height !== "number" ||
    !Number.isFinite(width) ||
    !Number.isFinite(height)
  ) {
    return undefined;
  }

  return {
    width: Math.max(280, Math.round(width)),
    height: Math.max(92, Math.round(height))
  };
};

export const ensureValidData = (input: unknown): DeskNoteData => {
  if (!isRecord(input)) {
    return createDefaultData();
  }

  const pages = Array.isArray(input.pages)
    ? input.pages.map(sanitizePage).filter((page): page is TodoPage => Boolean(page))
    : [];

  if (pages.length === 0) {
    return createDefaultData();
  }

  const requestedActiveId = cleanText(input.activePageId);
  const activePageId = pages.some((page) => page.id === requestedActiveId)
    ? requestedActiveId
    : pages[0].id;

  return {
    version: 1,
    activePageId,
    pages,
    expandedWindowSize: sanitizeSize(input.expandedWindowSize),
    compact: Boolean(input.compact),
    completedVisible: Boolean(input.completedVisible)
  };
};

export const getActivePage = (data: DeskNoteData): TodoPage => {
  return data.pages.find((page) => page.id === data.activePageId) ?? data.pages[0];
};

const updatePage = (
  data: DeskNoteData,
  pageId: string,
  updater: (page: TodoPage) => TodoPage
): DeskNoteData => ({
  ...data,
  pages: data.pages.map((page) => (page.id === pageId ? updater(page) : page))
});

export const addPage = (data: DeskNoteData, rawTitle: string): DeskNoteData => {
  const title = rawTitle.trim() || `Page ${data.pages.length + 1}`;
  const page: TodoPage = {
    id: createId("page"),
    title,
    todos: [],
    completed: []
  };

  return {
    ...data,
    activePageId: page.id,
    pages: [...data.pages, page]
  };
};

export const renamePage = (
  data: DeskNoteData,
  pageId: string,
  rawTitle: string
): DeskNoteData => {
  const title = rawTitle.trim();
  if (!title) {
    return data;
  }

  return updatePage(data, pageId, (page) => ({ ...page, title }));
};

export const deletePage = (data: DeskNoteData, pageId: string): DeskNoteData => {
  if (data.pages.length <= 1) {
    const clearedPage: TodoPage = {
      ...data.pages[0],
      title: data.pages[0].title.trim() || "Todos",
      todos: [],
      completed: []
    };
    return {
      ...data,
      activePageId: clearedPage.id,
      pages: [clearedPage]
    };
  }

  const pages = data.pages.filter((page) => page.id !== pageId);
  const activePageId =
    data.activePageId === pageId ? pages[0].id : data.activePageId;

  return {
    ...data,
    activePageId,
    pages
  };
};

export const addTodo = (
  data: DeskNoteData,
  rawText: string,
  clock: Clock = now
): DeskNoteData => {
  const text = rawText.trim();
  if (!text) {
    return data;
  }

  const todo: TodoItem = {
    id: createId("todo"),
    text,
    createdAt: clock()
  };

  return updatePage(data, data.activePageId, (page) => ({
    ...page,
    todos: [...page.todos, todo]
  }));
};

export const updateTodo = (
  data: DeskNoteData,
  pageId: string,
  todoId: string,
  rawText: string
): DeskNoteData => {
  const text = rawText.trim();
  if (!text) {
    return data;
  }

  return updatePage(data, pageId, (page) => ({
    ...page,
    todos: page.todos.map((todo) => (todo.id === todoId ? { ...todo, text } : todo))
  }));
};

export const completeTodo = (
  data: DeskNoteData,
  pageId: string,
  todoId: string,
  clock: Clock = now
): DeskNoteData => {
  return updatePage(data, pageId, (page) => {
    const todo = page.todos.find((item) => item.id === todoId);
    if (!todo) {
      return page;
    }

    return {
      ...page,
      todos: page.todos.filter((item) => item.id !== todoId),
      completed: [{ ...todo, completedAt: clock() }, ...page.completed]
    };
  });
};

export const deleteCompleted = (
  data: DeskNoteData,
  pageId: string,
  completedId: string
): DeskNoteData => {
  return updatePage(data, pageId, (page) => ({
    ...page,
    completed: page.completed.filter((item) => item.id !== completedId)
  }));
};

export const restoreCompleted = (
  data: DeskNoteData,
  pageId: string,
  completedId: string
): DeskNoteData => {
  return updatePage(data, pageId, (page) => {
    const completed = page.completed.find((item) => item.id === completedId);
    if (!completed) {
      return page;
    }

    const { completedAt: _completedAt, ...todo } = completed;
    return {
      ...page,
      todos: [...page.todos, todo],
      completed: page.completed.filter((item) => item.id !== completedId)
    };
  });
};

export const reorderTodo = (
  data: DeskNoteData,
  pageId: string,
  fromIndex: number,
  toIndex: number
): DeskNoteData => {
  return updatePage(data, pageId, (page) => {
    const lastIndex = page.todos.length - 1;
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex > lastIndex ||
      toIndex > lastIndex ||
      fromIndex === toIndex
    ) {
      return page;
    }

    const todos = [...page.todos];
    const [moved] = todos.splice(fromIndex, 1);
    todos.splice(toIndex, 0, moved);
    return { ...page, todos };
  });
};

export const setActivePage = (data: DeskNoteData, pageId: string): DeskNoteData => {
  if (!data.pages.some((page) => page.id === pageId)) {
    return data;
  }

  return {
    ...data,
    activePageId: pageId
  };
};

export const setCompactState = (
  data: DeskNoteData,
  compact: boolean,
  expandedWindowSize?: WindowSize
): DeskNoteData => ({
  ...data,
  compact,
  expandedWindowSize: expandedWindowSize ?? data.expandedWindowSize
});

export const setCompletedVisible = (
  data: DeskNoteData,
  completedVisible: boolean
): DeskNoteData => ({
  ...data,
  completedVisible
});
