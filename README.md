# Planning Poker Web-Anwendung

Eine moderne, Echtzeit Planning Poker Anwendung für agile Teams, gebaut mit React, TypeScript, Node.js und Socket.io.

## Neueste Verbesserungen

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

✨ **Echtzeit-Synchronisation** - Alle Spieler sehen Live-Updates dank Socket.io<br>
🎯 **Intuitive Benutzeroberfläche** - Responsive Design für Desktop und Mobile<br>
🎴 **Kompaktes Kartendeck** - Werte: 1, 2, 3, 5, 8, 13 (Fibonacci-basiert)<br>
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
│   │   │   ├── Home.tsx           # Startseite
│   │   │   ├── GameRoom.tsx       # Spielraum
│   │   │   ├── CardDeck.tsx       # Kartendeck
│   │   │   ├── PlayerList.tsx     # Spielerliste
│   │   │   └── Results.tsx        # Ergebnisanzeige
│   │   ├── hooks/         # Custom React Hooks
│   │   │   └── useSocket.ts       # Socket.io Hook
│   │   ├── types/         # TypeScript Typen
│   │   ├── App.tsx        # Haupt-App-Komponente
│   │   ├── main.tsx       # Entry Point
│   │   └── index.css      # Globale Styles
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── server/                # Node.js Backend
│   ├── src/
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

## Produktion

### Frontend bauen

```bash
npm run build
```

Das erstellt optimierte Produktions-Dateien im `client/dist` Ordner.

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

#### Server → Client
- `roomJoined({ roomCode, player, players })` - Erfolgreich beigetreten
- `playerJoined(player)` - Neuer Spieler ist beigetreten
- `playerLeft(playerId)` - Spieler hat den Raum verlassen
- `cardSelected({ playerId, hasVoted })` - Spieler hat Karte gewählt
- `cardsRevealed(players)` - Karten wurden aufgedeckt
- `newRound()` - Neue Runde wurde gestartet
- `observerToggled({ playerId, isObserver })` - Beobachter-Status geändert
- `error(message)` - Fehler aufgetreten

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
