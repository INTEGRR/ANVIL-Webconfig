# ANVIL Webconfig

Web-based configurator for the Teleport Native ISO keyboard with diagnostic tools and DFU flashing capabilities.

## Features

### Keyboard Configurator
- Visual keymap editor with drag-and-drop
- Real-time preview of key assignments
- QMK keycode support
- RGB and effect configuration
- Save and share presets online

### Diagnostic Tools
- Real-time keyboard matrix monitoring
- Chatter detection and analysis
- Ghosting detection
- Latency measurement (P50, P95, P99)
- Per-key debounce configuration
- EEPROM configuration management
- Export diagnostic data (JSON, PNG heatmaps)

### DFU Flash
- Browser-based firmware flashing (WebUSB)
- No driver installation required
- Compatible with STM32 DFU bootloader

### Gallery
- Browse community keyboard presets
- Vote and comment on presets
- Upload your own configurations

## Getting Started

### Prerequisites
- Chrome 89+ or Edge 89+ (for WebHID and WebUSB support)
- Node.js 18+ (for development)

### Installation

```bash
npm install
npm run dev
```

### Building for Production

```bash
npm run build
```

## Using the Diagnostic Tools

### 1. Flash Diagnostic Firmware

First, you need to flash the diagnostic firmware to your keyboard. See [qmk_diagnostic_firmware/README.md](qmk_diagnostic_firmware/README.md) for detailed instructions.

Quick steps:
```bash
# In your QMK firmware directory
cp -r qmk_diagnostic_firmware/lib/* keyboards/teleport/native/iso/
cp -r qmk_diagnostic_firmware/diag_keymap keyboards/teleport/native/iso/keymaps/diag
qmk flash -kb teleport/native/iso -km diag
```

### 2. Run Diagnostic Test

1. Navigate to the Diagnostics page in the web configurator
2. Click "Connect Keyboard"
3. Select your keyboard from the WebHID device picker
4. Click "Start Test"
5. Follow the on-screen test instructions:
   - Press individual keys across the keyboard
   - Try modifier combinations
   - Rapid WASD mashing
   - Hold keys for 2-3 seconds
6. Click "Stop Test" when done
7. Review the diagnostic report and recommendations

### 3. Apply Fixes

The diagnostic tool will automatically detect issues and suggest fixes:

- **Chatter Detection:** Increase debounce time for problematic keys
- **Ghosting:** Check hardware (diodes, solder joints)
- **High Latency:** Enable eager mode for faster response
- **Stuck Keys:** Hardware inspection needed

You can apply fixes temporarily (RAM only) for testing, then save permanently to EEPROM once verified.

### 4. Export Results

- **JSON:** Complete session data for support or further analysis
- **PNG Heatmap:** Visual representation of chatter rates
- **Share:** Upload to support team (optional, requires consent)

### 5. Return to Normal Firmware

After diagnostics, flash your regular keymap:

```bash
qmk flash -kb teleport/native/iso -km default
```

## Keyboard Shortcuts

When on the Diagnostic page:
- **Space:** Start/Stop test
- **R:** Reset diagnostic data

## Technical Details

### Matrix Configuration
- **Rows:** 6
- **Columns:** 15
- **Keys:** 85
- **Scan Rate:** Up to 1000 Hz

### Diagnostic Protocol

Communication uses RAW HID reports (32 bytes):

#### Commands (Host → Keyboard)
- `0x5A` DIAG_ENABLE: Start/stop diagnostic mode
- `0x5B` DIAG_RESET: Reset counters
- `0x5C` SET_DEBOUNCE: Adjust per-key debounce
- `0x5D` SET_EAGER: Toggle eager mode
- `0x4A` SAVE_EEPROM: Save config
- `0x4B` LOAD_EEPROM: Load config

#### Reports (Keyboard → Host)
- `0x50` EDGE: Key state change event (12 bytes)
- `0x51` SCAN_SUMMARY: Matrix snapshot (12 + bitmap)
- `0x52` METRICS_DUMP: Accumulated metrics

See [qmk_diagnostic_firmware/README.md](qmk_diagnostic_firmware/README.md) for detailed protocol documentation.

## Browser Compatibility

| Feature | Chrome | Edge | Firefox | Safari |
|---------|--------|------|---------|--------|
| Configurator | ✓ | ✓ | ✓ | ✓ |
| Diagnostics | ✓ (89+) | ✓ (89+) | ✗ | ✗ |
| DFU Flash | ✓ | ✓ | ✗ | ✗ |

WebHID and WebUSB are only available in Chromium-based browsers.

## Project Structure

```
.
├── src/
│   ├── components/       # React components
│   │   ├── DiagMatrix.tsx
│   │   ├── DiagTimeline.tsx
│   │   └── DiagReportCard.tsx
│   ├── lib/              # Core libraries
│   │   ├── hid.ts        # WebHID connection manager
│   │   ├── diagProtocol.ts
│   │   ├── dfu.ts        # DFU protocol
│   │   └── supabase.ts
│   ├── pages/            # Route pages
│   │   ├── Diag.tsx      # Diagnostic tool
│   │   ├── Configurator.tsx
│   │   ├── DFUFlash.tsx
│   │   └── Gallery.tsx
│   └── utils/
│       ├── diagHeuristics.ts
│       └── exporters.ts
├── qmk_diagnostic_firmware/  # QMK diagnostic firmware
│   ├── lib/
│   │   ├── timer_us.c/h
│   │   └── diag_mode.c/h
│   └── diag_keymap/
└── supabase/
    └── migrations/
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

MIT

## Support

For issues, questions, or feature requests, please open an issue on GitHub.
