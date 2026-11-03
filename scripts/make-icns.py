#!/usr/bin/env python3
"""Build build/icon.icns (macOS app icon) from build/icon.png.

An .icns is a flat container of PNGs, so this needs no macOS tooling.
"""

from PIL import Image

import os
import struct
import sys

SIZES = [
    (b"icp4", 16),
    (b"icp5", 32),
    (b"icp6", 64),
    (b"ic07", 128),
    (b"ic08", 256),
    (b"ic09", 512),
    (b"ic11", 32),
    (b"ic12", 64),
    (b"ic13", 256),
    (b"ic14", 512),
]

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
source = os.path.join(ROOT, "build", "icon.png")
target = os.path.join(ROOT, "build", "icon.icns")

if not os.path.exists(source):
    sys.exit(f"missing source icon: {source} (run `npx electron scripts/icon.cjs` first)")

src = Image.open(source).convert("RGBA")
if src.width < 512:
    print(f"warning: source icon is {src.width}px — large sizes will be upscaled")

chunks = []
for kind, size in SIZES:
    if src.width != size:
        frame = src.resize((size, size), Image.LANCZOS)
    else:
        frame = src
    buffer = f"{size}".encode()
    import io

    handle = io.BytesIO()
    frame.save(handle, "PNG", optimize=True)
    data = handle.getvalue()
    chunks.append(kind + struct.pack(">I", len(data) + 8) + data)
    print(f"  {kind.decode()} {size}x{size} {len(data) // 1024} KB")

body = b"".join(chunks)
with open(target, "wb") as handle:
    handle.write(b"icns" + struct.pack(">I", len(body) + 8) + body)

print(f"wrote {target} ({os.path.getsize(target) // 1024} KB)")
