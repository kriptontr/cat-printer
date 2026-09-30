/**
 * @module Constants
 */
/**
 * Advertisement service UUID for Cat Printers.
 */
export declare const CAT_ADV_SRV = 44848;
/**
 * Print service UUID for Cat Printers.
 */
export declare const CAT_PRINT_SRV = 44592;
/**
 * TX characteristic UUID for print data.
 */
export declare const CAT_PRINT_TX_CHAR = 44545;
/**
 * RX characteristic UUID for printer responses.
 */
export declare const CAT_PRINT_RX_CHAR = 44546;
/**
 * Default canvas width for text rendering.
 */
export declare const DEF_CANVAS_WIDTH = 384;
/**
 * Default print speed.
 */
export declare const DEF_SPEED = 32;
/**
 * Default print energy.
 */
export declare const DEF_ENERGY = 24000;
/**
 * Default finish feed lines.
 */
export declare const DEF_FINISH_FEED = 100;
/**
 * Default maximum number of bytes written to the printer in a single
 * Bluetooth write. Commands are batched up to this size.
 */
export declare const DEF_MTU = 200;
/**
 * Default pause (in milliseconds) after every Bluetooth write, so the
 * printer's small receive buffer is never overrun.
 */
export declare const DEF_CHUNK_DELAY = 20;
/**
 * Default number of blank lines printed at the start of every job. Some
 * printers (e.g. X5h) drop the first rows while the paper starts moving.
 */
export declare const DEF_LEAD_IN = 16;
/**
 * Maximum time (in milliseconds) to wait while the printer reports that it is
 * paused before giving up.
 */
export declare const DEF_PAUSE_TIMEOUT = 30000;
/**
 * Payload of the "lattice start" command that must precede bitmap data.
 */
export declare const LATTICE_START: Uint8Array<ArrayBuffer>;
/**
 * Payload of the "lattice end" command that must follow bitmap data.
 */
export declare const LATTICE_END: Uint8Array<ArrayBuffer>;
