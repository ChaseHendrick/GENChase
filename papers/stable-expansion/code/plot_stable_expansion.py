#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
"""Plot the recorded binary64 shape comparisons, without rerunning the proof.

Reads the rounded samples printed by verify_stable_expansion.py in
 data/verify-stable-expansion.txt. The samples are numerical illustrations,
not interval enclosures. Lines join the stored samples only. Run from any
working directory: python3 code/plot_stable_expansion.py.
"""
from pathlib import Path
import re
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[1]
report = (ROOT / "data/verify-stable-expansion.txt").read_text()
plt.rcParams.update({"font.size": 9, "pdf.fonttype": 42,
                     "svg.fonttype": "path", "svg.hashsalt": "stable-expansion"})
fig, axes = plt.subplots(1, 2, figsize=(6.5, 3.55), sharey=True)
for ax, name, panel in zip(axes, ("four", "five"), ("a", "b")):
    lines = [line for line in report.splitlines()
             if line.lstrip().startswith(name + " vortices expanding, perturbed 1e-4,")]
    if len(lines) != 1:
        raise ValueError("Expected exactly one stored energy comparison for " + name)
    samples = re.findall(r"size x([\deE+.-]+) dev ([\deE+.-]+) \(from zeta\* ([\deE+.-]+)\)", lines[0])
    data = np.array(samples, dtype=float)
    if data.shape != (10, 3) or not np.isfinite(data).all() or not (data > 0).all():
        raise ValueError("Missing or invalid stored samples for " + name)
    size, selected, original = data.T
    if not (np.diff(size) > 0).all():
        raise ValueError("Growth factors must increase")
    ax.loglog(size, selected, "o-", color="#176ca4", ms=3.5, lw=1.1,
              label="Same-energy member")
    ax.loglog(size, original, "s--", color="#a4511b", ms=3, lw=1.1,
              label="Original shape")
    ax.set_title(f"({panel}) {name.capitalize()} vortices")
    ax.set_xlabel("Size factor (dimensionless)")
    ax.set_xlim(0.8, 1e9)
    ax.set_ylim(3e-13, 3e-2)
    ax.set_xticks([1, 1e3, 1e6, 1e9])
    ax.grid(which="major", color="0.88", lw=0.5)
    ax.spines[["top", "right"]].set_visible(False)
    print(name, "vortices:", len(samples), "stored rounded samples")
axes[0].set_ylabel("Relative shape deviation (dimensionless)")
fig.legend(*axes[0].get_legend_handles_labels(), loc="lower center", ncol=2,
           bbox_to_anchor=(0.55, 0.01), fontsize=8, frameon=False)
fig.subplots_adjust(left=0.115, right=0.965, bottom=0.225, top=0.90, wspace=0.17)
out = ROOT / "paper/figures"
out.mkdir(exist_ok=True)
fig.savefig(out / "stable-expansion-convergence.pdf", metadata={"CreationDate": None, "ModDate": None})
fig.savefig(out / "stable-expansion-convergence.svg", metadata={"Date": None})

# Keep generated SVG text stable and free of insignificant trailing whitespace.
from pathlib import Path as _Path
for _svg in (_Path(__file__).resolve().parents[1] / "paper/figures").glob("*.svg"):
    _svg.write_text("\n".join(line.rstrip() for line in _svg.read_text().splitlines()) + "\n")
