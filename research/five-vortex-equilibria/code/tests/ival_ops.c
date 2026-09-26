/* reads lines "op alo ahi blo bhi" (hex floats) and prints the result interval */
#include <stdio.h>
#include <string.h>
#include "../ival.h"
int main(void) {
  iv_init();
  char op[8]; double a, b, c, d;
  while (scanf("%7s %la %la %la %la", op, &a, &b, &c, &d) == 5) {
    iv x = ivr(a, b), y = ivr(c, d), r;
    if (!strcmp(op, "add")) r = iv_add(x, y);
    else if (!strcmp(op, "sub")) r = iv_sub(x, y);
    else if (!strcmp(op, "mul")) r = iv_mul(x, y);
    else if (!strcmp(op, "sqr")) r = iv_sqr(x);
    else if (!strcmp(op, "rec")) r = iv_recip(x);
    else continue;
    printf("%a %a\n", r.lo, r.hi);
  }
  return 0;
}
