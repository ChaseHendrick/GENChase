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
"""The figures of the manuscript, drawn from stored files only (a few seconds, no proof is rerun).

    python3 code/plot_cardiac_rings.py     writes paper/figures/cell-orbit.pdf, ring-wave.pdf,
                                           alln-pieces.pdf and paper/figures/sources.json

NOT a proof.  Figures 1 and 2 sum, in binary64, the Fourier series of the centres of the existence proofs
(code/fourier/data/centre_N*_K32.json, exact dyadic numbers, each hashed by its record
data/fourier-existence-N*.json, which this script checks).  The proofs place the true profile within r_ex
of that centre (Theorem B(a), Table 1), far below the resolution of the figures.  Figure 3 draws the
stored enclosures and radii of data/fourier-existence-alln.json and the period enclosures of
data/fourier-existence-N*.json as they are stored; nothing is recomputed.  Run from any working directory.
Needs numpy and matplotlib (the figures were made with numpy 2.4.6 and matplotlib 3.11.2; sources.json
records the versions and the SHA-256 of every input); the output is byte-identical on regeneration.
"""
import hashlib
import json
from decimal import Decimal
from fractions import Fraction
from pathlib import Path

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt                                    # noqa: E402
from matplotlib.colors import LinearSegmentedColormap              # noqa: E402
from matplotlib.patches import Rectangle                           # noqa: E402
from matplotlib.lines import Line2D                                # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
FIG = ROOT / "paper" / "figures"
RINGS = (8, 16, 32, 64)
V_SCALE = 2.0 ** -2           # V = 2^e_V z_V with e_V = -2 (code/model/scales.txt, checked below)
S_LEVEL = 0.2                 # the section level s: the double nearest 0.2 (mV)
T_REF = Decimal("53.588")     # axis offset of Figure 3 (ms); a round number, not a result

# the first three categorical slots of the reference palette (validated all-pairs), ink for text and guides
BLUE, ORANGE, AQUA = "#2a78d6", "#eb6834", "#1baf7a"
INK, MUTED, GRID = "#0b0b0b", "#52514e", "#d9d8d4"
# one-hue sequential ramp (blue, steps 100 to 700) for the voltage image
SEQ = ["#cde2fb", "#b7d3f6", "#9ec5f4", "#86b6ef", "#6da7ec", "#5598e7", "#3987e5", "#2a78d6",
       "#256abf", "#1c5cab", "#184f95", "#104281", "#0d366b"]
plt.rcParams.update({"font.size": 8.5, "font.family": "serif", "mathtext.fontset": "cm",
                     "pdf.fonttype": 42, "axes.linewidth": 0.6, "axes.edgecolor": MUTED,
                     "axes.labelcolor": INK, "xtick.color": MUTED, "ytick.color": MUTED,
                     "xtick.labelcolor": INK, "ytick.labelcolor": INK,
                     "xtick.major.width": 0.6, "ytick.major.width": 0.6, "legend.frameon": False,
                     "image.interpolation": "none"})
INPUTS = []                   # (relative path) of every file read, hashed into sources.json


def read(rel):
    INPUTS.append(rel)
    return (ROOT / rel).read_bytes()


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def style(ax):
    ax.grid(True, color=GRID, linewidth=0.5)
    ax.set_axisbelow(True)
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)


def axes_in(fig, left, bottom, width, height):
    """Axes placed in inches from the lower left corner of the figure."""
    w, h = fig.get_size_inches()
    return fig.add_axes([left / w, bottom / h, width / w, height / h])


def save(fig, name, title):
    fig.savefig(FIG / name, metadata={"CreationDate": None, "ModDate": None, "Title": title,
                                      "Author": "Chase Hendrick"})
    plt.close(fig)
    print("wrote", (FIG / name).relative_to(ROOT))


# ------------------------------------------------------------------------------ stored inputs
scale_line = read("code/model/scales.txt").decode().splitlines()[2].split()
if int(scale_line[0]) != -2:
    raise SystemExit("unexpected scale exponent of V")


def existence(N):
    return json.loads(read(f"data/fourier-existence-N{N}.json"))


def centre(N, rec):
    """The centre that the record hashes: omega and a_{k,m}, m = 0..K, as binary64 (rounded to nearest)."""
    rel = "code/" + rec["centre_file"]
    raw = read(rel)
    if sha256(raw) != rec["centre_sha256"]:
        raise SystemExit(f"{rel} does not match the hash stored in its record")
    c = json.loads(raw)
    if c["N"] != N or c["omega"] != rec["omega_bar"] or c["K"] != rec["K"]:
        raise SystemExit(f"{rel} is not the centre of the N = {N} record")
    a = np.array([[complex(float.fromhex(re), float.fromhex(im)) for re, im in comp] for comp in c["a"]])
    if a.shape != (18, c["K"] + 1):
        raise SystemExit("unexpected coefficient array")
    return float.fromhex(c["omega"]), a


def series(a_k, theta):
    """sum_{|m| <= K} a_m e^{i m theta} for a real profile (a_{-m} = conj a_m), in binary64."""
    m = np.arange(1, a_k.size)
    return a_k[0].real + 2.0 * np.real(np.exp(1j * np.multiply.outer(theta, m)) @ a_k[1:])


REC = {N: existence(N) for N in (1,) + RINGS}
CEN = {N: centre(N, REC[N]) for N in REC}
for N, (om, a) in CEN.items():
    v0 = V_SCALE * series(a[0], np.array([0.0]))[0]
    if abs(v0 - S_LEVEL) > 1e-12:
        raise SystemExit(f"N = {N}: the centre does not start on the section V = s")
ALLN = json.loads(read("data/fourier-existence-alln.json"))

# ------------------------------------------------------------------------------ Figure 1: the cell
om1, a1 = CEN[1]
T1 = 2 * np.pi / om1
theta = np.linspace(0.0, 2 * np.pi, 2001)
V1 = V_SCALE * series(a1[0], theta)
dV = np.gradient(V1, theta)
if not dV[0] > 0:
    raise SystemExit("the section is not crossed upward at t = 0")
K1 = a1.shape[1] - 1
coef = V_SCALE * np.abs(a1[0])                     # |coefficient of e^{i m theta} in V|, m = 0..K (mV)
r_ex1 = float(Decimal(REC[1]["r_existence"]["dec"]))
m_env = np.linspace(0, K1 + 8, 200)
env = V_SCALE * r_ex1 * np.exp(-m_env / 4)         # |true - centre| <= r_ex e^{-|m|/4} per mode, times 2^-2

fig = plt.figure(figsize=(6.5, 2.85))
axa = axes_in(fig, 0.72, 1.0, 2.38, 1.6)
axb = axes_in(fig, 3.95, 1.0, 2.4, 1.6)
axa.plot(theta / om1, V1, color=BLUE, lw=1.4, label=r"$V(t)$ of the cell ($N = 1$), from the stored centre")
axa.plot([0.0], [V1[0]], "o", color=INK, ms=4, clip_on=False, zorder=4,
         label=r"section point: $V = s$, crossed upward, $t = 0$")
axa.set_xlim(0, T1)
axa.set_xticks([0, 10, 20, 30, 40, 50])
axa.set_xlabel(r"$t$ (ms)")
axa.set_ylabel(r"$V$ (mV)")
axa.set_title("(a) one period of the cell", loc="left")
style(axa)
axa.legend(loc="upper left", bbox_to_anchor=(-0.02, -0.25), fontsize=7.6, handlelength=1.8, borderaxespad=0)

axb.semilogy(np.arange(K1 + 1), coef, "o", color=BLUE, ms=3.2,
             label=r"$|\hat V_m|$ of the centre, $0 \leq m \leq K = 32$")
axb.semilogy(m_env, env, "-", color=ORANGE, lw=1.2,
             label=r"$(r_{\mathrm{ex}}/4)\,e^{-m/4}$: bound on $|\hat V_m - \hat V_m^{\mathrm{centre}}|$")
axb.axvline(K1, color=MUTED, lw=0.8, ls=":", label=r"$m = K$; the centre has no mode $m > K$")
axb.set_xlim(-1, K1 + 8)
axb.set_ylim(1e-35, 1)
axb.set_yticks([1e-32, 1e-24, 1e-16, 1e-8, 1])
axb.set_xlabel(r"Fourier mode $m$")
axb.set_ylabel(r"modulus (mV)")
axb.set_title(r"(b) Fourier coefficients of $V$", loc="left")
style(axb)
axb.legend(loc="upper left", bbox_to_anchor=(-0.02, -0.25), fontsize=7.6, handlelength=1.8, borderaxespad=0)
FIG.mkdir(exist_ok=True)
save(fig, "cell-orbit.pdf", "The periodic orbit of the cell")
print(f"  cell: T(centre) = {T1:.12f} ms, V in [{V1.min():.6f}, {V1.max():.6f}] mV, r_ex = {r_ex1:.4e}")

# ------------------------------------------------------------------------------ Figure 2: the ring wave
cmap = LinearSegmentedColormap.from_list("blue_ramp", SEQ)
SHOW = (8, 64)
NT = 600
imgs = {}
for N in SHOW:
    om, a = CEN[N]
    T = 2 * np.pi / om
    t = (np.arange(NT) + 0.5) * (2 * T / NT)       # cell centres of the image columns, two periods
    imgs[N] = (T, np.array([V_SCALE * series(a[0], om * t + 2 * np.pi * j / N) for j in range(N)]))
vmin = min(v.min() for _, v in imgs.values())
vmax = max(v.max() for _, v in imgs.values())

fig = plt.figure(figsize=(6.5, 2.75))
axes = [axes_in(fig, 0.5, 0.47, 2.3, 1.95), axes_in(fig, 3.42, 0.47, 2.3, 1.95)]
cax = axes_in(fig, 5.9, 0.47, 0.1, 1.95)
for ax, N, panel in zip(axes, SHOW, "ab"):
    T, img = imgs[N]
    im = ax.imshow(img, origin="lower", aspect="auto", cmap=cmap, vmin=vmin, vmax=vmax,
                   extent=(0, 2 * T, -0.5, N - 0.5), interpolation="none")
    ax.set_xlim(0, 2 * T)
    ax.set_xticks([0, 20, 40, 60, 80, 100])
    ax.set_xlabel(r"$t$ (ms)")
    ax.set_ylabel(r"cell $j$")
    ax.set_yticks(range(N) if N <= 8 else [0, 16, 32, 48, N - 1])
    ax.set_title(f"({panel}) $N = {N}$: $V_j(t)$ over two periods", loc="left")
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)
cb = fig.colorbar(im, cax=cax)
cb.set_label(r"$V$ (mV)")
cb.outline.set_linewidth(0.6)
cb.outline.set_edgecolor(MUTED)
save(fig, "ring-wave.pdf", "The rotating wave on rings of 8 and 64 cells")
for N in SHOW:
    print(f"  ring N = {N}: T(centre) = {imgs[N][0]:.12f} ms, V in [{imgs[N][1].min():.6f}, {imgs[N][1].max():.6f}] mV")

# ------------------------------------------------------------------------------ Figure 3: the pieces of Theorem C
pieces = ALLN["pieces"]
if ALLN["n_pieces"] != len(pieces) or ALLN["eps_covered"] != ["0", "1/64"] or not ALLN["complete_cover_of_0_to_1_64"]:
    raise SystemExit("unexpected record of Theorem C")


def ns(dec):
    """(T - 53.588 ms) in ns, from a stored decimal string."""
    return float((Decimal(dec) - T_REF) * Decimal(10) ** 6)


P = []
for p in pieces:
    lo, hi = (Fraction(e) for e in p["eps"])
    P.append(dict(lo=float(lo), hi=float(hi), T=(ns(p["T_ms"][0]), ns(p["T_ms"][1])),
                  rex=float(Decimal(p["r_existence"]["dec"])), run=float(Decimal(p["r_uniqueness"]["dec"]))))
if not all(q["lo"] > p["lo"] and q["hi"] > p["hi"] and q["lo"] < p["hi"] for p, q in zip(P, P[1:])):
    raise SystemExit("pieces are not consecutive and overlapping")
glue = []
for g in ALLN["gluing"]:
    o0, o1 = (float(Fraction(e)) for e in g["overlap"])
    glue.append((0.5 * (o0 + o1), float(Decimal(g["lhs"]["dec"]))))
ring_T = {}
for N in RINGS:
    lo, hi = (ns(REC[N]["T_ms"][k]["dec"]) for k in ("lower", "upper"))
    inc = [s for s in ALLN["stage_E_inclusion"] if s["N"] == N]
    if not inc or any(s["stage_E_T_ms"] != [REC[N]["T_ms"]["lower"]["dec"], REC[N]["T_ms"]["upper"]["dec"]]
                      for s in inc):
        raise SystemExit(f"N = {N}: the Theorem C record does not identify the Theorem B record")
    ring_T[N] = 0.5 * (lo + hi)
cable = ALLN["cable_piece"]
if cable["eps"][0] != "0":
    raise SystemExit("unexpected cable piece")
cable_T = (ns(cable["T_ms"][0]), ns(cable["T_ms"][1]))


def draw_pieces(ax, xmax):
    for p in P:
        if p["lo"] > xmax:
            continue
        ax.add_patch(Rectangle((p["lo"], p["T"][0]), p["hi"] - p["lo"], p["T"][1] - p["T"][0],
                               facecolor=BLUE, alpha=0.22, edgecolor=BLUE, lw=0.5, zorder=2))
    shown = [N for N in RINGS if 1 / N ** 2 <= xmax]
    ax.plot([1 / N ** 2 for N in shown], [ring_T[N] for N in shown], "D", color=ORANGE, ms=4.2, mec="white",
            mew=0.6, zorder=4)
    ax.plot([0, 0], cable_T, "-", color=AQUA, lw=3.0, solid_capstyle="butt", zorder=5)
    style(ax)


def top_axis(ax, labelled, width_in):
    """Ticks at eps = 1/N^2: labelled ones, and a minor tick at every other integer N >= 8 while
    consecutive ticks stay at least MIN_GAP inches apart (they accumulate at eps = 0)."""
    x0, x1 = ax.get_xlim()
    per_in = width_in / (x1 - x0)
    minor, N = [], 8
    while (1 / N ** 2 - 1 / (N + 1) ** 2) * per_in >= MIN_GAP:
        if N not in labelled and x0 <= 1 / N ** 2 <= x1:
            minor.append(1 / N ** 2)
        N += 1
    top = ax.secondary_xaxis("top", functions=(lambda e: e, lambda e: e))
    top.set_xticks([1 / N ** 2 for N in labelled])
    top.set_xticklabels([str(N) for N in labelled])
    top.set_xticks(minor, minor=True)
    top.tick_params(axis="x", which="minor", length=2.0, width=0.5, color=MUTED)
    top.tick_params(axis="x", which="major", length=3.5, width=0.6, color=MUTED, labelsize=7.6, pad=1.5)
    top.spines["top"].set_color(MUTED)
    top.spines["top"].set_linewidth(0.6)
    top.set_xlabel(r"ring size $N$ at $\varepsilon = 1/N^2$", labelpad=3)
    return N - 1


MIN_GAP = 0.025
fig = plt.figure(figsize=(6.5, 5.7))
W1, W2 = 5.7, 2.3
ax1 = axes_in(fig, 0.65, 3.65, W1, 1.45)
ax2 = axes_in(fig, 0.65, 1.15, W2, 1.4)
ax3 = axes_in(fig, 4.05, 1.15, W2, 1.4)
EPS_MAX = 1 / 64
draw_pieces(ax1, EPS_MAX)
ax1.set_xlim(-0.00025, EPS_MAX + 0.00025)
ax1.set_xticks([0, 0.003, 0.006, 0.009, 0.012, 0.015])
ax1.set_xticklabels(["0", "0.003", "0.006", "0.009", "0.012", "0.015"])
ax1.set_xlabel(r"$\varepsilon$")
ax1.set_ylabel(r"$T - 53.588$ ms (ns)")
n_minor_a = top_axis(ax1, (8, 9, 10, 12, 16, 32), W1)
ax1.set_title(r"(a) period enclosures of the 73 pieces of $[0, 1/64]$", loc="left", pad=4)

ZOOM = 5 / 4096
draw_pieces(ax2, ZOOM)
ax2.set_xlim(-0.00002, ZOOM)
ax2.set_ylim(min(p["T"][0] for p in P if p["lo"] <= ZOOM) - 2, max(p["T"][1] for p in P if p["lo"] <= ZOOM) + 2)
ax2.set_yticks(np.arange(85, 110, 5))
ax2.set_xticks([0, 0.0004, 0.0008, 0.0012])
ax2.set_xticklabels(["0", "0.0004", "0.0008", "0.0012"])
ax2.set_xlabel(r"$\varepsilon$")
ax2.set_ylabel(r"$T - 53.588$ ms (ns)")
n_minor_b = top_axis(ax2, (32, 40, 48, 64, 128), W2)
ax2.set_title(r"(b) detail of (a) near $\varepsilon = 0$", loc="left", pad=4)

for p in P:
    ax3.plot([p["lo"], p["hi"]], [p["rex"]] * 2, "-", color=BLUE, lw=1.6, solid_capstyle="butt")
    ax3.plot([p["lo"], p["hi"]], [p["run"]] * 2, "-", color=ORANGE, lw=1.6, solid_capstyle="butt")
ax3.plot([g[0] for g in glue], [g[1] for g in glue], "o", color=AQUA, ms=2.6, mec="none")
ax3.set_yscale("log")
ax3.set_xlim(-0.00025, EPS_MAX + 0.00025)
ax3.set_ylim(2e-7, 2e-3)
ax3.set_yticks([1e-6, 1e-5, 1e-4, 1e-3])
ax3.set_xticks([0, 0.005, 0.01, 0.015])
ax3.set_xticklabels(["0", "0.005", "0.010", "0.015"])
ax3.set_xlabel(r"$\varepsilon$")
ax3.set_ylabel(r"radius (weighted norm)")
style(ax3)

keys_ab = [Rectangle((0, 0), 1, 1, facecolor=BLUE, alpha=0.22, edgecolor=BLUE, lw=0.5),
           Line2D([], [], ls="none", marker="D", color=ORANGE, ms=4.2, mec="white", mew=0.6),
           Line2D([], [], color=AQUA, lw=3.0)]
labels_ab = [r"piece $P$: $\varepsilon \in P$, $T(\varepsilon)$ in its enclosure (Theorem C)",
             r"$T_N$, $N = 8, 16, 32, 64$ (Theorem B; width $< 2 \times 10^{-25}$ ms)",
             r"$T_\infty$ of the cable, $\varepsilon = 0$ (Theorem C(c))"]
fig.legend(keys_ab, labels_ab, loc="upper left", bbox_to_anchor=(0.55 / 6.5, 0.6 / 5.7), fontsize=7.6,
           handlelength=1.8, borderaxespad=0, ncol=1)
keys_c = [Line2D([], [], color=BLUE, lw=1.6), Line2D([], [], color=ORANGE, lw=1.6),
          Line2D([], [], ls="none", marker="o", color=AQUA, ms=2.6, mec="none")]
labels_c = [r"$r_{\mathrm{ex}}(P)$", r"$r_{\mathrm{un}}(P)$", r"left side of the gluing inequality"]
fig.legend(keys_c, labels_c, loc="upper left", bbox_to_anchor=(3.95 / 6.5, 0.6 / 5.7), fontsize=7.6,
           handlelength=1.8, borderaxespad=0, ncol=1)
# the title of (c) at the height that (b)'s title takes above its top axis
fig.canvas.draw()
yb = ax2.title.get_window_extent().y0
y3 = ax3.transAxes.inverted().transform((0, yb))[1]
ax3.text(0, y3, r"(c) radii of the pieces", transform=ax3.transAxes, ha="left", va="bottom",
         fontproperties=ax2.title.get_fontproperties(), color=ax2.title.get_color())
save(fig, "alln-pieces.pdf", "The pieces of the every-N proof")
print(f"  top axes: a minor tick at every integer N up to {n_minor_a} in (a) and {n_minor_b} in (b)")
print(f"  pieces: {len(P)}, gluing inequalities: {len(glue)}, max r_ex = {max(p['rex'] for p in P):.4e}, "
      f"min r_un = {min(p['run'] for p in P):.4e}")

# ------------------------------------------------------------------------------ manifest
srcs = {rel: sha256((ROOT / rel).read_bytes()) for rel in sorted(set(INPUTS))}
srcs["code/plot_cardiac_rings.py"] = sha256(Path(__file__).read_bytes())
manifest = {"description": "Display of stored centres, enclosures and radii; no proof is rerun.",
            "figures": ["cell-orbit.pdf", "ring-wave.pdf", "alln-pieces.pdf"],
            "inputs": srcs, "matplotlib": matplotlib.__version__, "numpy": np.__version__}
(FIG / "sources.json").write_text(json.dumps(manifest, indent=2) + "\n")
print("wrote", (FIG / "sources.json").relative_to(ROOT))
