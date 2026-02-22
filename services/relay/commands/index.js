import ping from "./ping.js";

export const commandRegistry = new Map();

export function loadCommands() {
  const commands = [ping];
  for (const cmd of commands) {
    commandRegistry.set(cmd.data.name, cmd);
  }
  return commands.map(c => c.data);
}
