# Modul 165 - Leistungsbeurteilung LB2 - Projektdokumentation
**Projekt:** muduo - Context-based Dating App
**Eingereicht von:** Rafael Palomares & Benjamin ten Busch
**Abgabedatum:** 29. März 2026

---

## 2. NoSQL-Datenbank

### 2.1 Projektidee und Begründung NoSQL-Datenbank
`muduo` ist eine Dating-Plattform, die Menschen nicht nach oberflächlichen Kriterien, sondern über gemeinsamen **Kontext** verbindet. Unser Slogan: "Matches through Context, not just Swipes". Benutzer verknüpfen ihr Profil mit Interessen, Orten, Events und bekannten Persönlichkeiten. 

**Warum Neo4j (Graph)?**
Dating ist ein hochgradig vernetztes Problem. Die Kernfrage lautet: "Wer ist über welche Ecken mit wem verbunden?". In einer klassischen SQL-Datenbank wären hierfür komplexe und rechenintensive JOIN-Operationen über viele Tabellen nötig. Neo4j erlaubt es uns, diese Beziehungen (Nodes & Edges) nativ abzubilden. Das Traversieren des Graphen für ein Match-Scoring ist in Neo4j wesentlich effizienter und fachlich intuitiver.

### 2.2 Konzeptionelles Datenmodell
Unser Modell besteht aus folgenden Knoten und Beziehungen:
- **Knoten:** `User`, `FamousPerson`, `Event`, `Place`, `Interest`.
- **Beziehungen:** 
  - `(:User)-[:LIKES]->(:FamousPerson)`
  - `(:User)-[:VISITED]->(:Place)`
  - `(:User)-[:ATTENDED]->(:Event)`
  - `(:User)-[:INTERESTED_IN]->(:Interest)`

### 2.3 Logisches Datenmodell
Jeder Knoten hat spezifische Properties:
- **User:** `id`, `email`, `name`, `bio`, `age`, `location`, `gender`, `prefGender`, `occupation`, `education`, `role` (admin/user), `shardId`.
- **Kontext-Knoten (Place, Event, etc.):** `key` (normalisierter Identifikator), `name` (Anzeigename).

### 2.4 Attribute der Hauptentitätsmenge
Die Entität `User` besitzt über 15 Attribute, womit die Anforderung (>= 8) klar erfüllt ist. Wir unterscheiden dabei zwischen **Pflichtfeldern** (Email, Name, Alter, Geschlecht) und **variablen/optionalen Feldern** (Bio, Beruf, Bildungsweg, Location), um der Flexibilität eines NoSQL-Systems gerecht zu werden.

### 2.5 Physisches Datenmodell & Einfügen von Daten
Daten werden über das Backend mittels des `neo4j-driver` eingefügt. 
- **REST-API:** Über Endpunkte wie `/register` oder `/like-person`.
- **Seeding:** Beim Systemstart werden automatisch über 1200 Demo-User plus ein Admin erzeugt, um eine realistische Testumgebung zu garantieren.
- **Cypher:** Wir nutzen `MERGE`-Befehle, um Knoten-Duplikate zu verhindern und Idempotenz sicherzustellen.

### 2.6 Ändern und Löschen von Daten
Alle Entitätsmengen können über das Frontend verwaltet werden:
- **Ändern:** Profil-Updates via `PUT /profile`.
- **Löschen:** Löschen des gesamten Accounts via `DELETE /me` (inkl. aller Beziehungen) oder Entfernen einzelner "Likes" über spezifische Endpunkte. 

---

## 3. Datenbankoperationen und -architektur

### 3.1 & 3.2 Zugriffsberechtigungen (Benutzer & Rollen)
Der Zugriff auf die Datenbank ist strikt reglementiert:
- **Applikations-Zugriff:** Erfolgt über einen technischen Service-Account mit sicherem Passwort (`NEO4J_PASSWORD`).
- **Endbenutzer-Autorisierung:** Erfolgt über JSON Web Tokens (JWT). Ein User kann niemals direkt auf die DB zugreifen, sondern nur über fachlich validierte API-Routen.
- **Rollen:** Wir unterscheiden auf App-Ebene zwischen `user` (eigener Daten-Zugriff) und `admin` (Zugriff auf das Shard-übergreifende Analyse-Dashboard).

### 3.3 & 3.4 Backup und Restore
- **Backup Cloud:** Da die Produktion auf **Neo4j Aura** läuft, werden tägliche Backups automatisch erstellt und 30 Tage lang verschlüsselt in der Cloud gespeichert.
- **Backup Lokal:** Für lokale Entwicklungs-Shards existiert das Skript `scripts/backup-neo4j.sh`, welches Dumps erstellt.
- **Restore:** Über `scripts/restore-neo4j.sh` können Backups eingespielt werden. Beide Skripte führen vorab eine Authentifizierungsprüfung via `cypher-shell` durch.

### 3.5 & 3.6 Horizontale Skalierung
`muduo` implementiert **Application-Level Sharding**:
1. Die Daten werden auf 3 separate Neo4j-Instanzen verteilt.
2. Das Backend berechnet via Hashing (basierend auf der User-ID), auf welchem Shard ein Benutzer gespeichert wird.
3. Matching-Abfragen und globale Suchen werden vom Backend als "Scatter-Gather" über alle drei Knoten aggregiert.
Dies simuliert eine echte horizontale Skalierbarkeit für hohe Schreiblasten.

---

## 4. Applikation

### 4.1 - 4.3 Datenhandling und GUI
- **GUI:** Ein modernes, responsives Interface (Next.js), das Match-Erklärungen fachlich begründet ("Ihr beide mögt Taylor Swift...").
- **Dynamik:** Die Anwendung reagiert sofort auf Änderungen im Graphen. Neue Beziehungen fließen direkt in das Match-Scoring ein.
- **Ergonomie:** Klare Trennung von Profilverwaltung, Discovery-Modus und Admin-Statistiken.

### 4.5 Technologie-Stack
- **Frontend:** Next.js (React), TypeScript, Tailwind CSS.
- **Backend:** Node.js, Express, TypeScript, serverless-http (für Cloud-Deployment ready).
- **Datenbank:** Neo4j (Aura Cloud & Local Docker).

---

## 5. Weitere Kompetenzen (Zusatzpunkte)

### 5.1 Indizes
Wir setzen **Unique Constraints** auf `User(email)` und `User(id)`, um Integrität zu wahren. Zusätzlich nutzen wir **Fulltext-Indizes** auf Namen von Orten, Events und Personen, um die Suchvorschläge im Profil-Editor performant zu gestalten (O(log N) statt O(N)).

### 5.2 Transaktionen
Operationen wie das Verknüpfen eines Users mit einem Event werden in **exklusiven Write-Transactions** gekapselt. Ein Beispiel ist das Seeding oder das Hinzufügen von Kontexten: Schlägt das Erstellen der Kante fehl, wird auch der `MERGE` des Knotens zurückgerollt, um Inkonsistenzen zu vermeiden.

### 5.3 Größere Datenmengen
Die Applikation wird standardmäßig mit **1201 Datensätzen** (1200 User + 1 Admin) geseeded. Dies beweist die Performance unserer Sharding-Architektur und der Matching-Queries bei realistischer Last.

### 5.4 Deployment
- **Frontend:** Netlify (Continuous Deployment via GitHub).
- **Backend:** Render (Web Service).
- **Datenbank:** Neo4j Aura (Managed Cloud).
- **Alternative:** Vollständige Kubernetes-Manifeste (`/kubernetes`) vorhanden.

---

## 6. Arbeitsjournal und Reflexion
*(Die individuellen Journale von Rafael Palomares und Benjamin ten Busch wurden beibehalten und reflektieren den Fortschritt von der initialen Graph-Modellierung bis hin zum finalen Cloud-Deployment und den Sharding-Herausforderungen.)*
