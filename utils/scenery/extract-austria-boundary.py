#!/usr/bin/env python3
"""Extract pinned Natural Earth Austria Polygon from a locally downloaded source."""
import hashlib
import json
import sys
from pathlib import Path

EXPECTED = '239eec57ac17f100a11e2536cffc56752c318b50ae765b0918ff7aab4ce8f255'
raw = Path(sys.argv[1]).read_bytes()
if hashlib.sha256(raw).hexdigest() != EXPECTED:
    raise ValueError('Natural Earth input hash mismatch')
doc = json.loads(raw)
features = [feature for feature in doc['features'] if feature['properties'].get('ADM0_A3') == 'AUT']
if len(features) != 1 or features[0]['geometry']['type'] != 'Polygon':
    raise ValueError('Unexpected Austria geometry')
output = json.dumps(features[0]['geometry'], separators=(',', ':')) + '\n'
if hashlib.sha256(output.encode()).hexdigest() != 'a98c79bbf465a12724aa8f9df8d5e318b02d7d8223d4a55fe89ee674b2fc0acd':
    raise ValueError('Extracted geometry hash mismatch')
sys.stdout.write(output)
