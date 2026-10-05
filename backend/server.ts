import "dotenv/config";
import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import { Server } from "socket.io";

const port = Number(process.env.PORT) || 4000;
const allowedOrigins = ["http://localhost:3000", "http://127.0.0.1:3000"];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

const app = express();
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "30mb" }));

const prisma = process.env.DATABASE_URL ? new PrismaClient() : null;
const boardWriteQueues = new Map<string, Promise<void>>();

function getDatabase() {
  if (!prisma) throw new Error("DATABASE_URL is not configured");
  return prisma;
}

function isBoardId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function createEmptyDocument() {
  return {
    type: "sketchflow-document",
    version: 1,
    name: "Untitled board",
    canvasSettings: {
      backgroundColor: "#f8fafc",
      backgroundMode: "theme-default",
      showGrid: false,
      gridSize: 16,
      snapSettings: { enabled: true, gridEnabled: false, gridSize: 16, threshold: 6 },
    },
    strokes: [],
    elements: [],
    groups: [],
    creationOrder: [],
  };
}

app.post("/api/boards", async (_request, response) => {
  try {
    const id = randomUUID();
    const document = createEmptyDocument();
    const board = await getDatabase().board.create({ data: { id, name: document.name, document } });
    response.status(201).json({ board: { id: board.id, name: board.name }, path: `/board?boardId=${encodeURIComponent(board.id)}` });
  } catch (error) {
    console.error("Board creation failed:", error);
    response.status(503).json({ error: "Board storage is unavailable" });
  }
});

app.get("/api/boards/:boardId", async (request, response) => {
  if (!isBoardId(request.params.boardId)) {
    response.status(404).json({ error: "Board not found" });
    return;
  }
  try {
    const board = await getDatabase().board.findUnique({ where: { id: request.params.boardId } });
    if (!board) {
      response.status(404).json({ error: "Board not found" });
      return;
    }
    response.json({ board: { id: board.id, name: board.name, document: board.document } });
  } catch (error) {
    console.error("Board load failed:", error);
    response.status(503).json({ error: "Board storage is unavailable" });
  }
});

app.patch("/api/boards/:boardId", async (request, response) => {
  if (!isBoardId(request.params.boardId) || typeof request.body?.name !== "string") {
    response.status(400).json({ error: "A valid board ID and name are required" });
    return;
  }
  const name = request.body.name.trim();
  if (!name || name.length > 120) {
    response.status(400).json({ error: "Board name must contain 1 to 120 characters" });
    return;
  }
  try {
    const db = getDatabase();
    const board = await db.board.findUnique({ where: { id: request.params.boardId } });
    if (!board) {
      response.status(404).json({ error: "Board not found" });
      return;
    }
    const document = typeof board.document === "object" && board.document !== null && !Array.isArray(board.document)
      ? { ...board.document, name }
      : createEmptyDocument();
    await db.board.update({ where: { id: board.id }, data: { name, document } });
    response.json({ board: { id: board.id, name } });
  } catch (error) {
    console.error("Board rename failed:", error);
    response.status(503).json({ error: "Board storage is unavailable" });
  }
});

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: allowedOrigins },
  maxHttpBufferSize: 30 * 1024 * 1024,
});

function boardRoom(boardId: string) {
  return `board:${boardId}`;
}

function enqueueBoardWrite(boardId: string, update: (document: Record<string, unknown>) => void) {
  const previous = boardWriteQueues.get(boardId) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(async () => {
    const db = getDatabase();
    const board = await db.board.findUnique({ where: { id: boardId } });
    if (!board || typeof board.document !== "object" || board.document === null || Array.isArray(board.document)) return;
    const document = structuredClone(board.document) as Record<string, unknown>;
    update(document);
    await db.board.update({ where: { id: boardId }, data: { document: document as Prisma.InputJsonValue } });
  });
  boardWriteQueues.set(boardId, next);
  void next.then(
    () => { if (boardWriteQueues.get(boardId) === next) boardWriteQueues.delete(boardId); },
    () => { if (boardWriteQueues.get(boardId) === next) boardWriteQueues.delete(boardId); },
  );
  return next;
}

function persistSocketEvent(
  socket: import("socket.io").Socket,
  boardId: string,
  update: (document: Record<string, unknown>) => void,
  event: string,
  payload: Record<string, unknown>,
) {
  void enqueueBoardWrite(boardId, update).then(() => {
    socket.to(boardRoom(boardId)).emit(event, payload);
  }).catch((error: unknown) => {
    console.error("Board change persistence failed:", error);
    socket.emit("board-persistence-error", { boardId });
  });
}

function documentArray(document: Record<string, unknown>, key: string): unknown[] {
  if (!Array.isArray(document[key])) document[key] = [];
  return document[key] as unknown[];
}

type PresenceUser = { userId: string; displayName: string; color: string };
type Viewport = { offsetX: number; offsetY: number; scale: number };
type ConnectedPresenceUser = {
  socketId: string;
  user: PresenceUser;
  selectedElementIds: string[];
  viewport?: Viewport;
};
const boardUsers = new Map<string, Map<string, ConnectedPresenceUser>>();

function getBoardId(payload: unknown): string | undefined {
  if (typeof payload !== "object" || payload === null || !("boardId" in payload)) {
    return undefined;
  }

  const boardId = payload.boardId;
  if (typeof boardId !== "string") return undefined;
  const normalizedBoardId = boardId.trim();
  return isBoardId(normalizedBoardId) ? normalizedBoardId : undefined;
}

function getPresenceUser(payload: unknown): PresenceUser | undefined {
  if (typeof payload !== "object" || payload === null || !("user" in payload)) return undefined;
  const user = payload.user;
  if (typeof user !== "object" || user === null) return undefined;
  if (!("userId" in user) || !("displayName" in user) || !("color" in user)) return undefined;
  if (typeof user.userId !== "string" || user.userId.length < 1 || user.userId.length > 80) return undefined;
  if (typeof user.displayName !== "string" || user.displayName.trim().length < 1 || user.displayName.length > 32) return undefined;
  if (typeof user.color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(user.color)) return undefined;
  return { userId: user.userId, displayName: user.displayName.trim(), color: user.color };
}

function getCursor(payload: unknown): { userId: string; x: number; y: number } | undefined {
  if (typeof payload !== "object" || payload === null) return undefined;
  if (!("userId" in payload) || !("x" in payload) || !("y" in payload)) return undefined;
  if (typeof payload.userId !== "string" || !payload.userId) return undefined;
  if (typeof payload.x !== "number" || !Number.isFinite(payload.x) || Math.abs(payload.x) > 1_000_000) return undefined;
  if (typeof payload.y !== "number" || !Number.isFinite(payload.y) || Math.abs(payload.y) > 1_000_000) return undefined;
  return { userId: payload.userId, x: payload.x, y: payload.y };
}

function getSelectionChange(payload: unknown): { userId: string; selectedElementIds: string[] } | undefined {
  if (typeof payload !== "object" || payload === null) return undefined;
  if (!("userId" in payload) || typeof payload.userId !== "string" || !payload.userId) return undefined;
  if (!("selectedElementIds" in payload) || !Array.isArray(payload.selectedElementIds)) return undefined;
  if (payload.selectedElementIds.length > 500
    || !payload.selectedElementIds.every((id) => typeof id === "string" && id.length > 0 && id.length <= 128)) {
    return undefined;
  }
  return { userId: payload.userId, selectedElementIds: [...new Set(payload.selectedElementIds)] };
}

function getViewportChange(payload: unknown): { userId: string; viewport: Viewport } | undefined {
  if (typeof payload !== "object" || payload === null) return undefined;
  if (!("userId" in payload) || typeof payload.userId !== "string" || !payload.userId) return undefined;
  if (!("viewport" in payload) || typeof payload.viewport !== "object" || payload.viewport === null) return undefined;
  const viewport = payload.viewport;
  if (!("offsetX" in viewport) || typeof viewport.offsetX !== "number" || !Number.isFinite(viewport.offsetX)) return undefined;
  if (!("offsetY" in viewport) || typeof viewport.offsetY !== "number" || !Number.isFinite(viewport.offsetY)) return undefined;
  if (!("scale" in viewport) || typeof viewport.scale !== "number" || !Number.isFinite(viewport.scale)) return undefined;
  if (Math.abs(viewport.offsetX) > 1_000_000 || Math.abs(viewport.offsetY) > 1_000_000) return undefined;
  if (viewport.scale < 0.25 || viewport.scale > 4) return undefined;
  return {
    userId: payload.userId,
    viewport: { offsetX: viewport.offsetX, offsetY: viewport.offsetY, scale: viewport.scale },
  };
}

function getElement(payload: unknown): object | undefined {
  if (typeof payload !== "object" || payload === null || !("element" in payload)) {
    return undefined;
  }

  const element = payload.element;
  if (typeof element !== "object" || element === null || !("id" in element) || typeof element.id !== "string") {
    return undefined;
  }

  return element;
}

function getElementId(payload: unknown): string | undefined {
  if (typeof payload !== "object" || payload === null || !("elementId" in payload)) {
    return undefined;
  }

  return typeof payload.elementId === "string" && payload.elementId ? payload.elementId : undefined;
}

function getStroke(payload: unknown): unknown[] | undefined {
  if (typeof payload !== "object" || payload === null || !("stroke" in payload) || !Array.isArray(payload.stroke)) {
    return undefined;
  }

  const stroke = payload.stroke;
  if (stroke.length === 0 || !stroke.every((point) =>
    typeof point === "object"
    && point !== null
    && "x" in point
    && typeof point.x === "number"
    && Number.isFinite(point.x)
    && "y" in point
    && typeof point.y === "number"
    && Number.isFinite(point.y)
  )) {
    return undefined;
  }

  return stroke;
}

function getStrokeOrder(payload: unknown): { strokeIndex?: number; creationOrderIndex?: number } | undefined {
  if (typeof payload !== "object" || payload === null) return undefined;
  const strokePayload = payload as Record<string, unknown>;
  const order: { strokeIndex?: number; creationOrderIndex?: number } = {};
  for (const key of ["strokeIndex", "creationOrderIndex"] as const) {
    if (!(key in strokePayload) || strokePayload[key] === undefined) continue;
    const value = strokePayload[key];
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || value > 100_000) return undefined;
    order[key] = value;
  }
  return order;
}

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);
  const socketUserIds = new Map<string, string>();

  const removeSocketPresence = (boardId: string) => {
    const userId = socketUserIds.get(boardId);
    if (!userId) return;
    socketUserIds.delete(boardId);
    const users = boardUsers.get(boardId);
    const current = users?.get(userId);
    if (current?.socketId !== socket.id) return;
    users?.delete(userId);
    socket.to(boardRoom(boardId)).emit("user-left", { boardId, userId });
    if (users?.size === 0) boardUsers.delete(boardId);
  };

  socket.on("join-board", (payload: unknown) => {
    const boardId = getBoardId(payload);
    const user = getPresenceUser(payload);
    if (!boardId || !user) return;

    const previousUserId = socketUserIds.get(boardId);
    if (previousUserId === user.userId) return;
    if (previousUserId) removeSocketPresence(boardId);

    const users = boardUsers.get(boardId) ?? new Map<string, ConnectedPresenceUser>();
    const existingUsers = [...users.values()].filter((entry) => entry.user.userId !== user.userId);
    const duplicate = users.get(user.userId);
    if (duplicate && duplicate.socketId !== socket.id) {
      socket.to(boardRoom(boardId)).emit("user-left", { boardId, userId: user.userId });
    }

    socket.join(boardRoom(boardId));
    users.set(user.userId, { socketId: socket.id, user, selectedElementIds: [] });
    boardUsers.set(boardId, users);
    socketUserIds.set(boardId, user.userId);

    existingUsers.forEach((entry) => {
      socket.emit("user-presence", { boardId, user: entry.user });
      if (entry.selectedElementIds.length > 0) {
        socket.emit("selection-changed", {
          boardId,
          userId: entry.user.userId,
          selectedElementIds: entry.selectedElementIds,
        });
      }
      if (entry.viewport) {
        socket.emit("viewport-changed", {
          boardId,
          userId: entry.user.userId,
          viewport: entry.viewport,
        });
      }
    });
    socket.to(boardRoom(boardId)).emit("user-presence", { boardId, user });
  });

  socket.on("leave-board", (payload: unknown) => {
    const boardId = getBoardId(payload);
    if (!boardId || !socket.rooms.has(boardRoom(boardId))) return;

    removeSocketPresence(boardId);
    socket.leave(boardRoom(boardId));
  });

  socket.on("cursor-moved", (payload: unknown) => {
    const boardId = getBoardId(payload);
    const cursor = getCursor(payload);
    if (!boardId || !cursor || !socket.rooms.has(boardRoom(boardId))) return;
    if (socketUserIds.get(boardId) !== cursor.userId) return;
    const activePresence = boardUsers.get(boardId)?.get(cursor.userId);
    if (activePresence?.socketId !== socket.id) return;

    socket.to(boardRoom(boardId)).emit("cursor-moved", { boardId, ...cursor });
  });

  socket.on("selection-changed", (payload: unknown) => {
    const boardId = getBoardId(payload);
    const selection = getSelectionChange(payload);
    if (!boardId || !selection || !socket.rooms.has(boardRoom(boardId))) return;
    if (socketUserIds.get(boardId) !== selection.userId) return;
    const activePresence = boardUsers.get(boardId)?.get(selection.userId);
    if (activePresence?.socketId !== socket.id) return;

    activePresence.selectedElementIds = selection.selectedElementIds;
    socket.to(boardRoom(boardId)).emit("selection-changed", { boardId, ...selection });
  });

  socket.on("viewport-changed", (payload: unknown) => {
    const boardId = getBoardId(payload);
    const update = getViewportChange(payload);
    if (!boardId || !update || !socket.rooms.has(boardRoom(boardId))) return;
    if (socketUserIds.get(boardId) !== update.userId) return;
    const activePresence = boardUsers.get(boardId)?.get(update.userId);
    if (activePresence?.socketId !== socket.id) return;

    activePresence.viewport = update.viewport;
    socket.to(boardRoom(boardId)).emit("viewport-changed", { boardId, ...update });
  });

  socket.on("element-created", (payload: unknown) => {
    const boardId = getBoardId(payload);
    const element = getElement(payload);
    if (!boardId || !element || !socket.rooms.has(boardRoom(boardId))) return;

    const entry = element as Record<string, unknown>;
    persistSocketEvent(socket, boardId, (document) => {
      const elements = documentArray(document, "elements");
      if (elements.some((item) => typeof item === "object" && item !== null && "id" in item && item.id === entry.id)) return;
      elements.push(entry);
      documentArray(document, "creationOrder").push({ kind: "element", id: entry.id });
    }, "element-created", { boardId, element });
  });

  socket.on("element-updated", (payload: unknown) => {
    const boardId = getBoardId(payload);
    const element = getElement(payload);
    if (!boardId || !element || !socket.rooms.has(boardRoom(boardId))) return;

    const entry = element as Record<string, unknown>;
    persistSocketEvent(socket, boardId, (document) => {
      const elements = documentArray(document, "elements");
      const index = elements.findIndex((item) => typeof item === "object" && item !== null && "id" in item && item.id === entry.id);
      if (index >= 0) elements[index] = entry;
    }, "element-updated", { boardId, element });
  });

  socket.on("element-deleted", (payload: unknown) => {
    const boardId = getBoardId(payload);
    const elementId = getElementId(payload);
    if (!boardId || !elementId || !socket.rooms.has(boardRoom(boardId))) return;

    persistSocketEvent(socket, boardId, (document) => {
      document.elements = documentArray(document, "elements").filter((item) =>
        !(typeof item === "object" && item !== null && "id" in item && item.id === elementId));
      document.groups = documentArray(document, "groups").flatMap((item) => {
        if (typeof item !== "object" || item === null || !("elementIds" in item) || !Array.isArray(item.elementIds)) return [item];
        const group = { ...item, elementIds: item.elementIds.filter((id) => id !== elementId) };
        return group.elementIds.length > 0 ? [group] : [];
      });
      document.creationOrder = documentArray(document, "creationOrder").filter((item) =>
        !(typeof item === "object" && item !== null && "kind" in item && item.kind === "element" && "id" in item && item.id === elementId));
    }, "element-deleted", { boardId, elementId });
  });

  socket.on("freehand-created", (payload: unknown) => {
    const boardId = getBoardId(payload);
    const stroke = getStroke(payload);
    const order = getStrokeOrder(payload);
    if (!boardId || !stroke || !order || !socket.rooms.has(boardRoom(boardId))) return;

    persistSocketEvent(socket, boardId, (document) => {
      const strokes = documentArray(document, "strokes");
      const creationOrder = documentArray(document, "creationOrder");
      const strokeIndex = Math.min(order.strokeIndex ?? strokes.length, strokes.length);
      strokes.splice(strokeIndex, 0, stroke);
      creationOrder.forEach((item) => {
        if (typeof item === "object" && item !== null && "kind" in item && item.kind === "stroke" && "index" in item && typeof item.index === "number" && item.index >= strokeIndex) item.index += 1;
      });
      const creationOrderIndex = Math.min(order.creationOrderIndex ?? creationOrder.length, creationOrder.length);
      creationOrder.splice(creationOrderIndex, 0, { kind: "stroke", index: strokeIndex });
    }, "freehand-created", { boardId, stroke, ...order });
  });

  socket.on("freehand-deleted", (payload: unknown) => {
    const boardId = getBoardId(payload);
    const stroke = getStroke(payload);
    const order = getStrokeOrder(payload);
    if (!boardId || !stroke || !order || !socket.rooms.has(boardRoom(boardId))) return;

    persistSocketEvent(socket, boardId, (document) => {
      const strokes = documentArray(document, "strokes");
      const target = order.strokeIndex !== undefined && order.strokeIndex < strokes.length
        ? order.strokeIndex
        : strokes.findIndex((item) => JSON.stringify(item) === JSON.stringify(stroke));
      if (target < 0 || target >= strokes.length) return;
      strokes.splice(target, 1);
      document.creationOrder = documentArray(document, "creationOrder").flatMap((item) => {
        if (typeof item !== "object" || item === null || !("kind" in item) || item.kind !== "stroke" || !("index" in item) || typeof item.index !== "number") return [item];
        if (item.index === target) return [];
        return [{ ...item, index: item.index > target ? item.index - 1 : item.index }];
      });
    }, "freehand-deleted", { boardId, stroke, ...order });
  });

  socket.on("text-content-updated", (payload: unknown) => {
    const boardId = getBoardId(payload);
    if (typeof payload !== "object" || payload === null) return;
    if (!("elementId" in payload) || typeof payload.elementId !== "string" || !payload.elementId) return;
    if (!("text" in payload) || typeof payload.text !== "string") return;
    if (!boardId || !socket.rooms.has(boardRoom(boardId))) return;

    persistSocketEvent(socket, boardId, (document) => {
      const element = documentArray(document, "elements").find((item) =>
        typeof item === "object" && item !== null && "id" in item && item.id === payload.elementId);
      if (typeof element === "object" && element !== null && "type" in element && element.type === "text") {
        (element as Record<string, unknown>).text = payload.text;
      }
    }, "text-content-updated", {
      boardId,
      elementId: payload.elementId,
      text: payload.text,
    });
  });

  socket.on("canvas-settings-updated", (payload: unknown) => {
    const boardId = getBoardId(payload);
    if (!boardId || !socket.rooms.has(boardRoom(boardId)) || typeof payload !== "object" || payload === null || !("canvasSettings" in payload)) return;
    const settings = payload.canvasSettings;
    if (typeof settings !== "object" || settings === null || Array.isArray(settings)) return;
    persistSocketEvent(socket, boardId, (document) => { document.canvasSettings = settings; }, "canvas-settings-updated", { boardId, canvasSettings: settings });
  });

  socket.on("disconnecting", () => {
    for (const room of socket.rooms) {
      if (room.startsWith("board:")) {
        removeSocketPresence(room.slice("board:".length));
      }
    }
  });

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

httpServer.listen(port, "0.0.0.0", () => {
  console.log(`SketchFlow backend listening on port ${port}`);
});
