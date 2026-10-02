"""Extrapolate the measured pilot costs (results/<run>.json and results/<run>_steps.tsv) to one shift interval and to
one C1 shift map, and compare with the estimate in SCOPING.md section 6.6.

Measured inputs, per run: the steps after the first (the first step size comes from CAPD's step-control
initialisation, not from the step-size formula; a final step shortened to land on T is also excluded), their mean
size h and mean wall time per step w (single thread, so wall time = core time; the user CPU time is recorded beside it).
Arithmetic (extrapolated, labelled as such in the output):
  steps per ms           = 1 / h
  core-seconds per ms    = w / h
  steps per shift        = tau / h,           tau = 33.8196585255 ms (SCOPING.md section 4)
  core-hours per shift   = (tau / h) * w / 3600
  core-hours per C1 shift map = core-hours per shift * (1 + a), with an allowance a in [0, 0.15] for what the
      integration over [0, tau] does not contain (two section crossings, the GHK series node, the branch switch);
      the allowance is a stated assumption, not a measurement.
Usage: python3 extrapolate.py RUN [RUN ...]   (writes results/extrapolation.json, prints a table)
"""
import json, os, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
TAU = 33.8196585255
SCOPING = dict(per_step_s=[40.0, 100.0], steps_order20=9850, steps_order30=5000, core_hours=[110.0, 270.0],
               stop_rule_core_hours=1000.0)
ALLOW = (0.0, 0.15)

rows, out = [], dict(note="Measured values are from the pilot runs named; every other number is an extrapolation "
                          "by the arithmetic in extrapolate.py's docstring.", tau_ms=TAU, scoping_estimate=SCOPING,
                     allowance_full_map=ALLOW, runs={})
for run in sys.argv[1:]:
    rec = json.load(open(os.path.join(HERE, "results", run + ".json")))
    r = rec["run"]
    st = np.loadtxt(os.path.join(HERE, "results", run + "_steps.tsv"), ndmin=2)
    t, h, w = st[:, 1], st[:, 2], st[:, 3]
    use = np.arange(1, len(h))
    if r["fraction_of_T"] >= 1.0 and len(use) > 1:
        use = use[:-1]  # last step shortened to land on T
    hm, wm = float(h[use].mean()), float(w[use].mean())
    e = dict(measured=dict(set=r["set"], order=r["order"], window_t0_ms=r["window_t0_ms"], reached_ms=float(t[-1]),
                           steps=int(len(h)), steps_used=int(len(use)), mean_step_ms=hm,
                           step_ms_min_max=[float(h[use].min()), float(h[use].max())],
                           wall_per_step_s=wm, wall_per_step_s_min_max=[float(w[use].min()), float(w[use].max())],
                           wall_total_s=rec["wall_s"], user_cpu_s=rec["user_cpu_s"], peak_rss_GiB=rec["peak_rss_GiB"],
                           h_times_942_per_ms=hm * 942.0,
                           end_c0_max_relative_diameter=r["end_c0_max_relative_diameter"],
                           end_c0_max_relative_diameter_at=r.get("end_c0_max_relative_diameter_at"),
                           end_c0_max_diameter_scaled=r.get("end_c0_max_diameter_scaled"),
                           end_derivative_max_entry_width_scaled=r["end_derivative_max_entry_width_scaled"],
                           max_over_steps_derivative_entry_width_scaled=float(st[:, 6].max()) if st.shape[1] > 6 else None,
                           end_derivative_max_relative_width_large_entries=r["end_derivative_max_relative_width_entries_ge_1e-3_max"]),
             extrapolated=dict(steps_per_ms=1 / hm, core_s_per_ms=wm / hm, steps_per_shift=TAU / hm,
                               core_hours_per_shift=TAU / hm * wm / 3600,
                               core_hours_per_C1_shift_map=[TAU / hm * wm / 3600 * (1 + a) for a in ALLOW],
                               wall_days_per_C1_shift_map_single_thread=[TAU / hm * wm / 86400 * (1 + a) for a in ALLOW],
                               ratio_to_stop_rule=TAU / hm * wm / 3600 * (1 + ALLOW[1]) / SCOPING["stop_rule_core_hours"]))
    out["runs"][run] = e
    m, x = e["measured"], e["extrapolated"]
    rows.append("| %s | %d | %.3f | %d | %.5f | %.1f | %.2f | %.0f | %.0f | %.0f to %.0f |" % (
        m["set"], m["order"], m["reached_ms"], m["steps"], m["mean_step_ms"], m["wall_per_step_s"], m["peak_rss_GiB"],
        x["core_s_per_ms"], x["steps_per_shift"], *x["core_hours_per_C1_shift_map"]))
json.dump(out, open(os.path.join(HERE, "results", "extrapolation.json"), "w"), indent=1)
print("| set | order | reached (ms, measured) | steps (measured) | mean step ms (measured) | wall/step s (measured) | "
      "peak RSS GiB (measured) | core-s per ms (extrap.) | steps per shift (extrap.) | core-h per C1 shift map (extrap.) |")
print("|---|---|---|---|---|---|---|---|---|---|")
print("\n".join(rows))
