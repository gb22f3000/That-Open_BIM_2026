# Notebook Guide: Graphing Floor Plans (MSD Dataset)

**Notebook:** `notebooks/05_graphing_floor_plans.ipynb`  
**Source:** `Voraceum_Coding_Practice.docx` — Design Layouts Representation

## What This Notebook Teaches

Raster images (PNG/JPEG) of floor plans hide the **relational structure** architects actually reason about: which rooms connect, what type each space is, and how circulation works. This notebook introduces **access graphs** — an explicit representation where:
- **Nodes** = rooms (with geometry, type, centroid attributes)
- **Edges** = doors, front doors, or passages between rooms

You work with the **MSD (Modified Swiss Dwellings)** dataset: 5,000+ Swiss residential floor plans, the first large-scale dataset of **whole buildings** (not just single apartments).

## Why Graphs Matter for AI

Image-only models (DALL-E, Midjourney, etc.) often produce floor plans that *look* plausible but violate connectivity, room count, or programmatic constraints. Graph representations make **compositionality** explicit — a prerequisite for trustworthy AI-assisted design.

## Section-by-Section Explanation

### Setup
Imports:
- `networkx` — graph data structure and algorithms
- `shapely` — geometric operations on room polygons
- `matplotlib` — visualization
- Local helpers (`plot_floor`, `load_pickle`, `CMAP_ROOMTYPE`)

### Loading MSD Graphs
Each floor plan is stored as a `.pickle` file containing a `networkx.Graph` object. Loading pipeline:
1. `os.listdir(data_dir)` — list all pickle files
2. Loop (or list comprehension) — `load_pickle()` each file
3. Store in `graphs` list for indexed access

### Graph Anatomy
```python
G = graphs[9]
print(G)  # Graph with 16 nodes and 15 edges
```

**Node attributes:**
| Attribute | Description |
|-----------|-------------|
| `geometry` | List of (x,y) corner coordinates in meters |
| `room_type` | Integer code 0–8 (bedroom, kitchen, etc.) |
| `centroid` | Room center point for graph node positioning |

**Room type codes:**
| Code | Room |
|------|------|
| 0 | Bedroom |
| 1 | Livingroom |
| 2 | Kitchen |
| 3 | Dining |
| 4 | Corridor |
| 5 | Stairs |
| 6 | Storeroom |
| 7 | Bathroom |
| 8 | Balcony |

### Visualization
`plot_floor(G, ax, fs)` from `helpers/plot.py`:
1. Draws each room polygon filled by room type color
2. Overlays graph edges between room centroids
3. Draws node markers at centroids

The multi-panel cell plots 8 floor plans in a 2×4 grid using `enumerate()` over subplot axes.

## Expected Results

With real MSD data: detailed multi-room apartment plans with colored rooms and connectivity overlay.

With synthetic sample graphs (`scripts/generate_sample_data.py`): simplified 3–5 room layouts demonstrating the same API.

## Key Takeaways

1. **Functional diagrams** (room connectivity) can be stored as graphs, not just drawings.
2. MSD provides geometry + topology + room semantics in one object.
3. Graph representations enable ML tasks: generation, validation, retrieval, and constraint checking.
4. This bridges Sketchpad Part 2 (manual polygons) to AI-scale architectural datasets.

## How to Run

```bash
# Option A: synthetic samples (included workflow)
python scripts/generate_sample_data.py

# Option B: real MSD data from Kaggle
# Download graph_out/ from Modified Swiss Dwellings → data/msd_graphs/

jupyter lab notebooks/05_graphing_floor_plans.ipynb
```

## Further Reading

- Christopher Alexander — *A Pattern Language* (relational thinking in architecture)
- Philip Steadman — *Architectural Morphology* (form and configuration analysis)
- [MSD on Kaggle](https://www.kaggle.com/datasets/caspervanengelenburg/modified-swiss-dwellings)
