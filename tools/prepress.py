#!/usr/bin/env python3
"""Optional native CMYK TIFF / PDF/X-3 conversion with a supplied press profile.

Install Pillow and pypdf; PDF/X also requires Ghostscript on PATH.
No default printing condition is guessed. Inputs are never overwritten.
"""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tempfile


def press_profile(path):
    data = path.read_bytes()
    if len(data) < 128 or data[36:40] != b'acsp' or data[12:16] != b'prtr' or data[16:20] != b'CMYK':
        raise ValueError('Supply an ICC CMYK output (printer) profile, not an RGB display profile.')
    if int.from_bytes(data[:4], 'big') != len(data):
        raise ValueError('ICC profile size does not match its header.')
    return data


def ps_string(value):
    return '(' + ''.join('\\%03o' % c for c in value.encode('utf-8')) + ')'


def convert(source, output, profile, mode, condition, ghostscript='gs'):
    if output.exists():
        raise ValueError('Output already exists; choose a new filename.')
    if source.resolve() == output.resolve():
        raise ValueError('Input and output must differ.')
    profile_data = press_profile(profile)
    if not source.is_file():
        raise ValueError('Input file is missing.')
    if not output.parent.is_dir():
        raise ValueError('Output directory is missing.')
    with tempfile.TemporaryDirectory(prefix='genchase-prepress-') as td:
        folder = Path(td)
        staged = folder / ('converted.tif' if mode == 'cmyk-tiff' else 'converted.pdf')
        if mode == 'cmyk-tiff':
            from PIL import Image, ImageCms
            with Image.open(source) as image:
                if image.format != 'TIFF' or image.mode != 'RGB':
                    raise ValueError('CMYK TIFF conversion expects the studio RGB TIFF export.')
                if image.width * image.height > 48_000_000:
                    raise ValueError('Input exceeds the 48 million pixel conversion limit.')
                icc = image.info.get('icc_profile')
                if not icc:
                    raise ValueError('The source TIFF needs an embedded RGB profile.')
                from io import BytesIO
                converted = ImageCms.profileToProfile(image, ImageCms.ImageCmsProfile(BytesIO(icc)),
                    ImageCms.ImageCmsProfile(BytesIO(profile_data)), outputMode='CMYK', renderingIntent=1)
                converted.save(staged, format='TIFF', compression='tiff_lzw',
                    dpi=image.info.get('dpi', (300, 300)), icc_profile=profile_data)
        else:
            from pypdf import PdfReader
            reader = PdfReader(source)
            if len(reader.pages) != 1 or reader.is_encrypted:
                raise ValueError('Use a single-page, unencrypted studio PDF.')
            page = reader.pages[0]
            unit = float(page.get('/UserUnit', 1))
            if unit != 1 or max(float(page.mediabox.width), float(page.mediabox.height)) > 14400:
                raise ValueError('PDF/X-3 supports pages up to 200 inches here, including bleed and marks.')
            gs = shutil.which(ghostscript)
            if not gs:
                raise ValueError('Install Ghostscript, or pass --ghostscript with its executable path.')
            local_profile = folder / 'press.icc'
            local_profile.write_bytes(profile_data)
            definition = folder / 'output-intent.ps'
            definition.write_text('\n'.join([
                '[ /GTS_PDFXVersion (PDF/X-3:2002) /Title (GENChase print) /Trapped /False /DOCINFO pdfmark',
                '[/_objdef {PressICC} /type /stream /OBJ pdfmark',
                '[{PressICC} << /N 4 >> /PUT pdfmark',
                '[{PressICC} ' + ps_string(str(local_profile)) + ' (r) file /PUT pdfmark',
                '[/_objdef {PressIntent} /type /dict /OBJ pdfmark',
                '[{PressIntent} << /Type /OutputIntent /S /GTS_PDFX /OutputConditionIdentifier ' + ps_string(condition) +
                ' /Info ' + ps_string(condition) + ' /DestOutputProfile {PressICC} >> /PUT pdfmark',
                '[{Catalog} << /OutputIntents [{PressIntent}] >> /PUT pdfmark',
            ]), encoding='ascii')
            command = [gs, '-dSAFER', '-dBATCH', '-dNOPAUSE', '-dPDFX=3', '-sDEVICE=pdfwrite',
                '-sColorConversionStrategy=CMYK', '-dProcessColorModel=/DeviceCMYK', '-dAutoFilterColorImages=false', '-dColorImageFilter=/FlateEncode',
                '-dDownsampleColorImages=false', '-dDownsampleGrayImages=false', '-dDownsampleMonoImages=false',
                '--permit-file-read=' + str(local_profile), '-sOutputICCProfile=' + str(local_profile),
                '-sOutputFile=' + str(staged), str(definition), str(source.resolve())]
            result = subprocess.run(command, capture_output=True, text=True, timeout=300, check=False)
            if result.returncode:
                raise ValueError('Ghostscript conversion failed: ' + (result.stderr or result.stdout)[-3000:])
            checked = PdfReader(staged)
            if 'PDF/X-3' not in str(checked.metadata.get('/GTS_PDFXVersion', '')):
                raise ValueError('Ghostscript did not emit the requested PDF/X-3 identification.')
            intents = checked.trailer['/Root'].get('/OutputIntents', [])
            if not any(i.get_object().get('/S') == '/GTS_PDFX' and
                i.get_object()['/DestOutputProfile'].get_object().get_data() == profile_data for i in intents):
                raise ValueError('Converted PDF lost the supplied output profile.')
            for key in ['mediabox', 'trimbox', 'bleedbox']:
                if any(abs(float(a)-float(b)) > .02 for a,b in zip(getattr(page,key),getattr(checked.pages[0],key))):
                    raise ValueError('Converted PDF changed the ' + key + '.')
        # Exclusive creation avoids overwriting an output created during conversion.
        with output.open('xb') as out, staged.open('rb') as inp:
            shutil.copyfileobj(inp, out)
    return {'output': str(output), 'mode': mode, 'profile_sha256': hashlib.sha256(profile_data).hexdigest(),
        'input_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
        'note': 'Structural checks passed. Printer preflight and a physical proof remain necessary.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--profile', type=Path, required=True, help='CMYK output ICC profile supplied by the printer')
    parser.add_argument('--mode', choices=['cmyk-tiff', 'pdfx'], required=True)
    parser.add_argument('--condition', default='Supplied printer profile', help='Printer and paper/printing condition')
    parser.add_argument('--ghostscript', default='gs')
    args = parser.parse_args()
    try:
        print(json.dumps(convert(args.input, args.output, args.profile, args.mode, args.condition, args.ghostscript), indent=2))
    except (ValueError, OSError, subprocess.TimeoutExpired) as exc:
        parser.exit(1, str(exc) + '\n')


if __name__ == '__main__':
    main()
