#!/usr/bin/env python3
"""Independent libtiff/Pillow decode of one unmodified public COG source block.

Wrap the original compressed 1024² Float32/Predictor3 payload in a tiny standard
single-strip TIFF. This is a numeric fixture tool, not the production decoder.
No need to download or decode an entire one-degree source object.
"""
import argparse
import io
import json
import struct
from pathlib import Path
from PIL import Image


def reference(compressed: bytes) -> bytes:
    if not 1 <= len(compressed) <= 5 * 1024 * 1024:
        raise ValueError('source block byte limit')
    fields = [(256, 4, 1024), (257, 4, 1024), (258, 3, 32), (259, 3, 8),
              (262, 3, 1), (273, 4, 0), (277, 3, 1), (278, 4, 1024),
              (279, 4, len(compressed)), (284, 3, 1), (317, 3, 3), (339, 3, 3)]
    start = 8 + 2 + len(fields) * 12 + 4
    entries = [struct.pack('<HHI', tag, kind, 1) +
               (struct.pack('<H', value) + b'\0\0' if kind == 3 else
                struct.pack('<I', start if tag == 273 else value))
               for tag, kind, value in fields]
    tiff = b'II' + struct.pack('<HIH', 42, 8, len(entries)) + b''.join(entries) + b'\0' * 4 + compressed
    with Image.open(io.BytesIO(tiff)) as image:
        if image.size != (1024, 1024) or image.mode != 'F':
            raise ValueError('unexpected independent raster geometry')
        return image.tobytes('raw', 'F;32F')


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('compressed', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    decoded = reference(args.compressed.read_bytes())
    args.output.write_bytes(decoded)
    values = struct.unpack_from('<8f', decoded)
    print(json.dumps({'pixels': 1024 * 1024, 'bytes': len(decoded), 'first': values}))


if __name__ == '__main__':
    main()
