"""Turns PDF files into text and page images for models that cannot read PDFs."""

from __future__ import annotations

from io import BytesIO

import pypdfium2 as pdfium

MIME_TYPE = "application/pdf"
PAGE_SCALE = 2  # 144 dpi, enough to read receipt print
IMAGE_FORMAT = "PNG"


# Text pages go in as text, scanned pages as images
def read(data: bytes) -> tuple[list[str], list[bytes]]:
    texts = []
    images = []
    for page in pdfium.PdfDocument(data):
        text = page.get_textpage().get_text_range().strip()
        if text:
            texts.append(text)
        else:
            images.append(render(page))
    return texts, images


def render(page: pdfium.PdfPage) -> bytes:
    buffer = BytesIO()
    page.render(scale=PAGE_SCALE).to_pil().save(buffer, format=IMAGE_FORMAT)
    return buffer.getvalue()
