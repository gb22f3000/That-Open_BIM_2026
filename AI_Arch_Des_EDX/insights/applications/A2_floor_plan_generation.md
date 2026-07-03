# A2 — Floor Plan Generation

## Application Summary

| Field | Detail |
|-------|--------|
| **Task** | Automatically generate residential floor plan layouts from constraints |
| **Algorithm** | Generative Adversarial Networks (GANs) with LSTM / Graph-GAN |
| **Primary Paper** | Nauata, A., et al. (2020) [2] — **House-GAN** |
| **Venue** | ECCV 2020 (also arXiv preprint) |
| **Open Access** | ✅ `papers&journals/open_access/01_Nauata_HouseGAN_FloorPlan_2020.pdf` |

## Problem Statement

Floor plan design is iterative and constraint-heavy: room count, types, adjacencies, circulation, and building footprint must all be satisfied. Manual drafting is slow. AI generation from high-level constraints (bubble diagrams / adjacency graphs) accelerates early design exploration.

## How the Algorithm Works

### House-GAN Architecture (Nauata et al.)
The course cites "GAN + LSTM"; the actual landmark paper **House-GAN** uses **relational GANs** with graph neural network components:

```
Bubble Diagram (Graph) → Relational Generator → Room Bounding Boxes → Floor Plan
                              ↑
                        Relational Discriminator
```

1. **Input**: Graph where nodes = rooms (with type labels), edges = required adjacencies
2. **Generator**: Relational network encodes graph constraints; outputs axis-aligned room boxes
3. **Discriminator**: Judges realism of generated layouts vs. 117,000 real floor plans
4. **Metrics**: Realism, diversity, compatibility with input graph

### Related: Graph2Plan (Hu et al., 2020)
Alternative approach combining **GNN + CNN**:
- Layout graph → GNN embeds rooms → predicts bounding boxes → refines floorplan image
- Downloaded: `02_Hu_Graph2Plan_FloorPlan_2020.pdf`

### LSTM Role (Course Context)
LSTM networks handle **sequential room placement** — predicting the next room given previously placed rooms. Used in earlier/alternative floor plan pipelines where rooms are generated one-by-one in sequence rather than simultaneously from a graph.

## Data Requirements

| Modality | Description |
|----------|-------------|
| **Training data** | 80,000–117,000 vectorized floor plan images with room annotations |
| **Input at inference** | Adjacency graph / bubble diagram + optional building boundary |
| **Output** | Vectorized floor plan (room polygons or bounding boxes) |

## Outputs & Use Cases

- Rapid massing of multiple layout options from a functional diagram
- Design space exploration in schematic design phase
- Educational tool for understanding adjacency-driven planning
- Input to BIM authoring (convert boxes to walls/doors)

## Connection to Course

- Directly supports **DesArchdev** space planning module
- Notebook 05 (MSD graphs) uses same graph-based floor plan representation
- Sketchpad Part 2 teaches manual polygon layout that Graph2Plan automates

## Limitations

- Generated plans may violate building codes, minimum room sizes, or accessibility
- Residential focus; office/hospital typologies need different training data
- Graph constraint must be specified correctly by the architect

## Code & Data

- House-GAN: https://github.com/ennauata/housegan
- Project page: https://ennauata.github.io/housegan/page.html
- MSD dataset (Notebook 05): https://www.kaggle.com/datasets/caspervanengelenburg/modified-swiss-dwellings

## Key References

```
[2] Nauata, A., et al. "House-GAN: Relational Generative Adversarial Networks
    for Graph-constrained House Layout Generation." ECCV 2020.
    arXiv:2003.06988

Related: Hu, R., et al. "Graph2Plan: Learning Floorplan Generation from Layout Graphs."
    ACM Transactions on Graphics, 39(4), 2020. arXiv:2004.13204
```
