# AI in Architecture & Design (EDX Course)

Recreated from the original `.docx` course materials as Jupyter notebooks and markdown insight files.

## Project Structure

```
AI_Arch_Des_EDX/
├── notebooks/          # Jupyter notebooks (runnable code)
├── insights/           # Written assignments, reflections, and theory
├── helpers/            # Python modules for floor plan graph tutorials
├── data/               # Place datasets here (see below)
└── requirements.txt
```

## Notebooks

| # | File | Source | Description |
|---|------|--------|-------------|
| 01 | `01_neuralnet_pytorch_tutorial.ipynb` | Coding Tutorial_NeuralNetByPyTorch.docx | Ungraded PyTorch neural net tutorial for building energy efficiency |
| 02 | `02_neuralnet_linear_classifier_assignment.ipynb` | Coding Tutorial_NeuralNetByPyTorch.docx | Graded linear classifier assignment |
| 03 | `03_sketchpad_part1_python_basics.ipynb` | Voraceum_Coding_Practice.docx | Python basics (variables, functions, libraries) |
| 04 | `04_sketchpad_part2_elements_of_layout.ipynb` | Voraceum_Coding_Practice.docx | Floor layout shapes, numpy, matplotlib, dictionaries |
| 05 | `05_graphing_floor_plans.ipynb` | Voraceum_Coding_Practice.docx | MSD dataset floor plan graphs with NetworkX |

## Insights (Markdown)

| File | Content |
|------|---------|
| `01_room_description_assignments.md` | Room description assignments (study room + studio apartment zones) |
| `02_ai_in_architecture_insights.md` | Expert podcasts, generative design, AI paradigm shift |
| `03_stable_diffusion_and_data_ethics.md` | Stable Diffusion applications, data modalities, ethics |
| `04_desarchdev_proposal.md` | DesArchdev AI tool proposal and ethics |
| `05_architectural_quality_and_ai_applications.md` | Quality assessment dataset + AI application catalog |
| `06_research_references_elaborated.md` | Expanded research paper summaries with methods and relevance |
| `07_ai_applications_master_guide.md` | **AI applications catalog** — all 12 applications with algorithms and papers |
| `applications/*.md` | **Per-application detailed notes** (A1–A6, B1, B3–B6, B8) |

## Notebook Guides (`insights/notebooks/`)

| Guide | Notebook |
|-------|----------|
| `01_neuralnet_pytorch_tutorial.md` | PyTorch neural net tutorial explained |
| `02_neuralnet_linear_classifier_assignment.md` | Linear classifier assignment explained |
| `03_sketchpad_part1_python_basics.md` | Python basics explained |
| `04_sketchpad_part2_elements_of_layout.md` | Floor layout geometry explained |
| `05_graphing_floor_plans.md` | MSD graph representation explained |

## Setup

```bash
pip install -r requirements.txt
python scripts/generate_sample_data.py   # creates sample BEEC + MSD data
python scripts/execute_all_notebooks.py  # run all notebooks and save outputs
jupyter lab
```

All notebooks have been **executed** with saved cell outputs. Re-run anytime with the execute script above.

## Data Requirements

### Building Energy Efficiency (notebooks 01-02)
Place the BEEC dataset under:
```
data/beec_dataset/
├── embeddings/
│   ├── embeddings_train.pkl.gz
│   └── embeddings_test.pkl.gz
└── labels/
    ├── train.csv
    └── test.csv
```

### MSD Floor Plan Graphs (notebook 05)
Download from [Kaggle: Modified Swiss Dwellings](https://www.kaggle.com/datasets/caspervanengelenburg/modified-swiss-dwellings) and place `.pickle` files in:
```
data/msd_graphs/
```

## Research Papers (`papers&journals/`)

10 open-access PDFs downloaded (arXiv, CVF, author pages). See [`papers&journals/README.md`](papers&journals/README.md) for the full manifest.

```bash
python scripts/download_papers.py   # re-download open-access papers
```

## Original Source Files

The content was extracted from:
- `Assignments & Notes.docx`
- `Coding Tutorial_NeuralNetByPyTorch.docx`
- `Voraceum_Coding_Practice.docx`
