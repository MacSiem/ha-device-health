import { copyFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const source = fileURLToPath(new URL("../ha-device-health.js", import.meta.url));
const bundled = fileURLToPath(new URL("../custom_components/ha_device_health/www/ha-device-health.js", import.meta.url));

if (process.argv.includes("--check")) {
  const [original, copy] = await Promise.all([readFile(source), readFile(bundled)]);
  if (!original.equals(copy)) {
    throw new Error("Bundled card differs from the dashboard card. Run node scripts/sync-card.mjs");
  }
} else {
  await copyFile(source, bundled);
}
