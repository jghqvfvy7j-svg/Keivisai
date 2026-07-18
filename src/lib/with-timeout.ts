// Wraps a promise so it can never hang forever. If it doesn't settle within
// `ms`, it resolves to `fallback` instead. This keeps the app from freezing on
// bad networks (captive portals, flaky DNS, slow public wifi) where a remote
// call might never return. No sensitive data is logged.
export async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
