// commands/index.js (ESM)
// Robust loader: avoids deploy breaks if a command file is missing (Android/Git unicode edge cases).
import ping from "./ping.js";

async function safeImport(path) {
  try {
    const mod = await import(path);
    return mod?.default ?? mod;
  } catch {
    return null;
  }
}

// Prefer ASCII filenames; provide unicode aliases as wrappers if present.
const maybe = await Promise.all([
  safeImport("./anadir_canal.js"),
  safeImport("./añadir_canal.js"),
]);

const anadir_canal = maybe.find(Boolean);

export const commands = [
  ping,
  ...(anadir_canal ? [anadir_canal] : []),
].filter(Boolean);

export function loadCommands() {
  return commands;
}

export function getCommand(name) {
  return commands.find((cmd) => cmd?.data?.name === name);
}
