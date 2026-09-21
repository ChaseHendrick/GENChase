# Project flow

The maintained source is modular. The generated download remains one HTML file.

```mermaid
flowchart TD
    A["Maintained source"] --> B["Interface, styles and shared utilities"]
    A --> C["120 simulation techniques"]
    B --> D["Build the studio"]
    C --> D
    D --> E["Single-file download: studio.html"]
    E --> F["Choose a technique, seed and settings"]
    F --> G["Run the simulation in the browser"]
    G --> H["View and adjust the artwork"]
    H --> I["Save a recipe or export a print"]
    C --> J["Scientific review"]
    J --> K["Compare with papers and independent benchmarks"]
    K --> L["Record evidence, limitations and defects"]
    L --> M["Correct the source and add regression tests"]
    M --> A
    D --> N["Automated checks"]
    N --> O["Build, recipes, browser behavior and print exports"]
    O --> P["Review the pull request"]
    P --> Q["Merge tested changes"]
    Q --> E
```

Passing automated checks does not mean all techniques are scientifically validated. The
[validation inventory](VALIDATION.md) records coverage; [BUILDING.md](BUILDING.md) explains
assembly, and [CONTRIBUTING.md](CONTRIBUTING.md) explains contribution and review.
