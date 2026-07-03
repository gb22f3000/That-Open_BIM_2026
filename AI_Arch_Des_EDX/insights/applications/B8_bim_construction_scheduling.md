# B8 — BIM-based Construction Scheduling (DQN)

## Application Summary

| Field | Detail |
|-------|--------|
| **Task** | Optimize construction task sequencing and resource allocation using BIM data |
| **Algorithm** | Reinforcement Learning with Deep Q-Networks (DQN) |
| **Primary Paper** | Kim, H., et al. (2020) [8] |
| **Journal** | *Journal of Construction Engineering and Management*, Vol. 146, No. 2 |
| **DOI** | [10.1061/(ASCE)CO.1943-7862.0001750](https://doi.org/10.1061/(ASCE)CO.1943-7862.0001750) |
| **Open Access** | ❌ ASCE Library (paywalled) |

## Problem Statement

Construction scheduling determines the order and timing of tasks (foundation → structure → MEP → finishing) to minimize project duration and cost while respecting dependencies, resource limits, and site constraints. Traditional critical path method (CPM) is manual and doesn't adapt to disruptions. RL learns optimal scheduling policies from BIM-rich project simulations.

## How the Algorithm Works

### Deep Q-Network (DQN)
```
BIM Project State → Q-Network → Q-values per possible action → Select best action → Update schedule
```

1. **State**: Current project status from BIM — completed tasks, available resources, weather, material deliveries
2. **Action**: Schedule next task (which activity to start, resource allocation)
3. **Reward**: Negative time cost, penalty for delays, bonus for early completion under budget
4. **Q-Network**: Neural network approximates Q(s,a) = expected future reward for action a in state s
5. **Experience replay**: Store past (state, action, reward, next_state) tuples; sample batches for stable training

### BIM Integration
BIM models provide structured data for RL state representation:
- **Quantity takeoffs** — Material volumes per construction phase
- **Task dependencies** — Which elements must be built before others
- **Spatial constraints** — Crane reach, access paths, storage areas
- **4D BIM** — Time-linked construction sequences

## Data Requirements

| Modality | Description |
|----------|-------------|
| **Input** | BIM model (IFC), task dependency graph, resource calendars |
| **Simulation** | Construction environment modeling task durations and uncertainties |
| **Output** | Optimized schedule (Gantt chart, task start/finish dates) |

## Outputs & Use Cases

- Automated construction scheduling from BIM
- What-if analysis for delay scenarios
- Resource leveling optimization
- Integration with project management tools (Primavera, MS Project)

## Connection to Course

- BIM section of AI applications table
- Extends A3 (BIM detection) into construction management
- Reinforcement learning category alongside B3 (furniture layout DDPG)
- DesArchdev design-to-construction pipeline

## Limitations

- Real construction has unpredictable disruptions (weather, supply chain)
- Simulation fidelity determines RL policy quality
- Requires detailed BIM with construction-level information (LOD 300+)
- Paywalled — access via ASCE Library

## Key References

```
[8] Kim, H., et al. "BIM-based Construction Scheduling using Reinforcement Learning."
    Journal of Construction Engineering and Management,
    vol. 146, no. 2, 2020.
    doi:10.1061/(ASCE)CO.1943-7862.0001750
```
