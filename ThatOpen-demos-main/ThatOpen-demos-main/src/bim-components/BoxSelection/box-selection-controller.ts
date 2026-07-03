import { Vector2, WebGLRenderer } from "three"
import CameraControls from "camera-controls"
import * as OBC from "@thatopen/components"

type SelectionEvent<T> = {
  event: PointerEvent
  pressedCtrlKey: boolean
} & T

type SelectionStartData = {
  startPoint: Vector2
}

export type SelectionData = {
  topLeft: Vector2
  bottomRight: Vector2
  direction: "right-to-left" | "left-to-right"
}

export class BoxSelectionController {
  private readonly element: HTMLElement
  private readonly renderer: WebGLRenderer
  private readonly controls: CameraControls

  enabled = true
  startWithoutShiftKey = false

  private startPoint = new Vector2()
  private pointTopLeft = new Vector2()
  private pointBottomRight = new Vector2()
  private direction: "right-to-left" | "left-to-right" = "right-to-left"
  private isDown = false
  private pressedCtrlKey = false

  readonly onStart = new OBC.Event<SelectionEvent<SelectionStartData>>()
  readonly onMove = new OBC.Event<SelectionEvent<SelectionData>>()
  readonly onFinish = new OBC.Event<SelectionEvent<SelectionData>>()

  constructor(world: OBC.World) {
    if (!world.camera.controls) throw new Error("world's camera must have controls")
    if (!world.renderer) throw new Error("world must have renderer")

    this.controls = world.camera.controls
    this.renderer = world.renderer.three

    this.element = document.createElement("div")
    this.element.classList.add("select-box")
    this.element.style.pointerEvents = "none"

    this.renderer.domElement.addEventListener("pointerdown", this.onPointerDown)
    this.renderer.domElement.addEventListener("pointermove", this.onPointerMove)
    this.renderer.domElement.addEventListener("pointerup", this.onPointerUp)
  }

  dispose() {
    this.renderer.domElement.removeEventListener("pointerdown", this.onPointerDown)
    this.renderer.domElement.removeEventListener("pointermove", this.onPointerMove)
    this.renderer.domElement.removeEventListener("pointerup", this.onPointerUp)

    this.onStart.reset()
    this.onMove.reset()
    this.onFinish.reset()
  }

  private onPointerDown = (event: PointerEvent) => {
    if (!this.enabled) return
    if (!event.shiftKey && !this.startWithoutShiftKey) return

    this.controls.enabled = false
    this.isDown = true
    this.pressedCtrlKey = event.ctrlKey
    this.onSelectStart(event)
  }

  private onPointerMove = (event: PointerEvent) => {
    if (!this.enabled) return
    if (this.isDown) this.onSelectMove(event)
  }

  private onPointerUp = (event: PointerEvent) => {
    if (!this.enabled) return
    this.controls.enabled = true
    if (this.isDown) {
      this.onSelectStop(event)
      this.isDown = false
    }
    this.pressedCtrlKey = false
  }

  private onSelectStart(event: PointerEvent) {
    this.element.style.display = "none"

    this.renderer.domElement.parentElement!.appendChild(this.element)

    this.element.style.left = `${event.clientX}px`
    this.element.style.top = `${event.clientY}px`
    this.element.style.width = "0px"
    this.element.style.height = "0px"

    this.startPoint.x = event.clientX
    this.startPoint.y = event.clientY

    this.onStart.trigger({ startPoint: this.startPoint, pressedCtrlKey: this.pressedCtrlKey, event })
  }

  private onSelectMove(event: PointerEvent) {
    this.element.style.display = "block"

    this.pointBottomRight.x = Math.max(this.startPoint.x, event.clientX)
    this.pointBottomRight.y = Math.max(this.startPoint.y, event.clientY)
    this.pointTopLeft.x = Math.min(this.startPoint.x, event.clientX)
    this.pointTopLeft.y = Math.min(this.startPoint.y, event.clientY)

    this.element.style.left = `${this.pointTopLeft.x}px`
    this.element.style.top = `${this.pointTopLeft.y}px`
    this.element.style.width = `${this.pointBottomRight.x - this.pointTopLeft.x}px`
    this.element.style.height = `${this.pointBottomRight.y - this.pointTopLeft.y}px`

    this.direction = this.pointBottomRight.x > this.startPoint.x ? "left-to-right" : "right-to-left"

    this.onMove.trigger({
      event,
      pressedCtrlKey: this.pressedCtrlKey,
      topLeft: this.pointTopLeft,
      bottomRight: this.pointBottomRight,
      direction: this.direction,
    })
  }

  private onSelectStop(event: PointerEvent) {
    this.element.parentElement!.removeChild(this.element)

    this.onFinish.trigger({
      event,
      pressedCtrlKey: this.pressedCtrlKey,
      topLeft: this.pointTopLeft,
      bottomRight: this.pointBottomRight,
      direction: this.direction,
    })
  }
}
