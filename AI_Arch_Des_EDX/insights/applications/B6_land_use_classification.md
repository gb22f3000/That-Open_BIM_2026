# B6 — Land Use Classification (SVM + Texture Analysis)

## Application Summary

| Field | Detail |
|-------|--------|
| **Task** | Classify land use categories from aerial/satellite imagery |
| **Algorithm** | Support Vector Machines (SVM) with Texture Analysis |
| **Primary Paper** | Chen, X., et al. (2019) [6] |
| **Journal** | *ISPRS Journal of Photogrammetry and Remote Sensing*, Vol. 147 |
| **DOI** | [10.1016/j.isprsjprs.2019.02.023](https://doi.org/10.1016/j.isprsjprs.2019.02.023) |
| **Open Access** | ❌ Elsevier (paywalled) |

## Problem Statement

Urban and regional planners need accurate land use maps (residential, commercial, industrial, agricultural, forest, water) for zoning, environmental assessment, and infrastructure planning. Manual photo-interpretation of satellite imagery is slow. Automated classification from texture features enables city-scale mapping.

## How the Algorithm Works

### Texture Analysis + SVM Pipeline
```
Satellite/Aerial Image → Texture Feature Extraction → Feature Vector → SVM Classifier → Land Use Label
```

1. **Texture analysis**: Extract statistical patterns from image regions
   - Gray-Level Co-occurrence Matrix (GLCM) features: contrast, homogeneity, entropy
   - Gabor filter responses at multiple scales/orientations
   - Local Binary Patterns (LBP)

2. **Feature vector**: Concatenate texture descriptors per image patch

3. **SVM classifier**: Find optimal hyperplane separating land use classes in feature space
   - Kernel trick (RBF, polynomial) for non-linear boundaries
   - Multi-class via one-vs-rest or one-vs-one strategies

### Why Classical ML (Not Deep Learning)?
- Works with smaller labeled datasets
- Interpretable features (planners can understand "high contrast = urban")
- Computationally efficient for large-scale satellite mosaics
- Established remote sensing pipeline predating CNN dominance

## Data Requirements

| Modality | Description |
|----------|-------------|
| **Input** | Aerial/satellite RGB or multispectral imagery |
| **Labels** | Per-patch land use class (from ground truth or GIS) |
| **Resolution** | Typically 0.5–30m per pixel depending on application |

## Land Use Categories (Typical)

| Class | Visual Texture Characteristics |
|-------|-------------------------------|
| Residential | Fine grain, regular patterns, mixed with vegetation |
| Commercial | Large flat roofs, parking lots, high reflectance |
| Industrial | Large uniform structures, bare ground |
| Agricultural | Regular field patterns, seasonal color change |
| Forest | High homogeneity, dark tone, fine texture |
| Water | Very low texture, homogeneous, dark/bright |

## Outputs & Use Cases

- City-scale land use maps for urban planning
- Change detection (monitor urban sprawl over decades)
- Environmental impact assessment
- Input to B5 urban layout generation models

## Connection to Course

- Urban planning AI applications table
- Geospatial data modality (OpenStreetMap, UrbanGIS datasets in Step 5)
- Classical ML alongside deep learning in the course's algorithm survey

## Limitations

- Texture features fail across seasons, sensors, and geographic regions
- Mixed-pixel problem at coarse resolution
- CNNs often outperform SVM on large remote sensing datasets today
- Paywalled original paper

## Key References

```
[6] Chen, X., et al. "Land Use Classification using Texture Analysis and SVM."
    ISPRS Journal of Photogrammetry and Remote Sensing, vol. 147, 2019.
    doi:10.1016/j.isprsjprs.2019.02.023
```
