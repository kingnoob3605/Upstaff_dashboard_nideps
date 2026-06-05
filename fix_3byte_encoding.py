#!/usr/bin/env python3
"""
Fix double-encoded 3-byte UTF-8 sequences in JavaScript files.

Corruption pattern:
  A UTF-8 source file was read as cp1252 (Windows-1252) and re-saved as UTF-8.
  Each original byte B (0x80-0xFF) was treated as a cp1252 character and
  re-encoded as UTF-8, expanding each byte to 2-3 bytes.

  For a 3-byte UTF-8 sequence \xAB \xCD \xEF (e.g. \xe2\x9a\xa0 = U+26A0 ⚠):
    \xe2 (Latin-1 a-grave U+00E2)  -> \xc3\xa2
    \x9a (cp1252 s-caron U+0161)   -> \xc5\xa1
    \xa0 (NBSP U+00A0)             -> \xc2\xa0
  Result: \xc3\xa2 \xc5\xa1 \xc2\xa0  (6 bytes instead of 3)

Fix strategy:
  Scan raw bytes for \xC3\xA0..\xC3\xAF (double-encoded 0xE0-0xEF first bytes).
  After that, read two more "double-encoded cp1252 continuation bytes" (each
  original 0x80-0xBF byte encoded as 2-3 UTF-8 bytes).
  Reconstruct the original 3-byte UTF-8 sequence and verify it decodes cleanly.

Safe guards:
  - Only applies when reconstruction produces valid UTF-8 (in U+0800-U+FFFF).
  - Does NOT touch already-correct 4-byte emoji sequences (\xF0 start).
  - Does NOT touch already-correct ASCII or 2-byte sequences.
"""

import sys

# cp1252 special characters for bytes 0x80-0x9F
CP1252_SPECIAL = {
    0x80: 0x20AC, 0x82: 0x201A, 0x83: 0x0192, 0x84: 0x201E, 0x85: 0x2026,
    0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02C6, 0x89: 0x2030, 0x8A: 0x0160,
    0x8B: 0x2039, 0x8C: 0x0152, 0x8E: 0x017D, 0x91: 0x2018, 0x92: 0x2019,
    0x93: 0x201C, 0x94: 0x201D, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
    0x98: 0x02DC, 0x99: 0x2122, 0x9A: 0x0161, 0x9B: 0x203A, 0x9C: 0x0153,
    0x9E: 0x017E, 0x9F: 0x0178,
    # Undefined in cp1252 -> Latin-1 fallback
    0x81: 0x0081, 0x8D: 0x008D, 0x8F: 0x008F, 0x90: 0x0090, 0x9D: 0x009D,
}

# Build cp1252 forward table: byte -> Unicode codepoint
CP1252_FWD = {}
for _i in range(0x80):
    CP1252_FWD[_i] = _i
for _i in range(0x80, 0xA0):
    CP1252_FWD[_i] = CP1252_SPECIAL.get(_i, _i)
for _i in range(0xA0, 0x100):
    CP1252_FWD[_i] = _i

# Build reverse: Unicode codepoint -> cp1252 byte (first mapping wins)
REVERSE_CP1252 = {}
for _b, _cp in CP1252_FWD.items():
    if _cp not in REVERSE_CP1252:
        REVERSE_CP1252[_cp] = _b


def try_read_cp1252_byte(data, pos):
    """
    At data[pos], try to read a UTF-8-encoded cp1252 character that represents
    a non-ASCII original byte (0x80-0xBF, i.e. UTF-8 continuation byte range).
    Returns (original_byte, bytes_consumed) or None.
    """
    if pos >= len(data):
        return None
    b0 = data[pos]

    # 4-byte UTF-8 start -> definitely not a cp1252 char (U+10000+)
    if b0 >= 0xF0:
        return None
    # ASCII: pass through, but we only care about 0x80+ originals here
    if b0 < 0x80:
        return None
    # Bare continuation byte: invalid start
    if b0 < 0xC2:
        return None

    if b0 < 0xE0:  # 2-byte UTF-8: U+0080..U+07FF
        if pos + 1 >= len(data):
            return None
        b1 = data[pos + 1]
        if not (0x80 <= b1 <= 0xBF):
            return None
        cp = ((b0 & 0x1F) << 6) | (b1 & 0x3F)
        orig = REVERSE_CP1252.get(cp)
        if orig is not None and 0x80 <= orig <= 0xBF:
            return (orig, 2)
        return None

    # 3-byte UTF-8: U+0800..U+FFFF
    if pos + 2 >= len(data):
        return None
    b1, b2 = data[pos + 1], data[pos + 2]
    if not (0x80 <= b1 <= 0xBF and 0x80 <= b2 <= 0xBF):
        return None
    cp = ((b0 & 0x0F) << 12) | ((b1 & 0x3F) << 6) | (b2 & 0x3F)
    orig = REVERSE_CP1252.get(cp)
    if orig is not None and 0x80 <= orig <= 0xBF:
        return (orig, 3)
    return None


def fix_file(filepath, dry_run=False):
    with open(filepath, 'rb') as f:
        data = bytearray(f.read())

    result = bytearray()
    pos = 0
    fixes = 0

    while pos < len(data):
        b0 = data[pos]

        # Detect \xC3\xA0..\xC3\xAF: double-encoded original byte 0xE0-0xEF
        # (these are the first bytes of 3-byte UTF-8 sequences)
        if b0 == 0xC3 and pos + 1 < len(data):
            b1 = data[pos + 1]
            if 0xA0 <= b1 <= 0xAF:
                # Recover original first byte
                orig_b0 = ((b0 & 0x1F) << 6) | (b1 & 0x3F)  # 0xE0-0xEF

                # Read two more double-encoded continuation bytes
                res1 = try_read_cp1252_byte(data, pos + 2)
                if res1 is not None:
                    res2 = try_read_cp1252_byte(data, pos + 2 + res1[1])
                    if res2 is not None:
                        orig_seq = bytes([orig_b0, res1[0], res2[0]])
                        try:
                            char = orig_seq.decode('utf-8')
                            # Successfully reconstructed a Unicode char in U+0800-U+FFFF
                            result.extend(orig_seq)
                            consumed = 2 + res1[1] + res2[1]
                            pos += consumed
                            fixes += 1
                            continue
                        except UnicodeDecodeError:
                            pass  # Not a valid sequence; fall through

        # No fix: copy byte as-is
        result.append(b0)
        pos += 1

    if not dry_run and fixes > 0:
        with open(filepath, 'wb') as f:
            f.write(result)

    return fixes


if __name__ == '__main__':
    files = sys.argv[1:]
    if not files:
        print("Usage: python fix_3byte_encoding.py <file1> [file2 ...]")
        sys.exit(1)

    for fp in files:
        count = fix_file(fp, dry_run=False)
        status = "FIXED" if count > 0 else "no changes"
        print(f"[{status}] {fp}: {count} sequences repaired")
