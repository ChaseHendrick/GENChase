'use strict';

// Independent checks for the exact sine–Gordon breather used by src/modules/breather.js.
// Extract the maintained scalar expression, then test independent PDE and energy identities.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/modules/breather.js'), 'utf8');
const expression = source.match(/const u = (4 \* Math\.atan[^;]+);/);
if (!expression) throw Error('Maintained breather expression moved; review harness');
const sample = new Function('xx', 't', 'b', 'a', 'return ' + expression[1]);

const TAU = 2 * Math.PI;
const betas = [0.2, 0.45, 0.75];
const fail = (ok, msg) => { if (!ok) throw new Error(msg); };
const alpha = beta => Math.sqrt(1 - beta * beta);
const breather = (x, t, beta, betaOverride = beta) => {
  const a = alpha(betaOverride);
  return sample(x, t, beta, a);
};
const residual = (x, t, beta, h, betaOverride = beta) => {
  const u = (xx, tt) => breather(xx, tt, beta, betaOverride);
  const utt = (u(x, t + h) - 2 * u(x, t) + u(x, t - h)) / (h * h);
  const uxx = (u(x + h, t) - 2 * u(x, t) + u(x - h, t)) / (h * h);
  return utt - uxx + Math.sin(u(x, t));
};
const energyDensity = (x, t, beta) => {
  const h = 2e-5;
  const u = (xx, tt) => breather(xx, tt, beta);
  const ut = (u(x, t + h) - u(x, t - h)) / (2 * h);
  const ux = (u(x + h, t) - u(x - h, t)) / (2 * h);
  return 0.5 * (ut * ut + ux * ux) + 1 - Math.cos(u(x, t));
};
const integrate = (fn, lo, hi, n) => {
  const dx = (hi - lo) / n;
  let sum = 0;
  for (let i = 0; i <= n; i++) {
    const w = i === 0 || i === n ? 0.5 : 1;
    sum += w * fn(lo + i * dx);
  }
  return sum * dx;
};

const residualRows = [];
for (const beta of betas) {
  const points = [[-0.73, 0.37], [0.0, 0.91], [1.31, -0.44], [2.2, 1.7]];
  const errors = [0.02, 0.01, 0.005].map(h => {
    let sum = 0;
    for (const [x, t] of points) sum += residual(x, t, beta, h) ** 2;
    return Math.sqrt(sum / points.length);
  });
  const order = Math.log(errors[0] / errors[2]) / Math.log(4);
  const wrongSign = Math.sqrt(points.reduce((sum, [x, t]) => sum + residual(x, t, beta, 0.005, beta * 0.92) ** 2, 0) / points.length);
  const period = TAU / alpha(beta);
  const periodicError = Math.max(...points.map(([x, t]) => Math.abs(breather(x, t, beta) - breather(x, t + period, beta))));
  const cut = 6 / beta;
  const total = integrate(x => energyDensity(x, 0.37, beta), -20 / beta, 20 / beta, 16000);
  const outside = integrate(x => energyDensity(x, 0.37, beta), cut, 20 / beta, 7000) + integrate(x => energyDensity(x, 0.37, beta), -20 / beta, -cut, 7000);
  const outsideFraction = outside / total;
  const energyRelativeError = Math.abs(total / (16 * beta) - 1);
  residualRows.push({ beta, errors, observedOrder: order, wrongFrequencyResidual: wrongSign, period, periodicError, totalEnergy: total, energyRelativeError, outsideEnergyFraction: outsideFraction });
}

for (const row of residualRows) {
  fail(row.observedOrder > 1.85, `breather residual did not converge at beta=${row.beta}`);
  fail(row.errors[2] < 3e-5, `breather residual too large at beta=${row.beta}`);
  fail(row.wrongFrequencyResidual > row.errors[2] * 20, `breather failure control did not separate at beta=${row.beta}`);
  fail(row.periodicError < 2e-12, `breather period mismatch at beta=${row.beta}`);
  fail(row.outsideEnergyFraction < 0.002, `breather energy localization failed at beta=${row.beta}`);
  fail(row.energyRelativeError < 1e-7, `breather total energy failed at beta=${row.beta}`);
}

const result = {
  sourceSha256: require('node:crypto').createHash('sha256').update(source).digest('hex'),
  model: 'sine-Gordon breather',
  equation: 'u_tt - u_xx + sin(u) = 0',
  cases: residualRows,
  pass: true,
  limitations: [
    'Checks the exact analytic field and a bounded spatial integral, not a browser time integrator.',
    'The localization threshold and finite integration window do not establish every beta or infinite-domain energy.'
  ]
};
const out = path.join(root, 'validation/results/breather-science.json');
if (process.argv.includes('--write')) fs.writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
