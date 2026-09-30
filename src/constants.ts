/**
 * @module Constants
 */

/**
 * Advertisement service UUID for Cat Printers.
 */
export const CAT_ADV_SRV = 0xaf30;

/**
 * Print service UUID for Cat Printers.
 */
export const CAT_PRINT_SRV = 0xae30;

/**
 * TX characteristic UUID for print data.
 */
export const CAT_PRINT_TX_CHAR = 0xae01;

/**
 * RX characteristic UUID for printer responses.
 */
export const CAT_PRINT_RX_CHAR = 0xae02;

/**
 * Default canvas width for text rendering.
 */
export const DEF_CANVAS_WIDTH = 384;

/**
 * Default print speed.
 */
export const DEF_SPEED = 32;

/**
 * Default print energy.
 */
export const DEF_ENERGY = 24000;

/**
 * Default finish feed lines.
 */
export const DEF_FINISH_FEED = 100;

/**
 * Default maximum number of bytes written to the printer in a single
 * Bluetooth write. Commands are batched up to this size.
 */
export const DEF_MTU = 200;

/**
 * Default pause (in milliseconds) after every Bluetooth write, so the
 * printer's small receive buffer is never overrun.
 */
export const DEF_CHUNK_DELAY = 20;

/**
 * Default number of blank lines printed at the start of every job. Some
 * printers (e.g. X5h) drop the first rows while the paper starts moving.
 */
export const DEF_LEAD_IN = 16;

/**
 * Maximum time (in milliseconds) to wait while the printer reports that it is
 * paused before giving up.
 */
export const DEF_PAUSE_TIMEOUT = 30000;

/**
 * Payload of the "lattice start" command that must precede bitmap data.
 */
export const LATTICE_START = new Uint8Array([
  0xaa, 0x55, 0x17, 0x38, 0x44, 0x5f, 0x5f, 0x5f, 0x44, 0x38, 0x2c,
]);

/**
 * Payload of the "lattice end" command that must follow bitmap data.
 */
export const LATTICE_END = new Uint8Array([
  0xaa, 0x55, 0x17, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x17,
]);
