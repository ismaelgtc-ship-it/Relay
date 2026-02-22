
export async function buildSnapshot(data = {}) {
  return {
    takenAt: new Date().toISOString(),
    payload: data
  };
}
