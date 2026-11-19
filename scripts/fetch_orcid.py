#!/usr/bin/env python3
"""Holt die Publikationsliste aus ORCID und ergänzt Autoren/Journal über Crossref.

Läuft automatisch beim Veröffentlichen der Website (GitHub Actions) und schreibt
data/publications_orcid.json. Schlägt der Abruf fehl, bleibt die zuletzt
gespeicherte Liste unverändert – die Website wird trotzdem gebaut.

Nur Python-Standardbibliothek, keine Installation nötig.
"""
import datetime
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE_FILE = os.path.join(ROOT, "data", "site.yml")
OUT_FILE = os.path.join(ROOT, "data", "publications_orcid.json")

# Welche ORCID-Werktypen auf der Website erscheinen
INCLUDE_TYPES = {"journal-article", "book-chapter", "book", "conference-paper", "review", "patent"}
# Preprints nur, wenn sie aus diesem oder dem Vorjahr stammen (ältere sind meist längst publiziert)
# und kein publizierter Eintrag mit gleichem Titel existiert. Auf der Website als „preprint“ markiert.
PREPRINT_TYPES = {"preprint"}
PREPRINT_YEARS = 2
MAX_AUTHORS = 12
UA = "F4M-group-website/1.0 (https://github.com; mailto:{mail})"


def read_site_value(key):
    with open(SITE_FILE, encoding="utf-8") as f:
        for line in f:
            m = re.match(rf"^{key}:\s*[\"']?([^\"'\n#]*)", line)
            if m:
                return m.group(1).strip()
    return ""


def get_json(url, mail, timeout=30, attempts=5):
    req = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": UA.format(mail=mail)})
    for i in range(attempts):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            # 429 = zu viele Anfragen, 5xx = Server kurz überlastet -> warten und erneut versuchen
            if e.code != 429 and e.code < 500 or i == attempts - 1:
                raise
            wait = e.headers.get("Retry-After")
            time.sleep(float(wait) if wait and wait.isdigit() else 2 * (i + 1))


def val(d, *path):
    for p in path:
        if not isinstance(d, dict):
            return None
        d = d.get(p)
    return d


def parse_orcid(data):
    min_preprint_year = datetime.date.today().year - (PREPRINT_YEARS - 1)
    works = []
    for group in data.get("group", []):
        summaries = group.get("work-summary") or []
        if not summaries:
            continue
        s = summaries[0]  # von ORCID bevorzugte Version
        wtype = s.get("type") or ""
        if wtype in PREPRINT_TYPES:
            y = val(s, "publication-date", "year", "value")
            if not (y and str(y).isdigit() and int(y) >= min_preprint_year):
                continue
        elif wtype not in INCLUDE_TYPES:
            continue
        doi = ""
        for eid in val(s, "external-ids", "external-id") or []:
            if (eid.get("external-id-type") or "").lower() == "doi":
                doi = (eid.get("external-id-value") or "").strip()
                doi = re.sub(r"^(https?://(dx\.)?doi\.org/|doi:)", "", doi, flags=re.I)
                break
        year = val(s, "publication-date", "year", "value")
        works.append({
            "title": (val(s, "title", "title", "value") or "").strip(),
            "journal": (val(s, "journal-title", "value") or "").strip(),
            "year": int(year) if year and str(year).isdigit() else None,
            "doi": doi,
            "url": val(s, "url", "value") or "",
            "type": wtype,
            "authors": "",
        })
    return works


def format_authors(authors):
    names = []
    for a in authors:
        family = (a.get("family") or a.get("name") or "").strip()
        given = (a.get("given") or "").strip()
        initials = "".join(part[0] + "." for part in re.split(r"[\s\-]+", given) if part)
        names.append(f"{family} {initials}".strip())
    if len(names) > MAX_AUTHORS:
        names = names[:MAX_AUTHORS] + ["et al."]
    return ", ".join(n for n in names if n)


def enrich(work, mail):
    if not work["doi"]:
        return work
    try:
        msg = get_json("https://api.crossref.org/works/" + urllib.parse.quote(work["doi"]), mail)["message"]
        work["authors"] = format_authors(msg.get("author") or [])
        if not work["journal"] and msg.get("container-title"):
            work["journal"] = msg["container-title"][0]
        if not work["journal"] and msg.get("institution"):  # Preprint-Server, z. B. bioRxiv
            work["journal"] = (msg["institution"][0].get("name") or "").strip()
        if not work["title"] and msg.get("title"):
            work["title"] = msg["title"][0]
        if not work["year"]:
            parts = val(msg, "issued", "date-parts") or [[None]]
            work["year"] = parts[0][0]
    except Exception as e:  # Crossref nicht erreichbar -> Eintrag ohne Autoren behalten
        print(f"  Crossref-Abruf fehlgeschlagen für {work['doi']}: {e}", file=sys.stderr)
    return work


def norm_title(t):
    return re.sub(r"\W+", "", re.sub(r"<[^>]+>", "", t or "").lower())


def dedupe(works):
    published = {norm_title(w["title"]) for w in works if w["type"] not in PREPRINT_TYPES}
    works = [w for w in works if w["type"] not in PREPRINT_TYPES or norm_title(w["title"]) not in published]
    seen, out = set(), []
    for w in works:
        key = w["doi"].lower() if w["doi"] else re.sub(r"\W+", "", w["title"].lower())
        if key and key not in seen:
            seen.add(key)
            out.append(w)
    return out


def main():
    orcid = read_site_value("orcid")
    mail = read_site_value("email") or "website@example.org"
    if not re.fullmatch(r"\d{4}-\d{4}-\d{4}-\d{3}[\dX]", orcid):
        print("Keine gültige ORCID-iD in data/site.yml – überspringe.")
        return 0
    source = os.environ.get("ORCID_TEST_FILE")
    if source:
        with open(source, encoding="utf-8") as f:
            data = json.load(f)
    else:
        data = get_json(f"https://pub.orcid.org/v3.0/{orcid}/works", mail)
    works = dedupe(parse_orcid(data))
    if not os.environ.get("SKIP_CROSSREF"):
        with ThreadPoolExecutor(max_workers=2) as ex:  # Crossref drosselt bei vielen parallelen Anfragen
            works = list(ex.map(lambda w: enrich(w, mail), works))
    works = [w for w in works if w["title"]]
    works.sort(key=lambda w: (-(w["year"] or 0), w["title"].lower()))
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(works, f, ensure_ascii=False, indent=1)
    print(f"{len(works)} Publikationen aus ORCID {orcid} gespeichert.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:
        print(f"ORCID-Abruf fehlgeschlagen ({e}) – die gespeicherte Liste wird verwendet.", file=sys.stderr)
        sys.exit(0)
