import fs from "fs";
import path from "path";

// Where a rotated API key is persisted so it survives a process restart
// without hand-editing .env — written by the manual-rotation route
// (src/app/api/admin/api-key/rotate/route.ts) and the automatic-rotation
// webhook receiver (src/app/api/internal/api-key-rotated/route.ts), read
// by apiClient.ts's createApiClient() on boot. This process is the only
// writer, so no polling/TTL is needed to keep the in-memory client and
// this file in sync — see apiClient.ts's setApiKey().
const RUNTIME_CONFIG_PATH = path.join(process.cwd(), "data", "runtime-config.json");

export function readRuntimeApiKey(): string | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(RUNTIME_CONFIG_PATH, "utf-8")) as { apiKey?: string };
    return parsed.apiKey || null;
  } catch {
    return null;
  }
}

export function writeRuntimeApiKey(apiKey: string): void {
  const dir = path.dirname(RUNTIME_CONFIG_PATH);
  fs.mkdirSync(dir, { recursive: true });
  // Write-then-rename so a reader never observes a partially-written file.
  const tmpPath = `${RUNTIME_CONFIG_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify({ apiKey, apiKeyUpdatedAt: new Date().toISOString() }, null, 2));
  fs.renameSync(tmpPath, RUNTIME_CONFIG_PATH);
}
