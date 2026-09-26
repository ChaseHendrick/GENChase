#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""The trailer's score: an original ambient electronic piece, synthesized here from oscillators and noise.

No samples and no third-party audio: every sound is computed below, so the track carries the repository's licence.
96 BPM, 4/4, 18 bars = 45 s. The progression is Dm9 | Bbmaj7 | Fmaj9 | Csus2, two bars each, played twice, and a
last Dm9 for the end card.

  bars  1-2   pad alone, filter opening                (title)
  bars  3-10  plucked arpeggio with ping-pong delay, sub bass; kick from bar 5, hats from bar 7
  bars 11-14  full: clap on 2 and 4, eighth-note bass, the filter wide open; a riser through bar 14
  bars 15-16  the lift: double-time hats, impact on the downbeat of bar 15
  bars 17-18  the last chord rings out under the end card and fades to silence at 45 s

usage: python3 tools/trailer/music.py <out.wav>
"""
import sys
import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 44100
BPM = 96
BEAT = 60 / BPM                 # 0.625 s
BAR = 4 * BEAT                  # 2.5 s
BARS = 18
N = int(round(BARS * BAR * SR))
rng = np.random.default_rng(20260926)
t_all = np.arange(N) / SR

MIDI = lambda m: 440.0 * 2 ** ((m - 69) / 12)
# chord tones (MIDI): Dm9, Bbmaj7, Fmaj9, Csus2
CHORDS = [[50, 57, 60, 64, 65, 69], [46, 53, 57, 62, 65, 69], [41, 53, 57, 60, 64, 67], [48, 55, 62, 67, 72, 74]]
ROOTS = [38, 34, 41, 36]
ARP = [[62, 65, 69, 72, 76, 72, 69, 65], [58, 62, 65, 69, 74, 69, 65, 62], [60, 65, 69, 72, 79, 72, 69, 65],
       [60, 62, 67, 72, 74, 72, 67, 62]]


def chord_of_bar(b):            # b = 0-based bar
    if b >= 16:
        return 0
    return (b // 2) % 4


def saw(f, t, phase=0.0):
    x = (f * t + phase) % 1.0
    return 2 * x - 1


def env_adsr(n, a, d, s, r, sr=SR):
    e = np.ones(n) * s
    na, nd, nr = int(a * sr), int(d * sr), int(r * sr)
    na = min(na, n)
    e[:na] = np.linspace(0, 1, na, endpoint=False)
    nd2 = min(nd, max(0, n - na))
    e[na:na + nd2] = np.linspace(1, s, nd2, endpoint=False)
    if nr > 0:
        nr = min(nr, n)
        e[n - nr:] *= np.linspace(1, 0, nr)
    return e


def lowpass_sweep(x, cutoffs, block=1024, order=2):
    """time-varying Butterworth low-pass: coefficients per block, filter state carried across blocks."""
    y = np.zeros_like(x)
    zi = None
    for i in range(0, len(x), block):
        fc = float(np.clip(cutoffs[min(i, len(cutoffs) - 1)], 40, SR * 0.45))
        b, a = signal.butter(order, fc / (SR / 2), 'low')
        if zi is None:
            zi = signal.lfilter_zi(b, a) * 0
        seg, zi = signal.lfilter(b, a, x[i:i + block], zi=zi)
        y[i:i + block] = seg
    return y


def reverb_ir(seconds=2.8, decay=2.2):
    n = int(seconds * SR)
    tt = np.arange(n) / SR
    ir = np.stack([rng.standard_normal(n), rng.standard_normal(n)]) * np.exp(-decay * tt)
    ir = signal.lfilter(*signal.butter(1, 6000 / (SR / 2), 'low'), ir, axis=1)
    return ir / np.sqrt(np.sum(ir ** 2, axis=1, keepdims=True))


def stereo(x, pan=0.0):
    return np.stack([x * np.sqrt(0.5 * (1 - pan)), x * np.sqrt(0.5 * (1 + pan))])


def place(buf, sound, start):
    i = int(round(start * SR))
    if i >= buf.shape[-1]:
        return
    j = min(buf.shape[-1], i + sound.shape[-1])
    buf[..., i:j] += sound[..., :j - i]


# ------------------------------------------------------------------ pad
pad = np.zeros(N)
for b in range(BARS):
    if b % 2 == 1 and b < 16:
        continue                                        # each chord lasts two bars (the last one, from bar 17, to the end)
    start = b * BAR
    dur = (2 * BAR if b < 16 else BARS * BAR - start)
    n = int(round((dur + 1.2) * SR))                   # overlap into the next chord
    tt = np.arange(n) / SR
    tone = np.zeros(n)
    for m in CHORDS[chord_of_bar(b)]:
        f = MIDI(m)
        for cents, ph in ((-8, 0.1), (0, 0.5), (7, 0.8)):
            tone += saw(f * 2 ** (cents / 1200), tt, ph)
    tone *= env_adsr(n, 0.9, 0.5, 0.8, 1.4) / 18
    i = int(round(start * SR))
    j = min(N, i + n)
    pad[i:j] += tone[:j - i]
cut = 350 + 3200 * np.clip(t_all / (10 * BAR), 0, 1) ** 1.5 + 1800 * ((t_all > 10 * BAR) & (t_all < 16 * BAR))
cut *= 1 + 0.08 * np.sin(2 * np.pi * t_all / (2 * BAR))          # slow movement
cut = np.where(t_all >= 16 * BAR, 1400 + 2000 * np.exp(-(t_all - 16 * BAR) / 2.0), cut)
pad = lowpass_sweep(pad, cut)

# ------------------------------------------------------------------ arpeggio (sixteenths from bar 3)
arp = np.zeros((2, N))
step = BEAT / 4
for b in range(2, 16):
    notes = ARP[chord_of_bar(b)]
    for k in range(16):
        m = notes[k % 8] + (12 if (b >= 10 and k % 4 == 2) else 0)
        f = MIDI(m)
        n = int(0.5 * SR)
        tt = np.arange(n) / SR
        x = (0.6 * np.sin(2 * np.pi * f * tt) + 0.4 * signal.sawtooth(2 * np.pi * f * tt, 0.5)) * np.exp(-tt / 0.13)
        x *= 1 - np.exp(-tt / 0.002)
        vel = 0.11 * (1.0 if k % 4 == 0 else 0.75) * min(1.0, (b - 1) / 3)
        place(arp, stereo(x * vel, pan=0.35 * np.sin(k * 0.9)), b * BAR + k * step)
# dotted-eighth ping-pong delay
dly = int(round(0.75 * BEAT * SR))
wet = np.zeros_like(arp)
fb = 0.38
src = arp.copy()
for rep in range(5):
    src = np.roll(src[::-1], dly, axis=1)                # swap channels each repeat
    src[:, :dly] = 0
    src *= fb
    wet += src
arp = arp + 0.8 * wet

# ------------------------------------------------------------------ bass
bass = np.zeros(N)
for b in range(2, 17):
    f = MIDI(ROOTS[chord_of_bar(b)])
    pulses = 8 if 10 <= b < 16 else 2
    for k in range(pulses):
        L = BAR / pulses
        n = int(L * SR)
        tt = np.arange(n) / SR
        x = np.sin(2 * np.pi * f * tt) + 0.15 * np.sin(4 * np.pi * f * tt)
        x *= env_adsr(n, 0.01, 0.1, 0.8, min(0.08, L / 3))
        place(bass[None, :], (x * (0.22 if pulses == 8 else 0.26))[None, :], b * BAR + k * L)

# ------------------------------------------------------------------ drums
drums = np.zeros((2, N))
duck = np.ones(N)


def kick():
    n = int(0.5 * SR)
    tt = np.arange(n) / SR
    f = 45 + 95 * np.exp(-tt / 0.045)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-tt / 0.22) + 0.25 * rng.standard_normal(n) * np.exp(-tt / 0.004)
    return x * 0.75


def hat(open_=False):
    n = int((0.25 if open_ else 0.06) * SR)
    tt = np.arange(n) / SR
    x = rng.standard_normal(n)
    x = signal.lfilter(*signal.butter(2, 7000 / (SR / 2), 'high'), x)
    return x * np.exp(-tt / (0.08 if open_ else 0.018)) * 0.09


def clap():
    n = int(0.35 * SR)
    tt = np.arange(n) / SR
    x = rng.standard_normal(n)
    x = signal.lfilter(*signal.butter(2, [900 / (SR / 2), 3200 / (SR / 2)], 'band'), x)
    e = np.exp(-tt / 0.11)
    for d in (0.0, 0.011, 0.022):                        # three quick hits make it a clap
        e += 0.6 * np.exp(-np.clip(tt - d, 0, None) / 0.006) * (tt >= d)
    return x * e * 0.16


K = kick()
for b in range(4, 16):
    for q in ((0, 2) if b < 10 else (0, 1, 2, 3)):
        start = b * BAR + q * BEAT
        place(drums, stereo(K), start)
        i = int(start * SR)
        n = int(0.3 * SR)
        j = min(N, i + n)
        duck[i:j] = np.minimum(duck[i:j], 1 - 0.45 * np.exp(-np.arange(j - i) / SR / 0.12))
for b in range(6, 16):
    sub = 8 if b < 14 else 16                          # eighths, then sixteenths for the lift
    for k in range(sub):
        off = (k % 2 == 1)
        place(drums, stereo(hat(open_=(sub == 8 and off and b >= 10)), pan=0.3 if off else -0.2), b * BAR + k * BAR / sub)
for b in range(10, 16):
    for q in (1, 3):
        place(drums, stereo(clap(), pan=0.05), b * BAR + q * BEAT)

# riser through bar 14 and the impact at bar 15
n = int(BAR * SR)
tt = np.arange(n) / SR
noise = rng.standard_normal(n)
riser = lowpass_sweep(noise, 300 + 9000 * (tt / BAR) ** 2) * (tt / BAR) ** 2 * 0.12
riser += 0.05 * np.sin(2 * np.pi * np.cumsum(200 + 1400 * (tt / BAR) ** 2) / SR) * (tt / BAR)
place(drums, stereo(riser), 13 * BAR)
n = int(2.5 * SR)
tt = np.arange(n) / SR
impact = (np.sin(2 * np.pi * np.cumsum(38 + 60 * np.exp(-tt / 0.08)) / SR) * np.exp(-tt / 0.6) * 0.8
          + lowpass_sweep(rng.standard_normal(n), 4000 * np.exp(-tt / 0.3) + 200) * np.exp(-tt / 0.5) * 0.25)
place(drums, stereo(impact), 14 * BAR)
place(drums, stereo(K * 1.1), 16 * BAR)                 # one last low hit under the end card

# ------------------------------------------------------------------ mix
ir = reverb_ir()
pad_st = stereo(pad * duck, 0.0) * 1.0
send = pad_st * 0.8 + arp * 0.6 + drums * 0.08
rev = np.stack([signal.fftconvolve(send[0], ir[0])[:N], signal.fftconvolve(send[1], ir[1])[:N]]) * 0.35
mix = pad_st + arp * duck + stereo(bass * duck) + drums + rev
fade_in = np.clip(t_all / 1.5, 0, 1)
fade_out = np.clip((BARS * BAR - t_all) / 3.0, 0, 1) ** 1.5
mix *= fade_in * fade_out
mix = np.tanh(1.4 * mix) / np.tanh(1.4)
mix /= np.max(np.abs(mix)) / 0.89                      # about -1 dBFS
out = (mix.T * 32767).astype(np.int16)
wavfile.write(sys.argv[1] if len(sys.argv) > 1 else 'trailer.wav', SR, out)
print('wrote %.2f s, %d Hz stereo, bars of %.3f s, cuts on bar lines' % (N / SR, SR, BAR))
