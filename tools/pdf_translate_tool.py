import argparse
import json
import re
from pathlib import Path

import fitz


CHINESE_RE = re.compile(r"[\u4e00-\u9fff]")


def is_chinese_text(text: str) -> bool:
    return bool(CHINESE_RE.search(text))


def normalize_lines(block: dict) -> list[str]:
    lines: list[str] = []
    for line in block.get("lines", []):
        text = "".join(span.get("text", "") for span in line.get("spans", []))
        lines.append(text.rstrip())
    return lines


def dominant_font(block: dict) -> tuple[str, float]:
    counts: dict[tuple[str, float], int] = {}
    for line in block.get("lines", []):
        for span in line.get("spans", []):
            key = (span.get("font", "unknown"), round(float(span.get("size", 12)), 2))
            counts[key] = counts.get(key, 0) + len(span.get("text", ""))
    if not counts:
        return ("unknown", 12.0)
    return max(counts.items(), key=lambda item: item[1])[0]


def extract_blocks(pdf_path: Path, output_path: Path) -> None:
    doc = fitz.open(pdf_path)
    payload: dict[str, object] = {
        "source_pdf": str(pdf_path),
        "page_count": doc.page_count,
        "pages": [],
    }
    for page_index in range(doc.page_count):
        page = doc[page_index]
        page_dict = page.get_text("dict")
        page_entry: dict[str, object] = {
            "page_number": page_index + 1,
            "width": round(page.rect.width, 2),
            "height": round(page.rect.height, 2),
            "blocks": [],
        }
        block_serial = 0
        for raw_block in page_dict.get("blocks", []):
            if raw_block.get("type") != 0:
                continue
            lines = normalize_lines(raw_block)
            text = "\n".join(lines).strip("\n")
            if not text.strip():
                continue
            font_name, font_size = dominant_font(raw_block)
            block_serial += 1
            page_entry["blocks"].append(
                {
                    "id": f"p{page_index + 1:03d}_b{block_serial:03d}",
                    "page_number": page_index + 1,
                    "bbox": [round(float(v), 2) for v in raw_block.get("bbox", [])],
                    "font": font_name,
                    "font_size": font_size,
                    "line_count": len(lines),
                    "is_chinese": is_chinese_text(text),
                    "text": text,
                }
            )
        payload["pages"].append(page_entry)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def build_translation_map(translations_path: Path) -> dict[str, str]:
    payload = json.loads(translations_path.read_text(encoding="utf-8"))
    translation_map: dict[str, str] = {}
    if isinstance(payload, dict) and "translations" in payload:
        items = payload["translations"]
    else:
        items = payload
    for item in items:
        block_id = item["id"]
        translation = item.get("translation", "").strip()
        if translation:
            translation_map[block_id] = translation
    return translation_map


def should_center(block: dict, page_width: float, page_height: float) -> bool:
    x0, y0, x1, y1 = block["bbox"]
    width = x1 - x0
    height = y1 - y0
    text = block["text"]
    if y0 > page_height * 0.9 and width < 40:
        return True
    if width < page_width * 0.6 and x0 > page_width * 0.18 and x1 < page_width * 0.82:
        if block["font_size"] >= 14 or "\n" in text:
            return True
    return False


def pick_font(block: dict) -> str:
    text = block["text"]
    if block["font_size"] >= 14:
        return "Helvetica-Bold"
    if text.isupper() and len(text) <= 8:
        return "Helvetica-Bold"
    return "Times-Roman"


def fit_textbox(page: fitz.Page, rect: fitz.Rect, text: str, base_size: float, fontname: str, align: int) -> None:
    size = min(max(base_size, 7.0), 24.0)
    margin_rect = fitz.Rect(rect.x0, rect.y0, rect.x1, rect.y1)
    while size >= 5.0:
        spare = page.insert_textbox(
            margin_rect,
            text,
            fontsize=size,
            fontname=fontname,
            color=(0, 0, 0),
            align=align,
            lineheight=1.08,
        )
        if spare >= -0.1:
            return
        page.draw_rect(margin_rect, color=(1, 1, 1), fill=(1, 1, 1), overlay=True)
        size -= 0.4
    page.insert_textbox(
        margin_rect,
        text,
        fontsize=5.0,
        fontname=fontname,
        color=(0, 0, 0),
        align=align,
        lineheight=1.0,
    )


def render_translation(pdf_path: Path, blocks_path: Path, translations_path: Path, output_path: Path) -> None:
    blocks_payload = json.loads(blocks_path.read_text(encoding="utf-8"))
    translation_map = build_translation_map(translations_path)
    doc = fitz.open(pdf_path)
    for page_entry in blocks_payload["pages"]:
        page_index = page_entry["page_number"] - 1
        page = doc[page_index]
        page_width = float(page_entry["width"])
        page_height = float(page_entry["height"])
        overlays: list[tuple[fitz.Rect, str, float, str, int]] = []
        for block in page_entry["blocks"]:
            block_id = block["id"]
            translation = translation_map.get(block_id)
            if not translation:
                continue
            rect = fitz.Rect(block["bbox"])
            page.draw_rect(rect, color=(1, 1, 1), fill=(1, 1, 1), overlay=True)
            align = 1 if should_center(block, page_width, page_height) else 0
            base_size = float(block["font_size"])
            if block["is_chinese"]:
                base_size *= 0.9
            fontname = pick_font(block)
            overlays.append((rect, translation, base_size, fontname, align))
        for rect, translation, base_size, fontname, align in overlays:
            fit_textbox(page, rect, translation, base_size, fontname, align)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    doc.save(output_path, garbage=4, deflate=True)
    doc.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract text blocks from a PDF and render translated overlays.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    extract_parser = subparsers.add_parser("extract")
    extract_parser.add_argument("--pdf", required=True, type=Path)
    extract_parser.add_argument("--out", required=True, type=Path)

    render_parser = subparsers.add_parser("render")
    render_parser.add_argument("--pdf", required=True, type=Path)
    render_parser.add_argument("--blocks", required=True, type=Path)
    render_parser.add_argument("--translations", required=True, type=Path)
    render_parser.add_argument("--out", required=True, type=Path)

    args = parser.parse_args()
    if args.command == "extract":
        extract_blocks(args.pdf, args.out)
    else:
        render_translation(args.pdf, args.blocks, args.translations, args.out)


if __name__ == "__main__":
    main()
