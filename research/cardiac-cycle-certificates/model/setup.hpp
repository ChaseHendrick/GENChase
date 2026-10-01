// Parameter setup shared by the rigorous and the ordinary programs.
#pragma once
#include <cmath>
#include <cstdint>
#include <stdexcept>
#include <string>
#include "tp06_capd.hpp"

namespace tp06 {

// Exact decomposition of a decimal literal such as "0.0153", "-2.5", "6.948e-6": value = sign * n * 10^e with the
// digits forming an integer n < 10^15 < 2^53 (exact in double) and |e| <= 22 (10^|e| exact in double). So
// n * 10^e (e >= 0) or n / 10^(-e) (e < 0) is a single correctly enclosed interval operation in any interval type.
struct Decimal { bool neg; double n, p; bool divide; };
inline Decimal parseDecimal(const std::string& text) {
  std::string s = text;
  bool neg = false;
  if (!s.empty() && (s[0] == '-' || s[0] == '+')) { neg = s[0] == '-'; s = s.substr(1); }
  int exp10 = 0;
  size_t e = s.find_first_of("eE");
  if (e != std::string::npos) {
    std::string es = s.substr(e + 1);
    size_t used = 0;
    exp10 = std::stoi(es, &used);
    if (used != es.size()) throw std::runtime_error("bad exponent in decimal: " + text);
    s = s.substr(0, e);
  }
  size_t dot = s.find('.');
  std::string digits = s;
  if (dot != std::string::npos) { exp10 -= int(s.size() - dot - 1); digits = s.substr(0, dot) + s.substr(dot + 1); }
  if (digits.empty() || digits.size() > 15) throw std::runtime_error("decimal out of range: " + text);
  for (char c : digits) if (c < '0' || c > '9') throw std::runtime_error("bad decimal: " + text);
  if (exp10 < -22 || exp10 > 22) throw std::runtime_error("exponent out of range: " + text);
  double p = 1.0;
  for (int i = 0; i < std::abs(exp10); ++i) p *= 10.0;
  return Decimal{neg, double(std::stoll(digits)), p, exp10 < 0};
}
template <class IntervalT>
IntervalT decimalEnclosureT(const std::string& text) {
  Decimal d = parseDecimal(text);
  IntervalT v = d.divide ? IntervalT(d.n) / IntervalT(d.p) : IntervalT(d.n) * IntervalT(d.p);
  return d.neg ? -v : v;
}
inline capd::interval decimalEnclosure(const std::string& text) { return decimalEnclosureT<capd::interval>(text); }

template <class ScalarT> ScalarT fromInterval(const capd::interval& v);
template <> inline capd::interval fromInterval<capd::interval>(const capd::interval& v) { return v; }
template <> inline double fromInterval<double>(const capd::interval& v) { return v.mid().leftBound(); }
// Value of a decimal in the scalar type of a map: an enclosure for interval types (specialized for MpInterval in the
// multiprecision program), the nearest double for the ordinary double map.
template <class ScalarT> ScalarT decimalAs(const std::string& s) { return fromInterval<ScalarT>(decimalEnclosure(s)); }

struct Physical {
  std::string gKr = "0.0153", gKs = "0.0275", gNa = "14.838", gK1 = "5.405", gCaL = "0.000199", Cm = "1", Ki = "138.3";
};

// Builds the map once (so the registry of decimals is filled), then sets every parameter.
// gKsOverride, if nonempty in the interval sense, replaces the decimal g_Ks (used for parameter intervals).
template <class MapT, class ScalarT>
void setParameters(MapT& f, const Physical& p, ScalarT coupling, const ScalarT* gKsOverride = nullptr) {
  auto set = [&](int k, const std::string& dec) { f.setParameter(k, decimalAs<ScalarT>(dec)); };
  set(P_GKR, p.gKr); set(P_GNA, p.gNa); set(P_GK1, p.gK1); set(P_GCAL, p.gCaL); set(P_CM, p.Cm); set(P_KI, p.Ki);
  if (gKsOverride) f.setParameter(P_GKS, *gKsOverride); else set(P_GKS, p.gKs);
  f.setParameter(P_COUPLING, coupling);
  auto& r = registry();
  for (size_t i = 0; i < r.size(); ++i) f.setParameter(P_BASE + int(i), decimalAs<ScalarT>(r[i]));
  for (int k = P_BASE + int(r.size()); k < P_MAX; ++k) f.setParameter(k, ScalarT(0.0));
}

}  // namespace tp06
