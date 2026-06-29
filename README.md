# CampusMap

A **CampusMap** egy modern, térképalapú webalkalmazás épületek nyilvántartására, valamint interaktív vizuális megjelenítésére. A projekt bemutatja az Angular legújabb funkcióinak (**Standalone Components**, **Signals**, új **Control Flow**) és a **Leaflet** interaktív térképkezelésének zökkenőmentes integrációját.

---

## Főbb funkciók

- **Interaktív térkép és lista szinkronizáció**
  - A Leaflet térkép és az oldalsó lista valós időben, kétirányúan kommunikál egymással.
  - Az egér rávitele (*hover*) vagy a kattintás azonnal vizuális visszajelzést ad (kiemelés, popup megnyitása, rázoomolás).

- **Épületek kezelése (CRUD)**
  - Új épületek felvétele.
  - Meglévő épületek szerkesztése.
  - Épületadatok részletes megjelenítése.

- **Térképes poligon rajzolás**
  - Új épület létrehozásakor a felhasználó közvetlenül a térképen rajzolhatja meg az épület körvonalát.
  - Beépített **Undo / Redo** (Visszavonás / Újra) támogatással.

- **Állapotkezelés (State Management)**
  - A globális állapotokat (`autentikáció`, `épületek`, `szűrők`, `kijelölések`) az `@ngrx/signals` biztosítja.
  - Gyors és reaktív adatfolyam.

- **Autentikáció és jogosultságkezelés**
  - JWT alapú bejelentkezés.
  - Egyedi Guardok és útvonalvédelem.
  - A felhasználó választhat, hogy csak a saját vagy a publikus épületeket szeretné megjeleníteni.

- **Keresés és szűrés**
  - Gyors kliensoldali keresés:
    - Épület neve
    - Épületkód
    - Leírás

---

## Alkalmazott technológiák

| Terület | Technológia |
|---------|-------------|
| **Frontend** | Angular (Standalone Components, Signals, funkcionális Interceptorok és Guardok) |
| **Térkép** | Leaflet & Leaflet-Draw |
| **Állapotkezelés** | NgRx Signals (`signalStore`) |
| **Felhasználói felület** | Angular Material |
| **Backend** | `json-server` (Mock REST API + egyedi login végpont) |

---

## Telepítés és futtatás

A projekt futtatásához **Node.js v18 vagy újabb** szükséges.

### 1. Függőségek telepítése

A projekt gyökérkönyvtárában futtasd:

```bash
npm install
```

### 2. Backend (JSON Server) indítása

Nyiss egy új terminált, majd futtasd:

```bash
npm run server
```

A szerver a következő címen érhető el:

```text
http://localhost:3000
```

### 3. Frontend alkalmazás indítása

Nyiss egy új terminált, majd futtasd:

```bash
npm start
```

Az alkalmazás elérhető a böngészőben:

```text
http://localhost:4200
```

---

## Teszt felhasználó

| Mező | Érték |
|------|-------|
| **Felhasználónév** | `admin` |
| **Jelszó** | `test01` |

---

## Projekt struktúra

```text
src/
├── app/
│   ├── core/               # Globális szolgáltatások (Services), Store, Modellek, Guardok, Interceptorok
│   ├── features/           # Fő funkciók (Auth, Buildings, Home)
│   ├── layout/             # Shell, Navbar és egyéb layout komponensek
│   ├── shared/             # Újrafelhasználható UI elemek
│   ├── app.component.ts
│   └── app.routes.ts
│
├── db/
│   └── db.json             # Lokális adatbázis
│
├── assets/                 # Statikus fájlok (képek, ikonok)
│
└── server.js               # JSON Server konfiguráció és egyedi API végpontok
```

---

## Technikai kiemelések

### Signals az RxJS helyett

A felület állapotfrissítései az Angular modern **Signals API** segítségével történnek, amely:

- minimalizálja a szükségtelen rendereléseket,
- egyszerűbb reaktív adatkezelést biztosít,
- jobb teljesítményt eredményez.

### Optimalizált térképszinkronizáció

A Leaflet események és az Angular Store közötti kommunikáció `untracked` környezetben történik, így:

- elkerülhető a térkép felesleges újrarajzolása,
- megszűnik a vizuális "remegés",
- gyorsabb felhasználói élmény biztosítható.

### Egyedi validátorok

A térképen rajzolt poligonok ellenőrzése saját fejlesztésű Reactive Forms validátorral történik:

```text
minPolygonPoints
```

Ez biztosítja, hogy egy épülethez csak megfelelő számú pontból álló poligon menthető.