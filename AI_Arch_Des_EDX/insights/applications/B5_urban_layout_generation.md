# B5 — Urban Layout Generation (GCN + GAN)

## Application Summary

| Field | Detail |
|-------|--------|
| **Task** | Generate urban land-use configurations and city block layouts |
| **Algorithm** | Graph Convolutional Networks (GCNs) + Generative Adversarial Networks (GANs) |
| **Primary Paper** | Liu, J., et al. (2020) [5] |
| **Venue** | ICML 2020 |
| **Open Access** | ✅ `03_Wang_LUCGAN_UrbanPlanning_GCN_GAN_2020.pdf` + `09_Wang_LUCGAN_SIGSPATIAL_2020.pdf` |

## Problem Statement

Urban planners must configure land use (residential, commercial, green space, industrial) within city blocks while respecting surrounding context, zoning, and accessibility. Manual planning at city scale is slow. AI models learn from existing city configurations to generate plausible new layouts.

## How the Algorithm Works

### LUCGAN Framework (Wang et al., SIGSPATIAL 2020)
The closest open-access match to "GCN + GAN for urban layout":

```
Spatial Graph (city blocks) → GCN Encoder → Latent Vector z → GCN Decoder → Land-Use Plan
                                    ↑
                              GAN Discriminator
```

1. **Spatial graph**: Nodes = land parcels; edges = adjacency; node features = current land use, area, demographics
2. **GCN Layer 1**: Aggregates neighbor features → low-dimensional embedding
3. **GCN Layer 2**: Outputs mean μ and variance σ² for latent distribution
4. **GAN training**: Generator produces land-use configurations; discriminator judges realism
5. **Output**: Predicted land-use assignment for each parcel in the urban block

### GlobalMapper (ICCV 2023) — Downloaded Extension
`10_GlobalMapper_UrbanLayout_ICCV2023.pdf` — Graph attention networks for arbitrary-shaped urban building layouts given road networks. Generates realistic layouts for 28 large cities.

## Data Requirements

| Modality | Description |
|----------|-------------|
| **Input** | Spatial graphs of urban blocks with attributed nodes |
| **Context** | Surrounding land use, demographics, road network |
| **Output** | Land-use configuration plan per parcel |

## Outputs & Use Cases

- Automated land-use planning scenarios
- Urban design exploration for new developments
- Policy impact simulation (what-if zoning changes)
- Smart city digital twin population

## Connection to Course

- Urban planning section of AI applications table
- Graph representation links to Notebook 05 (MSD floor plan graphs) at building scale
- Geospatial data modality in Stable Diffusion assignments

## Limitations

- Simplified urban models ignore infrastructure, politics, community input
- Training data geography-specific (Swiss/US cities may not generalize globally)
- Generated plans need expert review for regulatory compliance

## Key References

```
[5] Liu, J., et al. "Urban Layout Generation using Graph Convolutional Networks."
    Proceedings of ICML, 2020.

Downloaded related:
  Wang, D., et al. "Reimagining City Configuration: Automated Urban Planning
    via Adversarial Learning." SIGSPATIAL 2020. arXiv:2008.09912

  He, L., Aliaga, D. "GlobalMapper: Arbitrary-Shaped Urban Layout Generation."
    ICCV 2023. (Downloaded)
```
