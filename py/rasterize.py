#!/usr/bin/env python3
"""Render highlighted code to PNG with Pillow.

Usage: python rasterize.py <spec.json> <output.png> [info.json]

The spec is produced by dsh-code-highlight. Layout follows the same
fixed-advance model as the SVG renderer: one ASCII cell is 0.6 x fontSize
pixels and one wide (CJK / emoji) glyph occupies exactly two cells. The
image is therefore laid out by geometry alone, so the PNG and the SVG line
up even though browser and Pillow measure fonts differently.

Fonts are resolved per character class: ASCII from a monospace face, wide
glyphs from a CJK face. This is what keeps Chinese comments aligned without
making ASCII indentation wobble.
"""

import json
import math
import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def emit(payload, info_path=None):
    """Report one JSON line, and mirror it to a file when a path was given.

    The mirror lets the caller spawn this script with stdio ignored, so
    rasterization never depends on a captured pipe.
    """
    text = json.dumps(payload, ensure_ascii=False)
    if info_path:
        try:
            with open(info_path, "w", encoding="utf-8") as handle:
                handle.write(text)
        except Exception:
            pass
    print(text)
    return text


def fail(message, code=2, info_path=None):
    emit({"ok": False, "error": message}, info_path)
    sys.exit(code)


def js_round(value):
    """Round half away from zero, matching JavaScript's Math.round.

    Python's built-in round() is banker's rounding, which would shift the
    baseline grid away from the SVG renderer's on .5 boundaries.
    """
    return int(math.floor(value + 0.5))


try:
    from PIL import Image, ImageDraw, ImageFont
except Exception as exc:  # pragma: no cover - environment dependent
    fail("Pillow is required for PNG output: %s" % exc)


WINDOWS_FONTS = os.path.join(os.environ.get("WINDIR", r"C:\Windows"), "Fonts")
FONT_DIRS = [
    WINDOWS_FONTS,
    "/usr/share/fonts",
    "/usr/local/share/fonts",
    os.path.expanduser("~/.fonts"),
    os.path.expanduser("~/Library/Fonts"),
    "/Library/Fonts",
    "/System/Library/Fonts",
]


def iter_font_dirs():
    """Yield each font directory, then its immediate subdirectories.

    Linux distributions ship fonts one level down (`truetype/dejavu`,
    `opentype/noto`), so a flat search would miss them.
    """
    for directory in FONT_DIRS:
        if not os.path.isdir(directory):
            continue
        yield directory
        try:
            entries = sorted(os.listdir(directory))
        except OSError:
            continue
        for entry in entries:
            sub = os.path.join(directory, entry)
            if os.path.isdir(sub):
                yield sub

MONO_CANDIDATES = [
    "consola.ttf", "lucon.ttf", "cour.ttf", "DejaVuSansMono.ttf",
    "Menlo.ttc", "monospace.ttf",
]
MONO_BOLD_MAP = {
    "consola.ttf": "consolab.ttf",
    "cour.ttf": "courbd.ttf",
    "lucon.ttf": "luconb.ttf",
    "DejaVuSansMono.ttf": "DejaVuSansMono-Bold.ttf",
}
MONO_ITALIC_MAP = {
    "consola.ttf": "consolai.ttf",
    "cour.ttf": "courit.ttf",
    "lucon.ttf": "luconi.ttf",
    "DejaVuSansMono.ttf": "DejaVuSansMono-Oblique.ttf",
}
CJK_CANDIDATES = [
    "msyh.ttc", "simhei.ttf", "simsun.ttc", "Deng.ttf",
    "NotoSansCJK-Regular.ttc", "PingFang.ttc", "msjh.ttc",
]


def resolve_font(name, candidates):
    """Resolve a font file name or absolute path to an existing file."""
    if name:
        if os.path.isabs(name) and os.path.exists(name):
            return name
        for directory in iter_font_dirs():
            candidate = os.path.join(directory, name)
            if os.path.exists(candidate):
                return candidate
        return None
    for candidate in candidates:
        for directory in iter_font_dirs():
            path = os.path.join(directory, candidate)
            if os.path.exists(path):
                return path
    return None


def sibling_font(path, mapping):
    """Find a bold/italic sibling of a resolved monospace face."""
    if not path:
        return None
    base = os.path.basename(path)
    sibling = mapping.get(base)
    if not sibling:
        return None
    candidate = os.path.join(os.path.dirname(path), sibling)
    return candidate if os.path.exists(candidate) else None


def load_font(path, size):
    if not path:
        return ImageFont.load_default()
    for kwargs in ({}, {"index": 0}):
        try:
            return ImageFont.truetype(path, size, **kwargs)
        except Exception:
            continue
    return ImageFont.load_default()


def is_wide(ch):
    code = ord(ch)
    return (
        0x1100 <= code <= 0x115F
        or 0x2E80 <= code <= 0xA4CF
        or 0xAC00 <= code <= 0xD7A3
        or 0xF900 <= code <= 0xFAFF
        or 0xFE30 <= code <= 0xFE6F
        or 0xFF00 <= code <= 0xFF60
        or 0xFFE0 <= code <= 0xFFE6
        or 0x1F300 <= code <= 0x1FAFF
        or 0x20000 <= code <= 0x3FFFD
    )


def draw_mixed(draw, x, baseline, text, fonts, unit, color):
    """Draw text one glyph at a time on a fixed advance grid."""
    cursor = x
    ascii_font, cjk_font = fonts
    for ch in text:
        wide = is_wide(ch)
        advance = unit * (2 if wide else 1)
        if ch != " " and ch != "\t":
            font = cjk_font if wide else ascii_font
            try:
                draw.text((cursor, baseline), ch, font=font, fill=color, anchor="ls")
            except Exception:
                draw.text((cursor, baseline), ch, font=font, fill=color)
        cursor += advance
    return cursor


def main():
    if len(sys.argv) < 3:
        fail("usage: rasterize.py <spec.json> <output.png> [info.json]", 64)

    spec_path, out_path = sys.argv[1], sys.argv[2]
    info_path = sys.argv[3] if len(sys.argv) > 3 else None
    try:
        with open(spec_path, "r", encoding="utf-8") as handle:
            spec = json.load(handle)
    except Exception as exc:
        fail("cannot read spec: %s" % exc, 2, info_path)

    lines = spec.get("lines") or []
    dpi = int(spec.get("dpi") or 300)
    # 逻辑坐标（@96dpi）由 Node 侧算好并传入，SVG 与 PNG 因此共用同一套几何。
    block_width = float(spec.get("blockWidth") or 0)
    block_height = float(spec.get("blockHeight") or 0)
    fit = float(spec.get("scale") or 0)
    if block_width <= 0 or block_height <= 0 or fit <= 0:
        fail("spec must carry blockWidth, blockHeight and scale", 2, info_path)

    k = (dpi / 96.0) * fit
    canvas_width = max(1, js_round(block_width * k))
    canvas_height = max(1, js_round(block_height * k))

    line_ratio = float(spec.get("lineHeightRatio") or 1.5)
    font_size = float(spec.get("fontSizePx") or 16)
    start_line = int(spec.get("startLine") or 1)
    show_numbers = bool(spec.get("lineNumbers", True))
    title = spec.get("title") or ""
    show_title = bool(spec.get("showTitle", True)) and bool(title)
    background = spec.get("background") or "#ffffff"
    border = spec.get("border") or "#d0d7de"
    title_bar = spec.get("titleBar") or background
    gutter_color = spec.get("lineNumber") or "#8c959f"

    # 与 SVG 渲染器的 blockGeometry 完全相同的逻辑尺寸公式。
    padding = 18.0
    unit = font_size * 0.6
    digits = len(str(start_line + max(len(lines) - 1, 0)))
    gutter = (digits * unit + 18.0) if show_numbers else 0.0
    line_height = js_round(font_size * line_ratio)
    title_height = js_round(font_size * 2.1) if show_title else 0

    font_px = font_size * k
    padding_px = padding * k
    unit_px = unit * k
    gutter_px = gutter * k
    line_height_px = line_height * k
    title_height_px = title_height * k

    ascii_path = resolve_font(spec.get("monoFont"), MONO_CANDIDATES)
    ascii_bold_path = sibling_font(ascii_path, MONO_BOLD_MAP)
    cjk_path = resolve_font(spec.get("cjkFont"), CJK_CANDIDATES)

    image = Image.new("RGB", (canvas_width, canvas_height), background)
    draw = ImageDraw.Draw(image)

    radius = max(1.0, 8.0 * k)
    stroke = max(1, js_round(k))
    draw.rounded_rectangle(
        [0.5, 0.5, canvas_width - 1.5, canvas_height - 1.5],
        radius=radius,
        outline=border,
        width=stroke,
        fill=background,
    )

    glyph_size = max(1, js_round(font_px))
    ascii_font = load_font(ascii_path, glyph_size)
    ascii_bold = load_font(ascii_bold_path or ascii_path, glyph_size)
    cjk_font = load_font(cjk_path, glyph_size)

    if show_title:
        draw.rounded_rectangle(
            [0.5, 0.5, canvas_width - 1.5, title_height_px],
            radius=radius,
            fill=title_bar,
        )
        draw.rectangle(
            [0.5, title_height_px - radius, canvas_width - 1.5, title_height_px],
            fill=title_bar,
        )
        title_font_size = max(8, js_round(font_px * 0.92))
        draw_mixed(
            draw,
            padding_px,
            js_round(title_height_px * 0.66),
            title,
            (load_font(ascii_path, title_font_size), load_font(cjk_path, title_font_size)),
            title_font_size * 0.6,
            gutter_color,
        )

    base_y = padding_px + title_height_px
    code_x = padding_px + gutter_px
    for index, tokens in enumerate(lines):
        baseline = js_round(base_y + line_height_px * index + font_px * 1.05)
        if show_numbers:
            number = str(start_line + index)
            number_x = padding_px + gutter_px - 14 * k
            try:
                draw.text((number_x, baseline), number, font=ascii_font, fill=gutter_color, anchor="rs")
            except Exception:
                draw.text((number_x, baseline), number, font=ascii_font, fill=gutter_color)
        cursor = code_x
        for token in tokens:
            value = token.get("v", "")
            if not value:
                continue
            color = token.get("color") or "#000000"
            active = ascii_bold if token.get("bold") and ascii_bold_path else ascii_font
            cursor = draw_mixed(draw, cursor, baseline, value, (active, cjk_font), unit_px, color)

    try:
        image.save(out_path, "PNG", dpi=(dpi, dpi))
    except Exception as exc:
        fail("cannot write PNG: %s" % exc, 2, info_path)

    emit({
        "ok": True,
        "width": canvas_width,
        "height": canvas_height,
        "dpi": dpi,
        "scale": round(fit, 4),
        "fontSizePx": round(font_size * fit, 2),
        "lineHeightPx": round(line_height_px, 2),
        "unitPx": round(unit_px, 3),
        "asciiFont": ascii_path,
        "cjkFont": cjk_path,
    }, info_path)


if __name__ == "__main__":
    main()
