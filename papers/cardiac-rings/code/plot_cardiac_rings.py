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
                                           alln-pieces.pdf, branch-hopf.pdf and paper/figures/sources.json

NOT a proof.  Figures 1 and 2 sum, in binary64, the Fourier series of the centers of the existence proofs
(code/fourier/data/centre_N*_K32.json, exact dyadic numbers, each hashed by its record
data/fourier-existence-N*.json, which this script checks).  The proofs place the true profile within r_ex
of that center (Theorem B(a), Table 1), far below the resolution of the figures.  Figure 3 draws the
stored enclosures and radii of data/fourier-existence-alln.json and the period enclosures of
data/fourier-existence-N*.json as they are stored; nothing is recomputed.  The figure branch-hopf.pdf draws
the stored enclosures of the G_Ks branch (code/fourier/data/branch/run_K12.jsonl, with the first V harmonic
of each piece's center in centres_K12.jsonl, matched to the piece by the SHA-256 its record stores, which
this script recomputes), of the Hopf bridge and the Hopf point (code/fourier/data/hopf/pieces.jsonl,
theoremA.json, gluing_gks.json) and the stored Floquet multiplier bounds
(code/fourier/data/branch/stability_uniform_K12.jsonl, gluing_gks.json), converted to binary64 for drawing;
nothing is recomputed.  Run from any working directory.
Needs numpy and matplotlib (the figures were made with numpy 2.4.6 and matplotlib 3.11.2; sources.json
records the versions and the SHA-256 of every input); the output is byte-identical on regeneration.
"""
import hashlib
import json
import math
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
axa.plot(theta / om1, V1, color=BLUE, lw=1.4, label=r"$V(t)$ of the cell ($N = 1$), from the stored center")
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
             label=r"$|\hat V_m|$ of the center, $0 \leq m \leq K = 32$")
axb.semilogy(m_env, env, "-", color=ORANGE, lw=1.2,
             label=r"$(r_{\mathrm{ex}}/4)\,e^{-m/4}$: bound on $|\hat V_{*,m} - \hat V_m|$")
axb.axvline(K1, color=MUTED, lw=0.8, ls=":", label=r"$m = K$; the center has no mode $m > K$")
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
axes = [axes_in(fig, 0.5, 0.47, 2.2, 1.95), axes_in(fig, 3.25, 0.47, 2.2, 1.95)]
cax = axes_in(fig, 5.6, 0.47, 0.1, 1.95)
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

# ------------------------------------------------------------------------------ Figure branch-hopf: the G_Ks branch
# TEMPORARY FALLBACK, to be removed once the records are copied into this folder.  On 2026-10-02 the records of the
# G_Ks branch (code/fourier/data/branch/) and of the Hopf bridge (code/fourier/data/hopf/) are not yet in this folder.
# read_record() reads a record from this folder when it is there; otherwise, and only then, from the study folder
# whose files this folder's code/ and data/ copy (code/X there is X, data/X there is results/X), when this folder
# still sits in the repository where it was developed.  Every record read that way is listed in sources.json under
# "inputs_read_from_study_folder", with its SHA-256 under "inputs", and announced on the terminal.
STUDY = ROOT.parents[1] / "research" / "cardiac-cycle-certificates"
FALLBACK = {}                 # (relative path in this folder) -> SHA-256 of the file read from the study folder


def read_record(rel):
    if (ROOT / rel).exists():
        return read(rel)
    if rel.startswith("code/"):
        src = STUDY / rel[len("code/"):]
    elif rel.startswith("data/"):
        src = STUDY / "results" / rel[len("data/"):]
    else:
        raise SystemExit(f"{rel}: not a record path")
    if not src.is_file():
        raise SystemExit(f"{rel} is not in this folder (and no study folder holds it)")
    raw = src.read_bytes()
    FALLBACK[rel] = sha256(raw)
    print(f"  FALLBACK: {rel} is not in this folder; read from the study folder (SHA-256 {FALLBACK[rel][:16]}...)")
    return raw


def jsonl(rel):
    return [json.loads(line) for line in read_record(rel).decode().splitlines() if line.strip()]


def dyadic(t):
    """(mantissa, exponent) of an exact '<sign>0x<hex>p<exp>' text, as written by code/fourier/centre.py."""
    neg = t.startswith("-")
    man, exp = t.lstrip("-")[2:].split("p")
    return (-int(man, 16) if neg else int(man, 16)), int(exp)


def dyadic_text(man, exp):
    """centre.dyadic_to_text: the normalized text (odd mantissa; zero is 0x0p0)."""
    if man == 0:
        return "0x0p0"
    while man % 2 == 0:
        man, exp = man // 2, exp + 1
    return f"{'-' if man < 0 else ''}0x{abs(man):x}p{exp}"


def centre_digest(c):
    """branch.centre_digest of a centre record: SHA-256 of omega and of a_{k,m}, m = -K..K (a_{-m} = conj a_m)."""
    K = int(c["K"])
    h = hashlib.sha256(dyadic_text(*dyadic(c["omega"])).encode())
    for row in c["a"]:
        for m in range(-K, K + 1):
            (rm, re_), (im_m, ie) = (dyadic(t) for t in row[abs(m)])
            h.update((dyadic_text(rm, re_) + dyadic_text(-im_m if m < 0 else im_m, ie)).encode())
    return h.hexdigest()


def dec(rec):
    return Decimal(rec["dec"])


BRANCH_RUN = "code/fourier/data/branch/run_K12.jsonl"
BRANCH_CENTRES = "code/fourier/data/branch/centres_K12.jsonl"
BRANCH_UNITS = "code/fourier/data/branch/stability_uniform_K12.jsonl"
HOPF_PIECES = "code/fourier/data/hopf/pieces.jsonl"
HOPF_THEOREM_A = "code/fourier/data/hopf/theoremA.json"
HOPF_GLUING = "code/fourier/data/hopf/gluing_gks.json"

# the G_Ks branch: pieces [g_lo, g_hi] with T in T_ms for every G_Ks of the piece, and |a_{1,V} - abar_{1,V}| <=
# eta_V r_ex / nu (nu = e^rho0) about the center's real first V coefficient
bpieces = [r["rec"] for r in jsonl(BRANCH_RUN) if r["type"] == "piece"]
if len({p["label"] for p in bpieces}) != len(bpieces):
    raise SystemExit("a piece label occurs twice in the branch run log")
bpieces.sort(key=lambda p: Fraction(p["g_lo"]))
if not all(Fraction(p["g_lo"]) < Fraction(q["g_lo"]) < Fraction(p["g_hi"]) < Fraction(q["g_hi"])
           for p, q in zip(bpieces, bpieces[1:])):
    raise SystemExit("branch pieces are not consecutive and overlapping")
centres = {}
for c in jsonl(BRANCH_CENTRES):
    centres.setdefault(c["g"], []).append(c)
BR = []
for p in bpieces:
    cs = [c for c in centres.get(p["centre_g"], []) if centre_digest(c) == p["centre_sha256"]]
    if not cs:
        raise SystemExit(f"{p['label']}: no center in {BRANCH_CENTRES} has the SHA-256 of its record")
    re1, im1 = (dyadic(t) for t in cs[0]["a"][0][1])          # a_{1,V}: component V = 0, mode 1
    if im1[0] != 0:
        raise SystemExit(f"{p['label']}: Im abar_(1,V) is not 0")
    a1 = abs(float(Fraction(re1[0]) * Fraction(2) ** re1[1]))
    nu = math.exp(float(Fraction(p["settings"]["rho0"])))
    rad = float(Fraction(p["eta"][1])) * float(dec(p["r_existence"])) / nu
    if not a1 > rad:
        raise SystemExit(f"{p['label']}: the stored radius does not keep a_(1,V) away from 0")
    BR.append(dict(lo=float(Fraction(p["g_lo"])), hi=float(Fraction(p["g_hi"])),
                   T=(float(dec(p["T_ms"]["lower"])), float(dec(p["T_ms"]["upper"]))),
                   amp=(V_SCALE * (a1 - rad), V_SCALE * (a1 + rad))))

# the Hopf bridge: on the piece [e_lo, e_hi] of the amplitude parameter (a_{1,V} = parameter/2), G_Ks and T in the
# stored enclosures for every parameter value of the piece
hp = sorted((d for d in jsonl(HOPF_PIECES) if d["type"] == "piece"), key=lambda d: d["idx"])
if ([d["idx"] for d in hp] != list(range(len(hp))) or hp[0]["e_lo"] != "0"
        or any(Fraction(p["e_hi"]) != Fraction(q["e_lo"]) for p, q in zip(hp, hp[1:]))):
    raise SystemExit("the bridge pieces are not consecutive from 0")
HB = [dict(e=(Fraction(d["e_lo"]), Fraction(d["e_hi"])),
           g=(float(dec(d["result"]["g"]["lower"])), float(dec(d["result"]["g"]["upper"]))),
           T=(float(dec(d["result"]["T_ms"]["lower"])), float(dec(d["result"]["T_ms"]["upper"]))))
      for d in hp]
for b in HB:
    b["amp"] = tuple(V_SCALE * float(e) / 2 for e in b["e"])

# the Hopf point and Erhardt's numerical value
TA = json.loads(read_record(HOPF_THEOREM_A))
gH = tuple(Fraction(x) for x in TA["gH_interval"])
if not gH[0] < gH[1]:
    raise SystemExit("unexpected Hopf interval")
gH_mid = (gH[0] + gH[1]) / 2
TH = 2 * math.pi / float((dec(TA["omega_H"]["lower"]) + dec(TA["omega_H"]["upper"])) / 2)
g_erh = Fraction(TA["erhardt"]["g_H"])
if not (Fraction(hp[0]["result"]["g"]["lower"]["dec"]) <= gH[0] < gH[1]
        <= Fraction(hp[0]["result"]["g"]["upper"]["dec"])):
    raise SystemExit("the first bridge piece does not enclose the Hopf interval")

# where the two families share an orbit, and the pointwise Stage S proofs on the bridge
GL = json.loads(read_record(HOPF_GLUING))
if not GL["ok"]:
    raise SystemExit("the gluing record is not ok")
glue_g = [float(Fraction(p["g"])) for p in GL["glue_points"]]
want = {(p["g"], p["source"]) for p in GL["stable_bridge_points"]}
SP = [p for p in GL["points"] if (p["g"], p["source"]) in want]
if len(SP) != len(want) or not all(p["on_eps_branch"] and p["stage_S_ok"] and p["lemma_D"]["ok"] for p in SP):
    raise SystemExit("a stable bridge point is not a Stage S proof identified with the bridge")
SPT = [(float(Fraction(p["g"])), float(dec(p["multiplier_bound_full_period"])), float(dec(p["delta"]))) for p in SP]

# the uniform stability units: every nontrivial Floquet multiplier of the branch orbit has modulus at most the
# stored bound, for every G_Ks of the unit
units = jsonl(BRANCH_UNITS)
UOK = [u for u in units if u["type"] in ("unit", "group_unit") and u["ok"] is True and u["uniform"] is True]
n_not_ok = len(units) - len(UOK)
U = [(Fraction(u["g"][0]), Fraction(u["g"][1]), float(dec(u["multiplier_bound_full_period"])), float(dec(u["delta"])))
     for u in UOK]
covered = []                  # union of the units, exact
for lo, hi, _, _ in sorted(U):
    if covered and lo <= covered[-1][1]:
        covered[-1][1] = max(covered[-1][1], hi)
    else:
        covered.append([lo, hi])
bare, x = [], Fraction(bpieces[0]["g_lo"])  # G_Ks from the start of the branch to g_H with no uniform bound
for lo, hi in covered:
    if lo > x:
        bare.append((x, min(lo, gH_mid)))
    x = max(x, hi)
if x < gH_mid:
    bare.append((x, gH_mid))

fig = plt.figure(figsize=(6.5, 5.55))
axA = axes_in(fig, 0.72, 3.75, 2.38, 1.5)
axB = axes_in(fig, 3.95, 3.75, 2.4, 1.5)
axC = axes_in(fig, 0.72, 1.55, 2.38, 1.5)
axD = axes_in(fig, 3.95, 1.55, 2.4, 1.5)
ERH = dict(color=MUTED, lw=0.9, ls=(0, (1, 1.5)), zorder=3)
GLUE = dict(color=AQUA, lw=0.9, ls="-.", zorder=3)
HOPF = dict(marker="o", color=INK, ms=4, ls="none", clip_on=False, zorder=6)


def box(ax, x, y, color):
    ax.add_patch(Rectangle((x[0], y[0]), x[1] - x[0], y[1] - y[0], facecolor=color, alpha=0.22, edgecolor=color,
                           lw=0.5, zorder=2))


g0, g1 = BR[0]["lo"], float(gH_mid)
XL = (g0 - 0.03 * (g1 - g0), g1 + 0.04 * (g1 - g0))
GTICKS = [k / 10000 for k in range(275, 280)]
for ax in (axA, axB, axC):
    ax.set_xlim(*XL)
    ax.set_xticks(GTICKS)
    ax.set_xticklabels([f"{t:.4f}" for t in GTICKS])
    ax.set_xlabel(r"$G_{Ks}$ (nS/pF)")
    for g in glue_g:
        ax.axvline(g, **GLUE)
    style(ax)

for b in BR:
    box(axA, (b["lo"], b["hi"]), b["T"], BLUE)
    box(axB, (b["lo"], b["hi"]), b["amp"], BLUE)
for b in HB:
    box(axA, b["g"], b["T"], ORANGE)
    box(axB, b["g"], b["amp"], ORANGE)
for ax, y in ((axA, TH), (axB, 0.0)):
    ax.axvline(float(g_erh), **ERH)
    ax.plot([float(gH_mid)], [y], **HOPF)
Tall = [t for b in BR + HB for t in b["T"]] + [TH]
axA.set_ylim(min(Tall) - 0.06, max(Tall) + 0.06)
axA.set_ylabel(r"period $T$ (ms)")
axA.set_title("(a) period along the curve of orbits", loc="left")
axB.set_ylim(0, 1.06 * max(b["amp"][1] for b in BR + HB))
axB.set_ylabel(r"$|\hat V_1|$ (mV)")
axB.set_title(r"(b) first Fourier coefficient of $V$", loc="left")

for lo, hi, bound, _ in U:
    axC.plot([float(lo), float(hi)], [bound] * 2, "-", color=BLUE, lw=1.6, solid_capstyle="butt", zorder=4)
for lo, hi in bare:
    axC.axvspan(float(lo), float(hi), color=GRID, alpha=0.55, lw=0, zorder=1)
axC.plot([s[0] for s in SPT], [s[1] for s in SPT], "D", color=ORANGE, ms=4.2, mec="white", mew=0.6, zorder=5)
axC.axhline(1.0, color=MUTED, lw=0.8, ls="--", zorder=3)
yc = [u[2] for u in U] + [s[1] for s in SPT]
axC.set_ylim(min(yc) - 0.0004, 1.0003)
axC.set_yticks([0.998, 0.999, 1.0])
axC.set_yticklabels(["0.998", "0.999", "1"])
axC.set_ylabel(r"bound on $|\mu|$, $\mu$ nontrivial")
axC.set_title(r"(c) Floquet multiplier bound", loc="left")

# (d): the first pieces of the bridge near g_H, against G_Ks - OFF in 1e-8 nS/pF, |V_1| in 1e-4 mV
OFF = Decimal(gH_mid.numerator) / Decimal(gH_mid.denominator)
OFF = OFF.quantize(Decimal("1e-11"))
XD, YD = (-30.0, 10.0), (0.0, 10.0)


def zx(g):
    return float((Fraction(g) - Fraction(OFF)) * 10 ** 8)


for b, d in zip(HB, hp):
    x = (zx(d["result"]["g"]["lower"]["dec"]), zx(d["result"]["g"]["upper"]["dec"]))
    y = tuple(1e4 * a for a in b["amp"])
    if y[0] < YD[1] and x[0] < XD[1] and x[1] > XD[0]:
        box(axD, x, y, ORANGE)
axD.axvline(zx(g_erh), **ERH)
axD.plot([zx(gH_mid)], [0.0], **HOPF)
axD.set_xlim(*XD)
axD.set_ylim(*YD)
axD.set_xlabel(rf"$G_{{Ks}} - {OFF}$ ($10^{{-8}}$ nS/pF)")
axD.set_ylabel(r"$|\hat V_1|$ ($10^{-4}$ mV)")
axD.set_title(r"(d) detail of (b) at the Hopf point", loc="left")
style(axD)


def sci(v):
    m, e = f"{v:.0e}".split("e")
    return rf"{m} \times 10^{{{int(e)}}}"


keys_l = [Rectangle((0, 0), 1, 1, facecolor=BLUE, alpha=0.22, edgecolor=BLUE, lw=0.5),
          Rectangle((0, 0), 1, 1, facecolor=ORANGE, alpha=0.22, edgecolor=ORANGE, lw=0.5),
          Line2D([], [], **{k: v for k, v in HOPF.items() if k != "clip_on"}),
          Line2D([], [], **{k: v for k, v in ERH.items() if k != "zorder"}),
          Line2D([], [], **{k: v for k, v in GLUE.items() if k != "zorder"})]
labels_l = [rf"$G_{{Ks}}$ branch: piece $\times$ enclosure ({len(BR)} pieces)",
            rf"Hopf bridge: enclosure of $G_{{Ks}}$ $\times$ enclosure ({len(HB)} pieces)",
            rf"Hopf point $g_H$ (enclosure of width ${sci(float(gH[1] - gH[0]))}$)",
            rf"Erhardt's numerical Hopf value ${TA['erhardt']['g_H']}$",
            rf"$G_{{Ks}} = {', '.join(p['g'] for p in GL['glue_points'])}$: the two families share this orbit"]
fig.legend(keys_l, labels_l, loc="upper left", bbox_to_anchor=(0.55 / 6.5, 0.95 / 5.55), fontsize=7.6,
           handlelength=1.8, borderaxespad=0, ncol=1)
keys_r = [Line2D([], [], color=BLUE, lw=1.6),
          Line2D([], [], ls="none", marker="D", color=ORANGE, ms=4.2, mec="white", mew=0.6),
          Rectangle((0, 0), 1, 1, facecolor=GRID, alpha=0.55, lw=0),
          Line2D([], [], color=MUTED, lw=0.8, ls="--")]
labels_r = [rf"(c) bound over a unit ({len(U)} units)",
            rf"(c) bound at a single $G_{{Ks}}$ ({len(SPT)} points)",
            r"(c) no uniform bound: the points only",
            r"(c) modulus 1"]
fig.legend(keys_r, labels_r, loc="upper left", bbox_to_anchor=(3.95 / 6.5, 0.95 / 5.55), fontsize=7.6,
           handlelength=1.8, borderaxespad=0, ncol=1)
save(fig, "branch-hopf.pdf", "The periodic orbit of the cell from G_Ks = 0.0275 to the Hopf point")
print(f"  branch: {len(BR)} pieces, G_Ks in [{bpieces[0]['g_lo']}, {bpieces[-1]['g_hi']}], "
      f"T in [{min(b['T'][0] for b in BR):.6f}, {max(b['T'][1] for b in BR):.6f}] ms, "
      f"|V_1| in [{min(b['amp'][0] for b in BR):.6f}, {max(b['amp'][1] for b in BR):.6f}] mV")
print(f"  bridge: {len(HB)} pieces, parameter in [0, {hp[-1]['e_hi']}], "
      f"G_Ks in [{min(b['g'][0] for b in HB):.10f}, {max(b['g'][1] for b in HB):.10f}], "
      f"T in [{min(b['T'][0] for b in HB):.6f}, {max(b['T'][1] for b in HB):.6f}] ms")
print(f"  Hopf: g_H in [{TA['gH_interval_decimal'][0]}, {TA['gH_interval_decimal'][1]}], T_H = {TH:.9f} ms; "
      f"Erhardt {TA['erhardt']['g_H']} is {float(g_erh - gH_mid):.4e} above the midpoint")
print(f"  glued at G_Ks = {[p['g'] for p in GL['glue_points']]}; stable bridge points "
      f"{[(p['g'], round(s[1], 8), round(s[2], 8)) for p, s in zip(SP, SPT)]}")
print(f"  uniform units: {len(U)} ok ({n_not_ok} other records), bound in [{min(u[2] for u in U):.8f}, "
      f"{max(u[2] for u in U):.8f}], delta in {sorted({u[3] for u in U})}, "
      f"union {[[str(float(a)), str(float(b))] for a, b in covered]}; no uniform bound on "
      f"{[[f'{float(a):.11f}', f'{float(b):.11f}'] for a, b in bare]}")

# ------------------------------------------------------------------------------ manifest
srcs = {rel: sha256((ROOT / rel).read_bytes()) for rel in set(INPUTS)}
srcs.update(FALLBACK)
srcs = dict(sorted(srcs.items()))
srcs["code/plot_cardiac_rings.py"] = sha256(Path(__file__).read_bytes())
manifest = {"description": "Display of stored centres, enclosures, radii and bounds; no proof is rerun.",
            "figures": ["cell-orbit.pdf", "ring-wave.pdf", "alln-pieces.pdf", "branch-hopf.pdf"],
            "inputs": srcs, "matplotlib": matplotlib.__version__, "numpy": np.__version__}
if FALLBACK:
    manifest["inputs_read_from_study_folder"] = sorted(FALLBACK)
    manifest["fallback_note"] = ("These inputs are not yet in this folder; they were read from the study folder whose "
                                 "files code/ and data/ copy, with the SHA-256 given under inputs.")
(FIG / "sources.json").write_text(json.dumps(manifest, indent=2) + "\n")
print("wrote", (FIG / "sources.json").relative_to(ROOT))
