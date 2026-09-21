# Project flow

The maintained source is modular. The generated download remains one HTML file.

```mermaid
flowchart TD
    A["Edit source modules"] --> B["Build one HTML file"]
    B --> C["Test and review"]
    S["Papers and independent benchmarks"] --> C
    C -->|Fixes needed| A
    C -->|Checks pass, review complete| D["Merge and publish studio"]
    D --> E["Choose a technique, seed and settings"]
    E --> F["Run and explore the simulation"]
    F --> G["Save a recipe or export artwork"]

    classDef development fill:#e8f1ff,stroke:#2458a6,color:#102c54
    classDef science fill:#fff1d6,stroke:#9a6500,color:#553800
    classDef use fill:#e5f5ed,stroke:#24734b,color:#143e2a
    class A,B,D development
    class C,S science
    class E,F,G use
```

Passing automated checks does not mean all techniques are scientifically validated. The
[validation inventory](VALIDATION.md) records coverage; [BUILDING.md](BUILDING.md) explains
assembly, and [CONTRIBUTING.md](CONTRIBUTING.md) explains contribution and review.

## Reading the flow

- **Blue:** contributors edit modular source, build the portable HTML, and publish reviewed changes.
- **Amber:** tests exercise covered behavior; papers and independent benchmarks support specific scientific claims. Failures lead back to source corrections.
- **Green:** users choose inputs, explore a simulation, then keep a recipe or an exported image.

A recipe stores inputs; an image stores pixels. Keep the studio version with a recipe when you need to reproduce a historical result. Print dimensions do not increase a simulation's underlying numerical resolution.
