import * as ping from "./ping.js";

export const commands = [ping];

export function getCommand(name) {
  return commands.find((cmd) => cmd.data.name === name);
}
