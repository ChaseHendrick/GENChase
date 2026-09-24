// Compute and energy accounting for volunteer jobs. CPU time is measured; energy is measured only where the
// operating system exposes a package energy counter (Linux RAPL) and is otherwise an estimate labelled as such.
'use strict';
const fs = require('node:fs'), path = require('node:path');
const WATTS_PER_BUSY_CORE = [1, 20]; // Apple efficiency cores draw about 1 W under load, desktop x86 cores about 20 W
function energyCounter(base = '/sys/class/powercap') {
  try {
    const zones = fs.readdirSync(base).filter(z => /^intel-rapl:\d+$/.test(z));
    const read = z => ({ uj: Number(fs.readFileSync(path.join(base, z, 'energy_uj'), 'utf8')), max: Number(fs.readFileSync(path.join(base, z, 'max_energy_range_uj'), 'utf8')) });
    const values = zones.map(read); return values.length && values.every(v => Number.isFinite(v.uj) && v.max > 0) ? values : null;
  } catch { return null; }
}
// Joules between two counter reads; each register wraps at most once between reads.
function energyBetween(a, b) {
  if (!a || !b || a.length !== b.length) return null;
  return a.reduce((sum, v, i) => sum + ((b[i].uj - v.uj + v.max) % v.max) / 1e6, 0);
}
// POSIX `times` prints the shell's own user and system time, then its waited-for children's.
function parseTimes(text) {
  const lines = String(text || '').trim().split('\n').filter(Boolean); if (lines.length < 2) return null;
  const seconds = token => { const m = /^(?:(\d+)m)?([\d.]+)s$/.exec(token); return m ? Number(m[1] || 0) * 60 + Number(m[2]) : NaN; };
  const values = lines[1].trim().split(/\s+/).map(seconds);
  return values.length === 2 && values.every(Number.isFinite) ? { userSeconds: values[0], systemSeconds: values[1], cpuSeconds: values[0] + values[1] } : null;
}
function energy(cpuSeconds, joules) {
  return Number.isFinite(joules)
    ? { method: 'measured: Linux RAPL package counter over the job, including any other programs running', joules, wattHours: joules / 3600 }
    : { method: `estimate: CPU seconds times ${WATTS_PER_BUSY_CORE[0]} to ${WATTS_PER_BUSY_CORE[1]} W per busy core; not measured on this machine`,
        wattHoursLow: cpuSeconds * WATTS_PER_BUSY_CORE[0] / 3600, wattHoursHigh: cpuSeconds * WATTS_PER_BUSY_CORE[1] / 3600 };
}
function jobCompute(times, wallSeconds, joules) {
  if (!times) return { recorded: false, wallSeconds, note: 'CPU time unavailable: the job was stopped or its shell could not report times.', energy: Number.isFinite(joules) ? energy(0, joules) : null };
  return { recorded: true, wallSeconds, ...times, utilization: wallSeconds > 0 ? times.cpuSeconds / wallSeconds : null, energy: energy(times.cpuSeconds, joules),
    scope: 'CPU time of the job command and every descendant it waited for; detached descendants are not counted.' };
}
function describe(c) {
  if (!c) return 'not recorded';
  const e = c.energy, wh = !e ? '' : Number.isFinite(e.wattHours) ? `, ${e.wattHours.toFixed(3)} Wh measured` : `, about ${e.wattHoursLow.toFixed(3)} to ${e.wattHoursHigh.toFixed(3)} Wh estimated`;
  return c.recorded ? `${c.cpuSeconds.toFixed(1)} CPU s over ${c.wallSeconds.toFixed(1)} s wall${wh}` : `${c.wallSeconds.toFixed(1)} s wall, CPU time not recorded${wh}`;
}
module.exports = { WATTS_PER_BUSY_CORE, energyCounter, energyBetween, parseTimes, energy, jobCompute, describe };
