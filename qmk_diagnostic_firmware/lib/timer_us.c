#include "timer_us.h"
#include "ch.h"
#include "hal.h"

#ifndef F_CPU
#define F_CPU 168000000UL
#endif

static uint32_t cyccnt_offset = 0;

void timer_us_init(void) {
    CoreDebug->DEMCR |= CoreDebug_DEMCR_TRCENA_Msk;

    DWT->CTRL |= DWT_CTRL_CYCCNTENA_Msk;

    DWT->CYCCNT = 0;
    cyccnt_offset = 0;
}

uint32_t timer_read_us(void) {
    uint32_t cycles = DWT->CYCCNT + cyccnt_offset;

    return (uint32_t)((uint64_t)cycles * 1000000ULL / F_CPU);
}

uint32_t timer_elapsed_us(uint32_t last) {
    uint32_t now = timer_read_us();

    if (now >= last) {
        return now - last;
    } else {
        return (UINT32_MAX - last) + now + 1;
    }
}
