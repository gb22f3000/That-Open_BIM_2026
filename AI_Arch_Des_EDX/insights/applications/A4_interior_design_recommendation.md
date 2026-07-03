# A4 — Interior Design Recommendation

## Application Summary

| Field | Detail |
|-------|--------|
| **Task** | Recommend interior design elements (furniture, colors, layouts) to users |
| **Algorithm** | Collaborative Filtering with Matrix Factorization |
| **Primary Paper** | Lee, J., et al. (2019) [4] |
| **Journal** | *International Journal of Information Technology and Management*, Vol. 18, No. 2 |
| **Open Access** | ❌ Publisher access required |

## Problem Statement

Interior design involves matching user preferences with vast catalogs of furniture, materials, and color schemes. Expert designers intuitively know what combinations work; novices struggle. Recommendation systems learn preference patterns from user behavior to suggest personalized designs.

## How the Algorithm Works

### Collaborative Filtering (CF)
```
User-Item Interaction Matrix → Matrix Factorization → Latent User & Item Vectors → Predictions
```

1. **User-item matrix**: Rows = users, columns = design items (furniture, colors, styles); values = ratings/interactions
2. **Matrix factorization**: Decompose matrix into low-rank user and item latent factors
3. **Prediction**: Dot product of user and item vectors estimates preference score
4. **Recommendation**: Top-N items with highest predicted scores for each user

### Types of Collaborative Filtering
| Type | Logic |
|------|-------|
| **User-based** | "Users similar to you liked X" |
| **Item-based** | "People who liked X also liked Y" |
| **Model-based (MF)** | Learn latent factors via optimization (SVD, ALS) |

### Why Not Deep Learning?
CF works well when interaction data is sparse but patterns exist across users. No image processing needed — purely behavioral/preferences data.

## Data Requirements

| Modality | Description |
|----------|-------------|
| **Input** | User interaction history (views, likes, purchases, ratings) |
| **Catalog** | Interior design items with metadata (style, color, dimensions) |
| **Output** | Ranked list of recommended items per user |

## Outputs & Use Cases

- E-commerce interior platforms (IKEA, Wayfair-style recommendations)
- Design assistant apps suggesting furniture for a room photo
- Mood board generation from preference profiles
- Client consultation tools for interior designers

## Connection to Course

- Discriminative (not generative) AI — predicts preferences, doesn't create designs
- Contrasts with B3 (Furniture Layout Generation) which *creates* layouts via RL
- Interior design domain in AI applications table

## Limitations

- **Cold start**: New users/items with no history get poor recommendations
- No spatial constraint enforcement (recommended sofa may not fit the room)
- Popularity bias favors mainstream styles
- Paywalled original paper

## Key References

```
[4] Lee, J., et al. "Interior Design Recommendation System using Collaborative Filtering."
    International Journal of Information Technology and Management,
    vol. 18, no. 2, 2019.
```
