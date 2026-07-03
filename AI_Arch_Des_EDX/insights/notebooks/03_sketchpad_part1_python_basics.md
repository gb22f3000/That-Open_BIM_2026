# Notebook Guide: Python Sketchpad — Part 1 (Python Basics)

**Notebook:** `notebooks/03_sketchpad_part1_python_basics.ipynb`  
**Source:** `Voraceum_Coding_Practice.docx` — M2P1 Python Basics

## What This Notebook Teaches

Before drawing floor plans programmatically, you need Python fundamentals. Part 1 covers the minimum vocabulary used throughout the Sketchpad series: **variables**, **functions**, **errors**, **comments**, and **library imports**.

This notebook is intentionally simple. It establishes conventions used in Parts 2 and 3 (floor layout geometry with NumPy and Matplotlib).

## Section-by-Section Explanation

### Hello World
```python
text = "Hello world, you're beautiful"
print(text)
```
- `text` is a **variable** — a name pointing to a string object in memory.
- `"..."` creates a **string** (text data type).
- `print()` is a **built-in function** that outputs to the notebook cell.

### Multiple Arguments and Keyword Arguments
```python
print(text, text2, sep="; ", end="!")
```
- Positional arguments are printed in order.
- `sep` controls the separator between items (default: space).
- `end` controls what appears after the last item (default: newline).

### Errors
Two common beginner errors are demonstrated:
1. **NameError** — using `Hello` without quotes or assignment (undefined name).
2. **SyntaxError** — placing keyword arguments before positional ones.

Understanding error messages is essential for debugging architectural coding workflows.

### Comments
```python
a = 30  # age in years
```
Lines starting with `#` are ignored by Python. Use comments to document units, assumptions, or design intent (e.g., room dimensions in meters).

### Libraries
```python
import numpy as np
import matplotlib.pyplot as plt
```
- **NumPy (`np`)**: Numerical arrays — used for room polygon coordinates.
- **Matplotlib (`plt`)**: Plotting — used to visualize floor plan shapes.

Aliases (`as np`) reduce typing and follow community conventions.

## Connection to Architecture

| Python Concept | Architectural Use (Part 2+) |
|----------------|----------------------------|
| Variables | Store coordinates, dimensions |
| Functions | `get_rectangle(w, h, center)` |
| Lists / tuples | Points, walls, polygons |
| Libraries | Draw and transform floor layouts |

## Key Takeaways

1. Python executes code **line by line** in each cell.
2. Errors are learning tools — read the traceback carefully.
3. `numpy` and `matplotlib` are the core stack for 2D layout representation in this course.

## How to Run

No external data required. Open and run all cells top to bottom:

```bash
jupyter lab notebooks/03_sketchpad_part1_python_basics.ipynb
```
