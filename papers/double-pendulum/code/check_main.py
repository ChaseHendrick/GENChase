#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""The three single-energy orbits against data/E*.txt and the cones reports.

The numbers are the ones in Theorem main and in Table tab:comp. A printed
interval is supported when the certificate interval sits inside it. mu in the
table is the six-digit value from the report, lowered by one unit in the last
digit. kappa and vartheta are upper bounds, rounded up. The largest |w|/|u|
is not a bound and is not checked.
"""
import os
import re
import sys
from decimal import Decimal

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..")
DATA = os.path.join(ROOT, "data")
TEX = os.path.join(ROOT, "paper", "double-pendulum.tex")

# Column order in the table is E = -1/2, 0, 1/2.
CASES = (
    ("Eminushalf", "cones_Eminushalf", "-1/2"),
    ("E0", "cones_E0", "0"),
    ("Ehalf", "cones_Ehalf", "1/2"),
)


def D(text):
    return Decimal(text)


def fail(msg):
    print(msg)
    sys.exit(1)


def contained(inner, outer):
    return inner[0] >= outer[0] and inner[1] <= outer[1]


def parse_report(path):
    text = open(path).read()
    k = re.search(
        r"K = \(\[([^,]+), ([^\]]+)\], \[([^,]+), ([^\]]+)\]\)", text)
    over = re.search(
        r"trace Df in \[([^,]+), ([^\]]+)\].*return time of f in \[([^,]+), ([^\]]+)\]",
        text)
    stage2 = re.search(
        r"A\(\[([^,]+),([^\]]+)\] x \[([^,]+),([^\]]+)\]\), alpha = ([0-9.]+), grid (\d+)",
        text)
    mu = re.search(r"min over N0 of \|\(M\(1,t\)\)_x\| = ([0-9.]+) \(mu\)", text)
    box = re.search(r"R = \[([^,]+), ([^\]]+)\]", text)
    step = re.search(r"k = (\d+)", text)
    edges = re.findall(r"image of edge x = x[12]: t2 in \[([^,]+), ([^\]]+)\]", text)
    pieces = re.search(
        r"pieces checked (\d+), pieces whose image may meet t2 = m\*pi: (\d+), unresolved (\d+)",
        text)
    slope = re.search(r"slope dp2/dt2 lies in \[([^,]+), ([^\]]+)\]", text)
    p2 = re.findall(r"p2 \[([^,]+), ([^\]]+)\]", text)
    if not all((k, over, stage2, mu, box, step, edges, pieces, slope, p2)):
        fail("could not parse %s" % path)
    if "RESULT: ALL CHECKS PASSED" not in text:
        fail("%s did not pass" % path)
    if len(edges) != 2:
        fail("%s has %d edges" % (path, len(edges)))
    hull = [D(p2[0][0]), D(p2[0][1])]
    for a, b in p2[1:]:
        hull[0] = min(hull[0], D(a))
        hull[1] = max(hull[1], D(b))
    return {
        "y": (D(k.group(3)), D(k.group(4))),
        "trace": (D(over.group(1)), D(over.group(2))),
        "time": (D(over.group(3)), D(over.group(4))),
        "a": D(stage2.group(2)),
        "b": D(stage2.group(4)),
        "alpha": D(stage2.group(5)),
        "grid": int(stage2.group(6)),
        "mu": D(mu.group(1)),
        "x": (D(box.group(1)), D(box.group(2))),
        "k": int(step.group(1)),
        "edge1": (D(edges[0][0]), D(edges[0][1])),
        "edge2": (D(edges[1][0]), D(edges[1][1])),
        "n_pieces": int(pieces.group(1)),
        "n_meet": int(pieces.group(2)),
        "unresolved": int(pieces.group(3)),
        "slope": (D(slope.group(1)), D(slope.group(2))),
        "p2": tuple(hull),
        "n_p2": len(p2),
    }


def parse_cones(path):
    text = open(path).read()
    kappa = re.search(r"kappa = .* <= ([0-9.]+)", text)
    theta = re.search(r"theta = .* <= ([0-9.]+)", text)
    if not kappa or not theta:
        fail("could not parse %s" % path)
    return D(kappa.group(1)), D(theta.group(1))


def need(tex, snippet):
    if snippet not in tex:
        fail("not in the manuscript: %s" % snippet)


def show(name, cert, printed, ok):
    print("%s: certificate %s; printed %s; %s" % (
        name, cert, printed, "supported" if ok else "NOT SUPPORTED"))
    if not ok:
        sys.exit(1)


def check_interval(name, inner, outer):
    show(name, "[%s, %s]" % inner, "[%s, %s]" % outer, contained(inner, outer))


def rounded_up(cert, printed):
    """printed is cert rounded up to the printed number of decimals."""
    places = len(str(printed).split(".")[1])
    unit = D(1).scaleb(-places)
    return printed >= cert and printed - unit < cert


def main():
    tex = open(TEX).read()
    # Printed theorem intervals, in the table order E = -1/2, 0, 1/2.
    y = (
        ("[-1.244860970920, -1.244860970917]", D("-1.244860970920"), D("-1.244860970917")),
        ("[-1.462373092481, -1.462373092479]", D("-1.462373092481"), D("-1.462373092479")),
        ("[-1.627044959204, -1.627044959202]", D("-1.627044959204"), D("-1.627044959202")),
    )
    time = (
        ("[3.7047745436, 3.7047745487]", D("3.7047745436"), D("3.7047745487")),
        ("[2.9534890074, 2.9534890134]", D("2.9534890074"), D("2.9534890134")),
        ("[2.5643622220, 2.5643622277]", D("2.5643622220"), D("2.5643622277")),
    )
    trace = (
        ("[-3.23158, -3.23150]", D("-3.23158"), D("-3.23150")),
        ("[-3.80869, -3.80863]", D("-3.80869"), D("-3.80863")),
        ("[-3.33283, -3.33277]", D("-3.33283"), D("-3.33277")),
    )
    mu_claim = (D("2.8834"), D("3.5238"), D("2.9987"))
    mu_table = ("2.88344", "3.52384", "2.99874")
    # Table rows, same energy order. a and b are the half-widths.
    ab = ((D("1.8e-5"), D("3e-8"), 800), (D("2.5e-5"), D("4e-8"), 1000), (D("1.3e-5"), D("2e-8"), 600))
    cones = (("0.3547", "0.1233"), ("0.2878", "0.0818"), ("0.3351", "0.1118"))
    xbox = (
        ("[-1.4256, -1.4240]", D("-1.4256e-5"), D("-1.4240e-5")),
        ("[-1.8870, -1.8838]", D("-1.8870e-5"), D("-1.8838e-5")),
        ("[-1.0330, -1.0312]", D("-1.0330e-5"), D("-1.0312e-5")),
    )
    k_printed = (11, 9, 11)
    edge1 = (
        ("[-8.050, -7.878]", D("-8.050e-4"), D("-7.878e-4")),
        ("[1.519, 1.522]", D("1.519e-3"), D("1.522e-3")),
        ("[3.693, 3.707]", D("3.693e-3"), D("3.707e-3")),
    )
    edge2 = (
        ("[8.915, 9.087]", D("8.915e-4"), D("9.087e-4")),
        ("[-3.119, -3.115]", D("-3.119e-3"), D("-3.115e-3")),
        ("[-5.347, -5.333]", D("-5.347e-3"), D("-5.333e-3")),
    )
    counts = ((80, 9), (34, 2), (66, 1))
    slope = (
        ("[-8.2916, -0.0936]", D("-8.2916"), D("-0.0936")),
        ("[-6.2138, -0.5237]", D("-6.2138"), D("-0.5237")),
        ("[-21.416, -0.2789]", D("-21.416"), D("-0.2789")),
    )
    p2 = (
        ("[-1.4657285, -1.4656772]", D("-1.4657285"), D("-1.4656772")),
        ("[0.8220491, 0.8222516]", D("0.8220491"), D("0.8222516")),
        ("[0.8244028, 0.8245038]", D("0.8244028"), D("0.8245038")),
    )
    need(tex, "greater than $2.8834$, $3.5238$ and $2.9987$")
    need(tex, "topological entropy above $0.1016$")
    need(tex, "above $0.0138$")
    need(tex, "$p_2 \\in [0.82204913, 0.82225155]$")

    for i, (report, cones_name, energy) in enumerate(CASES):
        cert = parse_report(os.path.join(DATA, report + ".txt"))
        kappa, theta = parse_cones(os.path.join(DATA, cones_name + ".txt"))
        print(energy)
        for snippet, lo, hi in (y[i], time[i], trace[i]):
            need(tex, snippet)
        need(tex, mu_table[i])
        check_interval("y", cert["y"], (y[i][1], y[i][2]))
        check_interval("return time", cert["time"], (time[i][1], time[i][2]))
        check_interval("trace", cert["trace"], (trace[i][1], trace[i][2]))
        show("mu > theorem", cert["mu"], mu_claim[i], cert["mu"] > mu_claim[i])
        lowered = cert["mu"] - D("1e-5")
        show("mu table", lowered, mu_table[i], lowered == D(mu_table[i]))
        show("a, b, grid", (cert["a"], cert["b"], cert["grid"]), ab[i],
             (cert["a"], cert["b"], cert["grid"]) == ab[i])
        show("alpha", cert["alpha"], "0.001", cert["alpha"] == D("0.001"))
        show("kappa rounded up", kappa, cones[i][0], rounded_up(kappa, D(cones[i][0])))
        show("vartheta rounded up", theta, cones[i][1], rounded_up(theta, D(cones[i][1])))
        check_interval("x box", cert["x"], (xbox[i][1], xbox[i][2]))
        show("k", cert["k"], k_printed[i], cert["k"] == k_printed[i])
        check_interval("edge x1", cert["edge1"], (edge1[i][1], edge1[i][2]))
        check_interval("edge x2", cert["edge2"], (edge2[i][1], edge2[i][2]))
        show("pieces", (cert["n_pieces"], cert["n_meet"], cert["n_p2"]), counts[i],
             cert["unresolved"] == 0 and cert["n_p2"] == cert["n_meet"] == counts[i][1]
             and cert["n_pieces"] == counts[i][0])
        check_interval("slope", cert["slope"], (slope[i][1], slope[i][2]))
        check_interval("crossing p2", cert["p2"], (p2[i][1], p2[i][2]))

    e0 = parse_report(os.path.join(DATA, "E0.txt"))
    prose = (D("0.82204913"), D("0.82225155"))
    check_interval("prose p2 at E = 0", e0["p2"], prose)
    horseshoe = open(os.path.join(DATA, "horseshoe_E0.txt")).read()
    ent = re.search(
        r"h_top\(P\) >= log r >= ([0-9.]+) per return; return time <= ([0-9.]+), so h_top\(flow\) >= ([0-9.]+)",
        horseshoe)
    if not ent:
        fail("horseshoe_E0.txt has no entropy line")
    show("entropy per return > 0.1016", ent.group(1), "0.1016", D(ent.group(1)) > D("0.1016"))
    show("flow entropy > 0.0138", ent.group(3), "0.0138", D(ent.group(3)) > D("0.0138"))

    tight = (D("-1.462373092480"), y[1][2])
    ok = contained(e0["y"], tight)
    print("negative control: y printed as %s contains %s: %s" % (tight, e0["y"], ok))
    if ok:
        fail("negative control still contained the certificate")
    print("RESULT: supported")
    return 0


if __name__ == "__main__":
    sys.exit(main())
