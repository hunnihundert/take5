# Planning Poker Web-Anwendung

Eine moderne, Echtzeit Planning Poker Anwendung für agile Teams, gebaut mit React, TypeScript, Node.js und Socket.io.

## Neueste Verbesserungen

✅ **Jira Integration** - Stories direkt aus Jira importieren und Story Points zurück synchronisieren<br>
✅ **Story-Management** - Stories zur Abstimmung hinzufügen, auswählen und verwalten<br>
✅ **JQL-Import** - Mehrere Stories auf einmal via JQL-Abfragen importieren<br>
✅ **Emoji werfen** - Rechtsklick auf Spieler um lustige Emojis zu werfen mit Bogen-Animation<br>
✅ **Spieler-Avatare** - Eigenes Profilbild hochladen mit Zuschneidefunktion<br>
✅ **Poker-Tisch Ansicht** - Spieler werden um einen virtuellen Pokertisch angeordnet<br>
✅ **Kompaktes Kartendeck** - Reduziert auf 1, 2, 3, 5, 8, 13 für schnellere Entscheidungen<br>
✅ **Dezente Kartenauswahl** - Gewählte Karte mit sanftem blauen Hintergrund<br>
✅ **Persistente Hervorhebung** - Ausgewählte Karte bleibt dauerhaft dezent hervorgehoben<br>
✅ **Verdeckte Karten** - Gewählte Karten werden in der Spielerliste als verschlossene Karte angezeigt<br>
✅ **Flip-Animationen** - Sanfte Animationen beim Aufdecken der Karten<br>
✅ **Keine Namensduplikate** - Server-seitige Validierung verhindert doppelte Spielernamen im Raum<br>
✅ **Beobachter-Modus** - Spieler können als Beobachter teilnehmen ohne bei der Abstimmung mitzuzählen<br>
✅ **Konfetti bei Konsens** - Feier-Animation wenn alle Spieler die gleiche Karte wählen<br>
✅ **Shareable Links** - URLs mit Raum-Code können direkt geteilt werden<br>
✅ **Copy Link Button** - Ein-Klick zum Kopieren des Raum-Links<br>

## Features

### Jira Integration
🔗 **Jira-Anbindung** - Verbinde deinen Raum mit deiner Jira-Instanz<br>
📥 **Story-Import per Link** - Füge Jira-Issues durch Einfügen des Links hinzu<br>
🔍 **JQL-Import** - Importiere mehrere Stories mit JQL-Abfragen<br>
📤 **Story Points Sync** - Schreibe geschätzte Story Points zurück nach Jira<br>
📝 **Manuelle Stories** - Füge auch Stories ohne Jira hinzu<br>
🎯 **Aktive Story-Anzeige** - Banner zeigt die aktuell zu schätzende Story<br>
✅ **Fortschritts-Tracking** - Übersicht über geschätzte vs. offene Stories<br>

### Kernfunktionen
✨ **Echtzeit-Synchronisation** - Alle Spieler sehen Live-Updates dank Socket.io<br>
🎯 **Intuitive Benutzeroberfläche** - Responsive Design für Desktop und Mobile<br>
🎴 **Kompaktes Kartendeck** - Werte: 1, 2, 3, 5, 8, 13 (Fibonacci-basiert)<br>
🎭 **Emoji werfen** - Rechtsklick auf Spieler um Emojis zu werfen (Bogen-Animation mit Bounce-Effekt)<br>
🖼️ **Spieler-Avatare** - Eigenes Profilbild hochladen und zuschneiden<br>
🎰 **Poker-Tisch** - Spieler werden kreisförmig um einen virtuellen Pokertisch angeordnet<br>
🌟 **Dezente Hervorhebung** - Gewählte Karte mit sanftem blauen Hintergrund und Ring<br>
🔒 **Verdeckte Karten** - Gewählte Karten werden als verschlossene Karte angezeigt<br>
🎬 **Sanfte Animationen** - Flip-Animation beim Aufdecken der Karten<br>
👥 **Unbegrenzte Spieler** - Erstelle Räume und lade dein Team ein<br>
👁️ **Beobachter-Modus** - Beobachte ohne an der Abstimmung teilzunehmen<br>
🚫 **Keine doppelten Namen** - Server-seitige Validierung verhindert Namensduplikate<br>
🔒 **Moderator-Kontrolle** - Raum-Ersteller kann Karten aufdecken und neue Runden starten<br>
📊 **Automatische Durchschnittsberechnung** - Sofortige Auswertung nach dem Aufdecken<br>
🎉 **Konfetti bei Konsens** - Feier-Animation wenn alle sich einig sind<br>
🔗 **Shareable Links** - Direkte Raum-Links mit URL-Parametern<br>
📋 **Copy Link** - Ein-Klick Link-Kopieren für einfaches Teilen<br>
🎨 **Modernes UI** - Erstellt mit Tailwind CSS<br>

## Technologie-Stack

### Frontend
- **React 18** mit TypeScript
- **Vite** für schnelles Development
- **Tailwind CSS** für Styling
- **Socket.io Client** für Echtzeit-Kommunikation
- **Canvas Confetti** für Konfetti-Animationen

### Backend
- **Node.js** mit Express
- **Socket.io** für WebSocket-Verbindungen
- **TypeScript** für Type-Safety
- **In-Memory Storage** (keine Datenbank erforderlich)

## Projektstruktur

```
takeFive/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/    # React Komponenten
│   │   │   ├── Home.tsx              # Startseite
│   │   │   ├── GameRoom.tsx          # Spielraum
│   │   │   ├── PokerTable.tsx        # Poker-Tisch Ansicht
│   │   │   ├── CardDeck.tsx          # Kartendeck
│   │   │   ├── PlayerList.tsx        # Spielerliste
│   │   │   ├── AvatarEditor.tsx      # Avatar-Zuschneidung
│   │   │   ├── EmojiPicker.tsx       # Emoji-Auswahl
│   │   │   ├── FlyingEmoji.tsx       # Fliegende Emoji-Animation
│   │   │   ├── PlayerContextMenu.tsx # Rechtsklick-Menü
│   │   │   ├── Results.tsx           # Ergebnisanzeige
│   │   │   ├── StoryList.tsx         # Story-Liste mit Jira-Import
│   │   │   ├── ActiveStoryBanner.tsx # Aktuelle Story-Anzeige
│   │   │   ├── JiraConfigModal.tsx   # Jira-Konfiguration
│   │   │   ├── JqlImportSection.tsx  # JQL-Import
│   │   │   └── ApplyPointsDialog.tsx # Story Points vergeben
│   │   ├── hooks/         # Custom React Hooks
│   │   │   └── useSocket.ts       # Socket.io Hook
│   │   ├── types/         # TypeScript Typen
│   │   ├── utils/         # Hilfsfunktionen
│   │   │   └── confetti.ts        # Konfetti-Animation
│   │   ├── App.tsx        # Haupt-App-Komponente
│   │   ├── main.tsx       # Entry Point
│   │   └── index.css      # Globale Styles
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── server/                # Node.js Backend
│   ├── src/
│   │   ├── services/
│   │   │   └── jiraService.ts # Jira API Integration
│   │   ├── index.ts       # Server Entry Point
│   │   ├── roomManager.ts # Raum-Verwaltungslogik
│   │   └── types.ts       # TypeScript Typen
│   ├── package.json
│   └── tsconfig.json
├── package.json           # Root Package (Workspaces)
└── README.md
```

## Installation

### Voraussetzungen
- Node.js (Version 18 oder höher)
- npm oder yarn

### Schritt 1: Repository klonen oder herunterladen

```bash
cd takeFive
```

### Schritt 2: Dependencies installieren

```bash
npm install
```

Dies installiert alle Abhängigkeiten für Frontend und Backend dank npm Workspaces.

## Entwicklung

### Beide Server gleichzeitig starten (empfohlen)

```bash
npm run dev
```

Dies startet:
- Backend-Server auf `http://localhost:3001`
- Frontend-Dev-Server auf `http://localhost:3000`

### Einzeln starten

**Nur Backend:**
```bash
npm run dev:server
```

**Nur Frontend:**
```bash
npm run dev:client
```

## Tests

Die Anwendung verfügt über Tests für Frontend, Backend und End-to-End (E2E) Workflows.

### Alle Unit- & Integration-Tests ausführen

```bash
npm run test
```

Dies führt die Tests sowohl für den Client als auch für den Server aus.

### Server-Tests
Die Server-Tests verwenden **Vitest** und prüfen die Raum-Verwaltung, Socket-Handler, Jira-Integration und Datenbank-Integration.

```bash
npm run test:server
```

### Client-Tests
Die Client-Tests verwenden **Vitest** und die **React Testing Library** für die Verifizierung von Hooks und Context-Providern.

```bash
npm run test:client
```

### E2E-Tests
End-to-End Tests werden mit **Playwright** durchgeführt und testen den gesamten Abstimmungsprozess in einem echten Browser.

```bash
npm run test:e2e
```

## Produktion

### Frontend bauen

```bash
npm run build
```

Das erstellt optimierte Produktions-Dateien im `client/dist` Ordner.

### Datenbank-Update (WICHTIG)

Wenn du PostgreSQL verwendest (via `DATABASE_URL`), musst du bei Schema-Änderungen (z.B. Verlängerung der Raum-Codes) die Datenbank aktualisieren:

```bash
# Schema direkt pushen (empfohlen für schnelle Updates)
npm run db:push --workspace=server

# ODER Migrations generieren und anwenden
npm run db:generate --workspace=server
npm run db:migrate --workspace=server
```

### Server starten

```bash
npm start
```

Startet den Backend-Server auf Port 3001.

## Verwendung

### 1. Raum erstellen
1. Öffne die Anwendung im Browser (`http://localhost:3000`)
2. Klicke auf "Neuen Raum erstellen"
3. Gib deinen Namen ein
4. Du erhältst einen 6-stelligen Raum-Code
5. Teile den Code mit deinem Team

### 2. Raum beitreten
1. Klicke auf "Raum beitreten"
2. Gib deinen Namen und den Raum-Code ein
3. Klicke auf "Beitreten"

**Oder mit direktem Link:**
1. Öffne einen geteilten Link (z.B. `http://localhost:3000?room=ABC123`)
2. Gib nur deinen Namen ein (Raum-Code ist bereits vorausgefüllt)
3. Klicke auf "Beitreten"

### 3. Raum teilen
- **Copy Link Button**: Klicke im Spielraum auf "Link kopieren" neben dem Raum-Code
- Der Link wird in die Zwischenablage kopiert
- Teile den Link mit deinem Team per E-Mail, Chat, etc.
- Team-Mitglieder können direkt über den Link beitreten

### 4. Spielen
- **Karte wählen**: Klicke auf eine der Karten im Deck
- **Warten**: Alle Spieler sehen, wer bereits gewählt hat (✓ und verdeckte Karte)
- **Automatisches Aufdecken**: Wenn alle aktiven Spieler gewählt haben, werden die Karten automatisch aufgedeckt
- **Manuelles Aufdecken**: Der Moderator kann jederzeit "Karten aufdecken" klicken
- **Ergebnisse**: Nach dem Aufdecken siehst du alle gewählten Karten und den Durchschnitt
- **Konsens-Feier**: Wenn alle die gleiche Karte wählen, erscheint Konfetti
- **Neue Runde**: Der Moderator startet eine neue Runde mit "Neue Runde starten"

### 5. Beobachter-Modus
- **Aktivieren**: Klicke auf "Beobachter-Modus" im Header
- **Deaktivieren**: Klicke auf "Aktiv teilnehmen" um wieder mitzuspielen
- **Verhalten**:
  - Als Beobachter kannst du keine Karten wählen
  - Beobachter werden nicht bei der Durchschnittsberechnung berücksichtigt
  - Beobachter zählen nicht für das automatische Aufdecken
  - Du siehst alle Ergebnisse wie ein aktiver Spieler

### 6. Avatar ändern
- **Hochladen**: Klicke auf deinen Avatar im Header und wähle ein Bild
- **Zuschneiden**: Passe den Bildausschnitt im Editor an
- **Entfernen**: Hover über den Avatar und klicke auf das X-Symbol
- Avatare werden allen Spielern in Echtzeit angezeigt

### 7. Emoji werfen
- **Öffnen**: Rechtsklick auf einen anderen Spieler am Pokertisch
- **Auswählen**: Klicke auf "Emoji werfen" im Kontextmenü
- **Werfen**: Wähle ein Emoji aus dem Picker (9 Kategorien verfügbar)
- **Mehrfach werfen**: Der Picker bleibt offen für weitere Würfe
- **Schließen**: Klicke außerhalb des Pickers oder drücke Escape
- **Kategorien**: Lustig, Zahlen, Gesichter, Gesten, Herzen, Objekte, Essen, Tiere, Natur
- **Zuletzt verwendet**: Die letzten 5 geworfenen Emojis erscheinen oben

### 8. Jira Integration (Moderator)

#### Jira verbinden
1. Klicke auf das Jira-Symbol in der Story-Liste (rechte Seitenleiste)
2. Gib deine Jira-Instanz-URL ein (z.B. `https://dein-team.atlassian.net`)
3. Gib deine E-Mail-Adresse ein
4. Erstelle ein API-Token unter [Atlassian API-Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
5. Optional: Gib die Story Points Feld-ID ein (z.B. `customfield_10016`)
6. Klicke auf "Verbinden"

#### Stories per Link importieren
1. Kopiere die URL eines Jira-Issues (z.B. `https://team.atlassian.net/browse/PROJ-123`)
2. Füge den Link in das Eingabefeld "Jira-Link einfügen..." ein
3. Drücke Enter oder klicke auf das Plus-Symbol
4. Die Story wird automatisch mit Titel importiert

#### Stories per JQL importieren
1. Stelle sicher, dass Jira verbunden ist
2. Öffne "Erweitert: JQL-Import" unter der Story-Liste
3. Gib eine JQL-Abfrage ein oder nutze die Schnellauswahl:
   - `sprint in openSprints()` - Aktueller Sprint
   - `assignee = currentUser() AND type = Story` - Meine Stories
   - `"Story Points" is EMPTY AND type = Story` - Ohne Schätzung
4. Klicke auf "Importieren"

#### Manuelle Stories hinzufügen
1. Klicke auf "Story hinzufügen" unter der Story-Liste
2. Gib eine Beschreibung ein
3. Klicke auf "Hinzufügen"

#### Story zur Abstimmung auswählen
1. Klicke auf den Pfeil-Button neben einer Story
2. Die Story erscheint als Banner über dem Pokertisch
3. Alle Spieler sehen, welche Story gerade geschätzt wird

#### Story Points vergeben
1. Nach dem Aufdecken der Karten erscheint ein Dialog
2. Bei Konsens wird der Wert automatisch vorgeschlagen
3. Wähle den gewünschten Story Point-Wert
4. Klicke auf "Anwenden" (speichert lokal und optional in Jira)
5. Oder klicke "Überspringen" um ohne Punkte fortzufahren

## Spielregeln

### Moderator
- Der erste Spieler, der einen Raum erstellt, wird automatisch Moderator
- Falls der Moderator den Raum verlässt, wird automatisch ein neuer Moderator ernannt
- Nur der Moderator kann:
  - Karten vorzeitig aufdecken
  - Neue Runden starten

### Kartenwerte
Die Karten folgen einer Fibonacci-Sequenz:
- **1, 2, 3, 5, 8, 13** - Story Points für agile Schätzungen
- Kompaktes Set für schnelle Entscheidungen

### Abstimmung
- Jeder Spieler wählt genau eine Karte
- Andere Spieler sehen nur, dass du gewählt hast (nicht welche Karte)
- Karten werden gleichzeitig aufgedeckt, wenn:
  - ALLE Spieler gewählt haben (automatisch), ODER
  - Der Moderator "Karten aufdecken" klickt (manuell)

## API Übersicht

### Socket.io Events

#### Client → Server
- `createRoom(playerName, callback)` - Neuen Raum erstellen
- `joinRoom({ roomCode, playerName }, callback)` - Raum beitreten
- `selectCard(cardValue)` - Karte wählen (nicht als Beobachter möglich)
- `revealCards()` - Karten aufdecken (nur Moderator)
- `startNewRound()` - Neue Runde starten (nur Moderator)
- `toggleObserver()` - Beobachter-Modus umschalten
- `updateAvatar(avatarUrl)` - Avatar aktualisieren (Base64 oder null)
- `throwEmoji({ toPlayerId, emoji })` - Emoji auf Spieler werfen

**Story Events (nur Moderator):**
- `addManualStory(summary)` - Manuelle Story hinzufügen
- `removeStory(storyId)` - Story entfernen
- `selectStory(storyId)` - Story zur Abstimmung auswählen
- `applyStoryPoints({ storyId, points })` - Story Points vergeben
- `clearStories()` - Alle Stories löschen

**Jira Events (nur Moderator):**
- `configureJira({ baseUrl, email, apiToken, storyPointsFieldId? })` - Jira verbinden
- `disconnectJira()` - Jira-Verbindung trennen
- `addStoryByLink(url)` - Story per Jira-Link importieren
- `fetchJiraStories(jql)` - Stories per JQL importieren
- `refreshJiraStories()` - Jira-Stories aktualisieren

#### Server → Client
- `roomJoined({ roomCode, player, players, stories, activeStoryId, jiraConnected })` - Erfolgreich beigetreten
- `playerJoined(player)` - Neuer Spieler ist beigetreten
- `playerLeft(playerId)` - Spieler hat den Raum verlassen
- `cardSelected({ playerId, hasVoted })` - Spieler hat Karte gewählt
- `cardsRevealed(players)` - Karten wurden aufgedeckt
- `newRound()` - Neue Runde wurde gestartet
- `observerToggled({ playerId, isObserver })` - Beobachter-Status geändert
- `avatarUpdated({ playerId, avatarUrl })` - Avatar wurde aktualisiert
- `emojiThrown({ fromPlayerId, toPlayerId, emoji })` - Emoji wurde geworfen
- `error(message)` - Fehler aufgetreten

**Story Events:**
- `storyAdded(story)` - Story wurde hinzugefügt
- `storiesUpdated(stories)` - Story-Liste wurde aktualisiert
- `storySelected({ storyId, story })` - Story wurde ausgewählt
- `storyPointsApplied({ storyId, points })` - Story Points wurden vergeben

**Jira Events:**
- `jiraConfigured({ baseUrl })` - Jira wurde verbunden
- `jiraDisconnected()` - Jira wurde getrennt
- `jiraError({ code, message })` - Jira-Fehler aufgetreten

## Troubleshooting

### Port bereits in Verwendung
Wenn Port 3000 oder 3001 bereits verwendet wird:

**Frontend** - Ändere in `client/vite.config.ts`:
```typescript
server: {
  port: 3002, // Neuer Port
}
```

**Backend** - Setze Umgebungsvariable:
```bash
PORT=3003 npm run dev:server
```

### Verbindungsprobleme
- Stelle sicher, dass beide Server laufen
- Prüfe die Browser-Konsole auf Fehler
- Stelle sicher, dass keine Firewall die Verbindung blockiert

### Build-Fehler
```bash
# Dependencies neu installieren
rm -rf node_modules client/node_modules server/node_modules
npm install
```

## Browser-Kompatibilität

- Chrome/Edge (empfohlen)
- Firefox
- Safari
- Mobile Browser (iOS Safari, Chrome Mobile)

## Lizenz

Dieses Projekt ist Open Source und für Bildungszwecke gedacht.

## Entwickelt mit ❤️

Erstellt als MVP für agile Teams, um Story Points effizient zu schätzen.
