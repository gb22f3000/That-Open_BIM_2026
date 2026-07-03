# Research Papers — Library Manifest

Local copies of freely available research papers supporting the AI Applications catalog in `insights/07_ai_applications_master_guide.md`.

---

## Open Access Papers (Downloaded)

| File | Paper | Maps to Application | Source |
|------|-------|---------------------|--------|
| `open_access/01_Nauata_HouseGAN_FloorPlan_2020.pdf` | House-GAN: Relational GANs for Graph-constrained House Layout Generation | A2 Floor Plan Generation | [arxiv:2003.06988](https://arxiv.org/abs/2003.06988) |
| `open_access/02_Hu_Graph2Plan_FloorPlan_2020.pdf` | Graph2Plan: Learning Floorplan Generation from Layout Graphs | A2 Floor Plan Generation (related) | [arxiv:2004.13204](https://arxiv.org/abs/2004.13204) |
| `open_access/03_Wang_LUCGAN_UrbanPlanning_GCN_GAN_2020.pdf` | Reimagining City Configuration: Automated Urban Planning via Adversarial Learning | B5 Urban Layout Generation | [arxiv:2008.09912](https://arxiv.org/abs/2008.09912) |
| `open_access/04_Khan_Related_DeepLearningArchitect_2018.pdf` | Deep Learning Architect: Classification for Architectural Design | A1 Style Classification (related) | [arxiv:1812.01714](https://arxiv.org/abs/1812.01714) |
| `open_access/05_FurnitureLayout_RL_DiYu_2021.pdf` | Deep RL for Producing Furniture Layout in Indoor Scenes | B3 Furniture Layout (related) | [arxiv:2101.07462](https://arxiv.org/abs/2101.07462) |
| `open_access/06_FrankenGAN_GenerativeFacade_2018.pdf` | FrankenGAN: Guided Detail Synthesis for Mass Models | B1 Generative Design (related) | [arxiv:1806.07179](https://arxiv.org/abs/1806.07179) |
| `open_access/07_GenerativeLayout_ConstraintGraphs_2020.pdf` | Generative Layout Modeling using Constraint Graphs | A2 Floor Plan (related) | [arxiv:2011.13417](https://arxiv.org/abs/2011.13417) |
| `open_access/08_AI_Architecture_Survey_2023.pdf` | Towards AI-Architecture Liberty: Comprehensive Survey | All applications (survey) | [arxiv:2305.00510](https://arxiv.org/abs/2305.00510) |
| `open_access/09_Wang_LUCGAN_SIGSPATIAL_2020.pdf` | LUCGAN — SIGSPATIAL published version | B5 Urban Layout Generation | [VT archive](https://people.cs.vt.edu/~clu/Publication/2020/GIS-2020-Wang.pdf) |
| `open_access/10_GlobalMapper_UrbanLayout_ICCV2023.pdf` | GlobalMapper: Arbitrary-Shaped Urban Layout Generation | B5 Urban Layout (extension) | [CVF open access](https://openaccess.thecvf.com/content/ICCV2023/papers/He_GlobalMapper_Arbitrary-Shaped_Urban_Layout_Generation_ICCV_2023_paper.pdf) |

**Total: 10 PDFs (~120 MB)**

---

## Paywalled Papers (Reference Only)

These papers are cited in the course assignments but require institutional access or purchase. DOI links provided for library access.

| Ref | Paper | DOI | Application |
|-----|-------|-----|-------------|
| [1] | Khan et al. — Architecture Style Classification | [10.1016/j.jobe.2020.101933](https://doi.org/10.1016/j.jobe.2020.101933) | A1, B4 |
| [3] | Liu, Y. et al. — BIM Object Detection in Point Clouds | [10.1016/j.autcon.2020.103276](https://doi.org/10.1016/j.autcon.2020.103276) | A3, B7 |
| [4] | Lee et al. — Interior Design Recommendation | Publisher access | A4 |
| [5] | Singh et al. — Evolutionary Optimization of Layouts | [10.1061/(ASCE)AE.1943-5568.0000281](https://doi.org/10.1061/(ASCE)AE.1943-5568.0000281) | A5, B2 |
| [6] | Wang, Y. et al. — 3D Building Reconstruction LiDAR | [10.1016/j.isprsjprs.2020.02.005](https://doi.org/10.1016/j.isprsjprs.2020.02.005) | A6 |
| [7] | Kalantari et al. — Generative Design using GANs | ICML 2018 workshop | B1 |
| [8] | Li et al. — Furniture Layout DDPG | ICML 2020 | B3 |
| [9] | Liu, J. et al. — Urban Layout GCN | ICML 2020 | B5 |
| [10] | Chen et al. — Land Use SVM | [10.1016/j.isprsjprs.2019.02.023](https://doi.org/10.1016/j.isprsjprs.2019.02.023) | B6 |
| [11] | Kim et al. — BIM Construction Scheduling DQN | [10.1061/(ASCE)CO.1943-7862.0001750](https://doi.org/10.1061/(ASCE)CO.1943-7862.0001750) | B8 |

See `reference_only/` for BibTeX entries (if added).

---

## How Papers Were Obtained

Downloaded July 2026 via:
- **arXiv.org** — open preprints
- **openaccess.thecvf.com** — CVPR/ICCV open access
- **Author-hosted PDFs** — Virginia Tech faculty page

## Regenerating Downloads

```powershell
# Re-run from project root
$papersDir = "papers&journals\open_access"
Invoke-WebRequest -Uri "https://arxiv.org/pdf/2003.06988" -OutFile "$papersDir\01_Nauata_HouseGAN_FloorPlan_2020.pdf"
# ... see download script in git history
```

## Reading Guide

| If you want to understand... | Start with |
|-----------------------------|------------|
| Floor plan AI generation | `01_Nauata_HouseGAN` then `02_Hu_Graph2Plan` |
| Urban planning AI | `03_Wang_LUCGAN` then `10_GlobalMapper` |
| Style classification | `04_Khan_Related_DeepLearningArchitect` |
| Generative facades | `06_FrankenGAN` |
| Full field overview | `08_AI_Architecture_Survey` |
| Interior furniture AI | `05_FurnitureLayout_RL` |

## Legal Note

Open-access papers are shared under their respective licenses (typically arXiv non-exclusive distribution, CVF open access). Paywalled papers are referenced by DOI only — obtain through your institution's library.
