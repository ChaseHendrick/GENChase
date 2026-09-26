# Task (2): multi-covariate synapse model with crossed random effects for presynaptic (within projection type) and
# postsynaptic cells, Poisson, log co-travel offset. Compared with the paper's (1 | proj:pre)-only structure.
suppressMessages(library(glmmTMB))
d <- read.csv('work/pairs_syn.csv'); d$proj <- factor(d$proj); d$pp <- factor(paste(d$proj, d$pre)); d$post <- factor(d$post)
fits <- list(
  dt_pre      = nsyn ~ (sil + fsim + rfd) * proj + (1 | pp) + offset(log(L)),
  dt_prepost  = nsyn ~ (sil + fsim + rfd) * proj + (1 | pp) + (1 | post) + offset(log(L)),
  iv_prepost  = nsyn ~ (viv + fsim + rfd) * proj + (1 | pp) + (1 | post) + offset(log(L)))
out <- NULL
for (nm in names(fits)) {
  t0 <- Sys.time(); m <- glmmTMB(fits[[nm]], family = poisson, data = d)
  b <- fixef(m)$cond; V <- vcov(m)$cond
  for (v in c('sil', 'viv', 'fsim', 'rfd')) { if (!(v %in% names(b))) next
    for (k in levels(d$proj)) { w <- setNames(rep(0, length(b)), names(b)); w[v] <- 1
      nm2 <- paste0(v, ':proj', k); if (nm2 %in% names(b)) w[nm2] <- 1
      est <- sum(w * b); se <- sqrt(as.numeric(t(w) %*% V %*% w))
      out <- rbind(out, data.frame(model = nm, sim = v, proj = k, coef = est, se = se, z = est / se)) } }
  vc <- VarCorr(m)$cond
  cat(nm, 'sd_pre', sqrt(vc$pp[1]), 'sd_post', if (!is.null(vc$post)) sqrt(vc$post[1]) else NA, 'AIC', AIC(m), 'secs', as.numeric(Sys.time() - t0, units = 'secs'), '\n')
  if (nm == 'dt_prepost') { re <- ranef(m)$cond$post; write.csv(data.frame(post = rownames(re), u = re[, 1]), 'work/post_blup_dt.csv', row.names = FALSE) }
}
print(out); write.csv(out, 'work/glmm_crossed.csv', row.names = FALSE)
