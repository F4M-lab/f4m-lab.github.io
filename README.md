# Website der Arbeitsgruppe F4M – Anleitung

Diese Website wird mit **Hugo** gebaut, kostenlos auf **GitHub Pages** veröffentlicht
und über **Pages CMS** (Eingabemaske im Browser) gepflegt. Programmierkenntnisse sind
für die laufende Pflege nicht nötig.

## So hängt alles zusammen

```
Pages CMS (Formulare)  →  speichert in  →  GitHub (Dateien)  →  baut automatisch  →  Website (online)
```

Nach jedem Speichern in Pages CMS ist die Änderung nach ca. 1–2 Minuten online.

## Einmalige Einrichtung

1. **GitHub-Konto anlegen:** https://github.com/signup
2. **Organisation anlegen (empfohlen, kostenlos):** Oben rechts auf das Profilbild →
   *Your organizations* → *New organization* → *Free*. Name z. B. `f4m-lab`.
   Vorteil: Die Adresse lautet dann `f4m-lab.github.io` statt eures persönlichen Benutzernamens,
   und weitere Gruppenmitglieder lassen sich einfach hinzufügen.
3. **Repository anlegen:** In der Organisation → *New repository*. Als Namen
   **genau** `f4m-lab.github.io` eintragen (also Organisationsname + `.github.io`),
   *Public* wählen, sonst nichts ankreuzen.
4. **Dateien hochladen:** Mit *GitHub Desktop* den Ordner `40_operations/group-website` als
   eigenes Repository hochladen (selbst; aus dem CODEX-Arbeitsbereich wird nichts gepusht). Achtung: Beim Hochladen per Drag-and-drop im
   Browser werden die versteckten Dateien `.pages.yml` und `.github/` oft nicht mitkopiert –
   die sind aber nötig.
5. **Veröffentlichung einschalten:** Im Repository → *Settings* → *Pages* →
   bei *Source* **GitHub Actions** wählen.
6. **Warten:** Unter *Actions* erscheint „Website veröffentlichen“. Wenn der Haken grün ist,
   ist die Seite unter `https://f4m-lab.github.io` online.
7. **Eingabemaske verbinden:** https://pagescms.org → *Sign in with GitHub* → Zugriff auf das
   Repository erlauben → Repository öffnen. Links erscheinen die Bereiche
   *Mitarbeiter, News, Projekte, Forschungsbereiche, Publikationen, Einstellungen & Startseite,
   Seitentexte*.

## Laufende Pflege

| Aufgabe | In Pages CMS |
|---|---|
| Neue Person | *Mitarbeiter* → *Add an entry* → Name, Gruppe, Foto, Kontakt, Forschungsbereiche → *Save* |
| Person verlässt die Gruppe | Gruppe auf **Alumni** stellen (oder Eintrag löschen) |
| News | *News* → *Add an entry* → Titel, Datum, Text; optional Personen und Forschungsbereiche verknüpfen |
| Publikationen | **Automatisch:** Jeden Montag wird die Liste aus ORCID (iD in *Einstellungen*) übernommen, Autor*innen kommen von Crossref. Neue Papers also einfach in ORCID eintragen (oder ORCID mit Crossref verknüpfen). Sofort aktualisieren: im Repository *Actions* → „Website veröffentlichen“ → *Run workflow*. |
| Zusätzliche Publikation | *Publikationen* → *Add an entry* (z. B. Beiträge, die nicht in ORCID stehen, oder um einen ORCID-Eintrag einem Forschungsbereich zuzuordnen – gleiche DOI eintragen, dann erscheint er nur einmal) |
| Projekt anlegen oder ändern | *Projekte* → Fördergeber immer mit Link angeben |
| Texte der Startseite, Kontakt, Impressum, Datenschutz | *Einstellungen & Startseite* |
| Überschrift und Einleitung der Seiten Research, Projects, Team, News, Publications | *Seitentexte* |
| Masterarbeiten | Gruppe **Master student**, Feld *Thema* leer lassen (Themen von Masterarbeiten stehen nicht auf der Website) |

**Verknüpfungen entstehen automatisch:** Wer einem Forschungsbereich zugeordnet ist, erscheint
auf dessen Seite; eine News mit verknüpften Personen erscheint auch auf deren Profilen.

**Profilbilder:** quadratisch, mind. 600 × 600 Pixel, als JPG. Ohne Foto werden die Initialen angezeigt.

## Vor dem Live-Gang prüfen

- [ ] Beispiel-Einträge („Firstname Lastname“, „Example …“) ersetzen oder löschen
- [ ] Texte der Forschungsbereiche prüfen und anpassen
- [ ] Adresse, E-Mail und Impressum in *Einstellungen & Startseite* kontrollieren
- [ ] Datenschutztext (Seite *Legal notice and privacy*) mit den BOKU-Vorgaben abgleichen
- [ ] Einverständnis der Mitarbeitenden für Fotos und Kontaktdaten einholen

## Eigene Domain (optional, später)

Domain kaufen (z. B. `.at`, ca. 12–15 €/Jahr), dann im Repository unter
*Settings → Pages → Custom domain* eintragen und beim Domain-Anbieter die DNS-Einträge
setzen, die GitHub dort anzeigt.

## Technisches

- Lokale Vorschau: `hugo server` (Hugo ≥ 0.160)
- Design: `assets/site.css`; Seitenvorlagen: `layouts/`
- Schriften (Archivo, Literata, SIL Open Font License) liegen in `static/fonts` und werden
  nicht von Google geladen – keine Datenübertragung an Dritte.
- Die Website verwendet keine Cookies und kein Tracking.
- ORCID-Abruf: `scripts/fetch_orcid.py`, Ergebnis in `data/publications_orcid.json`. Ist ORCID nicht
  erreichbar, wird die zuletzt gespeicherte Liste verwendet.
- Hinweis: GitHub pausiert zeitgesteuerte Abläufe nach 60 Tagen ohne Änderungen im Repository.
  Jede Bearbeitung in Pages CMS zählt als Änderung.
