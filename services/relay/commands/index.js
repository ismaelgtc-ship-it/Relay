// commands/index.js (ESM)
// Robust loader: avoids deploy breaks if a command file is missing (Android/Git unicode edge cases).

async function safeImport(path) {
  try {
    const mod = await import(path);
    return mod?.default ?? mod;
  } catch {
    return null;
  }
}

// Prefer ASCII filenames; tolerate Unicode edge cases on Android/Git.
const loaded = (await Promise.all([
  safeImport("./ping.js"),

  // add_channel (legacy filenames)
  safeImport("./anadir_canal.js"),
  safeImport("./an#U0303adir_canal.js"),

  safeImport("./crear_grupo.js"),
  safeImport("./eliminar_grupo.js"),
  safeImport("./remover_canal.js"),
  safeImport("./list.js"),
  safeImport("./limpiar.js"),
  safeImport("./save_config.js"),
  safeImport("./load_config.js"),
  safeImport("./wipe_config.js"),
  safeImport("./ocr.js"),
  safeImport("./select_language.js"),
  safeImport("./select_language_edit.js"),
  safeImport("./help.js"),
  safeImport("./remove_rol.js"),
  safeImport("./translate_ctx.js"),
])).filter(Boolean);

// Deduplicate by command name (last one wins).
const byName = new Map();
for (const cmd of loaded) {
  const name = cmd?.data?.name;
  if (!name) continue;
  byName.set(name, cmd);
}

export const commands = [...byName.values()];

export function loadCommands() {
  return commands;
}

export function getCommand(name) {
  return commands.find((cmd) => cmd?.data?.name === name);
}
