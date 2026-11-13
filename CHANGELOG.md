# GPverse StagePlanner — Registro delle versioni

Schema: **V.maior.minor.patch**
- **maior**: cambiamento grosso o incompatibile con le versioni precedenti
- **minor**: nuova funzione
- **patch**: correzione di un bug

La versione è visibile nell'app (in alto, accanto al logo) e cliccandola si vedono le novità.

## V2.0.0 — 13/11/2026
Rinascita in stile GPverse: da planner di planimetrie ad app completa per **imparare la parte** e **disegnare il palco**.

**Progetto e palco**
- Ogni nuovo progetto parte dalla definizione del palco: all'italiana, tre lati, arena, libero/piazza. Misure in metri: larghezza, profondità, altezza, boccascena, proscenio, quinte per lato. Modelli pronti (sala parrocchiale, teatro medio/grande, piazza, tre lati, arena).
- Destra/sinistra dell'attore (uso teatrale) o del pubblico; zone del palco (avanti / centro / fondo × dx / c / sx).

**Copione**
- Import da Word (.docx), PDF, testo o incolla. Riconosce `NOME: battuta`, `NOME. battuta`, il nome da solo su una riga, `TUTTI:`, didascalie tra parentesi/corsivo, azioni in grassetto, titoli di scena/atto.
- Modifica riga per riga, nuove scene, note di regia (cue); ricerca, filtri «mie scene» / «mie battute».
- Personaggi: colore, attore, «sono io» (anche più ruoli), altezza, voce e tono per il partner vocale; rinomina e unione di personaggi.

**Prove**
- Lettura con le proprie battute visibili, a iniziali, con la sola prima parola o nascoste; tocca per sbirciare.
- Botta e risposta: battuta d'attacco letta ad alta voce, aiuto parola per parola, «Dilla» al microfono con controllo di precisione, voto ✓ ≈ ✗ e ripasso con le battute più deboli per prime.
- Partner vocale: voci diverse per personaggio; per la tua battuta pausa automatica, attesa di un tocco o ascolto del microfono con confronto parola per parola e voto automatico; opzione «leggi la mia battuta dopo».
- Ascolta come una canzone (tutto letto, anche le tue battute), Registra le voci (registrazioni usate al posto della voce sintetica), Teleprompter a velocità regolabile.
- Livello 0–5 per ogni battuta, percentuale imparata, giorni al debutto e battute al giorno.
- «Dove sono»: mini pianta con la tua posizione alla battuta corrente.

**Palco**
- Pianta dall'alto interattiva: trascina, ruota, ridimensiona, zoom/pan (anche con due dita), griglia 10 cm, annulla/ripristina.
- Vista dal pubblico in prospettiva, calcolata dalla stessa pianta, da posti diversi (sx/centro/dx, vicino/medio/lontano): boccascena e quinte coprono ciò che non si vede.
- Libreria: scenografia (fondale, quinte, pareti, porte, finestre, pedane, scale, colonne, alberi), arredi, oggetti, luci a terra, scritte e segni; tutti i personaggi e le comparse.
- Movimenti legati alle battute: ogni spostamento vale dalla battuta scelta in poi; frecce di spostamento, comparsa/scomparsa, «Anima» per vedere la scena muoversi, «Momento» per segnare azioni senza battuta.
- Immagini PNG delle viste.

**Dati**
- Tutto resta sul dispositivo (niente più Firebase): funziona senza internet e si installa come app.
- Backup completo (anche le registrazioni) o leggero; «Condividi con la compagnia» senza i propri progressi; import su qualsiasi dispositivo.
- Stampa / PDF del copione con la tua parte evidenziata e del libro di regia con pianta e vista dal pubblico per ogni movimento.

## V1.0.0 — 25/04/2026
Versione originale realizzata con Gemini.
- Progetti e scene con planimetria disegnata a mano (rettangoli, cerchi, linee, testo, oggetti emoji) e sincronizzazione Firebase.
- Esportazione PDF delle planimetrie.
