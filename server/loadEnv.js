import fs from "node:fs";
import path from "node:path";

const parseLine = (line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }
  const equalsIndex = trimmed.indexOf("=");
  if (equalsIndex === -1) {
    return null;
  }
  const key = trimmed.slice(0, equalsIndex).trim();
  const rawValue = trimmed.slice(equalsIndex + 1).trim();
  if (!key) {
    return null;
  }
  const value =
    rawValue.startsWith('"') && rawValue.endsWith('"')
      ? rawValue.slice(1, -1)
      : rawValue;
  return [key, value];
};

let loaded = false;

export const loadEnvFile = () => {
  if (loaded) return;
  loaded = true;
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }
  const contents = fs.readFileSync(envPath, "utf8");
  contents
    .split(/\r?\n/)
    .map(parseLine)
    .filter(Boolean)
    .forEach(([key, value]) => {
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    });
};
