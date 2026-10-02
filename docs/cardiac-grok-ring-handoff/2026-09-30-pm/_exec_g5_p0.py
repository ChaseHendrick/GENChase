#!/usr/bin/env python3
"""P0/G5 N=3 AZero vs ZeroPruned timed sparse speed bench. Stop after P0. Grok-only."""
from __future__ import annotations
import hashlib, json, os, shutil, signal, subprocess, time
from pathlib import Path

BASE = Path("<workspace>")
PM = BASE / "outputs/cardiac-study/grok-ring-handoff/2026-09-30-pm"
PREF = BASE / "work/cardiac-study/tissue-scalability-preflight"
ADMIT = PREF / "a-zero-admission-grok"
SHARED = ADMIT / "_shared-capd-inputs"
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
load = lambda p: json.loads(Path(p).read_text())
NOW_ET = time.strftime("%Y-%m-%d %H:%M:%S ET")
NOW_UTC = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
TAG = "azero-n3-c1-sparse-speed-bench-grok-20260930-v1"

EXPECT = {
    "AZeroPrunedCellwiseRingMap.hpp": "c252a3bcff9b4092659b4f08d407d8f6e9c7cd06db962f5ec3506a8149251e10",
    "AZeroPrunedSparseMap.hpp": "31d1eb16d06c333eb64535e7b8981680e54b6e60321c1344fe1d77508af21fc8",
    "ZeroPrunedCellwiseRingMap.hpp": "6817be29a468657e17073aefe037722cf51605ea26bb3ed66ea2e7b843289527",
    "ZeroPrunedSparseMap.hpp": "c2c0f5174f62785776195ccf69b04b1dfcf4963ea2a95389424212adf5e53043",
    "CellwiseRingMap.hpp": "9818bfdc6848216ca1e8303059bfd13bade8d172c27c865a379119f22e19cf7f",
}

CPP = r'''// P0/G5 timed sparse C1 speed bench: AZeroPrunedSparseMap vs ZeroPrunedSparseMap.
// N=3 order20. Fair identical seeds/work. NOT a theorem. NOT admitted for proof.
#include "ZeroPrunedSparseMap.hpp"
#include "AZeroPrunedSparseMap.hpp"
#include "capd/dynsys/OdeSolver.hpp"
#include <atomic>
#include <chrono>
#include <cmath>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <sstream>
#include <string>
#include <sys/resource.h>
#include <thread>
#include <vector>
using namespace capd;
using Clock = std::chrono::steady_clock;

static unsigned long long rss_bytes() {
  rusage u{}; getrusage(RUSAGE_SELF, &u);
#ifdef __APPLE__
  return (unsigned long long)u.ru_maxrss;
#else
  return 1024ULL * (unsigned long long)u.ru_maxrss;
#endif
}

struct Seed {
  std::vector<IVector> base;
  std::vector<IMatrix> dir;
};

static Seed makeSeed(unsigned dim, unsigned order, bool box, bool denseA0) {
  Seed s;
  for (unsigned k = 0; k <= order; ++k) {
    s.base.emplace_back(dim);
    s.dir.emplace_back(dim, dim);
  }
  interval w = box ? interval(1) / interval(1048576) : interval(0);
  interval mw = box ? interval(1) / interval(1073741824) : interval(0);
  for (unsigned i = 0; i < dim; ++i) {
    interval b = interval(int(i % 11) - 5) / interval(16) + interval(-w.rightBound(), w.rightBound());
    s.base[0][i] = b;
    for (unsigned j = 0; j < dim; ++j) {
      interval d = interval(int((i + 2 * j) % 7) - 3) / interval(32) + interval(-mw.rightBound(), mw.rightBound());
      if (denseA0) {
        double half = 1.0 / 1048576.0;
        d = interval(-half, half) + interval(int((i + 3 * j) % 5) - 2) / interval(64);
        if (d.leftBound() == 0 && d.rightBound() == 0) d = interval(-half, half);
      }
      s.dir[0][i][j] = d;
    }
  }
  return s;
}

static Seed cloneSeed(const Seed& src, unsigned dim, unsigned order) {
  Seed s;
  for (unsigned k = 0; k <= order; ++k) {
    s.base.push_back(src.base[k]);
    s.dir.push_back(src.dir[k]);
  }
  return s;
}

template<class Map>
static double timeCoeff(Map& field, unsigned dim, unsigned order, unsigned reps, bool box, bool denseA0, unsigned long long* ops) {
  // Fresh seed each rep so work is comparable; map already configured.
  auto t0 = Clock::now();
  for (unsigned r = 0; r < reps; ++r) {
    Seed seed = makeSeed(dim, order, box, denseA0);
    field.computeODECoefficients(seed.base.data(), seed.dir.data(), order);
  }
  auto t1 = Clock::now();
  *ops = reps;
  return std::chrono::duration<double>(t1 - t0).count();
}

template<class Map>
static double timeTubes(Map& field, unsigned dim, unsigned order, unsigned tubes, unsigned long long* ops) {
  IVector initial(dim);
  for (unsigned i = 0; i < dim; ++i) initial[i] = interval(int(i % 11) - 5) / interval(16);
  // Warm construct solver once per call? Reconstruct each tube set from same initial for fair "tube" unit.
  auto t0 = Clock::now();
  for (unsigned t = 0; t < tubes; ++t) {
    capd::dynsys::OdeSolver<Map> solver(field, order);
    solver.setStep(interval(1) / interval(8));
    IMatrix m = IMatrix::Identity(dim);
    C1Rect2Set::C0BaseSet c0(initial);
    C1Rect2Set::C1BaseSet c1(m);
    C1Rect2Set set(c0, c1);
    solver(set);
    volatile double sink = set.getCurrentTime().leftBound();
    (void)sink;
  }
  auto t1 = Clock::now();
  *ops = tubes;
  return std::chrono::duration<double>(t1 - t0).count();
}

int main(int argc, char** argv) {
  if (argc < 2) { std::cerr << "usage: out.json\n"; return 2; }
  if (!rounding::DoubleRounding::isWorking()) { std::cerr << "rounding\n"; return 1; }
  std::atomic<bool> done{false};
  const unsigned long long rss_cap = 768ULL * 1024ULL * 1024ULL;
  std::thread mon([&]{
    while (!done) {
      if (rss_bytes() > rss_cap) { std::cerr << "RSS cap\n"; std::_Exit(70); }
      std::this_thread::sleep_for(std::chrono::milliseconds(5));
    }
  });

  int rc = 1;
  try {
    const unsigned n = 3, dim = 54, order = 20;
    const unsigned coeff_reps = 12;   // within 8-16 band
    const unsigned tubes = 12;        // 8-16 tubes
    const unsigned warmup_coeff = 2;
    const unsigned warmup_tubes = 2;

    ZeroPrunedSparseMap zp(n);
    AZeroPrunedSparseMap az(n);
    zp.setOrder(order); zp.setCurrentTime(interval(3)/interval(4)); zp.differentiateTime();
    az.setOrder(order); az.setCurrentTime(interval(3)/interval(4)); az.differentiateTime();

    // Warmup both (not timed)
    {
      unsigned long long discard = 0;
      timeCoeff(zp, dim, order, warmup_coeff, true, true, &discard);
      timeCoeff(az, dim, order, warmup_coeff, true, true, &discard);
      // separate maps for tube warmup with time 0
      ZeroPrunedSparseMap zp2(n); AZeroPrunedSparseMap az2(n);
      zp2.setOrder(order); zp2.setCurrentTime(interval(0));
      az2.setOrder(order); az2.setCurrentTime(interval(0));
      timeTubes(zp2, dim, order, warmup_tubes, &discard);
      timeTubes(az2, dim, order, warmup_tubes, &discard);
    }

    // Timed coeff path: dense-A0 box (stresses variation products; A-zero skip still only on exact [0,0] higher terms)
    // Order A: ZP then AZ
    unsigned long long ops_zp_c = 0, ops_az_c = 0;
    double sec_zp_c = timeCoeff(zp, dim, order, coeff_reps, true, true, &ops_zp_c);
    double sec_az_c = timeCoeff(az, dim, order, coeff_reps, true, true, &ops_az_c);

    // Timed tube path on fresh maps (avoid solver state coupling)
    ZeroPrunedSparseMap zpT(n); AZeroPrunedSparseMap azT(n);
    zpT.setOrder(order); zpT.setCurrentTime(interval(0));
    azT.setOrder(order); azT.setCurrentTime(interval(0));
    unsigned long long ops_zp_t = 0, ops_az_t = 0;
    double sec_zp_t = timeTubes(zpT, dim, order, tubes, &ops_zp_t);
    double sec_az_t = timeTubes(azT, dim, order, tubes, &ops_az_t);

    // Reverse order second pass for bias check (coeff only, fewer reps)
    ZeroPrunedSparseMap zpR(n); AZeroPrunedSparseMap azR(n);
    zpR.setOrder(order); zpR.setCurrentTime(interval(3)/interval(4)); zpR.differentiateTime();
    azR.setOrder(order); azR.setCurrentTime(interval(3)/interval(4)); azR.differentiateTime();
    unsigned long long ops_az_c2 = 0, ops_zp_c2 = 0;
    double sec_az_c2 = timeCoeff(azR, dim, order, coeff_reps, true, true, &ops_az_c2);
    double sec_zp_c2 = timeCoeff(zpR, dim, order, coeff_reps, true, true, &ops_zp_c2);

    double s_per_coeff_zp = sec_zp_c / double(ops_zp_c);
    double s_per_coeff_az = sec_az_c / double(ops_az_c);
    double s_per_tube_zp = sec_zp_t / double(ops_zp_t);
    double s_per_tube_az = sec_az_t / double(ops_az_t);
    double speedup_coeff = s_per_coeff_zp / s_per_coeff_az; // >1 means AZero faster
    double speedup_tube = s_per_tube_zp / s_per_tube_az;
    double s_per_coeff_zp2 = sec_zp_c2 / double(ops_zp_c2);
    double s_per_coeff_az2 = sec_az_c2 / double(ops_az_c2);
    double speedup_coeff_rev = s_per_coeff_zp2 / s_per_coeff_az2;
    // Primary metric: tube s/tube (plan "s/tube"); also report coeff
    double speedup_primary = speedup_tube;
    double speedup_coeff_mean = 0.5 * (speedup_coeff + speedup_coeff_rev);

    const double material = 1.05;
    const double planning = 1.20;
    bool material_pass = speedup_primary >= material;
    bool planning_met = speedup_primary >= planning;
    // Gate pass: bench completed with fair sparse maps; material_pass decides speed-path recommendation
    bool all_passed = true; // structural bench success
    bool speed_path = material_pass;

    std::ofstream o(argv[1]);
    o << std::setprecision(17);
    o << "{\"schema\":\"azero-g5-p0-speed-bench-result-v1\",\"control\":\"G5\",\"pilot\":\"P0\""
      << ",\"all_passed\":" << (all_passed?"true":"false")
      << ",\"speed_path_material\":" << (speed_path?"true":"false")
      << ",\"planning_target_met\":" << (planning_met?"true":"false")
      << ",\"admitted_for_proof\":false,\"fixture_only\":true,\"flow_attempted\":false"
      << ",\"sites\":3,\"dimension\":54,\"order\":20"
      << ",\"maps\":[\"AZeroPrunedSparseMap\",\"ZeroPrunedSparseMap\"]"
      << ",\"sparse_path\":true"
      << ",\"thresholds\":{\"material_min\":" << material << ",\"planning_target\":" << planning << "}"
      << ",\"coeff_bench\":{"
      << "\"reps\":" << coeff_reps
      << ",\"mode\":\"box_dense_a0\""
      << ",\"zeropruned_seconds\":" << sec_zp_c
      << ",\"azero_seconds\":" << sec_az_c
      << ",\"zeropruned_s_per_rep\":" << s_per_coeff_zp
      << ",\"azero_s_per_rep\":" << s_per_coeff_az
      << ",\"speedup_zp_over_az\":" << speedup_coeff
      << ",\"reverse_order\":{"
      << "\"zeropruned_seconds\":" << sec_zp_c2
      << ",\"azero_seconds\":" << sec_az_c2
      << ",\"zeropruned_s_per_rep\":" << s_per_coeff_zp2
      << ",\"azero_s_per_rep\":" << s_per_coeff_az2
      << ",\"speedup_zp_over_az\":" << speedup_coeff_rev
      << "}"
      << ",\"speedup_mean_both_orders\":" << speedup_coeff_mean
      << "}"
      << ",\"tube_bench\":{"
      << "\"tubes\":" << tubes
      << ",\"step\":\"1/8\""
      << ",\"zeropruned_seconds\":" << sec_zp_t
      << ",\"azero_seconds\":" << sec_az_t
      << ",\"zeropruned_s_per_tube\":" << s_per_tube_zp
      << ",\"azero_s_per_tube\":" << s_per_tube_az
      << ",\"speedup_zp_over_az\":" << speedup_tube
      << "}"
      << ",\"primary_metric\":\"tube_s_per_tube_speedup_zp_over_az\""
      << ",\"primary_speedup\":" << speedup_primary
      << ",\"peak_rss_bytes\":" << rss_bytes()
      << ",\"does_not_prove\":[\"n32_return\",\"n64_return\",\"header_swap\",\"theorems\",\"continuum\"]"
      << "}\n";

    std::cout << "{\"control\":\"G5\",\"pilot\":\"P0\",\"primary_speedup\":" << speedup_primary
              << ",\"zp_s_per_tube\":" << s_per_tube_zp
              << ",\"az_s_per_tube\":" << s_per_tube_az
              << ",\"speed_path_material\":" << (speed_path?"true":"false")
              << ",\"planning_target_met\":" << (planning_met?"true":"false") << "}\n";
    rc = 0;
  } catch (const std::exception& e) {
    std::cerr << e.what() << "\n";
    rc = 1;
  }
  done = true; mon.join();
  return rc;
}
'''

def verify_pins():
    live = {}
    for n, e in EXPECT.items():
        h = sha(PREF / n)
        if h != e:
            raise SystemExit(f"PIN DRIFT {n}")
        live[n] = h
    return live

def main():
    # Prior gates
    for name in ["AZERO-G1-LEDGER-RECEIPT.json", "AZERO-G2-BUILD-RECEIPT.json",
                 "AZERO-G3-SUPPLIER-AUDIT-RECEIPT.json", "AZERO-G4-EQUIVALENCE-RECEIPT.json"]:
        r = load(PM / name)
        if r.get("verdict") != "PASS":
            raise SystemExit(f"prior gate not PASS: {name}")

    live = verify_pins()
    d = ADMIT / "g5-p0-sparse-speed-bench-grok" / TAG
    if d.exists():
        raise SystemExit(f"tag exists {d}")
    for sub in ("src", "bin", "results", "inputs"):
        (d / sub).mkdir(parents=True)

    src = d / "src" / "g5_p0_sparse_speed_bench.cpp"
    src.write_text(CPP)

    for h in [
        "AZeroPrunedCellwiseRingMap.hpp", "AZeroPrunedSparseMap.hpp",
        "ZeroPrunedCellwiseRingMap.hpp", "ZeroPrunedSparseMap.hpp",
        "CellwiseRingMap.hpp", "ring_model.h", "cardiac_model.h", "cardiac_scaled_model.h",
    ]:
        shutil.copy2(SHARED / h, d / "inputs" / h)
    shutil.copy2(SHARED / "libcapd.a", d / "inputs" / "libcapd.a")
    shutil.copytree(SHARED / "headers", d / "inputs" / "headers")

    for name in EXPECT:
        if name.endswith(".hpp") and name.startswith(("AZero", "Zero", "Cellwise")):
            if (d / "inputs" / name).exists() and sha(d / "inputs" / name) != EXPECT[name]:
                raise SystemExit(f"staged pin mismatch {name}")

    IN = d / "inputs"
    binary = d / "bin" / "g5_p0_sparse_speed_bench"
    cmd = (
        ["/usr/bin/clang++", "-std=c++17", "-O2", "-frounding-math", "-D__USE_NATIVE__", "-pthread"]
        + [f"-I{IN/'headers'/p/'include'}" for p in ["capdExt", "capdAux", "capdAlg", "capdDynSys"]]
        + [f"-I{IN}", str(src), str(IN / "libcapd.a"), "-o", str(binary)]
    )
    clog = d / "results" / "COMPILE-G5.log"
    with clog.open("w") as f:
        f.write("CMD: " + " ".join(cmd) + "\n"); f.flush()
        cr = subprocess.run(cmd, stdout=f, stderr=subprocess.STDOUT, timeout=180)
    if cr.returncode != 0:
        raise SystemExit(f"compile fail\n{clog.read_text()[-2500:]}")

    result_path = d / "results" / "G5-RESULT.json"
    stdout_path = d / "results" / "G5.stdout"
    time_path = d / "results" / "G5.time.log"
    began = time.monotonic()
    with stdout_path.open("w") as out, time_path.open("w") as tlog:
        proc = subprocess.Popen(
            [str(binary), str(result_path)],
            cwd=str(d), stdout=out, stderr=subprocess.STDOUT,
            start_new_session=True,
            preexec_fn=lambda: os.nice(19) if False else None,  # soft: may fail; use try below
        )
    # Fix: Popen already started without nice - rewrite properly
    # Actually the above already started. Let me kill and redo cleanly.
PY
# The script above is incomplete - rewrite full clean version
echo "rewriting full script..."
