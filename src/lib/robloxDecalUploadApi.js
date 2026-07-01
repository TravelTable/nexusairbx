import { authedFetch } from "./billing";

export async function uploadRobloxDecalBatch({ files = [], items = [], requestId, projectId } = {}) {
  const form = new FormData();
  files.forEach((file) => {
    form.append("files", file, file.name);
  });
  form.append("items", JSON.stringify(items));
  form.append("requestId", requestId || "");
  if (projectId) form.append("projectId", String(projectId));

  const response = await authedFetch("/api/roblox/decal-uploads", {
    method: "POST",
    body: form,
  });
  const payload = await response.json().catch(async () => ({
    error: await response.text().catch(() => ""),
  }));

  if (!response.ok) {
    const error = new Error(payload?.error || `Roblox decal upload failed (${response.status})`);
    error.code = payload?.code || null;
    error.status = response.status;
    error.details = payload?.details || null;
    throw error;
  }

  return payload;
}
