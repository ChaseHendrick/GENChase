"""Independent readers verify the browser encoders and optional native conversion."""
from pathlib import Path
import sys
import tempfile
from PIL import Image
from pypdf import PdfReader
from prepress import convert
folder = Path(sys.argv[1])
with Image.open(folder / 'plate.tif') as image:
    assert image.size == (300, 150) and image.mode == 'RGB'
    assert image.getpixel((147, 89)) == (147, 89, 73)
    assert tuple(round(x) for x in image.info['dpi']) == (100, 100)
    icc = image.info['icc_profile']
    assert icc[36:40] == b'acsp' and icc[16:20] == b'RGB '
for file in ['plate.pdf', 'bleed.pdf']:
    pdf = PdfReader(folder / file)
    page = pdf.pages[0]
    assert abs(float(page.trimbox.width)-216)<.001 and abs(float(page.trimbox.height)-108)<.001
    obj = page['/Resources']['/XObject']['/Plate'].get_object()
    assert obj['/Width']==300 and obj['/Height']==150
    assert obj['/ColorSpace'][1].get_object().get_data()==icc
    data = obj.get_data()
    assert data[(89*300+147)*3:(89*300+147)*3+3] == bytes([147,89,73])
    if file == 'bleed.pdf':
        assert abs(float(page.bleedbox.width)-216-6*72/25.4)<.001
        assert float(page.mediabox.width)>float(page.bleedbox.width)
print('Independent PDF/TIFF readers confirm dimensions, lossless pixels, profile and bleed boxes.')
if len(sys.argv)>2:
    profile=Path(sys.argv[2])
    with tempfile.TemporaryDirectory() as td:
        dest=Path(td)
        convert(folder/'plate.tif',dest/'cmyk.tif',profile,'cmyk-tiff','Test profile only')
        with Image.open(dest/'cmyk.tif') as im:
            assert im.mode=='CMYK' and im.size==(300,150)
            assert im.info['icc_profile']==profile.read_bytes()
        convert(folder/'bleed.pdf',dest/'press.pdf',profile,'pdfx','Test profile only')
        try:
            convert(folder/'plate.tif',dest/'cmyk.tif',profile,'cmyk-tiff','Test')
            raise AssertionError('overwritten')
        except ValueError as exc:
            assert 'already exists' in str(exc)
    print('Native CMYK TIFF and Ghostscript PDF/X conversion passed structural checks.')
