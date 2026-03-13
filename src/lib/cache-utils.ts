export async function clearCachesAndReload() {
  try {
    try {
      localStorage.clear();
    } catch {
      // ignore
    }

    try {
      sessionStorage.clear();
    } catch {
      // ignore
    }

    if ("caches" in window) {
      try {
        const names = await caches.keys();
        await Promise.all(names.map((name) => caches.delete(name)));
      } catch {
        // ignore
      }
    }
  } finally {
    window.location.reload();
  }
}

