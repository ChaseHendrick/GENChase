#!/usr/bin/env python3
"""Check Theorem interval (thm:interval) against data/E0_interval.txt.

A printed closed interval is supported when the certificate interval is
contained in it. A printed strict lower bound is supported when the
certificate number is strictly greater. Decimal strings only; no binary
floats.

p_2(q_E) is not printed as one summary interval. It is the interval hull of
the p2 enclosures on the pieces whose image may meet the symmetry line. If
those enclosures are absent, the claim is reported as not in the certificate
and is not invented.

Negative control, in memory only: move the printed y left endpoint one unit
in its last digit (to -1.46237309261) and require that the certificate is
then not contained. The tex file and the certificate are not modified.
"""
import os
import re
import sys
from decimal import Decimal

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..")
CERT = os.path.join(ROOT, "data", "E0_interval.txt")
TEX = os.path.join(ROOT, "paper", "double-pendulum.tex")


def D(s):
    return Decimal(s.strip())


def contained(inner, outer):
    """Closed inner interval subset of closed outer interval."""
    return outer[0] <= inner[0] and inner[1] <= outer[1]


def fmt_iv(pair):
    return "[%s, %s]" % pair


def parse_iv(text):
    a, b = text.split(",")
    return (a.strip(), b.strip())


def one_ulp(decimal_string):
    """One unit in the last digit of a plain decimal literal."""
    s = decimal_string.strip()
    if "." not in s:
        return Decimal(1)
    frac = s.split(".", 1)[1]
    if "e" in frac.lower():
        raise SystemExit("unexpected exponent in a printed endpoint: %s" % s)
    return Decimal("1e-%d" % len(frac))


def parse_theorem(tex):
    marks = list(re.finditer(r"\\label\{thm:interval\}", tex))
    if len(marks) != 1:
        raise SystemExit("expected one \\label{thm:interval}, found %d" % len(marks))
    body = tex[marks[0].end():]
    end = body.find("\\end{theorem}")
    if end < 0:
        raise SystemExit("theorem interval has no \\end{theorem}")
    body = re.sub(r"\s+", " ", body[:end])

    def need(pattern, what):
        m = re.search(pattern, body)
        if not m:
            raise SystemExit("theorem interval: could not parse %s" % what)
        return m

    energy = need(
        r"\$E \\in \[(-?)10\^\{(-?\d+)\},\s*(-?)10\^\{(-?\d+)\}\]\$",
        "energy interval",
    )
    y = need(
        r"y_E \\in \[(-?[0-9.]+),\s*(-?[0-9.]+)\]",
        "y_E",
    )
    tr = need(
        r"\\operatorname\{tr\}DP_E\(p_E\) \\in \[(-?[0-9.]+),\s*(-?[0-9.]+)\]",
        "trace",
    )
    modulus = need(
        r"modulus greater than \$([0-9.]+)\$",
        "eigenvalue modulus",
    )
    ret = need(
        r"return time in \$\[([0-9.]+),\s*([0-9.]+)\]\$",
        "return time",
    )
    p2 = need(
        r"p_2\(q_E\) \\in \[([0-9.]+),\s*([0-9.]+)\]",
        "p_2",
    )

    def signed_pow10(sign, exp):
        value = Decimal(10) ** Decimal(exp)
        return -value if sign == "-" else value

    return {
        "body": body.strip(),
        "E": (
            signed_pow10(energy.group(1), energy.group(2)),
            signed_pow10(energy.group(3), energy.group(4)),
            energy.group(0),
        ),
        "y": (y.group(1), y.group(2)),
        "tr": (tr.group(1), tr.group(2)),
        "modulus": modulus.group(1),
        "return": (ret.group(1), ret.group(2)),
        "p2": (p2.group(1), p2.group(2)),
    }


def parse_certificate(text):
    k = re.search(
        r"K = \(\[([^]]+)\],\s*\[([^]]+)\]\)\s*K in int B: (\w+)",
        text,
    )
    if not k:
        raise SystemExit("certificate: could not parse K")
    over = re.search(
        r"trace Df in \[([^]]+)\], det Df in \[[^]]+\], return time of f in \[([^]]+)\]",
        text,
    )
    if not over:
        raise SystemExit("certificate: could not parse trace and return time")
    mu = re.search(
        r"min over N0 of \|\(M\(1,t\)\)_x\| = ([0-9.]+) \(mu\)",
        text,
    )
    if not mu:
        raise SystemExit("certificate: could not parse min |(M(1,t))_x|")
    energy = re.search(r"E = \[([^]]+)\]", text)
    if not energy:
        raise SystemExit("certificate: could not parse E")
    pieces = []
    for line in text.splitlines():
        if "piece x in" not in line:
            continue
        m = re.search(r"p2 \[([^]]+)\]", line)
        if m:
            pieces.append(parse_iv(m.group(1)))
    hit = re.search(
        r"pieces whose image may meet t2 = m\*pi: (\d+), unresolved (\d+)",
        text,
    )
    edges = re.search(r"edges on opposite sides: (\w+)", text)
    result = re.search(r"^RESULT: (.*)$", text, re.M)
    return {
        "y": parse_iv(k.group(2)),
        "k_in_b": k.group(3),
        "tr": parse_iv(over.group(1)),
        "return": parse_iv(over.group(2)),
        "mu": mu.group(1),
        "E": parse_iv(energy.group(1)),
        "p2_pieces": pieces,
        "nhit": int(hit.group(1)) if hit else None,
        "unresolved": int(hit.group(2)) if hit else None,
        "edges": edges.group(1) if edges else None,
        "result": result.group(1).strip() if result else None,
    }


def p2_hull(pieces):
    """Interval hull of the printed piece enclosures. Endpoints stay as printed."""
    lo_s, hi_s = pieces[0]
    lo, hi = D(lo_s), D(hi_s)
    for a, b in pieces[1:]:
        da, db = D(a), D(b)
        if da < lo:
            lo, lo_s = da, a
        if db > hi:
            hi, hi_s = db, b
    return (lo_s, hi_s)


def main():
    cert_path = os.path.abspath(CERT)
    tex_path = os.path.abspath(TEX)
    print("paper: %s" % tex_path)
    print("certificate: %s" % cert_path)
    claims = parse_theorem(open(TEX).read())
    cert = parse_certificate(open(CERT).read())
    failures = []

    def check(name, paper_quote, cert_quote, ok):
        print(
            "%s: paper %s; certificate %s; %s"
            % (name, paper_quote, cert_quote, "supported" if ok else "NOT supported")
        )
        if not ok:
            failures.append(name)

    if cert["result"] != "ALL CHECKS PASSED":
        print("certificate RESULT: %s" % cert["result"])
        failures.append("RESULT")
    if cert["k_in_b"] != "yes":
        print("certificate K in int B: %s" % cert["k_in_b"])
        failures.append("K in int B")

    e_paper = (claims["E"][0], claims["E"][1])
    e_cert = (D(cert["E"][0]), D(cert["E"][1]))
    # The run encloses every energy in the certificate interval, so it
    # supports the theorem only when that interval contains the claimed one.
    e_ok = contained(e_paper, e_cert)
    check(
        "E",
        claims["E"][2],
        fmt_iv(cert["E"]),
        e_ok,
    )

    check(
        "y_E",
        fmt_iv(claims["y"]),
        fmt_iv(cert["y"]),
        contained((D(cert["y"][0]), D(cert["y"][1])), (D(claims["y"][0]), D(claims["y"][1]))),
    )
    check(
        "tr DP",
        fmt_iv(claims["tr"]),
        fmt_iv(cert["tr"]),
        contained((D(cert["tr"][0]), D(cert["tr"][1])), (D(claims["tr"][0]), D(claims["tr"][1]))),
    )
    check(
        "eigenvalue modulus",
        "> %s" % claims["modulus"],
        cert["mu"],
        D(cert["mu"]) > D(claims["modulus"]),
    )
    check(
        "return time",
        fmt_iv(claims["return"]),
        fmt_iv(cert["return"]),
        contained(
            (D(cert["return"][0]), D(cert["return"][1])),
            (D(claims["return"][0]), D(claims["return"][1])),
        ),
    )

    pieces = cert["p2_pieces"]
    if not pieces:
        print("p_2(q_E): no p_2 interval in the certificate; not checked")
    else:
        if cert["nhit"] is None or len(pieces) != cert["nhit"]:
            print(
                "p_2(q_E): piece enclosures %d, certificate hit count %s"
                % (len(pieces), cert["nhit"])
            )
            failures.append("p_2 count")
        if cert["unresolved"] != 0 or cert["edges"] != "yes":
            print(
                "p_2(q_E): edges on opposite sides: %s; unresolved %s"
                % (cert["edges"], cert["unresolved"])
            )
            failures.append("p_2 crossing")
        hull = p2_hull(pieces)
        check(
            "p_2(q_E)",
            fmt_iv(claims["p2"]),
            "hull of %d piece enclosures %s" % (len(pieces), fmt_iv(hull)),
            contained((D(hull[0]), D(hull[1])), (D(claims["p2"][0]), D(claims["p2"][1]))),
        )

    shrunk_left = D(claims["y"][0]) + one_ulp(claims["y"][0])
    expect = Decimal("-1.46237309261")
    if shrunk_left != expect:
        print(
            "negative control: shrunk left endpoint %s, expected %s"
            % (shrunk_left, expect)
        )
        failures.append("negative control setup")
    neg_outer = (shrunk_left, D(claims["y"][1]))
    neg_inner = (D(cert["y"][0]), D(cert["y"][1]))
    neg_contains = contained(neg_inner, neg_outer)
    print(
        "negative control: paper y interval [%s, %s] contains certificate %s: %s"
        % (
            format(shrunk_left, "f"),
            claims["y"][1],
            fmt_iv(cert["y"]),
            "contained" if neg_contains else "not contained",
        )
    )
    if neg_contains:
        failures.append("negative control")

    if failures:
        print("RESULT: NOT supported (%s)" % ", ".join(failures))
        return 1
    print("RESULT: supported")
    return 0


if __name__ == "__main__":
    sys.exit(main())
