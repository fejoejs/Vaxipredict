from __future__ import annotations

import csv
import io
import os
import uuid

from openpyxl import Workbook
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

from app.core.config import settings

REPORTS_DIR = os.path.join(settings.UPLOAD_DIR, "reports")
os.makedirs(REPORTS_DIR, exist_ok=True)


def _rows_to_dicts(rows: list[dict]) -> list[dict]:
    return rows or []


def build_csv(rows: list[dict], title: str) -> str:
    filename = f"{title}-{uuid.uuid4().hex[:8]}.csv"
    path = os.path.join(REPORTS_DIR, filename)
    rows = _rows_to_dicts(rows)
    with open(path, "w", newline="") as f:
        if rows:
            writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)
        else:
            f.write("")
    return path


def build_excel(rows: list[dict], title: str) -> str:
    filename = f"{title}-{uuid.uuid4().hex[:8]}.xlsx"
    path = os.path.join(REPORTS_DIR, filename)
    wb = Workbook()
    ws = wb.active
    ws.title = title[:31] or "Report"
    rows = _rows_to_dicts(rows)
    if rows:
        headers = list(rows[0].keys())
        ws.append(headers)
        for row in rows:
            ws.append([row.get(h, "") for h in headers])
    wb.save(path)
    return path


def build_pdf(rows: list[dict], title: str) -> str:
    filename = f"{title}-{uuid.uuid4().hex[:8]}.pdf"
    path = os.path.join(REPORTS_DIR, filename)
    rows = _rows_to_dicts(rows)

    doc = SimpleDocTemplate(path, pagesize=A4)
    styles = getSampleStyleSheet()
    elements = [Paragraph(title.replace("_", " ").title(), styles["Title"]), Spacer(1, 12)]

    if rows:
        headers = list(rows[0].keys())
        table_data = [headers] + [[str(row.get(h, "")) for h in headers] for row in rows]
        table = Table(table_data, repeatRows=1)
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0F766E")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F1F5F4")]),
                ]
            )
        )
        elements.append(table)
    else:
        elements.append(Paragraph("No data available for this report.", styles["Normal"]))

    doc.build(elements)
    return path
