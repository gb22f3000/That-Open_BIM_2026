# A5 — Architecture / Building Layout Optimization

## Application Summary

| Field | Detail |
|-------|--------|
| **Task** | Optimize spatial layout configurations for multiple design objectives |
| **Algorithm** | Evolutionary Algorithms (EA) with Genetic Programming |
| **Primary Paper** | Singh, A. K., et al. (2018) [5] |
| **Journal** | *Journal of Architectural Engineering*, Vol. 24, No. 2 |
| **DOI** | [10.1061/(ASCE)AE.1943-5568.0000281](https://doi.org/10.1061/(ASCE)AE.1943-5568.0000281) |
| **Open Access** | ❌ ASCE Library (paywalled) |

## Problem Statement

Architectural layout design must balance competing objectives: daylight, circulation efficiency, energy performance, cost, and programmatic adjacencies. Exhaustive search of all possible layouts is computationally impossible. Evolutionary algorithms explore the solution space intelligently, evolving better layouts over generations.

## How the Algorithm Works

### Genetic Programming + Evolutionary Algorithm
```
Initial Population of Layouts → Evaluate Fitness → Selection → Crossover + Mutation → Next Generation → Repeat
```

1. **Encoding**: Each layout = chromosome (room positions, sizes, adjacencies as genes)
2. **Fitness function**: Score layouts on objectives (daylight hours, travel distance, energy, cost)
3. **Selection**: Keep best-performing layouts (tournament or roulette selection)
4. **Crossover**: Combine two parent layouts to create offspring
5. **Mutation**: Randomly alter room positions/sizes for diversity
6. **Termination**: Stop after N generations or fitness plateau

### Multi-Objective Optimization
Real projects optimize **multiple criteria simultaneously**:
- Maximize natural light exposure
- Minimize circulation path length
- Satisfy minimum room area constraints
- Maintain required adjacencies (kitchen near dining)

Pareto-optimal solutions represent trade-offs between objectives.

## Data Requirements

| Modality | Description |
|----------|-------------|
| **Input** | Design constraints (room program, site boundary, codes) |
| **Fitness metrics** | Simulated daylight, energy, structural, cost models |
| **Output** | Ranked set of optimized layout configurations |

## Outputs & Use Cases

- Schematic design option generation
- Parametric massing studies
- Energy-driven plan optimization
- Research on layout performance metrics
- Precursor philosophy to Autodesk Fusion generative design

## Connection to Course

- Listed in both Set A (Architecture Layout Optimization) and Set B (Building Layout Optimization) — same paper
- Complements GAN-based generation (A2): EA optimizes, GAN generates
- DesArchdev design optimization module

## Limitations

- Computationally expensive for large programs (20+ rooms)
- Fitness functions require domain expertise to define correctly
- May produce geometrically awkward layouts without aesthetic constraints
- Paywalled — access via ASCE Library

## Key References

```
[5] Singh, A. K., et al. "Evolutionary Optimization of Architecture Layouts."
    Journal of Architectural Engineering, vol. 24, no. 2, 2018.
    doi:10.1061/(ASCE)AE.1943-5568.0000281
```
