#!/usr/bin/env python3
# Copyright 2026 Chase Hendrick
# SPDX-License-Identifier: Apache-2.0
"""Edit the trailer: recorded plates (capture.js) + title cards + the score (music.py) -> H.264/AAC MP4.

45 s at 30 fps, 1920x1080, cut to the score's bars (96 BPM: a bar is 2.5 s, 75 frames):
  bars  1-2   the attractors plate fades in; title
  bars  3-14  twelve plates, one bar each, beside their name, subtitle and reprint link, under four taglines
  bars 15-16  eight plates, one beat each (the lift)
  bars 17-18  end card

usage: python3 tools/trailer/assemble.py <clips dir> <montage dir> <score.wav> <out.mp4> [poster.jpg] [stills dir ...]
The clip and montage folders hold <id>/0000.jpg ... and meta.json as capture.js writes them; a stills folder holds
<id>.jpg single frames (capture.js probe). The end card shows every distinct plate at most once.
"""
import sys, os, json, glob, subprocess, math
from functools import lru_cache
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import imageio_ffmpeg

W, H, FPS = 1920, 1080, 30
BAR = 75                                   # frames per bar at 96 BPM and 30 fps
BEAT = BAR / 4
TOTAL = 18 * BAR
BG = (13, 15, 19)
INK = (238, 234, 225)
MUTED = (160, 164, 172)
ACCENT = (232, 176, 75)
FONTS = '/usr/share/fonts/opentype/urw-base35/'
F = lambda name, size: ImageFont.truetype(FONTS + name, size)
TITLE = lambda s: F('URWGothic-Demi.otf', s)
SANS = lambda s: F('NimbusSans-Regular.otf', s)
BOLD = lambda s: F('NimbusSans-Bold.otf', s)
MONO = lambda s: F('NimbusMonoPS-Regular.otf', s)

REPO = 'github.com/ChaseHendrick/GENChase'
# every clip is a live simulation (runningDefault in techniques.json), recorded while it visibly evolves
MAIN = ['fluid', 'dendrite', 'excitable', 'physarum', 'cyclic', 'schrodinger',
        'vegetation', 'cgl', 'ising', 'tonertu', 'skyrmion', 'maxwell']
TAGS = ['130 scientific simulations', 'Every plate reprints from its seed',
        'Measured against theory, with error bars', 'Print-ready at 300 ppi. The images are yours.']
MONTAGE = ['life', 'chirikov', 'film', 'xy', 'causticsea', 'turing', 'swarm', 'snowflake']
INTRO = 'plasma'


def techniques():
    d = json.load(open(os.path.join(os.path.dirname(__file__), '..', '..', 'techniques.json')))
    return {t['id']: t for t in d['techniques']}


class Clip:
    def __init__(self, folder):
        self.files = sorted(glob.glob(os.path.join(folder, '*.jpg')))
        if not self.files:
            raise SystemExit('no frames in ' + folder)

    @lru_cache(maxsize=64)
    def frame(self, k, box, zoom):
        """source frame k fitted into box (w, h), zoomed about its centre by zoom (1 = none)."""
        im = Image.open(self.files[min(k, len(self.files) - 1)]).convert('RGB')
        w, h = im.size
        cw, ch = w / zoom, h / zoom
        im = im.crop((int((w - cw) / 2), int((h - ch) / 2), int((w + cw) / 2), int((h + ch) / 2)))
        s = min(box[0] / im.width, box[1] / im.height)
        return im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)

    def at(self, u, box, z0=1.0, z1=1.04):
        """the plate at clip progress u in [0, 1]: frames in order, a slow push-in."""
        k = min(len(self.files) - 1, int(u * len(self.files)))
        z = round(z0 + (z1 - z0) * u, 3)
        return self.frame(k, box, z)


def shadowed(base, im, xy, radius=28, alpha=150):
    sh = Image.new('L', (im.width + 4 * radius, im.height + 4 * radius), 0)
    ImageDraw.Draw(sh).rectangle((2 * radius, 2 * radius + 10, 2 * radius + im.width, 2 * radius + im.height + 10), fill=alpha)
    sh = sh.filter(ImageFilter.GaussianBlur(radius))
    base.paste((0, 0, 0), (xy[0] - 2 * radius, xy[1] - 2 * radius), sh)
    base.paste(im, xy)


def wrap(draw, text, font, width):
    words, lines, cur = text.split(), [], ''
    for w_ in words:
        t = (cur + ' ' + w_).strip()
        if draw.textlength(t, font=font) <= width:
            cur = t
        else:
            lines.append(cur)
            cur = w_
    if cur:
        lines.append(cur)
    return lines


def spaced(draw, xy, text, font, fill, spacing):
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=font, fill=fill)
        x += draw.textlength(ch, font=font) + spacing
    return x


def text_layer(tech, tid, tag, right):
    """RGBA overlay with the tagline, name, subtitle and reprint link for one plate."""
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x0 = 1110 if not right else 150
    width = 660
    y = 300
    spaced(d, (x0, y), tag.upper(), BOLD(22), ACCENT + (255,), 3)
    y += 70
    for line in wrap(d, tech['name'], TITLE(76), width):
        d.text((x0, y), line, font=TITLE(76), fill=INK + (255,))
        y += 88
    y += 14
    for line in wrap(d, tech['subtitle'], SANS(34), width):
        d.text((x0, y), line, font=SANS(34), fill=MUTED + (255,))
        y += 46
    y += 34
    d.text((x0, y), '#' + tid + '/trailer', font=MONO(28), fill=(120, 126, 136, 255))
    return layer


def fade(layer, a):
    if a >= 1:
        return layer
    r, g, b, al = layer.split()
    al = al.point(lambda v: int(v * max(0.0, a)))
    return Image.merge('RGBA', (r, g, b, al))


def background():
    bg = Image.new('RGB', (W, H), BG)
    glow = Image.new('L', (W, H), 0)
    ImageDraw.Draw(glow).ellipse((W * 0.15, -H * 0.3, W * 0.85, H * 0.9), fill=26)
    glow = glow.filter(ImageFilter.GaussianBlur(220))
    bg.paste((40, 44, 56), (0, 0), glow)
    return bg


# stills that read as blank or near-blank at tile size (a dark field, a lone dot): left off the end card
SKIP_STILLS = {'caustics', 'faraday', 'bec', 'reaction', 'phyllotaxis', 'lichtenberg', 'cahn', 'liesegang', 'convection'}


def main(clips_dir, montage_dir, wav, out, poster=None, *stills_dirs):
    T = techniques()
    BG_IMG = background()
    clips = {i: Clip(os.path.join(clips_dir, i)) for i in MAIN + [INTRO] if os.path.isdir(os.path.join(clips_dir, i))}
    mont = {}
    for i in MONTAGE:
        for dd in (montage_dir, clips_dir):
            if os.path.isdir(os.path.join(dd, i)):
                mont[i] = Clip(os.path.join(dd, i))
                break
    main_ids = [i for i in MAIN if i in clips][:12]
    if len(main_ids) < 12:
        raise SystemExit('need 12 main clips, have %s' % main_ids)
    layers = [text_layer(T[i], i, TAGS[k // 3], right=(k % 2 == 1)) for k, i in enumerate(main_ids)]
    PLATE = (900, 900)

    def plate_frame(k, u):
        fr = BG_IMG.copy()
        im = clips[main_ids[k]].at(u, PLATE)
        right = (k % 2 == 1)
        x = (W - 150 - im.width) if right else 150
        shadowed(fr, im, (x, (H - im.height) // 2))
        return fr

    def main_frame(f):
        k, j = divmod(f - 2 * BAR, BAR)
        u = j / BAR
        fr = plate_frame(k, u)
        a = min(1.0, j / 10)
        fr.paste(fade(layers[k], a), (0, 0), fade(layers[k], a))
        if j >= BAR - 6 and k + 1 < 12:                  # 6-frame dissolve into the next plate
            nxt = plate_frame(k + 1, 0.0)
            fr = Image.blend(fr, nxt, (j - (BAR - 6) + 1) / 7)
        return fr

    def intro_frame(f):
        fr = Image.new('RGB', (W, H), (0, 0, 0))
        c = clips.get(INTRO) or mont.get(INTRO)
        im = c.at(f / (2 * BAR), (980, 980), 1.0, 1.08)
        a = min(1.0, f / 60) * (1 - 0.55 * min(1.0, max(0.0, (f - BAR) / 20)))
        fr.paste(Image.blend(Image.new('RGB', im.size, (0, 0, 0)), im, a), ((W - im.width) // 2, (H - im.height) // 2))
        if f >= BAR:
            ta = min(1.0, (f - BAR) / 18)
            lay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
            d = ImageDraw.Draw(lay)
            font = TITLE(150)
            tw = d.textlength('GENChase', font=font)
            d.text(((W - tw) / 2, 380 + 20 * (1 - ta)), 'GENChase', font=font, fill=INK + (255,))
            sub = 'a generative art studio built on real science'
            sw = d.textlength(sub, font=SANS(40))
            d.text(((W - sw) / 2, 590 + 20 * (1 - ta)), sub, font=SANS(40), fill=MUTED + (255,))
            lay = fade(lay, ta)
            fr.paste(lay, (0, 0), lay)
        return fr

    def montage_frame(f):
        g = f - 14 * BAR
        k = min(7, int(g / BEAT))
        u = (g - k * BEAT) / BEAT
        tid = MONTAGE[k]
        fr = BG_IMG.copy()
        c = mont.get(tid) or clips.get(tid)
        im = c.at(u, (1000, 1000), 1.02, 1.10)
        shadowed(fr, im, ((W - im.width) // 2, (H - im.height) // 2))
        lay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(lay)
        d.text((70, H - 110), T[tid]['name'], font=TITLE(44), fill=INK + (255,))
        d.text((70, H - 58), '#' + tid + '/trailer', font=MONO(24), fill=(120, 126, 136, 255))
        fr.paste(lay, (0, 0), lay)
        if g < 5:                                        # the impact on the downbeat of bar 15
            fr = Image.blend(fr, Image.new('RGB', (W, H), (255, 250, 240)), (5 - g) / 6)
        return fr

    tiles = None

    def end_tiles():
        """one tile per distinct plate: the clips, the montage, then any stills, never a plate twice."""
        seen, out = set(), []
        for i in main_ids + MONTAGE + [INTRO]:
            c = clips.get(i) or mont.get(i)
            if c and i not in seen:
                seen.add(i)
                out.append(c.frame(len(c.files) - 1, (220, 220), 1.0))
        for d in stills_dirs:
            for f in sorted(glob.glob(os.path.join(d, '*.jpg'))):
                i = os.path.basename(f)[:-4]
                if i in seen or i in SKIP_STILLS:
                    continue
                seen.add(i)
                im = Image.open(f).convert('RGB')
                im.thumbnail((220, 220))
                out.append(im)
        return out

    def end_frame(f):
        nonlocal tiles
        g = f - 16 * BAR
        if tiles is None:
            tiles = end_tiles()
        fr = Image.new('RGB', (W, H), BG)
        cols = 8
        rows = min(5, len(tiles) // cols)                 # whole rows only, so no plate repeats
        size, gap = 180, 14
        ox = (W - cols * (size + gap) + gap) // 2
        oy = (H - rows * (size + gap) + gap) // 2
        for k in range(rows * cols):
            r, cc = divmod(k, cols)
            im = tiles[k]
            t_ = Image.new('RGB', (size, size), BG)
            sm = im.copy()
            sm.thumbnail((size, size))
            t_.paste(sm, ((size - sm.width) // 2, (size - sm.height) // 2))
            fr.paste(t_, (ox + cc * (size + gap), oy + r * (size + gap)))
        fr = Image.blend(fr, Image.new('RGB', (W, H), BG), 0.78)
        lay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(lay)
        ta = min(1.0, g / 15)

        def centred(y, text, font, fill):
            tw = d.textlength(text, font=font)
            d.text(((W - tw) / 2, y), text, font=font, fill=fill + (255,))
        centred(300, 'GENChase', TITLE(140), INK)
        centred(500, '130 seeded scientific simulations. Every plate reprints, prints and measures.', SANS(38), MUTED)
        centred(570, 'Open source, Apache-2.0', SANS(38), MUTED)
        centred(690, REPO, MONO(44), ACCENT)
        lay = fade(lay, ta)
        fr.paste(lay, (0, 0), lay)
        out_a = max(0.0, (g - (2 * BAR - 45)) / 45)       # to black over the last 1.5 s, with the music
        if out_a > 0:
            fr = Image.blend(fr, Image.new('RGB', (W, H), (0, 0, 0)), min(1.0, out_a))
        return fr

    def frame(f):
        if f < 2 * BAR:
            return intro_frame(f)
        if f < 14 * BAR:
            return main_frame(f)
        if f < 16 * BAR:
            return montage_frame(f)
        return end_frame(f)

    stills = os.environ.get('TRAILER_STILLS')          # comma-separated frame numbers: write JPEGs, no video
    if stills:
        for f in [int(s) for s in stills.split(',')]:
            frame(f).save(out.replace('.mp4', '') + '_%04d.jpg' % f, quality=85)
        return

    ff = imageio_ffmpeg.get_ffmpeg_exe()
    cmd = [ff, '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', '%dx%d' % (W, H), '-r', str(FPS),
           '-i', '-', '-i', wav, '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-maxrate', '2400k',
           '-bufsize', '4800k', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-shortest',
           '-movflags', '+faststart', out]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for f in range(TOTAL):
        im = frame(f)
        if poster and f == 2 * BAR + 40:
            im.save(poster, quality=88)
        proc.stdin.write(im.tobytes())
        if f % 150 == 0:
            print('frame', f, flush=True)
    proc.stdin.close()
    proc.wait()
    print('wrote', out, os.path.getsize(out) // 1024, 'KiB')


if __name__ == '__main__':
    a = sys.argv[1:]
    if len(a) < 4:
        raise SystemExit(__doc__)
    main(*a)
