# Modul 165 - Leistungsbeurteilung LB2 - Dokumentation
**Projekt:** muduo - Context-based Dating App
**Eingereicht von:** Rafael Palomares & Benjamin ten Busch

---

## 2. NoSQL-Datenbank

### 2.4 Attribute der Hauptentitätsmenge (User)

Die Hauptentität `User` besitzt sowohl obligatorische (Pflichtfelder) als auch optionale/variable Attribute.

**Obligatorische Attribute (Pflichtfelder):**
- `id`: Eindeutiger technischer Identifikator.
- `email`: Eindeutiger fachlicher Identifikator für den Login.
- `passwordHash`: Gesichertes Passwort für die Authentifizierung.
- `name`: Anzeigename des Benutzers.
- `age`: Alter für das Matching-Profil.
- `gender`: Eigenes Geschlecht.
- `prefGender`: Präferenz für Matches.
- `role`: Berechtigungsstufe (`user` oder `admin`).
- `shardId`: Zuweisung zum entsprechenden Datenbank-Shard.

**Variable / Optionale Attribute:**
- `bio`: Freitext-Beschreibung (kann leer sein).
- `location`: Aktueller Aufenthaltsort (optionaler String).
- `occupation`: Beruf oder Tätigkeit (optional).
- `education`: Bildungsstand (optional).
- `seeded`: Kennzeichnung für Demo-Daten.
- `createdAt` / `updatedAt`: Zeitstempel für Auditing.

---

## 3. Datenbankoperationen und -architektur

### 3.1 & 3.2 Zugriffsberechtigungen: Technisches Konzept

Der Zugriff auf die Datenbank erfolgt auf zwei Ebenen:

1. **Applikationsebene (Technischer Benutzer):**
   Das Backend verbindet sich über einen **technischen Service-Account** (`NEO4J_USER`) mit der Datenbank. Endbenutzer haben **keinen direkten Zugriff** auf den Graph-Server. Alle Abfragen werden durch die Applikationslogik gefiltert und autorisiert.
   
2. **Rollen-Konzept (RBAC):**
   Innerhalb der Applikation wird zwischen Rollen unterschieden:
   - **`user`**: Darf nur den eigenen Knoten und eigene Beziehungen (`:LIKES`, `:VISITED` etc.) modifizieren.
   - **`admin`**: Hat Zugriff auf aggregierte Statistiken über alle Shards hinweg.
   - **`ReadOnlyUser` (Konzeptuell)**: Für Monitoring oder Support-Tools kann ein Datenbank-User mit reinem `READ`-Recht angelegt werden, um Analysen ohne Risiko für die Datenintegrität durchzuführen.

### 3.3 Backup-Konzept

Da wir auf **Neo4j Aura (Cloud)** migriert sind, nutzen wir ein professionelles Backup-Management:

- **Frequenz**: Die Datenbank wird automatisch **täglich** gesichert.
- **Speicherung**: Backups werden für **30 Tage** redundant in der Cloud vorgehalten (AES-256 verschlüsselt).
- **Strategie bei großen Datenmengen**: Aura nutzt inkrementelle Snapshots. Bei einem Restore kann ein direkter Cloud-Export genutzt werden, um Daten ohne Last auf dem Live-System wiederherzustellen.
- **Notfall-Plan**: Zusätzlich können jederzeit manuelle Dumps über das Skript `scripts/backup-neo4j.sh` erstellt und lokal gesichert werden.

### 3.5 & 3.6 Horizontale Skalierung: Konzept und Realisierung

Unser Konzept basiert auf **Application-Level Sharding**. 

- **Warum?** In Neo4j Community Edition gibt es kein natives Auto-Sharding (wie z.B. Fabric in Enterprise).
- **Konzept**: Das Backend berechnet anhand der User-ID deterministisch (Hashing), auf welcher Instanz die Daten liegen.
- **Vorteil**: Die Last wird gleichmäßig über beliebig viele Instanzen verteilt. Das Backend aggregiert Suchanfragen über alle Knoten ("Scatter-Gather"), um ein konsistentes Gesamtbild zu liefern.

---

## 4. Applikation

### 4.5 Technologie und Aufbau (Strukturiert)

Die Applikation ist als moderner Full-Stack Service aufgebaut:

*   **Frontend (Netlify):** 
    *   Next.js 14 (React Framework)
    *   TypeScript für Typsicherheit
    *   Tailwind CSS für das Design
*   **Backend (Render):**
    *   Node.js mit Express
    *   `neo4j-driver` für die DB-Kommunikation
    *   `jsonwebtoken` (JWT) für die Sicherheit
*   **Infrastruktur:**
    *   Neo4j Aura (Managed Cloud Database)
    *   Docker / Docker Compose für die lokale Entwicklung

---

## 5. Weitere Kompetenzen

### 5.1 Indizes: Konzept und Sinn

Indizes dienen als **Einstiegspunkte** in den Graph.

- **Sinn**: Ohne Index müsste Neo4j bei einer Suche nach einer E-Mail-Adresse jeden einzelnen Knoten prüfen (O(N)). Mit einem Index erfolgt der Zugriff in O(1) oder O(log N).
- **Konzept**: Wir setzen Indizes auf `id` und `email`. Sobald der Startknoten gefunden wurde, navigiert Neo4j performant über die Beziehungen (Pointers). Der Index wird nur für den ersten Schritt benötigt.
- **Uniqueness**: Constraints auf IDs verhindern Dubletten und sichern die Datenintegrität.

### 5.2 Transaktionen in der Applikation

Echte Transaktionen stellen sicher, dass zusammenhängende Operationen entweder ganz oder gar nicht ausgeführt werden (Atomarität).

**Beispiel aus muduo:**
Beim Hinzufügen eines Likes (`:LIKES`) wird eine **Write-Transaction** genutzt. Wir prüfen, ob der Kontext-Knoten (z.B. Taylor Swift) existiert (MERGE) und erstellen gleichzeitig die Beziehung. Würde die Erstellung der Beziehung fehlschlagen, wird auch der Knoten-Merge zurückgerollt, um "verwaiste" Daten zu verhindern.
```typescript
await session.executeWrite(async (tx) => {
  await tx.run("MERGE (p:Place {key: $key}) ...", { key });
  await tx.run("MATCH (u:User {id: $uid}), (p:Place {key: $key}) MERGE (u)-[:VISITED]->(p)", { uid, key });
});
```
