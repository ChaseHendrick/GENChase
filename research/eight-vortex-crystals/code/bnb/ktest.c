#include <stdio.h>
#include <string.h>
#include "kraw.h"
int main(void) {
  double REF[NU]; int ks[7] = {5, 6, 4, -1, 3, 1, 2}; double ys[7];
  REF[0] = 2.0;
  for (int t = 0; t < 7; t++) { int k = ks[t]; REF[1 + t] = k < 0 ? 0 : 2 * cos(2 * M_PI * k / 7); ys[t] = k < 0 ? 0 : 2 * sin(2 * M_PI * k / 7); }
  for (int t = 0; t < 7; t++) REF[8 + t] = ys[t];
  for (double r = 1e-6; r < 1; r *= 1.25) {
    iv v[NU], K[NU]; for (int k = 0; k < NU; k++) v[k] = I(REF[k] - r, REF[k] + r);
    int res = krawczyk(v, K);
    double mx = 0; for (int k = 0; k < NU; k++) mx = fmax(mx, fmax(K[k].hi - REF[k], REF[k] - K[k].lo));
    printf("r=%.3e result=%d  K radius=%.3e ratio=%.3f\n", r, res, mx, mx / r);
    if (res != 1) break;
  }
}
