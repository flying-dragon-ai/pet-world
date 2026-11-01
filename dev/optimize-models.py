#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""宠物 GLB 体积优化：把内嵌 PNG 贴图重编码成 1024 长边的 JPEG。

几何 / 骨骼 / 动画一个字节都不动 —— 只替换 images[i] 指向的那几个 bufferView 的数据，
其余 bufferView 按原索引、原顺序、原字节重新拼接（每个起点 4 字节对齐），accessor 依旧按
bufferView 索引寻址，所以顶点、蒙皮权重、动画曲线全部原样保留。改的只有：

  * images[i].mimeType = "image/jpeg"（名字保留）
  * 对应 bufferView 的 byteOffset / byteLength（以及被挤动的后续视图）
  * buffers[0].byteLength、JSON/ BIN 两个 chunk 的长度与文件头总长

原始件先挪到 assets/models/_raw/pets/<同名>.glb 留底（已在 .gitignore 里），
再往 assets/models/pets/<同名>.glb 写优化后的版本。

用法：
  python dev/optimize-models.py --dry-run     # 只算体积，不落地
  python dev/optimize-models.py               # 正式优化（幂等：已是 jpeg 的直接跳过）
  python dev/optimize-models.py --verify      # 拿 _raw 原始件逐只对账
  python dev/optimize-models.py --dir assets/models/pets --only cat,corgi
"""
import argparse
import io
import json
import os
import struct
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DIR = ROOT / 'assets/models/pets'
DEFAULT_RAW = ROOT / 'assets/models/_raw/pets'

GLB_MAGIC = 0x46546C67
CHUNK_JSON = 0x4E4F534A
CHUNK_BIN = 0x004E4942
MAX_EDGE = 1024      # 贴图最长边目标值（超了才缩）
QUALITY = 82         # JPEG 质量

# 这些顶层字段在优化前后必须逐字段完全相同（--verify 会对比）
FROZEN = ('asset', 'scene', 'scenes', 'extensionsUsed', 'extensionsRequired', 'nodes',
          'meshes', 'skins', 'animations', 'materials', 'textures', 'samplers', 'accessors')


def pad4(n):
    """向上取整到 4 的倍数。"""
    return (n + 3) & ~3


# ── GLB 读写 ────────────────────────────────────────────────
def read_glb(path):
    """返回 (gltf_json, bin_bytes)。只认 chunk0=JSON、chunk1=BIN 的标准 GLB。"""
    buf = path.read_bytes()
    if len(buf) < 20 or struct.unpack_from('<I', buf, 0)[0] != GLB_MAGIC:
        raise ValueError('不是 GLB（magic 不对）')
    version, total = struct.unpack_from('<II', buf, 4)
    if version != 2:
        raise ValueError(f'不是 glTF 2.0（version={version}）')
    if total != len(buf):
        raise ValueError(f'文件头总长 {total} 与磁盘字节 {len(buf)} 不一致')
    jlen, jtype = struct.unpack_from('<II', buf, 12)
    if jtype != CHUNK_JSON:
        raise ValueError('第一个 chunk 不是 JSON')
    gltf = json.loads(buf[20:20 + jlen].decode('utf-8'))
    off = 20 + jlen
    bin_data = b''
    if off + 8 <= len(buf):
        blen, btype = struct.unpack_from('<II', buf, off)
        if btype != CHUNK_BIN:
            raise ValueError('第二个 chunk 不是 BIN')
        bin_data = buf[off + 8:off + 8 + blen]
        if len(bin_data) != blen:
            raise ValueError('BIN chunk 被截断')
    return gltf, bin_data


def pack_glb(gltf, bin_data):
    """按 GLB 规则拼回：JSON 补空格到 4 字节，BIN 补 0 到 4 字节，写回头部总长。"""
    js = json.dumps(gltf, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    js += b' ' * (pad4(len(js)) - len(js))
    bd = bytes(bin_data)
    bd += b'\x00' * (pad4(len(bd)) - len(bd))
    total = 12 + 8 + len(js) + 8 + len(bd)
    return b''.join((
        struct.pack('<III', GLB_MAGIC, 2, total),
        struct.pack('<II', len(js), CHUNK_JSON), js,
        struct.pack('<II', len(bd), CHUNK_BIN), bd,
    ))


def triangles(gltf):
    """跟 dev/check-assets.js 同一口径数三角面。"""
    tris = 0
    for mesh in gltf.get('meshes') or []:
        for prim in mesh.get('primitives') or []:
            idx = prim['indices'] if 'indices' in prim else prim['attributes']['POSITION']
            acc = gltf['accessors'][idx]
            tris += acc['count'] / 3
    return round(tris)


# ── 贴图重编码 ──────────────────────────────────────────────
def encode_jpeg(data, max_edge=MAX_EDGE, quality=QUALITY):
    """PNG 字节 → (jpeg 字节, 原尺寸, 新尺寸)。带 alpha 的白底合成到 RGB。"""
    im = Image.open(io.BytesIO(data))
    im.load()
    src = im.size
    if im.mode in ('RGBA', 'LA', 'PA') or 'transparency' in im.info:
        rgba = im.convert('RGBA')
        flat = Image.new('RGB', rgba.size, (255, 255, 255))
        flat.paste(rgba, mask=rgba.split()[3])
        im = flat
    else:
        im = im.convert('RGB')
    w, h = im.size
    if max(w, h) > max_edge:
        k = max_edge / float(max(w, h))
        im = im.resize((max(1, round(w * k)), max(1, round(h * k))), Image.LANCZOS)
    out = io.BytesIO()
    im.save(out, 'JPEG', quality=quality, optimize=True)
    return out.getvalue(), src, im.size


def plan_images(gltf, bin_data):
    """挑出要重编码的 image：png 且最长边 > MAX_EDGE。返回 {bufferView 索引: 新 jpeg 字节}。"""
    bvs = gltf.get('bufferViews') or []
    todo = {}
    for i, im in enumerate(gltf.get('images') or []):
        bv_idx = im.get('bufferView')
        if bv_idx is None or bv_idx in todo:
            continue
        bv = bvs[bv_idx]
        off = bv.get('byteOffset', 0)
        raw = bin_data[off:off + bv['byteLength']]
        if im.get('mimeType') == 'image/jpeg':
            continue                                  # 已经压过，幂等跳过
        try:
            probe = Image.open(io.BytesIO(raw))
            probe.load()
        except Exception as err:  # noqa: BLE001 —— 打不开就原样留着，让人看见
            print(f'    ! images[{i}] 解不开（{err}），跳过这张')
            continue
        if max(probe.size) <= MAX_EDGE:
            continue                                  # 尺寸本来就不大，不碰
        jpeg, src, dst = encode_jpeg(raw)
        im['mimeType'] = 'image/jpeg'
        todo[bv_idx] = jpeg
        print(f'    images[{i}] {im.get("name", "")}: {src[0]}x{src[1]} PNG {len(raw)}B '
              f'→ {dst[0]}x{dst[1]} JPEG {len(jpeg)}B')
    return todo


def rebuild(gltf, bin_data, converted):
    """按索引顺序重排所有 bufferView：起点 4 字节对齐，image 视图换成新字节。"""
    bvs = gltf['bufferViews']
    olds = [(bv.get('byteOffset', 0), bv['byteLength']) for bv in bvs]   # 先记下旧坐标
    out = bytearray()
    for i, bv in enumerate(bvs):
        off = pad4(len(out))
        if off > len(out):
            out.extend(b'\x00' * (off - len(out)))
        data = converted[i] if i in converted else bin_data[olds[i][0]:olds[i][0] + olds[i][1]]
        bv['byteOffset'] = off
        bv['byteLength'] = len(data)
        out.extend(data)
    if not gltf.get('buffers'):
        raise ValueError('没有 buffers')
    if 'uri' in gltf['buffers'][0]:
        raise ValueError('buffers[0] 是外链 .bin，不是内嵌 GLB')
    gltf['buffers'][0]['byteLength'] = len(out)
    return bytes(out)


COMPONENT_SIZE = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}
TYPE_COUNT = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT2': 4, 'MAT3': 9, 'MAT4': 16}


def accessor_bytes(gltf, bin_data, idx):
    """把 accessor 实际读到的字节抠出来（无 byteStride 时整段，否则逐元素）。"""
    acc = gltf['accessors'][idx]
    bv = gltf['bufferViews'][acc['bufferView']]
    size = COMPONENT_SIZE[acc['componentType']] * TYPE_COUNT[acc['type']]
    base = bv.get('byteOffset', 0) + acc.get('byteOffset', 0)
    stride = bv.get('byteStride') or size
    if stride == size:
        return bin_data[base:base + size * acc['count']]
    return b''.join(bin_data[base + i * stride:base + i * stride + size] for i in range(acc['count']))


def check_invariants(old, new, old_bin, new_bin, image_views):
    """几何 / 骨骼 / 动画必须一字不动，非 image 视图的数据必须逐字节相同。"""
    for key in FROZEN:
        if old.get(key) != new.get(key):
            raise AssertionError(f'{key} 被改动了')
    if len(old['bufferViews']) != len(new['bufferViews']):
        raise AssertionError('bufferViews 数量变了')
    for i, (a, b) in enumerate(zip(old['bufferViews'], new['bufferViews'])):
        a2 = {k: v for k, v in a.items() if k not in ('byteOffset', 'byteLength')}
        b2 = {k: v for k, v in b.items() if k not in ('byteOffset', 'byteLength')}
        if a2 != b2:
            raise AssertionError(f'bufferViews[{i}] 的属性被改动')
        if i in image_views:
            continue
        ao, al = a.get('byteOffset', 0), a['byteLength']
        bo = b.get('byteOffset', 0)
        if old_bin[ao:ao + al] != new_bin[bo:bo + b['byteLength']]:
            raise AssertionError(f'bufferViews[{i}] 的数据变了')
    for i in range(len(old['accessors'])):
        if accessor_bytes(old, old_bin, i) != accessor_bytes(new, new_bin, i):
            raise AssertionError(f'accessors[{i}] 读到的数据变了')
    for i, b in enumerate(new['bufferViews']):
        if b['byteOffset'] % 4:
            raise AssertionError(f'bufferViews[{i}] 起点没对齐到 4 字节')
        if b.get('byteOffset', 0) + b['byteLength'] > len(new_bin):
            raise AssertionError(f'bufferViews[{i}] 超出 BIN 长度')
    for im in new.get('images') or []:
        if im.get('bufferView') in image_views and im.get('mimeType') != 'image/jpeg':
            raise AssertionError('image 的 mimeType 没改成 image/jpeg')


# ── 主流程 ──────────────────────────────────────────────────
def stems(pets_dir, only):
    keep = {s.strip() for s in only.split(',')} if only else None
    return sorted(p for p in pets_dir.glob('*.glb') if not p.name.startswith('_')
                  and (keep is None or p.stem in keep))


def optimize_one(path, raw_dir, dry_run):
    st0 = path.stat()
    before = st0.st_size
    gltf, bin_data = read_glb(path)
    st1 = path.stat()
    if (st0.st_size, st0.st_mtime_ns) != (st1.st_size, st1.st_mtime_ns):
        raise RuntimeError('文件正在被别的进程写（读的过程中变了），本轮跳过')
    print(f'  {path.name}  {before / 1048576:.2f}MB  {triangles(gltf)} tris  '
          f'{len(gltf.get("images") or [])} images')
    converted = plan_images(gltf, bin_data)
    if not converted:
        print('    = 贴图已达标（jpeg 或最长边 ≤1024），跳过')
        return None
    image_views = set(converted)
    new_gltf = json.loads(json.dumps(gltf))           # 深拷贝，留着对账
    new_bin = rebuild(new_gltf, bin_data, converted)
    check_invariants(gltf, new_gltf, bin_data, new_bin, image_views)
    blob = pack_glb(new_gltf, new_bin)
    after = len(blob)
    print(f'    → {after / 1048576:.2f}MB（-{before - after}B，{(1 - after / before) * 100:.1f}%）')
    if dry_run:
        return {'key': path.stem, 'before': before, 'after': after, 'tris': triangles(gltf),
                'skins': len(gltf.get('skins') or []), 'anims': [a.get('name') for a in gltf.get('animations') or []]}
    raw_dir.mkdir(parents=True, exist_ok=True)
    raw_path = raw_dir / path.name
    if raw_path.exists():
        print(f'    ! {raw_path.name} 已在 _raw 留底，保留原件不覆盖')
    else:
        os.replace(path, raw_path)                    # 原件先挪走，再写新的
    tmp = path.with_suffix('.glb.tmp')
    tmp.write_bytes(blob)
    os.replace(tmp, path)
    return {'key': path.stem, 'before': before, 'after': after, 'tris': triangles(new_gltf),
            'skins': len(new_gltf.get('skins') or []), 'anims': [a.get('name') for a in new_gltf.get('animations') or []]}


def run(dir_path, raw_dir, only, dry_run, quality, max_edge):
    global QUALITY, MAX_EDGE
    QUALITY, MAX_EDGE = quality, max_edge
    files = stems(dir_path, only)
    if not files:
        print(f'{dir_path} 里没有可选 *.glb')
        return 0
    print(f'{"预演" if dry_run else "优化"}：{len(files)} 只，目录 {dir_path}')
    rows = []
    failed = 0
    for path in files:
        if not path.exists():
            continue
        try:
            row = optimize_one(path, raw_dir, dry_run)
        except Exception as err:  # noqa: BLE001 —— 单只坏了不拖累整批（并行下载可能正在落盘）
            print(f'  ✗ {path.name}：{err}')
            failed += 1
            continue
        if row:
            rows.append(row)
    if not rows:
        print('没有需要优化的文件（全部已达标）')
        return 0
    print(f'\n{"key".ljust(12)}{"before".rjust(12)}{"after".rjust(12)}  降幅   tris  skins  anims')
    for r in rows:
        drop = (1 - r['after'] / r['before']) * 100
        print(f'{r["key"].ljust(12)}{r["before"]:>12}{r["after"]:>12}{drop:>6.1f}%'
              f'{r["tris"]:>7}{r["skins"]:>7}  {"/".join(r["anims"])}')
    print(f'合计：{sum(r["before"] for r in rows) / 1048576:.2f}MB → '
          f'{sum(r["after"] for r in rows) / 1048576:.2f}MB')
    if failed:
        print(f'跳过 {failed} 只（见上面的 ✗），重跑一次即可')
    return 1 if failed else 0


def verify(dir_path, raw_dir):
    """拿 _raw 里的原始件跟现在的成品逐只对账。"""
    files = sorted(raw_dir.glob('*.glb'))
    if not files:
        print(f'{raw_dir} 里没有原始件，先跑一次正式优化')
        return 1
    bad = 0
    print(f'{"key".ljust(12)}{"before".rjust(12)}{"after".rjust(12)}  tris     skins  anims  images')
    for raw_path in files:
        cur = dir_path / raw_path.name
        if not cur.exists():
            print(f'✗ {raw_path.name}：成品不见了')
            bad += 1
            continue
        a_gltf, a_bin = read_glb(raw_path)
        b_gltf, b_bin = read_glb(cur)
        ta, tb = triangles(a_gltf), triangles(b_gltf)
        sa, sb = len(a_gltf.get('skins') or []), len(b_gltf.get('skins') or [])
        aa = [a.get('name') for a in a_gltf.get('animations') or []]
        ab = [x.get('name') for x in b_gltf.get('animations') or []]
        ok = ta == tb and sa == sb and aa == ab
        mimes = sorted({im.get('mimeType') for im in (b_gltf.get('images') or [])})
        print(f'{raw_path.stem.ljust(12)}{raw_path.stat().st_size:>12}{cur.stat().st_size:>12}'
              f'  {ta}→{tb}  {sa}→{sb}  {"=" if aa == ab else "!"}{len(ab)}  {",".join(mimes)}')
        if not ok:
            print(f'  ✗ {raw_path.stem}：几何/骨骼/动画对不上')
            bad += 1
        try:
            check_invariants(a_gltf, b_gltf, a_bin, b_bin,
                             {im.get('bufferView') for im in (a_gltf.get('images') or [])})
        except AssertionError as err:
            print(f'  ✗ {raw_path.stem}：{err}')
            bad += 1
    print(f'对账：{len(files)} 只，异常 {bad} 处')
    return 1 if bad else 0


def main(argv=None):
    # Windows 控制台默认 GBK，先把输出口切成 UTF-8，否则中文/箭头一律炸
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding='utf-8', errors='replace')
        except (AttributeError, OSError):
            pass
    ap = argparse.ArgumentParser(description='宠物 GLB 贴图重编码（几何零改动）')
    ap.add_argument('--dir', default=str(DEFAULT_DIR), help='成品目录，默认 assets/models/pets')
    ap.add_argument('--raw-dir', default=str(DEFAULT_RAW), help='原始件留底目录')
    ap.add_argument('--dry-run', action='store_true', help='只算体积，不挪不改')
    ap.add_argument('--verify', action='store_true', help='用 _raw 原始件对账成品')
    ap.add_argument('--only', default='', help='只处理这几只，逗号分隔')
    ap.add_argument('--max-edge', type=int, default=MAX_EDGE)
    ap.add_argument('--quality', type=int, default=QUALITY)
    args = ap.parse_args(argv)
    dir_path, raw_dir = Path(args.dir), Path(args.raw_dir)
    if not dir_path.is_dir():
        print(f'目录不存在：{dir_path}')
        return 1
    if args.verify:
        return verify(dir_path, raw_dir)
    return run(dir_path, raw_dir, args.only, args.dry_run, args.quality, args.max_edge)


if __name__ == '__main__':
    sys.exit(main())
