# EEPROM Persistence Setup

## Was wurde implementiert?

Die RGB-LED-Einstellungen werden jetzt **automatisch im EEPROM** gespeichert und bleiben nach einem Neustart oder Trennen der Tastatur erhalten.

## Wie funktioniert es?

### Automatisches Speichern

Jede Farb-Änderung wird **automatisch** in den EEPROM geschrieben:

- **Einzelne Taste ändern** (Command 0x20) → Speichert sofort
- **Mehrere Tasten ändern** (Command 0x21) → Speichert nach allen Änderungen
- **Beim Booten** → Lädt automatisch die gespeicherten Farben

### Manuelle Commands (optional)

Falls du manuell speichern/laden willst:

```javascript
// Manuell speichern (Command 0x40)
await device.sendReport(0x00, new Uint8Array([0x40]));

// Manuell laden (Command 0x41)
await device.sendReport(0x00, new Uint8Array([0x41]));
```

## QMK Firmware flashen

### 1. Firmware kompilieren

```bash
# In deinem QMK-Verzeichnis:
qmk compile -kb deine_tastatur -km dein_keymap
```

### 2. Firmware flashen

```bash
# Tastatur in Bootloader-Modus versetzen (ESC + Fn beim Einstecken)
qmk flash -kb deine_tastatur -km dein_keymap
```

### 3. Testen

1. Verbinde die Tastatur mit dem Web-Configurator
2. Ändere einige LED-Farben
3. Trenne die Tastatur
4. Schließe sie wieder an
5. Die Farben sollten **automatisch** wiederhergestellt werden!

## Technische Details

### EEPROM Layout

- **Adresse**: Byte 32-287 (256 Bytes)
- **Daten**: 85 Keys × 3 Bytes (H, S, V) = 255 Bytes
- **Technologie**: `eeprom_update_block()` für optimiertes Schreiben

### Funktionen

```c
void save_ledmap_to_eeprom(void);    // Speichert ledmap[] → EEPROM
void load_ledmap_from_eeprom(void);  // Lädt EEPROM → ledmap[]
void keyboard_post_init_user(void);  // Lädt beim Boot
```

### Commands

| Command | Function | Auto-Save |
|---------|----------|-----------|
| 0x20 | Set single key color | ✅ Ja |
| 0x21 | Bulk set colors | ✅ Ja |
| 0x40 | Manual save | - |
| 0x41 | Manual load | - |

## Vorteile

✅ **Persistent** - Überlebt Neustarts und Trennen
✅ **Automatisch** - Kein manuelles Speichern nötig
✅ **Schnell** - `eeprom_update_block()` schreibt nur geänderte Bytes
✅ **Zuverlässig** - EEPROM hält >100.000 Schreibzyklen

## Hinweise

- EEPROM hat begrenzte Schreibzyklen (~100.000)
- Die Firmware schreibt nur bei tatsächlichen Änderungen
- Beim ersten Flash sind Default-Farben aktiv
- Nach dem ersten Sync mit dem Web-Configurator werden deine Farben gespeichert
