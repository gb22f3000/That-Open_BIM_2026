export function throttle<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  delayMs: number,
) {
  let lastCall = 0

  return (...args: TArgs) => {
    const now = performance.now()

    if (now - lastCall >= delayMs) {
      lastCall = now
      fn(...args)
    }
  }
}
