# BIM App — Architecture

This document describes the complete architecture of the **ThatOpen BIM demo application** (`bim-app`): a browser-based IFC/Fragments viewer built with Vite, TypeScript, Three.js, and the ThatOpen platform.

---

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [High-Level Architecture](#high-level-architecture)
5. [Application Bootstrap](#application-bootstrap)
6. [Core Engine Layer](#core-engine-layer)
7. [UI Layer](#ui-layer)
8. [Custom BIM Components](#custom-bim-components)
9. [Utilities](#utilities)
10. [Data Flow & Event Wiring](#data-flow--event-wiring)
11. [Layout System](#layout-system)
12. [User Interactions & Keyboard Shortcuts](#user-interactions--keyboard-shortcuts)
13. [Build & Runtime](#build--runtime)
14. [Extension Points](#extension-points)

---

## Overview

The app is a **single-page BIM viewer** that lets users:

- Load **IFC** and **Fragments** (`.frag`) models
- Navigate a 3D scene with orthographic/perspective camera
- Select, highlight, hide, isolate, and colorize building elements
- Measure lengths and areas, create clipping sections
- Save and restore **viewpoints** (camera + selection state)
- Perform **box selection** (drag-to-select multiple elements)

Architecture follows a **component-based** pattern from `@thatopen/components`: a central `Components` registry holds services (world, loader, highlighter, clipper, etc.), and the UI is declarative templates built with `@thatopen/ui` web components.

---

## Technology Stack

| Layer | Technology | Role |
|-------|------------|------|
| Build | Vite 7 | Dev server, bundling, ES modules |
| Language | TypeScript 6 (ES2024) | Type-safe application code |
| 3D | Three.js 0.182 | Scene graph, materials, rendering |
| BIM core | `@thatopen/components` | Worlds, loaders, clipper, hider, viewpoints |
| BIM front | `@thatopen/components-front` | Highlighter, measurements, postproduction renderer |
| Geometry | `@thatopen/fragments` | Optimized fragment models + Web Worker parsing |
| IFC parsing | `web-ifc` 0.0.77 | WASM-based IFC → fragment conversion |
| UI | `@thatopen/ui` | Web components (`bim-grid`, `bim-button`, etc.) |
| UI (BIM) | `@thatopen/ui-obc` | Pre-built tables (models list, item data, viewpoints) |
| Camera | `camera-controls` | Orbit/pan/zoom controls |

---

## Project Structure

```
ThatOpen-demos-main/
├── index.html              # Entry HTML — mounts <bim-grid id="app">
├── vite.config.ts          # Vite config (relative base, top-level await)
├── tsconfig.json           # Strict TypeScript, bundler resolution
├── package.json
└── src/
    ├── main.ts             # Application entry — engine + UI wiring
    ├── globals.ts          # Shared constants (IDs, icons, tooltips)
    ├── style.css           # Theme variables and layout styles
    ├── vite-env.d.ts
    ├── bim-components/     # Custom ThatOpen Component extensions
    │   ├── index.ts
    │   ├── CustomComponent/  # Stub for user-defined components
    │   └── BoxSelection/     # Drag rectangle multi-select
    ├── ui-templates/         # Declarative UI (BUI templates)
    │   ├── index.ts
    │   ├── grids/            # App, content, and viewport grids
    │   ├── groups/           # Sidebar navigation
    │   ├── sections/         # Panel sections (models, data, viewpoints)
    │   ├── toolbars/         # Viewer toolbars
    │   └── buttons/          # Viewport settings overlay
    └── utils/                # Shared helpers
        ├── serial-task-queue.ts
        ├── throttle.ts
        └── three-types.ts
```

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           index.html                                     │
│                    <bim-grid id="app">                                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         main.ts (Bootstrap)                              │
│  BUI.Manager.init() → OBC.Components → World → Renderer/Camera/Scene    │
└─────────────────────────────────────────────────────────────────────────┘
          │                                    │
          ▼                                    ▼
┌──────────────────────┐          ┌──────────────────────────────────────┐
│   Core Engine Layer   │          │           UI Layer                  │
│  @thatopen/components │◄────────►│  ui-templates/ (BUI + CUI)           │
│  @thatopen/fragments  │          │  grids, sections, toolbars           │
│  three.js             │          └──────────────────────────────────────┘
└──────────────────────┘
          │
          ▼
┌──────────────────────┐
│  Custom Components   │
│  BoxSelectionManager │
│  CustomComponent     │
└──────────────────────┘
```

The app separates **engine concerns** (3D world, model loading, selection logic) from **presentation** (panels, toolbars, layout). Both layers share a single `OBC.Components` instance passed through template `initialState`.

---

## Application Bootstrap

`src/main.ts` is the sole entry point. Initialization proceeds in this order:

### 1. UI framework init

```ts
BUI.Manager.init();
```

Registers ThatOpen UI web components globally.

### 2. Components registry & world creation

```ts
const components = new OBC.Components();
const world = worlds.create<SimpleScene, OrthoPerspectiveCamera, PostproductionRenderer>();
```

A **World** bundles:

| Property | Type | Purpose |
|----------|------|---------|
| `scene` | `SimpleScene` | Three.js scene wrapper |
| `camera` | `OrthoPerspectiveCamera` | Switchable perspective/orthographic |
| `renderer` | `PostproductionRenderer` | WebGL + AO, edges, color shadows |
| Grid | via `Grids` component | Ground reference grid |

### 3. Viewport element

A `<bim-viewport>` custom element hosts the WebGL canvas. Resize events propagate to `world.renderer.resize()` and `world.camera.updateAspect()`.

### 4. Postproduction & visual quality

- Ambient occlusion (GTAO) and edge pass configured
- Style: `PostproductionAspect.COLOR_SHADOWS`
- LOD materials registered for isolated postprocessing pass

### 5. Fragments worker

```ts
fragments.init("/node_modules/@thatopen/fragments/dist/Worker/worker.mjs");
```

Heavy geometry parsing runs off the main thread.

### 6. IFC loader (WASM)

```ts
await ifcLoader.setup({
  wasm: { absolute: true, path: "https://unpkg.com/web-ifc@0.0.77/" },
});
```

IFC files are parsed via WebAssembly loaded from CDN.

### 7. Interaction tools

Registered on the shared `components` instance:

- **Highlighter** — click selection, custom highlight styles
- **Clipper** — double-click to create section planes
- **LengthMeasurement** / **AreaMeasurement** — dimension tools
- **Raycasters** — pointer picking

### 8. Model load lifecycle

When a fragment model is added to `fragments.list`:

1. Assign camera: `model.useCamera(world.camera.three)`
2. Wire clipping planes from renderer
3. Add `model.object` to scene
4. Trigger `fragments.core.update(true)`

### 9. UI assembly

Templates are composed hierarchically:

```
App Grid (#app)
├── sidebar (gridSidebarTemplate)
└── contentGrid (contentGridTemplate)
    ├── models panel
    ├── viewer (viewport + overlays)
    ├── elementData panel
    └── viewpoints panel
        └── viewport contains:
            ├── viewportSettings (gear menu)
            └── viewportGrid (floating toolbars)
```

Layout is driven by URL hash (`#Viewer`).

---

## Core Engine Layer

All engine services live in the **`OBC.Components` service locator**. Key services used by this app:

### Worlds & Scene

- **`Worlds`** — factory for 3D worlds; this app uses one world named `"Main"`
- **`SimpleScene`** — sets up lights and scene graph
- **`Grids`** — infinite ground grid with customizable colors/sizes

### Model Loading & Storage

- **`IfcLoader`** — reads IFC bytes, converts to Fragments via web-ifc WASM
- **`FragmentsManager`** — manages loaded fragment models, worker coordination, material registry

Models are identified by **`ModelIdMap`**: `{ [modelId: string]: Set<localId> }`.

### Selection & Visibility

- **`Highlighter`** (`@thatopen/components-front`) — raycast selection, multi-style highlights, events (`select.onHighlight`, `select.onClear`)
- **`Hider`** — show/hide/isolate elements by model ID map

### Tools

- **`Clipper`** — interactive section planes (double-click create, Delete/Backspace remove)
- **`LengthMeasurement`** — polyline distance measurement
- **`AreaMeasurement`** — polygon area measurement (Enter to finish)
- **`Viewpoints`** — snapshot camera position, selection, and colors

### Rendering

- **`PostproductionRenderer`** — compositing pipeline with AO, edge detection, material isolation for LOD
- Camera projection changes trigger fragment updates and postproduction camera sync

---

## UI Layer

UI is built with **stateful/stateless BUI templates** — functions returning `BUI.html` tagged template literals that render web components.

### Template categories

| Folder | Responsibility |
|--------|----------------|
| `grids/` | Nested `bim-grid` layouts (app shell, content area, viewport overlays) |
| `groups/` | Sidebar with layout switcher and collapse toggle |
| `sections/` | Fixed panels: Models, Selection Data, Viewpoints |
| `toolbars/` | Bottom viewer toolbar (visibility, selection actions) |
| `buttons/` | Floating viewport settings (grid toggle, projection) |

### Pre-built UI from `@thatopen/ui-obc`

| Component | Used in | Purpose |
|-----------|---------|---------|
| `CUI.tables.modelsList` | `models.ts` | List loaded models |
| `CUI.tables.itemsData` | `elements-data.ts` | IFC properties for selection |
| `CUI.tables.viewpointsList` | `viewpoints.ts` | Saved viewpoints list |

### State propagation

Templates receive `{ components, world }` (or subsets) via `BUI.Component.create(template, initialState)`. Child grids receive `initialState` when `grid.elements` is configured in `onCreated` callbacks.

### Shared constants (`globals.ts`)

- `CONTENT_GRID_ID`, column widths, gap spacing
- `appIcons` — Iconify icon IDs for buttons
- `tooltips` — Tooltip copy for toolbar actions

---

## Custom BIM Components

Custom logic extends `OBC.Component` and registers with the components registry via `components.add(uuid, this)`.

### BoxSelectionManager

**Location:** `src/bim-components/BoxSelection/`

The most substantial custom component. Enables CAD-style **rectangle selection**:

```
BoxSelectionManager
    └── Map<worldUuid, BoxSelectionController>
            └── pointer events on renderer DOM
            └── visual .select-box overlay (CSS)
```

**Architecture:**

1. **`BoxSelectionController`** — low-level pointer handling
   - Activates on **Shift+drag** or programmatic `startWithoutShiftKey`
   - Draws a DOM rectangle overlay during drag
   - Determines direction: `left-to-right` (fully enclosed) vs `right-to-left` (intersecting)
   - Disables camera controls while selecting

2. **`BoxSelectionManager`** — orchestration
   - One controller per world (auto-created on `Worlds.list` changes)
   - Uses `SerialTaskQueue` to serialize async highlight updates
   - Throttles `onMove` previews (200 ms)
   - Calls `model.rectangleRaycast()` on all loaded fragment models
   - Integrates with `Highlighter`: preview style `box-selection-highlight`, final style `select`
   - Supports **Ctrl** to append to previous selection
   - Exposes `startBoxSelection(world)` promise API (used by toolbar button)

**Registration:** Imported by `viewer-toolbar.ts`; instantiated lazily via `components.get(BoxSelectionManager)`.

### CustomComponent

**Location:** `src/bim-components/CustomComponent/`

A minimal stub extending `OBC.Component` with a static UUID. Serves as a **template** for adding new custom services to the app.

---

## Utilities

| Module | Purpose |
|--------|---------|
| `serial-task-queue.ts` | Runs async tasks sequentially; `replace()` drops stale tasks (used during box-select drag previews) |
| `throttle.ts` | Limits call frequency (box-select move events) |
| `three-types.ts` | Type guards for `PerspectiveCamera` and `OrthographicCamera` |

---

## Data Flow & Event Wiring

### Model loading flow

```
User picks .ifc / .frag file
        │
        ▼
IfcLoader.load() / fragments.core.load()
        │
        ▼
Fragments Worker parses geometry
        │
        ▼
fragments.list.onItemSet
        │
        ├── model.useCamera(camera)
        ├── scene.add(model.object)
        └── fragments.core.update()
        │
        ▼
modelsList UI refreshes (via CUI)
```

### Selection flow

```
Pointer click / box drag
        │
        ▼
Raycasters / rectangleRaycast
        │
        ▼
Highlighter.highlightByID("select", modelIdMap)
        │
        ├── highlighter.events.select.onHighlight
        │         └── elements-data panel updates propsTable
        │
        └── Toolbar actions (hide, isolate, colorize, focus)
                  └── Hider / Camera.fitToItems
```

### Viewpoint creation flow

```
User clicks "Add" in Viewpoints panel
        │
        ▼
Viewpoints.create()
        ├── viewpoint.updateCamera() — saves current camera
        ├── selectionComponents ← current highlighter selection (as GUIDs)
        └── componentColors ← highlighter style colors
```

---

## Layout System

Three nested **`bim-grid`** levels define the shell:

### App Grid (`#app`)

```
┌──────────┬────────────────────────────────────┐
│ sidebar  │           contentGrid                 │
│ (nav)    │  (models | viewer | elementData)     │
│          │  (viewpoints | viewer | elementData)  │
└──────────┴────────────────────────────────────┘
```

CSS grid template: `"sidebar contentGrid" / auto 1fr`

### Content Grid (`#app-content`)

Layout `"Viewer"`:

```
┌─────────┬──────────────────┬─────────────┐
│ models  │                  │ elementData │
├─────────┤     viewport     ├─────────────┤
│viewpoints│                 │             │
└─────────┴──────────────────┴─────────────┘
```

Side columns: `22rem` (`SMALL_COLUMN_WIDTH`).

### Viewport Grid (floating overlay)

```
┌ leftToolbar ────────────────┐
│                              │
│         3D canvas            │
│                              │
└──────── bottomToolbar ───────┘
```

Left toolbar: measurements + section tools. Bottom toolbar: visibility + selection actions.

### Layout routing

- Initial layout from `window.location.hash` (defaults to `#Viewer`)
- `layoutchange` events sync hash back to URL

---

## User Interactions & Keyboard Shortcuts

| Action | Trigger |
|--------|---------|
| Create clip plane | Double-click viewport (clipper enabled) |
| Delete clip / length measure | `Delete` or `Backspace` |
| Finish area measure | `Enter` |
| Box select | Shift + drag, or toolbar "Box select" button |
| Append to selection | Ctrl while selecting |
| Toggle length/area/clipper | Left toolbar buttons (mutually exclusive with highlighter) |

---

## Build & Runtime

### Scripts

| Command | Action |
|---------|--------|
| `npm run dev` | Vite dev server (`--host` for LAN access) |
| `npm run build` | Type-check + production bundle |
| `npm run preview` | Serve production build |

### Vite configuration

- `base: "./"` — relative asset paths for static deployment
- `esbuild.supported.top-level-await: true` — required for async IFC setup in `main.ts`

### External runtime dependencies

- **web-ifc WASM** loaded from unpkg CDN at runtime
- **Fragments worker** served from `node_modules/@thatopen/fragments/dist/Worker/worker.mjs`

### Theming

- `index.html` uses `class="bim-ui-dark"` on `<html>`
- `style.css` defines CSS custom properties for ThatOpen UI (`--bim-ui_*`) and dashboard card styling

---

## Extension Points

Developers can extend the app in these ways:

1. **New `OBC.Component` subclasses** — follow `CustomComponent` or `BoxSelectionManager` patterns; register in constructor; access via `components.get()`

2. **New UI templates** — add stateful components under `ui-templates/`; wire into grid `elements` in `content.ts` or `viewport.ts`

3. **Additional layouts** — extend `ContentGridLayouts` and add grid templates in `contentGridTemplate`

4. **Toolbar actions** — extend `viewerToolbarTemplate` with new buttons calling engine services

5. **Model load hooks** — subscribe to `fragments.list.onItemSet` in `main.ts`

6. **Highlight styles** — register styles on `Highlighter` (see box-selection and colorize flows)

---

## Dependency Graph (Conceptual)

```
main.ts
 ├── @thatopen/components      (engine services)
 ├── @thatopen/components-front (highlighter, renderer, measurements)
 ├── @thatopen/ui              (BUI templates, grids, buttons)
 ├── three                     (colors, vectors, scene)
 └── ui-templates/
      ├── sections/ → @thatopen/ui-obc (tables)
      ├── toolbars/ → bim-components/BoxSelection
      └── grids/    → sections, toolbars, buttons

bim-components/BoxSelection/
 ├── @thatopen/components
 ├── @thatopen/components-front
 ├── @thatopen/fragments       (rectangleRaycast)
 └── utils/                    (queue, throttle, type guards)
```

---

*Generated from source analysis of the ThatOpen BIM demo application.*
