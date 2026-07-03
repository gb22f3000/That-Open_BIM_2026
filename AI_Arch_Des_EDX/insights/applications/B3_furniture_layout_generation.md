# B3 — Furniture Layout Generation (Deep RL)

## Application Summary

| Field | Detail |
|-------|--------|
| **Task** | Automatically place furniture in interior scenes with optimal position and size |
| **Algorithm** | Deep Deterministic Policy Gradients (DDPG) |
| **Primary Paper** | Li, Y., et al. (2020) [8] |
| **Venue** | ICML 2020 |
| **Open Access** | Related: ✅ `05_FurnitureLayout_RL_DiYu_2021.pdf` |

## Problem Statement

Professional interior designers manually plan furniture position and size for functionality, circulation, and aesthetics. This is time-consuming and requires expertise. Formulating layout as a **Markov Decision Process** solved by deep reinforcement learning automates the sequential placement process.

## How the Algorithm Works

### DDPG (Deep Deterministic Policy Gradients)
```
Room State → Actor Network → Furniture Action (position, size, rotation)
     ↑                              ↓
     └──── Critic Network ← Reward (clearance, aesthetics, function)
```

1. **State**: Current room configuration (placed furniture, free space, room boundaries)
2. **Action**: Place next furniture item (x, y, width, height, rotation)
3. **Reward**: Positive for good clearance, functional zones, aesthetic balance; negative for overlaps/blockages
4. **DDPG**: Actor learns deterministic policy; Critic estimates action value
5. **Sequential placement**: Agent places one item at a time until room is furnished

### MDP Formulation
| Component | Interior Layout |
|-----------|----------------|
| State s_t | Room geometry + already placed furniture |
| Action a_t | Next furniture type, position, dimensions |
| Reward r_t | Ergonomic clearance, visual balance, functional grouping |
| Terminal | All required furniture placed or no valid moves |

## Data Requirements

| Modality | Description |
|----------|-------------|
| **Training** | Large dataset of professional interior layouts |
| **Input** | Room boundary polygon + furniture requirements list |
| **Output** | Complete furniture layout (positions + sizes) |

## Outputs & Use Cases

- Automated staging for real estate visualization
- Client presentation mockups
- Starting point for designer refinement
- Game/virtual environment interior population

## Connection to Course

- Contrasts A4 (recommendation) — RL *creates* layouts vs. CF *recommends* items
- Interior design AI applications table
- Reinforcement learning category in Assignment Step 4

## Limitations

- Reward function design is critical and subjective
- May not capture cultural or high-end aesthetic preferences
- Original Li et al. ICML 2020 paper may differ from downloaded Di & Yu arXiv 2021 related work
- 2D layout focus; 3D clearance (height) needs extension

## Downloaded Related Paper

`05_FurnitureLayout_RL_DiYu_2021.pdf` — "Deep Reinforcement Learning for Producing Furniture Layout in Indoor Scenes" (arXiv:2101.07462). Code: https://github.com/CODE-SUBMIT/simulator1

## Key References

```
[8] Li, Y., et al. "Furniture Layout Generation using Deep Reinforcement Learning."
    Proceedings of ICML, 2020.

Related: Di, X., Yu, P. "Deep Reinforcement Learning for Producing Furniture Layout
    in Indoor Scenes." arXiv:2101.07462, 2021. (Downloaded)
```
