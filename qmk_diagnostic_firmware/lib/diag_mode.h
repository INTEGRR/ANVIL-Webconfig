#pragma once

#include <stdint.h>
#include <stdbool.h>

#define DIAG_CMD_EDGE 0x50
#define DIAG_CMD_SCAN_SUMMARY 0x51
#define DIAG_CMD_METRICS_DUMP 0x52
#define DIAG_CMD_ENABLE 0x5A
#define DIAG_CMD_RESET 0x5B
#define DIAG_CMD_SET_DEBOUNCE 0x5C
#define DIAG_CMD_SET_EAGER 0x5D
#define DIAG_CMD_SAVE_EEPROM 0x4A
#define DIAG_CMD_LOAD_EEPROM 0x4B
#define DIAG_CMD_SET_SCANMASK 0x5E

#define MATRIX_ROWS_DIAG 6
#define MATRIX_COLS_DIAG 15
#define KEY_COUNT_DIAG 85
#define BITMAP_STRIDE ((MATRIX_COLS_DIAG + 7) / 8)

typedef struct {
    bool enabled;
    uint8_t scan_div;
    uint32_t scan_counter;
    uint32_t ghost_events;
    uint32_t actuations[KEY_COUNT_DIAG];
    uint32_t chatter[KEY_COUNT_DIAG];
    uint8_t debounce_ms[KEY_COUNT_DIAG];
    bool eager_mode[KEY_COUNT_DIAG];
    uint8_t stuck_rows;
    uint8_t stuck_cols;
} diag_state_t;

void diag_init(void);

void diag_process_command(uint8_t *data, uint8_t len);

void diag_on_pre_debounce_edge(uint8_t key, bool pressed, uint32_t timestamp_us, uint32_t scan_id);

void diag_on_post_debounce_edge(uint8_t key, bool pressed, uint32_t timestamp_us, uint32_t scan_id);

void diag_on_scan_complete(const uint8_t *matrix_bitmap, uint32_t timestamp_us, uint32_t scan_id);

void diag_send_edge_event(uint8_t key, uint8_t phase, uint8_t kind, uint32_t timestamp_us, uint32_t scan_id);

void diag_send_scan_summary(const uint8_t *bitmap, uint32_t timestamp_us, uint32_t scan_id);

void diag_send_metrics_dump(void);

uint8_t diag_get_debounce(uint8_t key);

bool diag_is_eager(uint8_t key);

void diag_save_to_eeprom(void);

void diag_load_from_eeprom(void);
