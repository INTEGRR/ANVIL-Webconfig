# QMK Diagnostic Firmware for Teleport Native ISO

This directory contains the complete diagnostic firmware implementation for the Teleport Native ISO keyboard.

## Directory Structure

```
qmk_diagnostic_firmware/
├── lib/
│   ├── timer_us.h          # Microsecond-precision timer interface
│   ├── timer_us.c          # DWT_CYCCNT-based timer implementation
│   ├── diag_mode.h         # Diagnostic mode interface
│   └── diag_mode.c         # Protocol handlers and state management
└── diag_keymap/
    ├── keymap.c            # Diagnostic keymap (standard ISO layout)
    ├── config.h            # RAW HID configuration
    └── rules.mk            # Build rules
```

## Installation

### Step 1: Copy to QMK Firmware Directory

Copy this entire structure into your QMK firmware directory:

```bash
# Navigate to your QMK firmware root
cd ~/qmk_firmware

# Create the diagnostic keymap directory
mkdir -p keyboards/teleport/native/iso/keymaps/diag

# Copy the keymap files
cp /path/to/this/project/qmk_diagnostic_firmware/diag_keymap/* \
   keyboards/teleport/native/iso/keymaps/diag/

# Copy the library files to the keyboard directory
cp /path/to/this/project/qmk_diagnostic_firmware/lib/* \
   keyboards/teleport/native/iso/
```

### Step 2: Compile the Firmware

```bash
qmk compile -kb teleport/native/iso -km diag
```

This will generate a `.bin` or `.hex` file in the QMK firmware directory.

### Step 3: Flash to Keyboard

#### Option A: Using QMK Toolbox
1. Put keyboard in DFU mode (usually by holding ESC while plugging in)
2. Open QMK Toolbox
3. Select the compiled firmware file
4. Click "Flash"

#### Option B: Using Command Line
```bash
qmk flash -kb teleport/native/iso -km diag
```

#### Option C: Using Web DFU (if supported)
1. Put keyboard in DFU mode
2. Navigate to the DFU Flash page in your web configurator
3. Select the compiled firmware file
4. Click "Program"

## Protocol Reference

### Commands (Host → Keyboard)

| Command | ID | Parameters | Description |
|---------|----|-----------| ------------|
| DIAG_ENABLE | 0x5A | enable (bool), scan_div (uint8) | Start/stop diagnostic mode |
| DIAG_RESET | 0x5B | - | Reset all counters and metrics |
| SET_DEBOUNCE | 0x5C | key (uint8), ms (uint8) | Set per-key debounce time |
| SET_EAGER | 0x5D | key (uint8), on (bool) | Enable/disable eager mode for key |
| SAVE_EEPROM | 0x4A | - | Save current config to EEPROM |
| LOAD_EEPROM | 0x4B | - | Load config from EEPROM |
| METRICS_DUMP | 0x52 | - | Request metrics snapshot |

### Reports (Keyboard → Host)

| Report | ID | Size | Description |
|--------|----| -----| ------------|
| EDGE | 0x50 | 12 bytes | Key state change event |
| SCAN_SUMMARY | 0x51 | 12 + bitmap | Matrix snapshot |
| METRICS_DUMP | 0x52 | Variable | Accumulated metrics |

### EDGE Event Format (12 bytes)

```
[0]     cmd = 0x50
[1]     key index (0-84)
[2]     phase (1=pre-debounce, 2=post-debounce)
[3]     kind (0=release, 1=press)
[4-7]   timestamp_us (uint32 little-endian)
[8-11]  scan_id (uint32 little-endian)
```

### SCAN_SUMMARY Format (12 + bitmap bytes)

```
[0]     cmd = 0x51
[1]     rows (6)
[2]     cols (15)
[3]     stride (2)
[4-7]   timestamp_us (uint32 little-endian)
[8-11]  scan_id (uint32 little-endian)
[12+]   bitmap (rows * stride bytes)
```

## Matrix Configuration

- **Rows:** 6
- **Cols:** 15
- **Keys:** 85
- **Bitmap Stride:** 2 bytes per row (ceil(15/8) = 2)

## Timer Implementation

The firmware uses the ARM Cortex-M DWT (Data Watchpoint and Trace) cycle counter for microsecond-precision timing:

- **Timer Source:** DWT_CYCCNT
- **CPU Frequency:** 168 MHz (STM32F4)
- **Resolution:** ~6 nanoseconds per cycle
- **Range:** ~25 seconds before 32-bit overflow

## EEPROM Layout

Per-key configuration is stored in EEPROM starting at address `EECONFIG_SIZE`:

```
[EECONFIG_SIZE + 0..84]      debounce_ms[85]
[EECONFIG_SIZE + 85..169]    eager_mode[85]
```

## Switching Back to Normal Firmware

To return to your normal keymap:

```bash
qmk compile -kb teleport/native/iso -km default
qmk flash -kb teleport/native/iso -km default
```

Or use your custom keymap name instead of `default`.

## Troubleshooting

### Keyboard not detected in Web Configurator
- Ensure you're using Chrome 89+ or Edge 89+
- Check that RAW HID is enabled in the firmware
- Verify USB cable supports data transfer

### No events received
- Confirm diagnostic mode is enabled (DIAG_ENABLE command sent)
- Check USB polling rate (should be 1ms)
- Verify firmware was compiled and flashed successfully

### High latency or dropped events
- Reduce scan_div parameter (lower = more frequent scan summaries)
- Check USB cable quality
- Ensure adequate power supply

## Development Notes

### Adding Matrix Hooks

To integrate with your existing matrix scanning code, add these hooks:

```c
// In matrix_scan() or similar, after reading raw matrix state:
uint8_t bitmap[MATRIX_ROWS_DIAG * BITMAP_STRIDE];
// ... populate bitmap from matrix state ...
diag_on_scan_complete(bitmap, timer_read_us(), scan_id);

// In debounce algorithm, when detecting state change:
diag_on_pre_debounce_edge(key, pressed, timer_read_us(), scan_id);

// After debounce decision:
diag_on_post_debounce_edge(key, pressed, timer_read_us(), scan_id);
```

### Memory Usage

- **RAM:** ~600 bytes (state + buffers)
- **Flash:** ~2 KB (code + lookup tables)
- **EEPROM:** 170 bytes (per-key config)

## License

This diagnostic firmware follows the same license as QMK Firmware (GPL v2 or later).
