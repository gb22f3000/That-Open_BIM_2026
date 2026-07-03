# Notebook Guide: Python Sketchpad — Part 2 (Elements of a Layout)

**Notebook:** `notebooks/04_sketchpad_part2_elements_of_layout.ipynb`  
**Source:** `Voraceum_Coding_Practice.docx` — M2P2 Elements of a Layout

## What This Notebook Teaches

Part 2 translates architectural floor plan elements into **Python data structures** and **visualizations**. You learn to represent walls, rooms, and full layouts computationally — the foundation for Part 3 (recreating your own floor plan in code).

## Core Concept: Floor Plans Live in 2D

A layout exists in an **x–y plane** (typically axis-aligned). Elements decompose into:
- **Walls / doors / windows** → lines (2 points)
- **Rooms / spaces** → polygons (ordered point sequences)

## Section-by-Section Explanation

### Walls as Lines
```
Point = tuple of floats:  (x, y)
Line  = list of 2 points: [(x1,y1), (x2,y2)]
```
- **Tuples** are immutable — good for fixed corner coordinates.
- **Lists** are mutable — useful when walls may change.

### Spaces as Polygons
A room is an ordered list of corner points. A rectangle needs 4 corners (5 if closed):
```
[(0,0), (2.2,0), (2.2,1.5), (0,1.5)]
```

### NumPy Arrays — Transformations
Converting polygons to `np.array` enables vectorized operations:

| Operation | Code | Effect |
|-----------|------|--------|
| Translate | `poly + 2` | Move +2 in both x and y |
| Scale | `poly * 2` | Double all coordinates |
| Independent | `poly + [2, -1]` | Shift x by 2, y by -1 |
| Index | `poly[1]` | Access second corner |
| Slice | `poly[:2]` | First two corners |
| Concatenate | `np.concatenate(...)` | Add/remove vertices |

### Visualization with Matplotlib
- `plt.plot(x, y)` — draw polygon outline
- `plt.fill(x, y, color=...)` — fill room area
- `plt.axis('off')` — clean plan view without axes
- `plt.gca().set_aspect('equal')` — preserve true proportions (critical for architecture)

**Common pitfall:** Passing a 2D list directly to `plt.plot(poly)` plots index vs. coordinate values, not the actual shape. Always separate x and y columns.

### Loops — Generating Many Shapes
```python
for i in range(n):
    polygons.append(poly1 * i + i)
```
Loops avoid writing hundreds of manual coordinate definitions.

### `get_rectangle(w, h, m)` Function
Encapsulates the math for axis-aligned rectangles from **width**, **height**, and **center point** — far more intuitive than manual corner calculation.

### Layout Dictionary
```python
floor = {
    "room 1": [rect1, "red"],
    "room 2": [rect2, "blue"],
}
```
A **dictionary** maps room names (keys) to `[geometry, color]` pairs. This is the simplest structured representation of a multi-room apartment before moving to graph-based models (Notebook 05).

## Expected Visual Output

Running the notebook produces:
1. A single closed polygon plot
2. Multiple transformed polygons (translated, scaled, filled)
3. A spiral/gradient pattern from loop-generated shapes
4. A two-room floor plan with colored fills

## Key Takeaways

1. Architectural geometry can be stored as **nested lists/tuples** then upgraded to **NumPy arrays**.
2. Vectorized transforms make parametric design exploration fast.
3. Dictionaries provide a human-readable structure for multi-space layouts.
4. Equal aspect ratio is non-negotiable for legible floor plan drawings.

## How to Run

```bash
pip install numpy matplotlib
jupyter lab notebooks/04_sketchpad_part2_elements_of_layout.ipynb
```
