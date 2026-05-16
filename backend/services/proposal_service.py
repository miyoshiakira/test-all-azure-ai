"""企画書PDF生成サービス"""
import io
import os
import platform
import zipfile
from typing import List, Optional
from fpdf import FPDF
import httpx


# --- Japanese font resolution ---

FONT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "fonts")
FONT_CACHE = os.path.join(FONT_DIR, "ipaexg.ttf")

# IPAexGothic official download (zip containing ipaexg.ttf)
IPA_FONT_URL = "https://ipafont.ipa.go.jp/IPAexfont/IPAexfont00401.zip"

_font_path: Optional[str] = None


def _find_system_japanese_font() -> Optional[str]:
    """Try to find a Japanese-capable TTF font on the system (TTC not supported by fpdf2 add_font)."""
    system = platform.system()
    if system == "Windows":
        windir = os.environ.get("WINDIR", r"C:\Windows")
        # Only .ttf files work reliably with fpdf2 add_font
        for name in ["meiryo.ttf", "msgothic.ttf", "yugothic.ttf"]:
            path = os.path.join(windir, "Fonts", name)
            if os.path.exists(path):
                return path
    elif system == "Darwin":
        for path in [
            "/Library/Fonts/IPAexFont00401/ipaexg.ttf",
        ]:
            if os.path.exists(path):
                return path
    else:
        for path in [
            "/usr/share/fonts/truetype/ipaex/ipaexg.ttf",
            "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttf",
        ]:
            if os.path.exists(path):
                return path
    return None


def _download_ipaex_gothic() -> str:
    """Download IPAexGothic TTF and cache it locally. Tries multiple URLs."""
    os.makedirs(FONT_DIR, exist_ok=True)

    # Multiple fallback URLs for the font
    urls = [
        "https://ipafont.ipa.go.jp/IPAexfont/IPAexfont00401.zip",
        "https://moji.or.jp/wp-content/ipafont/IPAexfont/IPAexfont00401.zip",
    ]

    for url in urls:
        try:
            print(f"[INFO] Trying to download Japanese font from {url} ...")
            with httpx.Client(timeout=30.0, follow_redirects=True) as client:
                resp = client.get(url)
                resp.raise_for_status()
                with zipfile.ZipFile(io.BytesIO(resp.content)) as zf:
                    for name in zf.namelist():
                        if name.endswith("ipaexg.ttf"):
                            with zf.open(name) as src, open(FONT_CACHE, "wb") as dst:
                                dst.write(src.read())
                            print(f"[INFO] Japanese font cached at {FONT_CACHE}")
                            return FONT_CACHE
        except Exception as e:
            print(f"[WARN] Download from {url} failed: {e}")
            continue

    raise RuntimeError(
        "日本語フォントのダウンロードに失敗しました。"
        "手動でIPAexGothic(ipaexg.ttf)をダウンロードして "
        f"{FONT_DIR} に配置してください。"
        "ダウンロード: https://ipafont.ipa.go.jp/"
    )


def _ensure_japanese_font() -> str:
    """Ensure a Japanese-capable font is available and return its path."""
    global _font_path
    if _font_path:
        return _font_path

    # 1. Check cached download
    if os.path.exists(FONT_CACHE):
        _font_path = FONT_CACHE
        return _font_path

    # 2. Try system font
    sys_font = _find_system_japanese_font()
    if sys_font:
        _font_path = sys_font
        return _font_path

    # 3. Download
    _font_path = _download_ipaex_gothic()
    return _font_path


# --- PDF class ---

class ProposalPDF(FPDF):
    """企画書用PDFクラス（日本語フォント対応）"""

    def __init__(self):
        super().__init__()
        font_path = _ensure_japanese_font()
        self.add_font("jgothic", "", font_path)
        self.add_font("jgothic", "B", font_path)
        self.set_auto_page_break(auto=True, margin=20)

    def header(self):
        if self.page_no() > 1:
            self.set_font("jgothic", "", 8)
            self.set_text_color(150, 150, 150)
            self.cell(0, 10, "企画書", align="C")
            self.ln(5)
            self.set_draw_color(200, 200, 200)
            self.line(10, 15, 200, 15)
            self.ln(10)

    def footer(self):
        self.set_y(-15)
        self.set_font("jgothic", "", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f"Page {self.page_no()}", align="C")


class ProposalService:
    """企画書生成サービス"""

    @staticmethod
    def generate_pdf(proposal_text: str, title: str = "企画書") -> bytes:
        """企画書テキストからPDFを生成してバイナリで返す"""
        pdf = ProposalPDF()
        pdf.add_page()

        # Title
        pdf.set_font("jgothic", "B", 22)
        pdf.set_text_color(30, 30, 30)
        pdf.cell(0, 15, title, align="C", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(5)

        # Divider line
        pdf.set_draw_color(79, 110, 247)
        pdf.set_line_width(0.8)
        pdf.line(10, pdf.get_y(), 200, pdf.get_y())
        pdf.ln(10)

        # Body text - parse sections
        lines = proposal_text.strip().split("\n")
        for line in lines:
            stripped = line.strip()
            if not stripped:
                pdf.ln(4)
                continue

            # Section header detection (【...】or markdown headers)
            if stripped.startswith("【") and stripped.endswith("】"):
                pdf.set_font("jgothic", "B", 13)
                pdf.set_text_color(79, 110, 247)
                pdf.cell(0, 8, stripped, new_x="LMARGIN", new_y="NEXT")
                pdf.ln(2)
            elif stripped.startswith("# "):
                pdf.set_font("jgothic", "B", 16)
                pdf.set_text_color(30, 30, 30)
                pdf.cell(0, 10, stripped[2:], new_x="LMARGIN", new_y="NEXT")
                pdf.ln(3)
            elif stripped.startswith("## "):
                pdf.set_font("jgothic", "B", 13)
                pdf.set_text_color(79, 110, 247)
                pdf.cell(0, 8, stripped[3:], new_x="LMARGIN", new_y="NEXT")
                pdf.ln(2)
            elif stripped.startswith("### "):
                pdf.set_font("jgothic", "B", 11)
                pdf.set_text_color(60, 60, 60)
                pdf.cell(0, 7, stripped[4:], new_x="LMARGIN", new_y="NEXT")
                pdf.ln(1)
            elif stripped.startswith("- ") or stripped.startswith("* "):
                pdf.set_font("jgothic", "", 10)
                pdf.set_text_color(50, 50, 50)
                pdf.cell(8)
                pdf.cell(0, 6, f"\u2022 {stripped[2:]}", new_x="LMARGIN", new_y="NEXT")
            elif stripped[0].isdigit() and "." in stripped[:4]:
                # Numbered list
                pdf.set_font("jgothic", "", 10)
                pdf.set_text_color(50, 50, 50)
                pdf.cell(8)
                pdf.cell(0, 6, stripped, new_x="LMARGIN", new_y="NEXT")
            elif stripped.startswith("---") or stripped.startswith("==="):
                pdf.set_draw_color(200, 200, 200)
                pdf.set_line_width(0.3)
                pdf.line(10, pdf.get_y(), 200, pdf.get_y())
                pdf.ln(3)
            else:
                pdf.set_font("jgothic", "", 10)
                pdf.set_text_color(50, 50, 50)
                pdf.multi_cell(0, 6, stripped)

        # Output to bytes
        buffer = io.BytesIO()
        pdf.output(buffer)
        return buffer.getvalue()
