RAW_ENABLE = yes

EXTRAFLAGS += -flto
OPT_DEFS += -DDIAG_MODE_ENABLED

SRC += ../lib/timer_us.c \
       ../lib/diag_mode.c
