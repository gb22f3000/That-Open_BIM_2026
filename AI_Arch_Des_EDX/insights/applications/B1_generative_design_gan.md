# B1 — Generative Design in Architecture (GANs)

## Application Summary

| Field | Detail |
|-------|--------|
| **Task** | Generate novel architectural forms and design alternatives using AI |
| **Algorithm** | Generative Adversarial Networks (GANs) |
| **Primary Paper** | Kalantari, N., et al. (2018) [7] |
| **Venue** | ICML 2018 Workshop |
| **Open Access** | Related: ✅ `06_FrankenGAN_GenerativeFacade_2018.pdf` |

## Problem Statement

Traditional generative design (rule-based parametric modeling) requires manually coded rules. GANs learn the **statistical distribution** of existing designs and generate new samples that look plausible. This enables data-driven exploration of form, facade, and material possibilities.

## How the Algorithm Works

### GAN Framework
```
Random Noise (z) → Generator G(z) → Synthetic Design
                        ↓
Real Designs → Discriminator → Real vs. Fake Score → Backprop to improve G
```

1. **Generator**: Maps random latent vector to a design (image, parametric encoding, or layout)
2. **Discriminator**: Trained to distinguish real designs from generated ones
3. **Adversarial training**: Generator improves to fool discriminator; discriminator improves to detect fakes
4. **Result**: Generator produces increasingly realistic novel designs

### Kalantari et al. (2018) Context
The ICML 2018 workshop paper explores GAN-based generative design for architecture. Related work by the same research community includes **FrankenGAN** (Kelly et al., 2018) — a cascade of GANs that adds realistic facade, roof, and window details to coarse massing models guided by style reference images.

## FrankenGAN (Downloaded Open-Access Related Paper)

```
Coarse Mass Model → GAN Chain 1 (Facade) → GAN Chain 2 (Roof) → GAN Chain 3 (Windows) → Detailed Building
```

- Five cascaded GAN chains for facade textures, roof details, window elements
- Style vectors synchronize appearance across chains
- User provides reference images for style guidance

## Data Requirements

| Modality | Description |
|----------|-------------|
| **Training** | Large dataset of architectural images or parametric design encodings |
| **Input** | Random noise + optional style/constraint vectors |
| **Output** | Generated design images or parametric models |

## Outputs & Use Cases

- Conceptual design exploration (massing, facade variations)
- Style-consistent detail generation on coarse models
- Training data augmentation for other ML tasks
- Inspiration boards for architects

## Connection to Course

- Generative vs. discriminative AI discussion (DesArchdev Step 2)
- Autodesk Fusion generative design (commercial parallel)
- Foundation for Stable Diffusion and modern text-to-image tools

## Limitations

- Generated designs may not be structurally buildable
- Limited parametric editability compared to rule-based systems
- Training data bias reflects styles in the dataset
- Original Kalantari ICML paper may be workshop-only; FrankenGAN is the accessible open-access related work

## Key References

```
[7] Kalantari, N., et al. "Generative Design in Architecture using GANs."
    Proceedings of ICML, 2018.

Related: Kelly, T., et al. "FrankenGAN: Guided Detail Synthesis for Mass Models using Style-Synced GANs."
    arXiv:1806.07179, 2018. (Downloaded)
```
