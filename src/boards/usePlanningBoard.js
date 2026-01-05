import { useCallback, useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import {
  aiGenerateBoard,
  aiImportFromImage,
  createBoard,
  createSnapshot,
} from "../lib/uiBuilderApi";

const DEFAULT_CANVAS = { w: 1280, h: 720 };
const DEFAULT_THEME = {
  bg: "#020617",
  panel: "rgba(2,6,23,0.65)",
  border: "rgba(148,163,184,0.25)",
  text: "#e5e7eb",
  primary: "#3b82f6",
  radius: "12px",
  font: "system-ui",
};

function ensureCanvasSize(canvasSize) {
  if (
    canvasSize &&
    typeof canvasSize === "object" &&
    Number.isFinite(Number(canvasSize.w)) &&
    Number.isFinite(Number(canvasSize.h))
  ) {
    return { w: Number(canvasSize.w), h: Number(canvasSize.h) };
  }
  return DEFAULT_CANVAS;
}

export function usePlanningBoard(initialBoardId = null) {
  const [boardId, setBoardId] = useState(initialBoardId || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setBoardId(initialBoardId || null);
  }, [initialBoardId]);

  const getToken = useCallback(async () => {
    const user = getAuth().currentUser;
    if (!user) throw new Error("Not authenticated");
    return user.getIdToken();
  }, []);

  const initBoard = useCallback(
    async ({ title, canvasSize = DEFAULT_CANVAS, settings = {} }) => {
      setLoading(true);
      try {
        const token = await getToken();
        const res = await createBoard({
          token,
          title,
          canvasSize: ensureCanvasSize(canvasSize),
          settings: settings || {},
        });
        const id = res?.boardId || res?.board?.id || null;
        if (id) setBoardId(id);
        return res;
      } finally {
        setLoading(false);
      }
    },
    [getToken]
  );

  const generateWithAI = useCallback(
    async ({
      prompt,
      canvasSize = DEFAULT_CANVAS,
      themeHint = DEFAULT_THEME,
      mode = "overwrite",
      maxItems = 40,
    }) => {
      setLoading(true);
      try {
        const token = await getToken();
        const result = await aiGenerateBoard({
          token,
          prompt,
          canvasSize: ensureCanvasSize(canvasSize),
          themeHint: themeHint || DEFAULT_THEME,
          mode,
          maxItems,
        });
        return result?.boardState || null;
      } finally {
        setLoading(false);
      }
    },
    [getToken]
  );

  const importFromImage = useCallback(
    async ({
      file,
      canvasSize = DEFAULT_CANVAS,
      themeHint = DEFAULT_THEME,
      rightsMode = "reference",
      prompt = "",
      mode = "overwrite",
      maxItems = 40,
    }) => {
      setLoading(true);
      try {
        const token = await getToken();
        const result = await aiImportFromImage({
          token,
          file,
          canvasSize: ensureCanvasSize(canvasSize),
          themeHint: themeHint || DEFAULT_THEME,
          rightsMode,
          prompt,
          mode,
          maxItems,
        });
        return result?.boardState || null;
      } finally {
        setLoading(false);
      }
    },
    [getToken]
  );

  const saveSnapshot = useCallback(
    async (boardState) => {
      if (!boardId) return;
      const token = await getToken();
      return createSnapshot({
        token,
        boardId,
        boardState,
      });
    },
    [boardId, getToken]
  );

  return {
    boardId,
    setBoardId,
    loading,
    initBoard,
    generateWithAI,
    importFromImage,
    saveSnapshot,
  };
}
