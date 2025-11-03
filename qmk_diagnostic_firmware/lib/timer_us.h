#pragma once

#include <stdint.h>

void timer_us_init(void);

uint32_t timer_read_us(void);

uint32_t timer_elapsed_us(uint32_t last);
