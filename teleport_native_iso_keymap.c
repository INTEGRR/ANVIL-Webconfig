#include QMK_KEYBOARD_H
#include "raw_hid.h"

// Per-Key RGB Configuration
// Edit these arrays to customize each key's color

// Color for each key in HSV format (Hue: 0-255, Saturation: 0-255, Value: 0-255)
uint8_t ledmap[85][3] = {
    // Row 0: ESC, F1-F12, F13, PSCR, DEL (0-15) - 16 keys
    [0] = {0, 255, 255},     // ESC - Red
    [1] = {42, 255, 255},    // F1 - Orange
    [2] = {42, 255, 255},    // F2
    [3] = {42, 255, 255},    // F3
    [4] = {42, 255, 255},    // F4
    [5] = {85, 255, 255},    // F5 - Green
    [6] = {85, 255, 255},    // F6
    [7] = {85, 255, 255},    // F7
    [8] = {85, 255, 255},    // F8
    [9] = {127, 255, 255},   // F9 - Cyan
    [10] = {127, 255, 255},  // F10
    [11] = {127, 255, 255},  // F11
    [12] = {127, 255, 255},  // F12
    [13] = {170, 255, 255},  // F13 - Blue
    [14] = {170, 255, 255},  // Print Screen
    [15] = {170, 255, 255},  // Delete

    // Row 1: GRV, 1-0, MINS, EQL, BSPC, PGUP (16-30) - 15 keys
    [16] = {0, 255, 200},    // ^ (Grave)
    [17] = {21, 255, 200},   // 1
    [18] = {21, 255, 200},   // 2
    [19] = {21, 255, 200},   // 3
    [20] = {21, 255, 200},   // 4
    [21] = {21, 255, 200},   // 5
    [22] = {21, 255, 200},   // 6
    [23] = {21, 255, 200},   // 7
    [24] = {21, 255, 200},   // 8
    [25] = {21, 255, 200},   // 9
    [26] = {21, 255, 200},   // 0
    [27] = {21, 255, 200},   // - (Minus)
    [28] = {21, 255, 200},   // = (Equal)
    [29] = {0, 255, 200},    // Backspace
    [30] = {200, 255, 200},  // Page Up

    // Row 2: TAB, Q-P, LBRC, RBRC, PGDN (31-44) - 14 keys
    [31] = {127, 255, 200},  // Tab
    [32] = {42, 200, 255},   // Q - Alphas (orange tint)
    [33] = {42, 200, 255},   // W
    [34] = {42, 200, 255},   // E
    [35] = {42, 200, 255},   // R
    [36] = {42, 200, 255},   // T
    [37] = {42, 200, 255},   // Y
    [38] = {42, 200, 255},   // U
    [39] = {42, 200, 255},   // I
    [40] = {42, 200, 255},   // O
    [41] = {42, 200, 255},   // P
    [42] = {42, 200, 255},   // [ (Left Bracket)
    [43] = {42, 200, 255},   // ] (Right Bracket)
    [44] = {200, 255, 200},  // Page Down

    // Row 3: CAPS, A-L, SCLN, QUOT, NUHS, ENT, HOME (45-59) - 15 keys
    [45] = {170, 255, 200},  // Caps Lock
    [46] = {42, 200, 255},   // A
    [47] = {42, 200, 255},   // S
    [48] = {42, 200, 255},   // D
    [49] = {42, 200, 255},   // F
    [50] = {42, 200, 255},   // G
    [51] = {42, 200, 255},   // H
    [52] = {42, 200, 255},   // J
    [53] = {42, 200, 255},   // K
    [54] = {42, 200, 255},   // L
    [55] = {42, 200, 255},   // ; (Semicolon)
    [56] = {42, 200, 255},   // ' (Quote)
    [57] = {42, 200, 255},   // # (ISO hash key)
    [58] = {127, 255, 200},  // Enter
    [59] = {200, 255, 200},  // Home

    // Row 4: LSFT, NUBS, Z-M, COMM, DOT, SLSH, RSFT, UP, END (60-74) - 15 keys
    [60] = {170, 255, 200},  // Left Shift
    [61] = {42, 200, 255},   // < > | (ISO key)
    [62] = {42, 200, 255},   // Z
    [63] = {42, 200, 255},   // X
    [64] = {42, 200, 255},   // C
    [65] = {42, 200, 255},   // V
    [66] = {42, 200, 255},   // B
    [67] = {42, 200, 255},   // N
    [68] = {42, 200, 255},   // M
    [69] = {42, 200, 255},   // , (Comma)
    [70] = {42, 200, 255},   // . (Dot)
    [71] = {42, 200, 255},   // / (Slash)
    [72] = {170, 255, 200},  // Right Shift
    [73] = {212, 255, 255},  // Up Arrow
    [74] = {200, 255, 200},  // End

    // Row 5: LCTL, LGUI, LALT, SPC, RALT, FN, RCTL, LEFT, DOWN, RGHT (75-84) - 10 keys
    [75] = {170, 255, 200},  // Left Ctrl
    [76] = {170, 255, 200},  // Left Win/GUI
    [77] = {170, 255, 200},  // Left Alt
    [78] = {85, 200, 255},   // Space
    [79] = {170, 255, 200},  // Right Alt (AltGr)
    [80] = {170, 255, 200},  // Fn
    [81] = {170, 255, 200},  // Right Ctrl
    [82] = {212, 255, 255},  // Left Arrow
    [83] = {212, 255, 255},  // Down Arrow
    [84] = {212, 255, 255},  // Right Arrow
};

// Track if we're using custom per-key colors or RGB effects
bool use_per_key_colors = true;

void set_layer_color(int layer) {
    if (!use_per_key_colors) return;

    for (uint8_t i = 0; i < RGB_MATRIX_LED_COUNT; i++) {
        HSV hsv = {
            .h = ledmap[i][0],
            .s = ledmap[i][1],
            .v = ledmap[i][2]
        };
        RGB rgb = hsv_to_rgb(hsv);
        rgb_matrix_set_color(i, rgb.r, rgb.g, rgb.b);
    }
}

// ISO Layout definition for Teleport Native
const uint16_t PROGMEM keymaps[][MATRIX_ROWS][MATRIX_COLS] = {
    [0] = LAYOUT_75_iso(
        // Row 0: ESC, F1-F12, F13, PSCR, DEL (0-15) - 16 keys
        KC_ESC,  KC_F1,   KC_F2,   KC_F3,   KC_F4,   KC_F5,   KC_F6,   KC_F7,   KC_F8,   KC_F9,   KC_F10,  KC_F11,  KC_F12,  KC_F13,  KC_PSCR, KC_DEL,

        // Row 1: GRV, 1-0, MINS, EQL, BSPC, PGUP (16-30) - 15 keys
        KC_GRV,  KC_1,    KC_2,    KC_3,    KC_4,    KC_5,    KC_6,    KC_7,    KC_8,    KC_9,    KC_0,    KC_MINS, KC_EQL,  KC_BSPC,    KC_PGUP,

        // Row 2: TAB, Q-P, LBRC, RBRC, PGDN (31-44) - 14 keys
        KC_TAB,  KC_Q,    KC_W,    KC_E,    KC_R,    KC_T,    KC_Y,    KC_U,    KC_I,    KC_O,    KC_P,    KC_LBRC, KC_RBRC,             KC_PGDN,

        // Row 3: CAPS, A-L, SCLN, QUOT, NUHS, ENT, HOME (45-59) - 15 keys
        KC_CAPS, KC_A,    KC_S,    KC_D,    KC_F,    KC_G,    KC_H,    KC_J,    KC_K,    KC_L,    KC_SCLN, KC_QUOT, KC_NUHS, KC_ENT,     KC_HOME,

        // Row 4: LSFT, NUBS, Z-M, COMM, DOT, SLSH, RSFT, UP, END (60-74) - 15 keys
        KC_LSFT, KC_NUBS, KC_Z,    KC_X,    KC_C,    KC_V,    KC_B,    KC_N,    KC_M,    KC_COMM, KC_DOT,  KC_SLSH,          KC_RSFT,    KC_UP,   KC_END,

        // Row 5: LCTL, LGUI, LALT, SPC, RALT, FN, RCTL, LEFT, DOWN, RGHT (75-84) - 10 keys
        KC_LCTL, KC_LGUI, KC_LALT, KC_SPC, KC_RALT, MO(1), KC_RCTL, KC_LEFT, KC_DOWN, KC_RGHT
    ),

    [1] = LAYOUT_75_iso(
        // Layer 1: Function layer (hold Fn key)
        QK_BOOT, _______, _______, _______, _______, _______, _______, _______, _______, _______, _______, _______, _______, _______, RM_TOGG, RM_NEXT,

        _______, _______, _______, _______, _______, _______, _______, _______, _______, _______, _______, _______, _______, _______,    RM_PREV,
        _______, _______, _______, _______, _______, _______, _______, _______, _______, _______, _______, _______, _______,             KC_INS,
        _______, _______, _______, _______, _______, _______, _______, _______, _______, _______, _______, _______, _______, _______,    _______,
        _______, _______, _______, _______, _______, _______, _______, _______, _______, _______, _______, _______,          _______,    RM_VALU, _______,
        _______, _______, _______, _______, _______, _______, _______, RM_HUEU, RM_VALD, RM_HUED
    ),
};

// RGB Matrix indicator function - applies per-key colors
bool rgb_matrix_indicators_user(void) {
    if (rgb_matrix_get_flags() == LED_FLAG_NONE) {
        return false;
    }

    if (use_per_key_colors) {
        set_layer_color(get_highest_layer(layer_state));
    }
    return false;
}

// RAW HID for web control
void raw_hid_receive(uint8_t *data, uint8_t length) {
    uint8_t command = data[0];
    uint8_t response[32] = {0};

    switch (command) {
        case 0x01: // Set RGB mode
            if (data[1] == 0) {
                // Mode 0 = use per-key colors
                use_per_key_colors = true;
            } else {
                // Use RGB matrix effects
                use_per_key_colors = false;
                rgb_matrix_mode(data[1]);
            }
            break;

        case 0x02: // Set HSV
            rgb_matrix_sethsv(data[1], data[2], data[3]);
            break;

        case 0x03: // Set brightness
            rgb_matrix_sethsv(rgb_matrix_get_hue(), rgb_matrix_get_sat(), data[1]);
            break;

        case 0x04: // Set speed
            rgb_matrix_set_speed(data[1]);
            break;

        case 0x05: // Toggle RGB
            rgb_matrix_toggle();
            break;

        case 0x10: // Get status
            response[0] = 0x10;
            response[1] = rgb_matrix_get_mode();
            response[2] = rgb_matrix_get_hue();
            response[3] = rgb_matrix_get_sat();
            response[4] = rgb_matrix_get_val();
            response[5] = rgb_matrix_get_speed();
            response[6] = rgb_matrix_is_enabled() ? 1 : 0;
            raw_hid_send(response, 32);
            break;

        case 0x20: // Set individual key color
            {
                uint8_t key_index = data[1];
                uint8_t h = data[2];
                uint8_t s = data[3];
                uint8_t v = data[4];

                if (key_index < RGB_MATRIX_LED_COUNT) {
                    // Store the color permanently in RAM
                    ledmap[key_index][0] = h;
                    ledmap[key_index][1] = s;
                    ledmap[key_index][2] = v;

                    // Enable per-key mode
                    use_per_key_colors = true;
                }
            }
            break;

        case 0x21: // Bulk set key colors (up to 10 keys per packet)
            {
                uint8_t count = data[1]; // Number of keys in this packet
                if (count > 10) count = 10; // Safety limit

                for (uint8_t i = 0; i < count; i++) {
                    uint8_t offset = 2 + (i * 4);
                    uint8_t key_index = data[offset];
                    uint8_t h = data[offset + 1];
                    uint8_t s = data[offset + 2];
                    uint8_t v = data[offset + 3];

                    if (key_index < RGB_MATRIX_LED_COUNT) {
                        ledmap[key_index][0] = h;
                        ledmap[key_index][1] = s;
                        ledmap[key_index][2] = v;
                    }
                }

                use_per_key_colors = true;
            }
            break;

        case 0x30: // Get key colors (request range)
            {
                uint8_t start_index = data[1];
                uint8_t count = data[2];

                if (start_index < RGB_MATRIX_LED_COUNT) {
                    response[0] = 0x30;
                    response[1] = start_index;
                    response[2] = count;

                    // Send up to 7 keys per response (3 bytes each + 3 header bytes = 24 bytes)
                    if (count > 7) count = 7;

                    for (uint8_t i = 0; i < count && (start_index + i) < RGB_MATRIX_LED_COUNT; i++) {
                        uint8_t key_idx = start_index + i;
                        response[3 + (i * 3)] = ledmap[key_idx][0]; // H
                        response[4 + (i * 3)] = ledmap[key_idx][1]; // S
                        response[5 + (i * 3)] = ledmap[key_idx][2]; // V
                    }

                    raw_hid_send(response, 32);
                }
            }
            break;
    }
}
