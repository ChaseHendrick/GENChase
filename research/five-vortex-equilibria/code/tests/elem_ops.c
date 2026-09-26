#include <stdio.h>
#include <string.h>
#include "../ivelem.h"
int main(void) {
  iv_init();
  char op[8]; double a, b, c, d;
  while (scanf("%7s %la %la %la %la", op, &a, &b, &c, &d) == 5) {
    iv x = ivr(a, b), y = ivr(c, d), r;
    if (!strcmp(op, "log")) r = iv_log(x);
    else if (!strcmp(op, "exp")) r = iv_exp(x);
    else if (!strcmp(op, "pow")) r = iv_powr(x, y);
    else continue;
    printf("%a %a\n", r.lo, r.hi);
  }
  return 0;
}
