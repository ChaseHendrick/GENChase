"""Check the horseshoe table in double-pendulum.tex against the certificate files.

For each energy E = -1/2, 0, 1/2 the printed row is supported only if:
  * the certificate spectral-radius lower bound has the printed r digits as a
    prefix, or is at least that value truncated where the paper stops;
  * the certificate h_top lower bound is strictly greater than the printed one;
  * the certificate return-time upper bound is at most the printed tau;
  * the certificate flow-entropy lower bound is strictly greater than the printed one;
  * the certificate says ALL COVERING RELATIONS VERIFIED.

A negative control, held only in memory, raises the printed E = 0 h_top bound by
one unit in its last digit. That inflated bound must not be supported. The tex
file and the certificates are not modified.

Standard library only. Digits are taken from the files; nothing is re-rounded.
"""

from __future__ import annotations

import re
import sys
from decimal import Decimal
from pathlib import Path

HERE = Path(__file__).resolve().parent
PAPER = HERE.parent / "paper" / "double-pendulum.tex"
DATA = HERE.parent / "data"
CERTS = {
    "-1/2": DATA / "horseshoe_Eminushalf.txt",
    "0": DATA / "horseshoe_E0.txt",
    "1/2": DATA / "horseshoe_Ehalf.txt",
}

ROW_RE = re.compile(
    r"^\$(-1/2|1/2|0)\$\s*&\s*"
    r"\$([0-9]+\.[0-9]+)\\ldots\$\s*&\s*"
    r"\$([0-9]+\.[0-9]+)\$\s*&\s*"
    r"\$([0-9]+\.[0-9]+)\$\s*&\s*"
    r"\$([0-9]+\.[0-9]+)\$\s*\\\\"
)
SPEC_RE = re.compile(
    r"min_i \(A v\)_i / v_i >= ([0-9]+\.[0-9]+) for a positive v, "
    r"so the spectral radius is at least that: yes"
)
BOUND_RE = re.compile(
    r"h_top\(P\) >= log r >= ([0-9]+\.[0-9]+) per return; "
    r"return time <= ([0-9]+\.[0-9]+), so h_top\(flow\) >= ([0-9]+\.[0-9]+) per unit time"
)
VERIFIED = "ALL COVERING RELATIONS VERIFIED"


def parse_table(text):
    rows = {}
    lines = {}
    for line in text.splitlines():
        m = ROW_RE.match(line.strip())
        if not m:
            continue
        energy, r, htop, tau, flow = m.groups()
        if energy in rows:
            print(f"FAIL: duplicate table row for E={energy}")
            print("printed: " + line.strip())
            sys.exit(1)
        rows[energy] = {"r": r, "htop": htop, "tau": tau, "flow": flow}
        lines[energy] = line.strip()
    missing = [e for e in CERTS if e not in rows]
    if missing:
        print("FAIL: horseshoe table is missing energies: " + ", ".join(missing))
        sys.exit(1)
    return rows, lines


def parse_cert(path):
    text = path.read_text()
    spec_line = bound_line = verified_line = None
    spec = bounds = None
    for line in text.splitlines():
        spec_m = SPEC_RE.search(line)
        if spec_m:
            if spec_line is not None:
                print(f"FAIL: two spectral-radius lines in {path}")
                sys.exit(1)
            spec_line = line
            spec = spec_m.group(1)
        bound_m = BOUND_RE.search(line)
        if bound_m:
            if bound_line is not None:
                print(f"FAIL: two entropy lines in {path}")
                sys.exit(1)
            bound_line = line
            h, tau, flow = bound_m.groups()
            bounds = {"htop": h, "tau": tau, "flow": flow}
        if VERIFIED in line:
            if verified_line is not None:
                print(f"FAIL: two verification lines in {path}")
                sys.exit(1)
            verified_line = line
    if spec is None or bounds is None or verified_line is None:
        print(f"FAIL: {path} is missing a required certificate line")
        if spec_line:
            print("certificate: " + spec_line.strip())
        if bound_line:
            print("certificate: " + bound_line.strip())
        if verified_line:
            print("certificate: " + verified_line.strip())
        sys.exit(1)
    return spec, bounds, spec_line, bound_line, verified_line


def bump_last_digit(decimal_string):
    """Increase the last printed digit by one unit in that place."""
    if "." not in decimal_string:
        print(f"FAIL: cannot bump a non-decimal bound {decimal_string}")
        sys.exit(1)
    places = len(decimal_string.split(".", 1)[1])
    bumped = Decimal(decimal_string) + Decimal(1).scaleb(-places)
    rendered = format(bumped, f".{places}f")
    if rendered == decimal_string:
        print(f"FAIL: bumping {decimal_string} did not change it")
        sys.exit(1)
    return rendered


def unsupported(failures, energy, what, printed_line, cert_line):
    print(f"FAIL E={energy}: printed {what} is not supported")
    print("printed: " + printed_line.rstrip("\n"))
    print("certificate: " + cert_line.rstrip("\n"))
    return failures + 1


def main():
    checker = Path(__file__).resolve()
    print(f"checker: {checker}")
    rows, row_lines = parse_table(PAPER.read_text())
    failures = 0
    parsed = {}

    for energy, path in CERTS.items():
        printed = rows[energy]
        spec, bounds, spec_line, bound_line, verified_line = parse_cert(path)
        parsed[energy] = (spec, bounds, spec_line, bound_line, verified_line, path)
        print(f"file: {path}")
        print("printed: " + row_lines[energy])
        print("certificate: " + spec_line.strip())
        print("certificate: " + bound_line.strip())
        print("certificate: " + verified_line.strip())

        prefix = spec.startswith(printed["r"])
        at_least = Decimal(spec) >= Decimal(printed["r"])
        if not (prefix or at_least):
            failures = unsupported(
                failures,
                energy,
                "spectral radius",
                row_lines[energy],
                spec_line.strip(),
            )
        else:
            how = []
            if prefix:
                how.append("printed digits are a prefix")
            if at_least:
                how.append(f"{spec} >= {printed['r']}")
            print("  r OK (" + "; ".join(how) + ")")

        if not (Decimal(bounds["htop"]) > Decimal(printed["htop"])):
            failures = unsupported(
                failures,
                energy,
                "h_top",
                row_lines[energy],
                bound_line.strip(),
            )
        else:
            print(f"  htop OK ({bounds['htop']} > {printed['htop']})")

        if not (Decimal(bounds["tau"]) <= Decimal(printed["tau"])):
            failures = unsupported(
                failures,
                energy,
                "return time",
                row_lines[energy],
                bound_line.strip(),
            )
        else:
            print(f"  tau OK ({bounds['tau']} <= {printed['tau']})")

        if not (Decimal(bounds["flow"]) > Decimal(printed["flow"])):
            failures = unsupported(
                failures,
                energy,
                "flow entropy",
                row_lines[energy],
                bound_line.strip(),
            )
        else:
            print(f"  flow OK ({bounds['flow']} > {printed['flow']})")

        if VERIFIED not in verified_line:
            failures = unsupported(
                failures,
                energy,
                VERIFIED,
                row_lines[energy],
                verified_line.strip(),
            )
        else:
            print(f"  {VERIFIED}: OK")

    # Negative control, in memory only: the E = 0 printed h_top bound, last digit + 1.
    spec, bounds, spec_line, bound_line, verified_line, path = parsed["0"]
    printed_h = rows["0"]["htop"]
    bumped = bump_last_digit(printed_h)
    print("negative control (in memory; tex not edited):")
    print(f"file: {path}")
    print(f"printed: htop bound {printed_h} raised by one unit in the last digit -> {bumped}")
    print("certificate: " + bound_line.strip())
    if Decimal(bounds["htop"]) > Decimal(bumped):
        failures += 1
        print("FAIL negative control: the certificate still supports the inflated htop bound")
        print("printed: " + bumped)
        print("certificate: " + bound_line.strip())
    else:
        print(
            "  NOT SUPPORTED, as required: "
            f"certificate h_top >= {bounds['htop']} is not strictly greater than printed {bumped}"
        )
        print("printed: " + bumped)
        print("certificate: " + bound_line.strip())

    if failures:
        print(f"RESULT: FAIL ({failures})")
        sys.exit(1)
    print("RESULT: OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
