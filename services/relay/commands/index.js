import * as ping from "./ping.js";

export const commands = [ping];

// Compatibility export: some bootstraps import `loadCommands`.
export function loadCommands() {
  return commands;
}

export function getCommand(name) {
  return commands.find((cmd) => cmd.data.name === name);
}
