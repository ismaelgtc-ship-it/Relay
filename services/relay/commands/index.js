import ping from "./ping.js";
import help from "./help.js";
import crear_grupo from "./crear_grupo.js";
import eliminar_grupo from "./eliminar_grupo.js";
import añadir_canal from "./añadir_canal.js";
import remover_canal from "./remover_canal.js";
import limpiar from "./limpiar.js";
import list from "./list.js";
import save_config from "./save_config.js";
import load_config from "./load_config.js";
import wipe_config from "./wipe_config.js";
import select_language from "./select_language.js";
import select_language_edit from "./select_language_edit.js";
import remove_rol from "./remove_rol.js";
import ocr from "./ocr.js";
import translate_ctx from "./translate_ctx.js";

export const commands = [
  ping,
  help,
  crear_grupo,
  eliminar_grupo,
  añadir_canal,
  remover_canal,
  limpiar,
  list,
  save_config,
  load_config,
  wipe_config,
  select_language,
  select_language_edit,
  remove_rol,
  ocr,
  translate_ctx
];

// Compatibility export: some bootstraps import `loadCommands`.
export function loadCommands() {
  return commands;
}

export function getCommand(name) {
  return commands.find((cmd) => cmd.data?.name === name);
}
