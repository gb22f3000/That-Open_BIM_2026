/**
 * Runs async tasks one at a time, in submission order.
 *
 * Use {@link push} for tasks that must run, and {@link replace} for
 * tasks that are obsolete the moment something newer is queued
 * (e.g. UI previews during a drag).
 */
export class SerialTaskQueue {
  private chain: Promise<void> = Promise.resolve()
  private latest = 0

  push(task: () => Promise<void>): Promise<void> {
    this.latest++
    return this.enqueue(task)
  }

  /** Runs only if it's still the newest task when its turn comes. */
  replace(task: () => Promise<void>): Promise<void> {
    const id = ++this.latest
    return this.enqueue(async () => {
      if (id !== this.latest) return
      await task()
    })
  }

  private enqueue(task: () => Promise<void>) {
    const run = this.chain.then(task)
    this.chain = run
      .catch((e) => console.error("queued task failed", e))
    return run
  }
}
