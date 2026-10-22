/** Runs each callback after its delay in ms. Returns a function that cancels whatever has not run yet. */
export function schedule(steps: Array<[number, () => void]>): () => void {
  const ids = steps.map(([ms, fn]) => window.setTimeout(fn, ms));
  return () => ids.forEach((id) => window.clearTimeout(id));
}
