/* Lossless print containers. ICC sRGB2014 profile: see licenses/ICC-sRGB.txt. */
(function (root) {
  'use strict';
  const PROFILE_BASE64 = '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';
  const profile = () => Uint8Array.from(atob(PROFILE_BASE64), c => c.charCodeAt(0));
  const bytes = text => new TextEncoder().encode(text);
  function validate(rgb, width, height, wIn, hIn) {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 ||
        width * height > 48e6 || rgb.length !== width * height * 3 ||
        !Number.isFinite(wIn) || !Number.isFinite(hIn) || wIn < 1 || hIn < 1 || wIn > 1000 || hIn > 1000)
      throw new Error('Invalid print size or RGB pixel buffer (maximum 48 million pixels).');
  }
  async function pdf(rgb, width, height, wIn, hIn, options = {}) {
    validate(rgb, width, height, wIn, hIn);
    const bleed = Number(options.bleedMm || 0) * 72 / 25.4;
    if (!Number.isFinite(bleed) || bleed < 0 || bleed > 25 * 72 / 25.4) throw new Error('Bleed must be between 0 and 25 mm.');
    const marks = !!options.cropMarks, markPad = marks ? 18 : 0, margin = bleed + markPad;
    const fullW = wIn * 72 + 2 * margin, fullH = hIn * 72 + 2 * margin;
    const icc = profile(), unit = Math.max(1, fullW / 14400, fullH / 14400);
    const w = wIn * 72 / unit, h = hIn * 72 / unit, m = margin / unit, b = bleed / unit, mp = markPad / unit;
    const box = [m, m, m+w, m+h], bleedBox = [mp, mp, mp+w+2*b, mp+h+2*b];
    // Cover the bleed area without distorting the image. This slightly crops the trim view.
    const scale = Math.max((w+2*b)/w, (h+2*b)/h), iw = w*scale, ih = h*scale;
    let drawing = 'q\n' + [mp,mp,w+2*b,h+2*b].join(' ') + ' re W n\n' +
      [iw,0,0,ih,m+(w-iw)/2,m+(h-ih)/2].join(' ') + ' cm\n/Plate Do\nQ\n';
    if (marks) {
      drawing += '0 G ' + (.25/unit) + ' w\n';
      for (const x of [m,m+w]) for (const y of [m,m+h]) {
        const sx = x===m ? -1 : 1, sy = y===m ? -1 : 1;
        drawing += [x+sx*(b+4/unit),y].join(' ') + ' m ' + [x+sx*(b+14/unit),y].join(' ') + ' l S\n';
        drawing += [x,y+sy*(b+4/unit)].join(' ') + ' m ' + [x,y+sy*(b+14/unit)].join(' ') + ' l S\n';
      }
    }
    const content = bytes(drawing);
    let image = rgb, filter = '';
    if (typeof CompressionStream !== 'undefined') {
      image = new Uint8Array(await new Response(new Blob([rgb]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer());
      filter = ' /Filter /FlateDecode';
    }
    const objects = [
      [bytes('<< /Type /Catalog /Pages 2 0 R >>')],
      [bytes('<< /Type /Pages /Kids [3 0 R] /Count 1 >>')],
      [bytes('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + (fullW/unit) + ' ' + (fullH/unit) + '] /TrimBox [' + box.join(' ') + '] /BleedBox [' + bleedBox.join(' ') + '] /UserUnit ' + unit + ' /Resources << /XObject << /Plate 4 0 R >> >> /Contents 6 0 R >>')],
      [bytes('<< /Type /XObject /Subtype /Image /Width ' + width + ' /Height ' + height + ' /BitsPerComponent 8 /ColorSpace [/ICCBased 5 0 R] /Interpolate false' + filter + ' /Length ' + image.length + ' >>\nstream\n'), image, bytes('\nendstream')],
      [bytes('<< /N 3 /Alternate /DeviceRGB /Length ' + icc.length + ' >>\nstream\n'), icc, bytes('\nendstream')],
      [bytes('<< /Length ' + content.length + ' >>\nstream\n'), content, bytes('endstream')]
    ];
    const chunks = [bytes('%PDF-1.7\n')], offsets = [0]; let offset = chunks[0].length;
    objects.forEach((parts, i) => {
      offsets.push(offset);
      for (const chunk of [bytes((i + 1) + ' 0 obj\n'), ...parts, bytes('\nendobj\n')]) { chunks.push(chunk); offset += chunk.length; }
    });
    chunks.push(bytes('xref\n0 7\n0000000000 65535 f \n' + offsets.slice(1).map(n => String(n).padStart(10, '0') + ' 00000 n \n').join('') +
      'trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n' + offset + '\n%%EOF\n'));
    return new Blob(chunks, {type:'application/pdf'});
  }
  function tiff(rgb, width, height, wIn, hIn) {
    validate(rgb, width, height, wIn, hIn);
    const icc = profile(), count = 14, bits = 8 + 2 + count * 12 + 4, xr = bits + 6, yr = xr + 8, iccAt = yr + 8;
    const pixelAt = (iccAt + icc.length + 3) & ~3;
    const header = new Uint8Array(pixelAt), v = new DataView(header.buffer);
    v.setUint16(0, 0x4949, true); v.setUint16(2, 42, true); v.setUint32(4, 8, true); v.setUint16(8, count, true);
    let at = 10;
    const tag = (id, type, n, value) => {
      v.setUint16(at,id,true); v.setUint16(at+2,type,true); v.setUint32(at+4,n,true);
      if (type===3 && n===1) v.setUint16(at+8,value,true); else v.setUint32(at+8,value,true);
      at += 12;
    };
    tag(256,4,1,width); tag(257,4,1,height); tag(258,3,3,bits); tag(259,3,1,1);
    tag(262,3,1,2); tag(273,4,1,pixelAt); tag(277,3,1,3); tag(278,4,1,height);
    tag(279,4,1,rgb.length); tag(282,5,1,xr); tag(283,5,1,yr); tag(284,3,1,1);
    tag(296,3,1,2); tag(34675,7,icc.length,iccAt);
    for (let i=0;i<3;i++) v.setUint16(bits+i*2,8,true);
    v.setUint32(xr,width*10000,true); v.setUint32(xr+4,Math.round(wIn*10000),true);
    v.setUint32(yr,height*10000,true); v.setUint32(yr+4,Math.round(hIn*10000),true);
    header.set(icc,iccAt);
    return new Blob([header,rgb], {type:'image/tiff'});
  }
  root.GenChasePrintFormats = Object.freeze({pdf,tiff});
})(typeof window !== 'undefined' ? window : globalThis);
