# A3 — BIM Object Detection in 3D Point Clouds

## Application Summary

| Field | Detail |
|-------|--------|
| **Task** | Detect and classify BIM components (walls, columns, doors) in 3D scans |
| **Algorithm** | Faster R-CNN with ResNet50 backbone |
| **Primary Paper** | Liu, Y., et al. (2020) [3] |
| **Journal** | *Automation in Construction*, Vol. 118 |
| **DOI** | [10.1016/j.autcon.2020.103276](https://doi.org/10.1016/j.autcon.2020.103276) |
| **Open Access** | ❌ Paywalled (Elsevier) |

## Problem Statement

Construction sites and existing buildings are increasingly captured as **3D point clouds** (LiDAR, photogrammetry). Converting these scans into structured BIM models manually is labor-intensive. Automated object detection identifies building elements, enabling scan-to-BIM pipelines and as-built verification.

## How the Algorithm Works

### Faster R-CNN + ResNet50
```
Point Cloud → Voxelization/Projection → ResNet50 Feature Extraction
    → Region Proposal Network → Bounding Box + Class per BIM Element
```

1. **Point cloud preprocessing**: Convert unstructured 3D points to voxels or multi-view 2D projections
2. **ResNet50 backbone**: Deep residual network extracts hierarchical spatial features
3. **Faster R-CNN**: Jointly proposes object regions and classifies them in one pass
4. **Output**: 3D bounding boxes with labels (wall, column, beam, door, window, etc.)

### Why Faster R-CNN?
- Two-stage detector: high accuracy for structured objects like walls and columns
- ResNet50 provides strong feature representation with manageable compute
- Well-established in construction robotics and scan-to-BIM research

## Data Requirements

| Modality | Description |
|----------|-------------|
| **Input** | 3D point clouds from terrestrial or aerial LiDAR |
| **Labels** | 3D bounding boxes with BIM element class per object |
| **Training** | Thousands of annotated point cloud scenes |

## Outputs & Use Cases

- **Scan-to-BIM**: Automatic creation of BIM models from site scans
- **As-built verification**: Compare detected elements against design BIM
- **Digital twins**: Populate virtual building models with real geometry
- **Progress monitoring**: Track installed elements during construction

## Connection to Course

- DesArchdev BIM integration and fire safety checking
- Stable Diffusion data modality: point clouds, 3D models
- Complements A6 (3D Building Reconstruction) — detection vs. full reconstruction

## Limitations

- Point cloud quality (occlusion, noise, incomplete scans) degrades accuracy
- Expensive labeled 3D training data
- Element taxonomy must match target BIM schema (IFC classes)
- Paywalled — access via institutional library or DOI

## Related Open-Access Papers

| File | Relevance |
|------|-----------|
| `08_AI_Architecture_Survey_2023.pdf` | Reviews BIM + deep learning applications |

## Key References

```
[3] Liu, Y., et al. "Detecting BIM Objects in 3D Point Clouds using Deep Learning."
    Automation in Construction, vol. 118, 2020.
    doi:10.1016/j.autcon.2020.103276
```
