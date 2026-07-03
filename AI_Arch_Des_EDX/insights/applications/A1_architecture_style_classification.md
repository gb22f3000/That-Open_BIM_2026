# A1 — Architecture Style Classification

## Application Summary

| Field | Detail |
|-------|--------|
| **Task** | Automatically classify buildings by architectural style from images |
| **Algorithm** | Convolutional Neural Network (CNN) with Transfer Learning (VGG16) |
| **Primary Paper** | Khan, S., et al. (2020) [1] |
| **Journal** | *Journal of Building Engineering*, Vol. 33 |
| **DOI** | [10.1016/j.jobe.2020.101933](https://doi.org/10.1016/j.jobe.2020.101933) |

## Problem Statement

Architectural style classification traditionally requires expert historians to visually analyze facades, ornamentation, massing, and period-specific features. At urban scale, manual classification is impractical. Automated CNN-based classification enables heritage surveys, style-aware search, and training data labeling for generative models.

## How the Algorithm Works

### 1. Transfer Learning with VGG16
- **VGG16** is pre-trained on ImageNet (1.2M natural images, 1000 classes).
- Low-level layers detect edges, textures, and patterns that transfer to architectural imagery.
- The final fully-connected layers are replaced and retrained for architectural style classes.

### 2. CNN Pipeline
```
Input Image → Convolutional Layers → Feature Maps → Pooling → FC Layers → Style Label
```

### 3. Training Process
1. Collect labeled images per architectural style (Gothic, Modern, Baroque, etc.)
2. Resize/crop images to VGG16 input size (typically 224×224)
3. Fine-tune pre-trained weights on architectural dataset
4. Evaluate with accuracy, confusion matrix, per-class precision/recall

## Data Requirements

| Modality | Description |
|----------|-------------|
| **Input** | 2D RGB images of building facades, elevations, or full structures |
| **Labels** | Discrete style categories (expert-annotated) |
| **Size** | Hundreds to thousands of images per class for reliable training |

## Outputs & Use Cases

- **Heritage mapping** — Catalog styles across a city or region
- **Design search** — Retrieve buildings similar in style to a reference
- **Generative conditioning** — Style labels as input to GANs/Stable Diffusion
- **Education** — Interactive style recognition tools for architecture students

## Connection to Course

- Assignment Step 4: Computer Vision models for visual architectural data
- Stable Diffusion: architectural style labels as text/image conditioning
- DesArchdev: style-aware design generation

## Limitations

- Style is culturally subjective; Western-centric training data biases results
- Facade-only images miss plan-based and spatial style cues
- Hybrid or regional styles are hard to classify into single categories
- Paywalled original paper; related open-access: `papers&journals/open_access/04_Khan_Related_DeepLearningArchitect_2018.pdf`

## Related Open-Access Papers (Downloaded)

| File | Relevance |
|------|-----------|
| `04_Khan_Related_DeepLearningArchitect_2018.pdf` | CNN classification of 34 architects' works |
| `08_AI_Architecture_Survey_2023.pdf` | Comprehensive DL in architecture survey citing Khan et al. |

## Key References

```
[1] Khan, S., et al. "Architecture Style Classification Using Deep Learning."
    Journal of Building Engineering, vol. 33, 2020.
    doi:10.1016/j.jobe.2020.101933
```
