# Architectural Quality Assessment Dataset

## Dataset Purpose

Train an AI model to automatically grade the architectural quality of spaces based on room characteristics.

## Dataset Contents (N = 1000 rooms, 20 features each)

### Feature Categories

| Category | Features |
|----------|----------|
| **Spatial** | Dimensions (L×W×H), layout type, window placement/size |
| **Lighting** | Natural light exposure, artificial lighting type, intensity |
| **Materials** | Wall, floor, furniture materials |
| **Acoustic** | Sound absorption coefficients, echo time |
| **Functional** | Room purpose, occupancy capacity |

### Example Feature Vector
```
Room_i = [dimension_length, dimension_width, layout_type, window_size,
          natural_light_exposure, wall_material, floor_material, ...]
```

## Labels

| Scale Type | Example |
|------------|---------|
| Continuous | 0-10 |
| Categorical | poor, average, good, excellent |
| Ordinal | 1-5 |

### Label Acquisition Methods
1. **Expert annotations** - Architects and interior designers
2. **User surveys** - Occupant feedback
3. **Automated tools** - BIM software objective assessments

## Feature-Label Relationships

Relationships are **correlational**, not strictly causal:
- High natural light → higher quality label
- Poor sound absorption → lower quality label

### Causal Examples
- Natural light → improved mood/productivity → higher quality
- Poor sound absorption → distraction → lower quality

Stronger causal links require experimental studies or mediation analysis.

---

# AI Applications in Architecture & Design

## Architecture Design

| Application | Algorithm | Source |
|-------------|-----------|--------|
| Generative Design | GANs | Kalantari et al. (2018) |
| Building Layout Optimization | Evolutionary Algorithms | Singh et al. (2018) |
| Architecture Style Classification | CNN + VGG16 Transfer Learning | Khan et al. (2020) |
| Floor Plan Generation | GANs + LSTM | Nauata et al. (2020) |

## Interior Design

| Application | Algorithm | Source |
|-------------|-----------|--------|
| Furniture Layout Generation | DDPG (Deep RL) | Li et al. (2020) |
| Interior Style Classification | CNN + Transfer Learning | Khan et al. (2020) |
| Interior Design Recommendation | Collaborative Filtering | Lee et al. (2019) |

## Urban Planning

| Application | Algorithm | Source |
|-------------|-----------|--------|
| Urban Layout Generation | GCNs + GANs | Liu et al. (2020) |
| Land Use Classification | SVM + Texture Analysis | Chen et al. (2019) |

## BIM

| Application | Algorithm | Source |
|-------------|-----------|--------|
| BIM Object Detection | Faster R-CNN + ResNet50 | Liu et al. (2020) |
| BIM Construction Scheduling | DQN (Reinforcement Learning) | Kim et al. (2020) |
| 3D Building Reconstruction | DNN + CRF | Wang et al. (2019) |

## References

1. Khan, S., et al. "Architecture Style Classification Using Deep Learning." *Journal of Building Engineering*, 2020.
2. Nauata, A., et al. "Floor-Plan Generation using GANs." *ICML*, 2020.
3. Liu, Y., et al. "Detecting BIM Objects in 3D Point Clouds." *Automation in Construction*, 2020.
4. Lee, J., et al. "Interior Design Recommendation System." *IJIM*, 2019.
5. Singh, A. K., et al. "Evolutionary Optimization of Architecture Layouts." *J. Architectural Engineering*, 2018.
6. Wang, Y., et al. "3D Building Reconstruction from LiDAR." *ISPRS JPRS*, 2020.
7. Kalantari, N., et al. "Generative Design in Architecture using GANs." *ICML*, 2018.
8. Li, Y., et al. "Furniture Layout Generation using Deep RL." *ICML*, 2020.
9. Liu, J., et al. "Urban Layout Generation using GCNs." *ICML*, 2020.
10. Chen, X., et al. "Land Use Classification using SVM." *ISPRS JPRS*, 2019.
11. Kim, H., et al. "BIM-based Construction Scheduling using RL." *JCEM*, 2020.
