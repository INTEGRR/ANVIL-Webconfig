RAW_ENABLE = yes

EXTRAFLAGS += -flto
OPT_DEFS += -DDIAG_MODE_ENABLED

EEPROM_DRIVER = wear_leveling
WEAR_LEVELING_DRIVER = embedded_flash

SRC += ../lib/timer_us.c \
       ../lib/diag_mode.c
