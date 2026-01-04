let BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
if (!BACKEND_URL) {
  BACKEND_URL = "https://nexusrbx-backend-production.up.railway.app";
}
if (BACKEND_URL.endsWith("/")) {
  BACKEND_URL = BACKEND_URL.replace(/\/+$/, "");
}

async function handleResponse(res) {
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const msg = data?.error || data?.message || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

function authHeaders(token) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function listBoards({ token }) {
  const res = await fetch(`${BACKEND_URL}/api/ui-builder/boards`, {
    headers: authHeaders(token),
  });
  return handleResponse(res);
}

export async function createBoard({ token, title, projectId = null, canvasSize, settings }) {
  const res = await fetch(`${BACKEND_URL}/api/ui-builder/boards`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ title, projectId, canvasSize, settings }),
  });
  return handleResponse(res);
}

export async function getBoard({ token, boardId }) {
  const res = await fetch(`${BACKEND_URL}/api/ui-builder/boards/${encodeURIComponent(boardId)}`, {
    headers: authHeaders(token),
  });
  return handleResponse(res);
}

export async function listSnapshots({ token, boardId }) {
  const res = await fetch(`${BACKEND_URL}/api/ui-builder/boards/${encodeURIComponent(boardId)}/snapshots`, {
    headers: authHeaders(token),
  });
  return handleResponse(res);
}

export async function createSnapshot({ token, boardId, boardState }) {
  const res = await fetch(`${BACKEND_URL}/api/ui-builder/boards/${encodeURIComponent(boardId)}/snapshots`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ boardState }),
  });
  return handleResponse(res);
}

export async function getSnapshot({ token, boardId, snapshotId }) {
  const res = await fetch(`${BACKEND_URL}/api/ui-builder/boards/${encodeURIComponent(boardId)}/snapshots/${encodeURIComponent(snapshotId)}`, {
    headers: authHeaders(token),
  });
  return handleResponse(res);
}
