/* Data containers for research use: NumPy .npy arrays in an uncompressed .npz (zip) archive, and
   provenance text embedded in PNG and JPEG files. Dependency-free; runs in the browser and in Node so
   the tools test the same bytes the studio writes. Print containers (PDF, TIFF) are in print-formats.js. */
(function (root) {
  'use strict';
  const enc = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
  const utf8 = text => enc.encode(String(text));
  const latin1 = text => Uint8Array.from(String(text), c => {
    const code = c.charCodeAt(0);
    if (code > 255) throw new Error('Latin-1 text expected');
    return code;
  });

  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes, start) {
    let c = start === undefined ? 0xffffffff : (start ^ 0xffffffff) >>> 0;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function concat(parts) {
    let n = 0;
    for (const p of parts) n += p.length;
    const out = new Uint8Array(n);
    let at = 0;
    for (const p of parts) { out.set(p, at); at += p.length; }
    return out;
  }

  // JSON with every non-ASCII character escaped, for containers whose text fields are ASCII only
  // (TIFF ASCII tags, JPEG comments read by naive tools). JSON.parse restores the original text.
  function asciiJSON(value) {
    return JSON.stringify(value).replace(/[\u007f-￿]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
  }

  /* ---- NumPy .npy, format version 1.0 ---- */
  const DTYPES = [
    ['Float32Array', '<f4'], ['Float64Array', '<f8'], ['Int32Array', '<i4'], ['Uint32Array', '<u4'],
    ['Int16Array', '<i2'], ['Uint16Array', '<u2'], ['Int8Array', '|i1'], ['Uint8Array', '|u1'], ['Uint8ClampedArray', '|u1'],
  ];
  function dtypeOf(data) {
    for (const [name, descr] of DTYPES) if (typeof root[name] === 'function' && data instanceof root[name]) return descr;
    throw new Error('Unsupported array type for .npy: ' + Object.prototype.toString.call(data));
  }
  function littleEndian() { return new Uint8Array(new Uint16Array([1]).buffer)[0] === 1; }
  function npy(data, shape) {
    const descr = dtypeOf(data);
    if (!Array.isArray(shape) || !shape.length || !shape.every(n => Number.isInteger(n) && n >= 0)) throw new Error('Invalid .npy shape');
    if (shape.reduce((a, b) => a * b, 1) !== data.length) throw new Error('Shape ' + JSON.stringify(shape) + ' does not match ' + data.length + ' values');
    if (!littleEndian() && data.BYTES_PER_ELEMENT > 1) throw new Error('Big-endian hosts are not supported');
    const dims = shape.length === 1 ? '(' + shape[0] + ',)' : '(' + shape.join(', ') + ')';
    let header = "{'descr': '" + descr + "', 'fortran_order': False, 'shape': " + dims + ', }';
    const pad = 64 - ((10 + header.length + 1) % 64);
    header += ' '.repeat(pad === 64 ? 0 : pad) + '\n';
    const head = new Uint8Array(10);
    head.set([0x93, 0x4e, 0x55, 0x4d, 0x50, 0x59, 1, 0]);
    head[8] = header.length & 0xff; head[9] = header.length >> 8;
    const body = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    return concat([head, latin1(header), body]);
  }
  function readNpy(bytes) {
    if (bytes[0] !== 0x93 || String.fromCharCode(...bytes.subarray(1, 6)) !== 'NUMPY') throw new Error('Not a .npy file');
    const len = bytes[8] | (bytes[9] << 8);
    const header = String.fromCharCode(...bytes.subarray(10, 10 + len));
    const descr = /'descr': '([^']+)'/.exec(header)[1];
    const shape = /'shape': \(([^)]*)\)/.exec(header)[1].split(',').map(s => s.trim()).filter(Boolean).map(Number);
    const name = (DTYPES.find(d => d[1] === descr) || [])[0];
    if (!name) throw new Error('Unsupported dtype ' + descr);
    const body = bytes.slice(10 + len);
    return { descr, shape, data: new root[name](body.buffer, 0, body.byteLength / root[name].BYTES_PER_ELEMENT) };
  }

  /* ---- zip, stored (no compression), which is what numpy.load reads as .npz ---- */
  function zipStore(entries) {
    const local = [], central = [];
    let offset = 0;
    // A fixed DOS timestamp (1980-01-01 00:00) keeps the archive byte-identical for identical content.
    const time = 0, date = (0 << 9) | (1 << 5) | 1;
    for (const { name, data } of entries) {
      if (!/^[A-Za-z0-9_.-]{1,80}$/.test(name)) throw new Error('Invalid archive member name: ' + name);
      const nameBytes = latin1(name), crc = crc32(data), size = data.length;
      if (size >= 0xffffffff) throw new Error('Member too large for a zip without Zip64');
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0, true); lh.setUint16(8, 0, true);
      lh.setUint16(10, time, true); lh.setUint16(12, date, true); lh.setUint32(14, crc, true);
      lh.setUint32(18, size, true); lh.setUint32(22, size, true); lh.setUint16(26, nameBytes.length, true); lh.setUint16(28, 0, true);
      local.push(new Uint8Array(lh.buffer), nameBytes, data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0, true);
      ch.setUint16(10, 0, true); ch.setUint16(12, time, true); ch.setUint16(14, date, true); ch.setUint32(16, crc, true);
      ch.setUint32(20, size, true); ch.setUint32(24, size, true); ch.setUint16(28, nameBytes.length, true);
      ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), nameBytes);
      offset += 30 + nameBytes.length + size;
    }
    const cd = concat(central);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, entries.length, true); end.setUint16(10, entries.length, true);
    end.setUint32(12, cd.length, true); end.setUint32(16, offset, true);
    return concat([...local, cd, new Uint8Array(end.buffer)]);
  }
  function readZip(bytes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const out = {};
    let at = 0;
    while (at + 30 <= bytes.length && view.getUint32(at, true) === 0x04034b50) {
      if (view.getUint16(at + 8, true) !== 0) throw new Error('Only stored zip members are supported');
      const size = view.getUint32(at + 18, true), nlen = view.getUint16(at + 26, true), xlen = view.getUint16(at + 28, true);
      const name = String.fromCharCode(...bytes.subarray(at + 30, at + 30 + nlen));
      const data = bytes.slice(at + 30 + nlen + xlen, at + 30 + nlen + xlen + size);
      if (crc32(data) !== view.getUint32(at + 14, true)) throw new Error('CRC mismatch in ' + name);
      out[name] = data;
      at += 30 + nlen + xlen + size;
    }
    return out;
  }

  /* ---- PNG text chunks ---- */
  const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  function pngChunks(bytes) {
    for (let i = 0; i < 8; i++) if (bytes[i] !== PNG_SIG[i]) throw new Error('Not a PNG file');
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), chunks = [];
    let at = 8;
    while (at + 12 <= bytes.length) {
      const len = view.getUint32(at), type = String.fromCharCode(...bytes.subarray(at + 4, at + 8));
      chunks.push({ type, start: at, end: at + 12 + len, data: bytes.subarray(at + 8, at + 8 + len) });
      at += 12 + len;
      if (type === 'IEND') break;
    }
    return chunks;
  }
  function chunk(type, data) {
    const out = new Uint8Array(12 + data.length), view = new DataView(out.buffer);
    view.setUint32(0, data.length);
    out.set(latin1(type), 4); out.set(data, 8);
    view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
    return out;
  }
  function textKeyword(chunkData) {
    const zero = chunkData.indexOf(0);
    return zero < 0 ? '' : String.fromCharCode(...chunkData.subarray(0, zero));
  }
  // entries: { keyword: text }. Latin-1 text goes in tEXt, anything else in uncompressed iTXt.
  // A chunk with the same keyword is replaced, so provenance is never stacked twice.
  function pngWithText(bytes, entries) {
    const chunks = pngChunks(bytes);
    const iend = chunks.find(c => c.type === 'IEND');
    if (!iend) throw new Error('PNG has no IEND');
    const replace = new Set(Object.keys(entries));
    const kept = [bytes.subarray(0, 8)];
    for (const c of chunks) {
      if (c.type === 'IEND') break;
      if ((c.type === 'tEXt' || c.type === 'iTXt') && replace.has(textKeyword(c.data))) continue;
      kept.push(bytes.subarray(c.start, c.end));
    }
    for (const [keyword, text] of Object.entries(entries)) {
      if (!/^[\x20-\x7e]{1,79}$/.test(keyword) || /^ | $|  /.test(keyword)) throw new Error('Invalid PNG keyword: ' + keyword);
      const plain = /^[\x09\x0a\x20-\x7e\xa0-\xff]*$/.test(text);
      kept.push(plain
        ? chunk('tEXt', concat([latin1(keyword), new Uint8Array([0]), latin1(text)]))
        : chunk('iTXt', concat([latin1(keyword), new Uint8Array([0, 0, 0, 0, 0]), utf8(text)])));
    }
    kept.push(bytes.subarray(iend.start, iend.end));
    return concat(kept);
  }
  function readPngText(bytes) {
    const out = {}, dec = new TextDecoder();
    for (const c of pngChunks(bytes)) {
      if (c.type === 'tEXt') {
        const k = textKeyword(c.data);
        out[k] = String.fromCharCode(...c.data.subarray(k.length + 1));
      } else if (c.type === 'iTXt') {
        const k = textKeyword(c.data);
        let at = k.length + 1;
        if (c.data[at] !== 0) continue; // compressed iTXt is not written here
        at += 2;
        at = c.data.indexOf(0, at) + 1; // language tag
        at = c.data.indexOf(0, at) + 1; // translated keyword
        out[k] = dec.decode(c.data.subarray(at));
      }
    }
    return out;
  }

  /* ---- JPEG comment segment ---- */
  function jpegWithComment(bytes, text) {
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('Not a JPEG file');
    const body = latin1(text);
    if (body.length > 65533) throw new Error('JPEG comment too long');
    // After SOI and an APP0 (JFIF) segment when present, so JFIF readers still see APP0 first.
    let at = 2;
    if (bytes[2] === 0xff && bytes[3] === 0xe0) at = 4 + ((bytes[4] << 8) | bytes[5]);
    const seg = new Uint8Array(4 + body.length);
    seg[0] = 0xff; seg[1] = 0xfe; seg[2] = (body.length + 2) >> 8; seg[3] = (body.length + 2) & 0xff; seg.set(body, 4);
    return concat([bytes.subarray(0, at), seg, bytes.subarray(at)]);
  }
  function readJpegComments(bytes) {
    const out = [];
    let at = 2;
    while (at + 4 <= bytes.length && bytes[at] === 0xff) {
      const marker = bytes[at + 1];
      if (marker === 0xda || marker === 0xd9) break;
      const len = (bytes[at + 2] << 8) | bytes[at + 3];
      if (marker === 0xfe) out.push(String.fromCharCode(...bytes.subarray(at + 4, at + 2 + len)));
      at += 2 + len;
    }
    return out;
  }

  const api = Object.freeze({ crc32, asciiJSON, npy, readNpy, zipStore, readZip, pngWithText, readPngText, jpegWithComment, readJpegComments });
  root.GenChaseDataFormats = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
