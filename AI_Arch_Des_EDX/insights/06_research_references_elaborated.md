# Research References — Elaborated Guide

Expanded bibliography from **Assignments & Notes.docx**, covering AI applications in architecture, datasets, and the papers cited in the course assignments.

---

## 1. Khan, S., et al. (2020)
**"Architecture Style Classification Using Deep Learning"**  
*Journal of Building Engineering*, Vol. 33, 2020.  
DOI: [10.1016/j.jobe.2020.101933](https://doi.org/10.1016/j.jobe.2020.101933)

### What the paper addresses
Automated recognition of architectural styles (e.g., Gothic, Modern, Baroque) from building images — a task traditionally requiring expert art/architecture historians.

### Method
- **Convolutional Neural Network (CNN)** with **transfer learning** using **VGG16** pre-trained on ImageNet.
- Fine-tuning replaces the final classification layer to predict architectural style categories.
- Transfer learning is effective because low-level visual features (edges, textures) learned on natural images transfer to facade ornamentation and massing patterns.

### Why it matters for architects
Enables large-scale analysis of urban fabric, heritage cataloguing, and style-aware generative tools. Connects to Assignment Step 4 (Computer Vision models for architectural image data).

### Limitations
- Style labels can be culturally subjective and geographically biased.
- Facade-only images miss spatial and plan-based style cues.

---

## 2. Nauata, A., et al. (2020)
**"Floor-Plan Generation using Generative Adversarial Networks"**  
*Proceedings of the 37th International Conference on Machine Learning (ICML)*, 2020.

### What the paper addresses
Automatic generation of residential **floor plan layouts** from high-level specifications, reducing manual drafting in early design.

### Method
- **Generative Adversarial Network (GAN)** architecture combined with **LSTM** (Long Short-Term Memory) networks.
- LSTM captures sequential/spatial dependencies between rooms (adjacency, connectivity).
- GAN framework: generator creates plan layouts; discriminator judges realism vs. real plans.

### Why it matters
Directly relevant to **DesArchdev** proposal and Stable Diffusion space-planning use cases. Demonstrates that plan generation needs **relational** reasoning, not just pixel synthesis.

### Limitations
- Generated plans may violate building codes or ergonomic constraints without post-processing.
- Training data diversity limits generalization to non-residential typologies.

---

## 3. Liu, Y., et al. (2020)
**"Detecting BIM Objects in 3D Point Clouds using Deep Learning"**  
*Automation in Construction*, Vol. 118, 2020.  
DOI: [10.1016/j.autcon.2020.103276](https://doi.org/10.1016/j.autcon.2020.103276)

### What the paper addresses
Identifying BIM components (walls, columns, doors) directly from **3D point cloud** scans of construction sites — bridging site reality and digital models.

### Method
- **Faster R-CNN** object detection framework with **ResNet50** backbone.
- Point clouds voxelized or projected into representations suitable for 2D/3D CNN detection heads.
- Outputs bounding regions/class labels for BIM element types.

### Why it matters
Supports scan-to-BIM workflows, as-built verification, and digital twin creation. Links to DesArchdev's BIM integration and point-cloud data modality in Stable Diffusion analysis.

### Limitations
- Point cloud quality (occlusion, noise) heavily affects accuracy.
- Requires labeled training data costly to produce at scale.

---

## 4. Lee, J., et al. (2019)
**"Interior Design Recommendation System using Collaborative Filtering"**  
*International Journal of Information Technology and Management*, Vol. 18, No. 2, 2019.

### What the paper addresses
Recommending interior design elements (furniture, color schemes, layouts) based on user preferences and behavior patterns.

### Method
- **Collaborative filtering** with **matrix factorization**.
- User-item interaction matrix decomposed into latent preference factors.
- Similar users' choices inform recommendations for new users (user-based CF) or similar items cluster together (item-based CF).

### Why it matters
Shows a **non-deep-learning** AI approach still valuable in design domains with sparse preference data. Relevant to interior design AI applications table in assignments.

### Limitations
- Cold-start problem for new users/items with no history.
- Does not inherently enforce spatial or ergonomic constraints.

---

## 5. Singh, A. K., et al. (2018)
**"Evolutionary Optimization of Architecture Layouts"**  
*Journal of Architectural Engineering*, Vol. 24, No. 2, 2018.  
DOI: [10.1061/(ASCE)AE.1943-5568.0000281](https://doi.org/10.1061/(ASCE)AE.1943-5568.0000281)

### What the paper addresses
Optimizing spatial **layout configurations** (room positions, sizes, adjacencies) to satisfy multiple design objectives: circulation, daylight, energy, or cost.

### Method
- **Evolutionary Algorithms (EA)** with **Genetic Programming**.
- Candidate layouts encoded as chromosomes; fitness functions score performance.
- Selection, crossover, and mutation evolve populations toward Pareto-optimal solutions.

### Why it matters
Predates deep generative models but remains foundational for **constraint-based** layout optimization. Autodesk Fusion generative design uses related optimization philosophy at component scale.

### Limitations
- Computationally expensive for large programs with many constraints.
- Fitness function design requires domain expertise.

---

## 6. Wang, Y., et al. (2020)
**"3D Building Reconstruction from Aerial LiDAR Point Clouds"**  
*ISPRS Journal of Photogrammetry and Remote Sensing*, Vol. 157, 2020.  
DOI: [10.1016/j.isprsjprs.2020.02.005](https://doi.org/10.1016/j.isprsjprs.2020.02.005)

### What the paper addresses
Reconstructing **3D building models** from aerial **LiDAR** point clouds for urban mapping, energy modeling, and city-scale analysis.

### Method
- **Deep Neural Networks (DNN)** for semantic labeling of points.
- **Conditional Random Fields (CRF)** refine predictions using spatial consistency between neighboring points.
- Pipeline: classify roof/facade/ground points → assemble watertight building meshes.

### Why it matters
Connects to Rotterdam BEEC tutorial (aerial building analysis) and geospatial data modalities in Stable Diffusion assignments. Enables city-scale digital twins.

### Limitations
- Complex roof structures and dense urban contexts remain challenging.
- Requires high-quality LiDAR acquisition campaigns.

---

## 7. Kalantari, N., et al. (2018)
**"Generative Design in Architecture using GANs"**  
*Proceedings of the 35th International Conference on Machine Learning (ICML)*, 2018.

### What the paper addresses
Early exploration of **GAN-based generative design** for architectural form-finding — producing novel massing and facade alternatives from training on existing buildings.

### Method
- **Generative Adversarial Networks** trained on datasets of architectural imagery or parametric encodings.
- Generator explores design latent space; discriminator enforces statistical similarity to real projects.

### Why it matters
Foundational reference linking GANs to architectural creativity. Supports course discussion of generative vs. discriminative AI (DesArchdev Step 2).

### Limitations
- Output interpretability and parametric editability are limited compared to rule-based or BIM-native generators.

---

## 8. Li, Y., et al. (2020)
**"Furniture Layout Generation using Deep Reinforcement Learning"**  
*Proceedings of the 38th International Conference on Machine Learning (ICML)*, 2020.

### What the paper addresses
Automatically arranging **furniture** in interior spaces respecting clearance, facing directions, and functional zones.

### Method
- **Deep Deterministic Policy Gradients (DDPG)** — actor-critic reinforcement learning.
- Agent places/moves furniture items sequentially; reward function encodes ergonomics, clearance, and design rules.

### Why it matters
Demonstrates **RL** for sequential spatial decisions — complementary to GAN whole-plan generation. Relevant to interior design AI applications.

### Limitations
- Reward engineering is critical and may not capture subjective aesthetic goals.

---

## 9. Liu, J., et al. (2020)
**"Urban Layout Generation using Graph Convolutional Networks"**  
*Proceedings of the 39th International Conference on Machine Learning (ICML)*, 2020.

### What the paper addresses
Generating **urban block layouts** and street networks using graph-structured data rather than pixel grids.

### Method
- **Graph Convolutional Networks (GCNs)** operate on nodes (blocks, intersections) and edges (streets).
- Combined with **GANs** for generating novel urban configurations conditioned on constraints.

### Why it matters
Directly parallels Notebook 05 (floor plan graphs). Shows graph neural networks are the natural architecture for relational spatial AI at both building and city scale.

### Limitations
- Simplified urban models may not capture zoning law, infrastructure, and stakeholder complexity.

---

## 10. Chen, X., et al. (2019)
**"Land Use Classification using Texture Analysis and SVM"**  
*ISPRS Journal of Photogrammetry and Remote Sensing*, Vol. 147, 2019.

### What the paper addresses
Classifying **land use** categories (residential, commercial, industrial, green space) from aerial/satellite imagery for urban planning.

### Method
- **Texture analysis** extracts statistical patterns from image regions.
- **Support Vector Machines (SVM)** classify feature vectors into land use categories.

### Why it matters
Classic geospatial ML pipeline — relevant to UrbanGIS, OpenStreetMap, and NASA datasets listed in Stable Diffusion Step 5. Shows not all architectural AI requires deep learning.

### Limitations
- Texture features may fail across seasons, sensor types, or developing-world urban morphologies.

---

## 11. Kim, H., et al. (2020)
**"BIM-based Construction Scheduling using Reinforcement Learning"**  
*Journal of Construction Engineering and Management*, Vol. 146, No. 2, 2020.

### What the paper addresses
Optimizing **construction schedules** using BIM model information (quantities, dependencies, durations) and AI-based decision making.

### Method
- **Deep Q-Networks (DQN)** — value-based reinforcement learning.
- State: current project status from BIM; Action: schedule task ordering/resource allocation; Reward: time/cost minimization.

### Why it matters
Extends AI in AEC beyond design into **construction management**. Demonstrates BIM as structured input modality for ML (aligns with DesArchdev BIM integration).

### Limitations
- Real construction uncertainty (weather, supply chain) difficult to fully model.

---

## Cross-Cutting Themes from Assignments

| Theme | Papers |
|-------|--------|
| **Computer Vision** | Khan (2020), Liu/Y BIM detection (2020), Wang (2020) |
| **Generative Models** | Nauata (2020), Kalantari (2018), Liu/J urban GCN (2020) |
| **Optimization** | Singh (2018), Kim (2020) |
| **Recommendation / CF** | Lee (2019) |
| **Geospatial / Urban** | Chen (2019), Wang (2020), Liu/J (2020) |
| **Interior / Layout** | Li (2020), Nauata (2020), Lee (2019) |

## Suggested Reading Order

1. **Singh (2018)** — optimization baseline for layouts
2. **Khan (2020)** — CNN transfer learning entry point
3. **Nauata (2020)** — generative floor plans
4. **Liu/J (2020)** — graph-based spatial AI (pairs with Notebook 05)
5. **Kim (2020)** — BIM + RL for construction

## How to Access

| Resource | URL |
|----------|-----|
| Google Scholar | [scholar.google.com](https://scholar.google.com) |
| DOI resolver | [https://doi.org/](https://doi.org/) |
| arXiv (many ICML papers) | [arxiv.org](https://arxiv.org) |
| Semantic Scholar | [semanticscholar.org](https://www.semanticscholar.org) |

> **Note:** Some conference papers may be available as preprints. Verify final published versions for citations in academic work.
