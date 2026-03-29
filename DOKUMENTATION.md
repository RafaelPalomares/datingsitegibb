# Modul 165 - Leistungsbeurteilung LB2 - Projektdokumentation

**Modul:** IET-165 - Projektarbeit  
**Projekt:** muduo - Context-based Dating App  
**Eingereicht von:** Inf2024L - Rafael Palomares & Benjamin ten Busch  
**Eingereicht bei:** Remo Albertani  
**Datum:** 29. März 2026

---

## 1. Einleitung und Management Summary

`muduo` ist eine innovative Full-Stack-Applikation, die das traditionelle Dating-Konzept revolutioniert. Statt auf rein visueller Selektion basiert das Matching bei `muduo` auf gemeinsamen Interessen, besuchten Orten, Events und kulturellen Vorlieben. Technisch wird dies durch eine hochskalierbare Graphen-Datenbank (Neo4j) und eine moderne Cloud-Infrastruktur realisiert.

---

## 2. NoSQL-Datenbank

### 2.1 Projektidee und Begründung NoSQL-Datenbank
Die Wahl von Neo4j als NoSQL-Datenbank begründet sich in der fachlichen Domäne: Dating ist ein Problem der Vernetzung. In einer relationalen Datenbank müssten komplexe "N:M"-Beziehungen über zahlreiche Zwischentabellen und rechenintensive JOINs abgebildet werden. Ein Graphmodell erlaubt es uns, Benutzer und ihre Kontexte als Knoten zu betrachten, die über gewichtete Kanten direkt miteinander verbunden sind. Dies ermöglicht performante und fachlich nachvollziehbare Match-Algorithmen (Traversierung statt Tabellen-Scans).

### 2.2 Konzeptionelles Datenmodell
Das konzeptionelle Modell besteht aus fünf Hauptentitäten:
- **User:** Die zentrale Personeneinheit.
- **FamousPerson, Event, Place, Interest:** Die vier Kontext-Kategorien.
Jeder User kann beliebig viele Beziehungen zu diesen Kontexten aufbauen (z.B. `LIKES`, `VISITED`, `ATTENDED`).

### 2.3 Logisches Datenmodell
Auf logischer Ebene haben wir uns für ein flexibles Schema-on-Read-Modell entschieden. 
- **User-Knoten** speichern neben Stammdaten (Name, Alter, Bio) auch technische Metadaten wie die `shardId` für die horizontale Skalierung. 
- **Kontext-Knoten** sind normalisiert über einen eindeutigen `key` (z.B. `taylor-swift`), um Redundanz zu vermeiden und effiziente Suchen zu ermöglichen.

### 2.4 Attribute der Hauptentitätsmenge
Die Entität `User` besitzt eine umfassende Menge an Attributen:
*   **Fachlich:** Name, Bio, Alter, Location, Gender, Preferred Gender, Occupation, Education.
*   **Technisch:** ID, Email, PasswordHash, Role, ShardId, CreatedAt, UpdatedAt.
Dies übersteigt die geforderten 8 Attribute deutlich und erlaubt ein differenziertes Matching.

### 2.5 Physisches Datenmodell & Einfügen von Daten
Die Datenhaltung erfolgt in drei Shards. Beim **Startup-Seeding** werden über 1200 realistische Datensätze erzeugt. Wir nutzen Cypher-Operationen mit `UNWIND` und `MERGE`, um Massen-Einfügevorgänge atomar und effizient zu gestalten.

### 2.6 Ändern und Löschen von Daten
Die Applikation implementiert vollständige CRUD-Funktionalität. Benutzer können ihr Profil aktualisieren (`PUT`), Kontextbeziehungen dynamisch hinzufügen oder entfernen und ihren gesamten Account unwiderruflich löschen (`DELETE`), wobei alle zugehörigen Kanten im Graphen sauber entfernt werden.

### 2.7 Variable Attribute
Ein zentraler Vorteil von NoSQL ist hier sichtbar: Nicht jeder Benutzer muss alle Felder ausfüllen. Während Stammdaten validiert werden, können biografische oder berufliche Informationen variabel gestaltet sein, ohne das Schema der gesamten Datenbank anpassen zu müssen.

### 2.8 Anzeigen von Daten & Aggregation
Die Anzeige reicht vom einfachen Profil-View bis hin zu komplexen Aggregationen. Der **Match-Score** berechnet sich durch Gewichtung gemeinsamer Kanten über alle Kontext-Kategorien hinweg. Im Admin-Dashboard werden zudem Shard-übergreifende Statistiken (z.B. User-Verteilung pro Node) aggregiert dargestellt.

---

## 3. Datenbankoperationen und -architektur

### 3.1 & 3.2 Zugriffsberechtigungen
- **Technischer Zugriff:** Das Backend agiert als autorisierter Proxy via Service-Account.
- **Rollen:** Anwendungsspezifische Rollen (`user` und `admin`) schützen die Endpunkte. Ein Admin-Token erlaubt den Zugriff auf Shard-Analytics, während User-Token auf die eigenen Schattendaten begrenzt sind.

### 3.3 & 3.4 Backup und Restore
Wir nutzen eine hybride Strategie:
*   **Cloud (Produktion):** Täglich automatisierte, verschlüsselte Snapshots auf Neo4j Aura mit 30-tägiger Vorhaltung.
*   **Lokal (Entwicklung):** Shell-Skripte (`backup-neo4j.sh`) erzeugen Offline-Dumps, die via `restore-neo4j.sh` mit Authentifizierungsprüfung wiederhergestellt werden können.

### 3.5 & 3.6 Horizontale Skalierung
Unsere Architektur implementiert **Application-Level Sharding**. Über eine Hashing-Logik im Backend werden die User-Daten gleichmäßig auf drei Neo4j-Nodes verteilt. Dies ermöglicht eine lineare Skalierbarkeit der Schreiblast und erhöht die Ausfallsicherheit der Gesamtanlage.

---

## 4. Applikation

### 4.5 Technologie-Stack
- **Frontend:** Next.js (React), TypeScript, Tailwind CSS.
- **Backend:** Node.js, Express, TypeScript.
- **Datenbank:** Neo4j (Aura Cloud & Local Docker Environment).
Die Architektur ist streng in Layer (Routes, Services, Data Access) getrennt.

---

## 5. Weitere Kompetenzen (Zusatzpunkte)

### 5.1 Indizes
Indices auf `email` und `id` (Unique Constraints) garantieren Integrität. Fulltext-Indizes auf den Kontext-Namen ermöglichen blitzschnelle Suchvorschläge während der Profileingabe.

### 5.2 Transaktionen
Wir nutzen explizite **Write-Transactions** (`executeWrite`), um komplexe Graph-Updates (z.B. Profiländerung + Beziehungs-Update) atomar auszuführen.

### 5.3 Größere Datenmengen
Die Applikation generiert standardmäßig **1201 aktive Datensätze**, was die Stabilität der Architektur unter Last demonstriert.

---

## 6. Arbeitsjournal und Reflexion

### 6.1 Journal Rafael Palomares
- Fokus auf Architektur-Design, Graph-Modellierung und Frontend-Entwicklung.
- Erkenntnis: Die Balance zwischen technischer Komplexität (Sharding) und User-Erfahrung (Match-Erklärung) war die größte Herausforderung.

### 6.2 Journal Benjamin ten Busch
- Fokus auf Infrastruktur-Automatisierung (Docker/K8s), Backup-Logik und Shard-Aggregation.
- Erkenntnis: Eine saubere Trennung von Stateful- und Stateless-Komponenten ist die Basis für jedes Cloud-native Projekt.
