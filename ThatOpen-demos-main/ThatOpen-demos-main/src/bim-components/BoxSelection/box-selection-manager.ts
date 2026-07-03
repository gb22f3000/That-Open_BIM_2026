import { Color } from "three"
import * as OBC from "@thatopen/components"
import * as OBF from "@thatopen/components-front"
import * as FRAGS from "@thatopen/fragments"
import { BoxSelectionController, SelectionData } from "./box-selection-controller.ts"
import { isOrthographicCamera, isPerspectiveCamera } from "../../utils/three-types.ts"
import { SerialTaskQueue } from "../../utils/serial-task-queue.ts"
import { throttle } from "../../utils/throttle.ts"

const BOX_SELECTION_HIGHLIGHT = "box-selection-highlight"

export class BoxSelectionManager extends OBC.Component implements OBC.Disposable {
  static readonly uuid = "69e5705b-4a7f-4ddf-be22-166f798d4abe" as const
  private _enabled = true

  private readonly worlds: OBC.Worlds
  private readonly highlighter: OBF.Highlighter
  private readonly fragmentsManager: OBC.FragmentsManager

  readonly onSelected = new OBC.Event<OBC.ModelIdMap>()
  readonly onDisposed = new OBC.Event<BoxSelectionManager>()

  private boxSelectionResolvers: PromiseWithResolvers<OBC.ModelIdMap> | null = null

  controllers = new Map<string, BoxSelectionController>()

  constructor(components: OBC.Components) {
    super(components)
    components.add(BoxSelectionManager.uuid, this)

    this.highlighter = components.get(OBF.Highlighter)
    this.highlighter.styles.set(BOX_SELECTION_HIGHLIGHT, {
      color: new Color(0x69e4ff),
      opacity: 1,
      transparent: false,
      renderedFaces: FRAGS.RenderedFaces.ONE,
      preserveOriginalMaterial: false
    })
    this.fragmentsManager = components.get(OBC.FragmentsManager)

    this.worlds = components.get(OBC.Worlds)
    this.worlds.list.onItemSet.add(this.update)
    this.worlds.list.onItemDeleted.add(this.update)
    this.worlds.list.onCleared.add(this.update)
    this.update()
  }

  get enabled() {
    return this._enabled
  }

  set enabled(value: boolean) {
    for (const controller of this.controllers.values()) {
      controller.enabled = value
    }
    this._enabled = value
  }

  update = () => {
    for (const [ uuid, world ] of this.worlds.list.entries()) {
      if (this.controllers.has(uuid)) continue
      this.setupController(uuid, world)
    }
    for (const [ uuid, controller ] of this.controllers.entries()) {
      if (this.worlds.list.has(uuid)) continue
      controller.dispose()
      this.controllers.delete(uuid)
    }
  }

  setupController(uuid: string, world: OBC.World) {
    const renderer = world.renderer
    if (!renderer) {
      console.warn("World has no renderer so cannot be supported for box selection", world)
      return
    }

    const camera = world.camera.three
    if (!isOrthographicCamera(camera) && !isPerspectiveCamera(camera)) {
      console.warn("Only perspective and orthographic camera is supported for box selection", camera)
      return
    }

    const controller = new BoxSelectionController(world)
    controller.enabled = this.enabled

    const queue = new SerialTaskQueue()
    let previousSelection: OBC.ModelIdMap = {}

    const createRaycastData = (event: SelectionData) => ({
      camera,
      dom: renderer!.three.domElement,
      topLeft: event.topLeft,
      bottomRight: event.bottomRight,
      // Same convention as Revit, AutoCAD, etc.
      fullyIncluded: event.direction !== "right-to-left"
    } satisfies FRAGS.RectangleRaycastData)

    controller.onStart.add(async (event) =>
      queue.push(async () => {
        previousSelection = cloneModelIdMap(this.highlighter.selection.select)
        if (!event.pressedCtrlKey) await this.highlighter.clear("select")
      })
    )

    controller.onMove.add(throttle(async event => {
      await queue.replace(async () => {
        const selection = event.pressedCtrlKey ? cloneModelIdMap(previousSelection) : {}
        await this.raycastSelection(createRaycastData(event), selection)

        await this.highlighter.highlightByID(BOX_SELECTION_HIGHLIGHT, selection, true)
      })
    }, 200))

    controller.onFinish.add(async (event) => {
      await queue.push(async () => {
        const selection = event.pressedCtrlKey ? cloneModelIdMap(previousSelection) : {}
        await this.raycastSelection(createRaycastData(event), selection)

        await this.highlighter.highlightByID("select", selection, true)
        await this.highlighter.clear(BOX_SELECTION_HIGHLIGHT)

        this.onSelected.trigger(selection)
      })
    })

    this.controllers.set(uuid, controller)
  }

  private async raycastSelection(raycastData: FRAGS.RectangleRaycastData, appendSelection?: OBC.ModelIdMap) {
    const map: OBC.ModelIdMap = appendSelection ?? {}
    for (const model of this.fragmentsManager.list.values()) {
      const result = await model.rectangleRaycast(raycastData)
      if (!result) continue
      const ids = (map[result.fragments.modelId] ??= new Set<number>())
      for (const localId of result.localIds) ids.add(localId)
    }
    return map
  }

  startBoxSelection(world: OBC.World): Promise<OBC.ModelIdMap> {
    this.cancelBoxSelection()

    const resolvers = Promise.withResolvers<OBC.ModelIdMap>()
    this.boxSelectionResolvers = resolvers

    const controller = this.controllers.get(world.uuid)
    if (!controller) throw new Error(`Could not find controller for world ${world.uuid}`)
    controller.startWithoutShiftKey = true

    const handleSelected = (selection: OBC.ModelIdMap) => {
      controller.startWithoutShiftKey = false
      resolvers.resolve(selection)
    }

    this.onSelected.add(handleSelected)

    resolvers.promise.finally(() => {
      this.onSelected.remove(handleSelected)
    })

    return resolvers.promise
  }

  cancelBoxSelection() {
    this.boxSelectionResolvers?.reject()
    for (const controller of this.controllers.values()) {
      controller.startWithoutShiftKey = false
    }
  }

  dispose(): void | Promise<void> {
    for (const controller of this.controllers.values()) {
      controller.dispose()
    }
    this.controllers.clear()

    this.worlds.list.onItemSet.remove(this.update)
    this.worlds.list.onItemDeleted.remove(this.update)
    this.worlds.list.onCleared.remove(this.update)
  }
}

function cloneModelIdMap(map: OBC.ModelIdMap): OBC.ModelIdMap {
  const out: OBC.ModelIdMap = {}
  for (const k in map) out[k] = new Set(map[k])
  return out
}
