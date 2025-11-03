#include "diag_mode.h"
#include "timer_us.h"
#include "raw_hid.h"
#include "eeconfig.h"
#include <string.h>

static diag_state_t diag_state;

#define EEPROM_DIAG_CONFIG_ADDR (EECONFIG_SIZE)
#define EEPROM_DIAG_CONFIG_SIZE (KEY_COUNT_DIAG * 2)

void diag_init(void) {
    memset(&diag_state, 0, sizeof(diag_state));

    for (uint8_t i = 0; i < KEY_COUNT_DIAG; i++) {
        diag_state.debounce_ms[i] = 5;
        diag_state.eager_mode[i] = false;
    }

    diag_state.enabled = false;
    diag_state.scan_div = 1;
    diag_state.scan_counter = 0;

    timer_us_init();
}

void diag_process_command(uint8_t *data, uint8_t len) {
    if (len < 1) return;

    uint8_t cmd = data[0];

    switch (cmd) {
        case DIAG_CMD_ENABLE:
            if (len >= 3) {
                diag_state.enabled = data[1] != 0;
                diag_state.scan_div = data[2] > 0 ? data[2] : 1;
                diag_state.scan_counter = 0;
            }
            break;

        case DIAG_CMD_RESET:
            diag_state.scan_counter = 0;
            diag_state.ghost_events = 0;
            memset(diag_state.actuations, 0, sizeof(diag_state.actuations));
            memset(diag_state.chatter, 0, sizeof(diag_state.chatter));
            diag_state.stuck_rows = 0;
            diag_state.stuck_cols = 0;
            break;

        case DIAG_CMD_SET_DEBOUNCE:
            if (len >= 3) {
                uint8_t key = data[1];
                uint8_t ms = data[2];
                if (key < KEY_COUNT_DIAG) {
                    diag_state.debounce_ms[key] = ms;
                }
            }
            break;

        case DIAG_CMD_SET_EAGER:
            if (len >= 3) {
                uint8_t key = data[1];
                bool eager = data[2] != 0;
                if (key < KEY_COUNT_DIAG) {
                    diag_state.eager_mode[key] = eager;
                }
            }
            break;

        case DIAG_CMD_SAVE_EEPROM:
            diag_save_to_eeprom();
            break;

        case DIAG_CMD_LOAD_EEPROM:
            diag_load_from_eeprom();
            break;

        case DIAG_CMD_METRICS_DUMP:
            diag_send_metrics_dump();
            break;

        default:
            break;
    }
}

void diag_on_pre_debounce_edge(uint8_t key, bool pressed, uint32_t timestamp_us, uint32_t scan_id) {
    if (!diag_state.enabled) return;
    if (key >= KEY_COUNT_DIAG) return;

    diag_send_edge_event(key, 1, pressed ? 1 : 0, timestamp_us, scan_id);
}

void diag_on_post_debounce_edge(uint8_t key, bool pressed, uint32_t timestamp_us, uint32_t scan_id) {
    if (!diag_state.enabled) return;
    if (key >= KEY_COUNT_DIAG) return;

    if (pressed) {
        diag_state.actuations[key]++;
    }

    diag_send_edge_event(key, 2, pressed ? 1 : 0, timestamp_us, scan_id);
}

void diag_on_scan_complete(const uint8_t *matrix_bitmap, uint32_t timestamp_us, uint32_t scan_id) {
    if (!diag_state.enabled) return;

    diag_state.scan_counter++;

    if (diag_state.scan_counter % diag_state.scan_div == 0) {
        diag_send_scan_summary(matrix_bitmap, timestamp_us, scan_id);
    }
}

void diag_send_edge_event(uint8_t key, uint8_t phase, uint8_t kind, uint32_t timestamp_us, uint32_t scan_id) {
    uint8_t buf[32] = {0};

    buf[0] = DIAG_CMD_EDGE;
    buf[1] = key;
    buf[2] = phase;
    buf[3] = kind;

    buf[4] = (timestamp_us >> 0) & 0xFF;
    buf[5] = (timestamp_us >> 8) & 0xFF;
    buf[6] = (timestamp_us >> 16) & 0xFF;
    buf[7] = (timestamp_us >> 24) & 0xFF;

    buf[8] = (scan_id >> 0) & 0xFF;
    buf[9] = (scan_id >> 8) & 0xFF;
    buf[10] = (scan_id >> 16) & 0xFF;
    buf[11] = (scan_id >> 24) & 0xFF;

    raw_hid_send(buf, 32);
}

void diag_send_scan_summary(const uint8_t *bitmap, uint32_t timestamp_us, uint32_t scan_id) {
    uint8_t buf[32] = {0};

    buf[0] = DIAG_CMD_SCAN_SUMMARY;
    buf[1] = MATRIX_ROWS_DIAG;
    buf[2] = MATRIX_COLS_DIAG;
    buf[3] = BITMAP_STRIDE;

    buf[4] = (timestamp_us >> 0) & 0xFF;
    buf[5] = (timestamp_us >> 8) & 0xFF;
    buf[6] = (timestamp_us >> 16) & 0xFF;
    buf[7] = (timestamp_us >> 24) & 0xFF;

    buf[8] = (scan_id >> 0) & 0xFF;
    buf[9] = (scan_id >> 8) & 0xFF;
    buf[10] = (scan_id >> 16) & 0xFF;
    buf[11] = (scan_id >> 24) & 0xFF;

    uint8_t bitmap_size = MATRIX_ROWS_DIAG * BITMAP_STRIDE;
    if (bitmap_size > 20) bitmap_size = 20;

    memcpy(&buf[12], bitmap, bitmap_size);

    raw_hid_send(buf, 32);
}

void diag_send_metrics_dump(void) {
}

uint8_t diag_get_debounce(uint8_t key) {
    if (key >= KEY_COUNT_DIAG) return 5;
    return diag_state.debounce_ms[key];
}

bool diag_is_eager(uint8_t key) {
    if (key >= KEY_COUNT_DIAG) return false;
    return diag_state.eager_mode[key];
}

void diag_save_to_eeprom(void) {
    uint8_t *config_ptr = (uint8_t *)&diag_state.debounce_ms[0];
    for (uint16_t i = 0; i < KEY_COUNT_DIAG; i++) {
        eeprom_update_byte((uint8_t *)(EEPROM_DIAG_CONFIG_ADDR + i), diag_state.debounce_ms[i]);
    }
    for (uint16_t i = 0; i < KEY_COUNT_DIAG; i++) {
        eeprom_update_byte((uint8_t *)(EEPROM_DIAG_CONFIG_ADDR + KEY_COUNT_DIAG + i), diag_state.eager_mode[i] ? 1 : 0);
    }
}

void diag_load_from_eeprom(void) {
    for (uint16_t i = 0; i < KEY_COUNT_DIAG; i++) {
        uint8_t val = eeprom_read_byte((uint8_t *)(EEPROM_DIAG_CONFIG_ADDR + i));
        if (val == 0xFF) val = 5;
        diag_state.debounce_ms[i] = val;
    }
    for (uint16_t i = 0; i < KEY_COUNT_DIAG; i++) {
        uint8_t val = eeprom_read_byte((uint8_t *)(EEPROM_DIAG_CONFIG_ADDR + KEY_COUNT_DIAG + i));
        diag_state.eager_mode[i] = (val != 0 && val != 0xFF);
    }
}
