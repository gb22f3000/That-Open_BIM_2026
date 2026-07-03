# B4 — Interior Style Classification

## Application Summary

| Field | Detail |
|-------|--------|
| **Task** | Classify interior spaces and furnishings by design style |
| **Algorithm** | CNN with Transfer Learning |
| **Primary Paper** | Khan, S., et al. (2020) [4] — Interior Style variant |
| **Journal** | *Journal of Building Engineering*, Vol. 33 |
| **Open Access** | Related: `04_Khan_Related_DeepLearningArchitect_2018.pdf` |

## Problem Statement

Interior style classification identifies whether a space is Modern, Scandinavian, Industrial, Minimalist, etc. This supports automated tagging, style-based search, and conditioning generative interior tools.

## How the Algorithm Works

Same CNN + transfer learning pipeline as A1 (Architecture Style Classification), applied to **interior photographs** instead of building exteriors:

1. Pre-trained CNN (VGG16, ResNet, or Inception) on ImageNet
2. Fine-tune on interior design image dataset with style labels
3. Classify new interior images into style categories

### Interior vs. Exterior Differences
| Aspect | Exterior (A1) | Interior (B4) |
|--------|---------------|---------------|
| Features | Facade, massing, ornament | Furniture, color palette, lighting, materials |
| Dataset | Building facade images | Room interior photographs |
| Classes | Gothic, Art Deco, Modern | Scandinavian, Industrial, Bohemian, etc. |

## Data Requirements

- RGB interior photographs with style labels
- Multiple images per style class
- Consistent labeling guidelines (what defines "Scandinavian" vs. "Minimalist")

## Outputs & Use Cases

- Automatic Pinterest/Instagram-style tagging
- Interior design app style filters
- Training labels for interior GANs
- Client preference profiling

## Connection to Course

- Same author (Khan) and method family as A1
- Interior design section of AI applications table
- Pairs with B3 (furniture layout) and A4 (recommendation) for full interior AI pipeline

## Key References

```
[4] Khan, S., et al. "Interior Style Classification using Deep Learning."
    Journal of Building Engineering, vol. 33, 2020.
    (Same volume as Architecture Style Classification paper)
```
