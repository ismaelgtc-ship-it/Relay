// Compatibility shim for filesystems / git tooling that may drop or rename
// non-ASCII filenames. Some command registries import "./añadir_canal.js".
// The canonical implementation should live in "./anadir_canal.js".

let mod;
try {
  mod = await import("./anadir_canal.js");
} catch (e) {
  // If the canonical file truly doesn't exist, fail with a clear message.
  const err = new Error(
    "[relay] Missing command implementation: expected ./anadir_canal.js to exist (alias for ./añadir_canal.js)."
  );
  // @ts-ignore
  err.cause = e;
  throw err;
}

// Support both `export default` and named exports.
const resolved = mod.default ?? mod;

export const data = resolved.data ?? mod.data;
export const execute = resolved.execute ?? mod.execute;

// Re-export anything else commonly used by loaders.
export const meta = resolved.meta ?? mod.meta;
export const permissions = resolved.permissions ?? mod.permissions;
export default resolved;
