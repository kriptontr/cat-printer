/**
 * @module CatPrinter
 */

import {
  CAT_ADV_SRV,
  CAT_PRINT_SRV,
  CAT_PRINT_TX_CHAR,
  CAT_PRINT_RX_CHAR,
  DEF_CANVAS_WIDTH,
  DEF_SPEED,
  DEF_ENERGY,
  DEF_FINISH_FEED,
  DEF_MTU,
  DEF_CHUNK_DELAY,
  DEF_LEAD_IN,
  DEF_PAUSE_TIMEOUT,
  LATTICE_START,
  LATTICE_END,
} from './constants';
import { Command, CommandType } from './enums';
import {
  PrinterOptions,
  TextOptions,
  ImageOptions,
  PrinterState,
} from './types';
import { crc8, rgbaToBits, intToBytes, delay } from './utils';
import {
  ThresholdDithering,
  BayerDithering,
  FloydSteinbergDithering,
  DotDithering,
} from './dithering';

/**
 * Cat Printer
 * A library to connect and print with Bluetooth "Cat Printers".
 */
export class CatPrinter {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private txCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private rxCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private printerState: PrinterState = {
    outOfPaper: false,
    coverOpen: false,
    overheat: false,
    lowPower: false,
    paused: false,
    busy: false,
  };
  private options: PrinterOptions;
  private modelName: string = '';
  /**
   * Command bytes queued but not yet written to the printer.
   * See {@link send} and {@link flush}.
   */
  private pending: number[] = [];

  /**
   * Creates an instance of the CatPrinter.
   * @param options Optional settings for the SDK.
   */
  constructor(options: PrinterOptions = {}) {
    this.options = {
      debug: false,
      speed: DEF_SPEED,
      energy: DEF_ENERGY,
      finishFeed: DEF_FINISH_FEED,
      mtu: DEF_MTU,
      chunkDelay: DEF_CHUNK_DELAY,
      leadIn: DEF_LEAD_IN,
      lattice: true,
      startRetract: 0,
      ...options,
    };
  }

  /**
   * Connect to a Cat Printer device.
   * @returns A Promise that resolves with the initial printer state when connected.
   * @throws Error if Bluetooth is not available or connection fails.
   */
  async connect(): Promise<PrinterState> {
    if (!navigator.bluetooth) {
      throw new Error('Bluetooth API is not available in this browser');
    }

    try {
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [CAT_ADV_SRV] }],
        optionalServices: [CAT_PRINT_SRV],
      });

      this.modelName = this.device.name || '';
      this.log(`Connected to printer model: ${this.modelName}`);

      if (!this.device.gatt) {
        throw new Error('Bluetooth GATT not available');
      }

      this.server = await this.device.gatt.connect();
      const service = await this.server.getPrimaryService(CAT_PRINT_SRV);

      this.txCharacteristic =
        await service.getCharacteristic(CAT_PRINT_TX_CHAR);
      this.rxCharacteristic =
        await service.getCharacteristic(CAT_PRINT_RX_CHAR);

      await this.rxCharacteristic.startNotifications();
      this.rxCharacteristic.addEventListener(
        'characteristicvaluechanged',
        this.handleNotification.bind(this)
      );

      this.pending = [];
      await this.getDeviceState();

      return this.printerState;
    } catch (error) {
      console.error('Connection error:', error);
      throw error;
    }
  }

  /**
   * Disconnect from the printer.
   * @returns A Promise that resolves when disconnected.
   */
  async disconnect(): Promise<void> {
    if (this.rxCharacteristic) {
      try {
        await this.rxCharacteristic.stopNotifications();
      } catch (e) {
        this.log('Error stopping notifications:', e);
      }
    }

    if (this.server && this.server.connected) {
      this.server.disconnect();
    }

    this.device = null;
    this.server = null;
    this.txCharacteristic = null;
    this.rxCharacteristic = null;
    this.pending = [];
    this.log('Disconnected from printer');
  }

  /**
   * Get the current printer state.
   * @returns The current printer state object.
   */
  getState(): PrinterState {
    return { ...this.printerState };
  }

  /**
   * Check if the printer is currently connected.
   * @returns True if connected, false otherwise.
   */
  isConnected(): boolean {
    return this.server?.connected === true && this.txCharacteristic !== null;
  }

  /**
   * Print text content.
   * The printer is prepared before and finished (with the configured
   * `finishFeed`) after the text.
   * @param text The text to print.
   * @param options Optional text formatting options.
   * @returns A Promise that resolves when printing is complete.
   * @throws Error if the printer is not connected.
   */
  async printText(text: string, options: TextOptions = {}): Promise<void> {
    this.assertConnected();

    await this.prepare(this.options.speed!, this.options.energy!);
    await this.printTextContent(text, options);
    await this.finish(this.options.finishFeed!);
  }

  /**
   * Print an image from a URL.
   * The printer is prepared before and finished (with the configured
   * `finishFeed`) after the image.
   * @param imageUrl The URL of the image to print.
   * @param options Optional image formatting options.
   * @returns A Promise that resolves when printing is complete.
   * @throws Error if the printer is not connected or the image fails to load.
   */
  async printImage(
    imageUrl: string,
    options: ImageOptions = {}
  ): Promise<void> {
    this.assertConnected();

    await this.prepare(this.options.speed!, this.options.energy!);
    await this.printImageContent(imageUrl, options);
    await this.finish(this.options.finishFeed!);
  }

  /**
   * Print multiple items (text or images) in sequence as a single job.
   * @param items An array of items to print, each with a type ('text' or 'image'), content, and optional options.
   * @returns A Promise that resolves when all items are printed.
   * @throws Error if the printer is not connected.
   */
  async printMultiple(
    items: Array<{
      type: 'text' | 'image';
      content: string;
      options?: TextOptions | ImageOptions;
    }>
  ): Promise<void> {
    this.assertConnected();

    await this.prepare(this.options.speed!, this.options.energy!);

    for (const item of items) {
      if (item.type === 'text') {
        await this.printTextContent(
          item.content,
          (item.options as TextOptions) || {}
        );
      } else if (item.type === 'image') {
        await this.printImageContent(
          item.content,
          (item.options as ImageOptions) || {}
        );
      }
    }

    await this.finish(this.options.finishFeed!);
  }

  /**
   * Feed paper forward by a specified number of lines.
   * @param lines The number of lines to feed.
   * @returns A Promise that resolves when the feed command is sent.
   */
  async feed(lines: number): Promise<void> {
    if (lines <= 0) return;
    await this.transmit(Command.Feed, intToBytes(lines, 2));
  }

  /**
   * Retract paper (reverse feed) by a specified number of lines.
   * @param lines The number of lines to retract.
   * @returns A Promise that resolves when the retract command is sent.
   */
  async retract(lines: number): Promise<void> {
    if (lines <= 0) return;
    await this.transmit(Command.Retract, intToBytes(lines, 2));
  }

  /**
   * Set the print speed.
   * @param speed The print speed value (0-255, lower is faster).
   * @returns A Promise that resolves when the speed command is sent.
   */
  async setSpeed(speed: number): Promise<void> {
    await this.transmit(Command.Speed, intToBytes(speed, 1));
  }

  /**
   * Set the print energy/density.
   * @param energy The energy value (0-65535).
   * @returns A Promise that resolves when the energy command is sent.
   */
  async setEnergy(energy: number): Promise<void> {
    await this.transmit(Command.Energy, intToBytes(energy, 2));
  }

  /**
   * Apply the current energy settings to the printer.
   * @returns A Promise that resolves when the apply energy command is sent.
   */
  async applyEnergy(): Promise<void> {
    await this.transmit(Command.ApplyEnergy, intToBytes(1, 1));
  }

  /**
   * Set the print resolution to 200 DPI (the only mode supported).
   * @returns A Promise that resolves when the command is sent.
   */
  async setDpi(): Promise<void> {
    await this.transmit(Command.SetDpi, intToBytes(50, 1));
  }

  /**
   * Ask the printer to apply its updated settings.
   * @returns A Promise that resolves when the command is sent.
   */
  async updateDevice(): Promise<void> {
    await this.transmit(Command.UpdateDevice, intToBytes(0, 1));
  }

  /**
   * Send the "lattice start" sequence that has to precede bitmap data.
   * @returns A Promise that resolves when the command is sent.
   */
  async startLattice(): Promise<void> {
    await this.transmit(Command.Lattice, LATTICE_START);
  }

  /**
   * Send the "lattice end" sequence that has to follow bitmap data.
   * @returns A Promise that resolves when the command is sent.
   */
  async endLattice(): Promise<void> {
    await this.transmit(Command.Lattice, LATTICE_END);
  }

  /**
   * Get the current device state from the printer.
   * The state is updated asynchronously when the printer answers.
   * @returns A Promise that resolves with the last known printer state.
   */
  async getDeviceState(): Promise<PrinterState> {
    await this.transmit(Command.GetDeviceState, intToBytes(0, 1));
    return this.printerState;
  }

  /**
   * Prepare the printer for a print job: query state, set DPI, speed and
   * energy, and open the lattice so bitmap lines are accepted.
   * @param speed The print speed.
   * @param energy The print energy/density.
   * @returns A Promise that resolves when the prepare commands are sent.
   */
  async prepare(speed: number, energy: number): Promise<void> {
    await this.flush();
    await this.queue(Command.GetDeviceState, intToBytes(0, 1));
    await this.queue(Command.SetDpi, intToBytes(50, 1));
    await this.queue(Command.Speed, intToBytes(speed, 1));
    await this.queue(Command.Energy, intToBytes(energy, 2));
    await this.queue(Command.ApplyEnergy, intToBytes(1, 1));
    if (this.options.lattice) {
      await this.queue(Command.UpdateDevice, intToBytes(0, 1));
      await this.queue(Command.Lattice, LATTICE_START);
    }
    if (this.options.startRetract! > 0) {
      // Pull back the blank paper left over from the previous job's feed.
      await this.queue(Command.Speed, intToBytes(8, 1));
      await this.queue(
        Command.Retract,
        intToBytes(this.options.startRetract!, 2)
      );
      await this.queue(Command.Speed, intToBytes(speed, 1));
    }
    // Blank lines first: some printers drop the first rows of a job.
    const blank = new Uint8Array(DEF_CANVAS_WIDTH / 8);
    for (let i = 0; i < this.options.leadIn!; i++) {
      await this.queue(Command.Bitmap, blank);
    }
    await this.flush();
  }

  /**
   * Finish a print job: close the lattice and optionally feed paper.
   * @param feed The number of lines to feed at the end of printing. Default is 0.
   * @returns A Promise that resolves when the finish commands are sent.
   */
  async finish(feed: number = 0): Promise<void> {
    await this.flush();
    if (this.options.lattice) {
      await this.queue(Command.Lattice, LATTICE_END);
    }
    await this.queue(Command.Speed, intToBytes(8, 1)); // Slower speed for final feed
    if (feed > 0) {
      await this.queue(Command.Feed, intToBytes(feed, 2));
    }
    await this.queue(Command.GetDeviceState, intToBytes(0, 1));
    await this.flush();
  }

  /**
   * Draw a single line of bitmap data to the printer.
   * @param line The bitmap line data as a Uint8Array (1 bit per pixel, LSB first).
   * @returns A Promise that resolves when the draw command is sent.
   * @throws Error if the printer is not connected.
   */
  async draw(line: Uint8Array): Promise<void> {
    this.assertConnected();
    await this.transmit(Command.Bitmap, line);
  }

  /**
   * Print a full bitmap.
   * Blank rows at the top and bottom are trimmed; blank rows inside the image
   * are printed so the image keeps its proportions. Lines are batched into
   * MTU-sized chunks with a short pause between them so the printer's
   * receive buffer is not overrun.
   * @param bitmap An object containing the width, height, and bitmap data.
   * @returns A Promise that resolves when the entire bitmap has been sent.
   */
  async printBitmap(bitmap: {
    width: number;
    height: number;
    data: Uint8Array;
  }): Promise<void> {
    const { width, height, data } = bitmap;
    const pitch = Math.ceil(width / 8); // Bytes per line

    const isBlank = (y: number): boolean => {
      const start = y * pitch;
      for (let i = start; i < start + pitch; i++) {
        if (data[i] !== 0) return false;
      }
      return true;
    };

    let first = 0;
    while (first < height && isBlank(first)) first++;
    let last = height - 1;
    while (last > first && isBlank(last)) last--;

    for (let y = first; y <= last; y++) {
      const line = data.subarray(y * pitch, (y + 1) * pitch);
      await this.queue(Command.Bitmap, line);
    }

    await this.flush();
  }

  /**
   * Write every queued command to the printer.
   * Waits while the printer reports that it is paused (its buffer is full).
   * @returns A Promise that resolves when the queue is empty.
   */
  async flush(): Promise<void> {
    if (this.pending.length === 0) return;

    const chunk = new Uint8Array(this.pending);
    this.pending = [];
    await this.writeChunk(chunk);
  }

  // Private methods

  /**
   * Throw if the printer is not connected.
   */
  private assertConnected(): void {
    if (!this.isConnected()) {
      throw new Error('Printer not connected');
    }
  }

  /**
   * Queue a command. Commands are batched up to `mtu` bytes and written by
   * {@link flush}. A command that does not fit in the current batch causes
   * the batch to be written first.
   * @param command The command to send.
   * @param payload The data payload for the command.
   */
  private async queue(command: Command, payload: Uint8Array): Promise<void> {
    await this.send(this.makeCommand(command, payload));
  }

  /**
   * Queue a command and write it immediately.
   * @param command The command to send.
   * @param payload The data payload for the command.
   */
  private async transmit(command: Command, payload: Uint8Array): Promise<void> {
    await this.queue(command, payload);
    await this.flush();
  }

  /**
   * Add a complete command packet to the outgoing queue.
   * @param packet The command packet.
   */
  private async send(packet: Uint8Array): Promise<void> {
    const mtu = Math.max(1, this.options.mtu!);

    if (this.pending.length > 0 && this.pending.length + packet.length > mtu) {
      await this.flush();
    }

    if (packet.length > mtu) {
      // The printer parses a byte stream, so a packet larger than the MTU can
      // be split at arbitrary boundaries.
      for (let i = 0; i < packet.length; i += mtu) {
        await this.writeChunk(packet.subarray(i, i + mtu));
      }
      return;
    }

    for (let i = 0; i < packet.length; i++) {
      this.pending.push(packet[i]);
    }
  }

  /**
   * Write one chunk to the printer, honouring pause notifications and the
   * configured delay between writes.
   * @param chunk The bytes to write.
   */
  private async writeChunk(chunk: Uint8Array): Promise<void> {
    await this.waitWhilePaused();
    await this.write(chunk);
    const pause = this.options.chunkDelay!;
    if (pause > 0) {
      await delay(pause);
    }
  }

  /**
   * Wait while the printer reports that it is paused.
   * @throws Error if the printer stays paused longer than the timeout.
   */
  private async waitWhilePaused(): Promise<void> {
    const start = Date.now();
    while (this.printerState.paused) {
      if (Date.now() - start > DEF_PAUSE_TIMEOUT) {
        throw new Error(
          'Printer stayed paused for too long (check paper and cover)'
        );
      }
      await delay(100);
    }
  }

  /**
   * Create a command packet to send to the printer.
   * @param command The command to send.
   * @param payload The data payload for the command.
   * @param type The type of command (Transfer or Response). Default is Transfer.
   * @returns The complete command packet as a Uint8Array.
   */
  private makeCommand(
    command: Command,
    payload: Uint8Array,
    type: CommandType = CommandType.Transfer
  ): Uint8Array {
    return new Uint8Array([
      0x51,
      0x78,
      command,
      type,
      payload.length & 0xff,
      payload.length >> 8,
      ...payload,
      crc8(payload),
      0xff,
    ]);
  }

  /**
   * Send data to the printer via the TX characteristic.
   * @param data The data to send as a Uint8Array.
   * @returns A Promise that resolves when the data is written.
   * @throws Error if the printer is not properly connected.
   */
  private async write(data: Uint8Array): Promise<void> {
    if (!this.txCharacteristic) {
      throw new Error('Printer not properly connected');
    }

    this.log(
      'Sending data:',
      Array.from(data)
        .map(b => b.toString(16).padStart(2, '0'))
        .join(' ')
    );

    try {
      await this.txCharacteristic.writeValueWithoutResponse(data);
    } catch (error) {
      this.log('Error writing to printer:', error);
      throw error;
    }
  }

  /**
   * Handle incoming notifications from the printer via the RX characteristic.
   * @param event The characteristicvaluechanged event.
   */
  private handleNotification(event: Event): void {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const value = target.value;
    if (!value) return;

    const data = new Uint8Array(
      value.buffer,
      value.byteOffset,
      value.byteLength
    );
    this.log(
      'Received notification:',
      Array.from(data)
        .map(b => b.toString(16).padStart(2, '0'))
        .join(' ')
    );

    // Handle printer state update (also sent spontaneously as pause/resume)
    if (data.length >= 7 && data[2] === Command.GetDeviceState) {
      const state = data[6];
      this.printerState = {
        outOfPaper: !!(state & 0x01),
        coverOpen: !!(state & 0x02),
        overheat: !!(state & 0x04),
        lowPower: !!(state & 0x08),
        paused: !!(state & 0x10),
        busy: !!(state & 0x80),
      };

      this.log('Printer state updated:', this.printerState);
    }
  }

  /**
   * Feed or retract paper before printing an item.
   * @param offset Lines to feed (positive) or retract (negative).
   */
  private async applyOffset(offset: number | undefined): Promise<void> {
    if (!offset || offset === 0) return;

    await this.setSpeed(8); // Slower speed for feeding
    if (offset > 0) {
      await this.feed(offset);
    } else {
      await this.retract(-offset);
    }
    await this.setSpeed(this.options.speed!);
  }

  /**
   * Render and send text as part of an already prepared job.
   * @param text The text to print.
   * @param options Text formatting options.
   */
  private async printTextContent(
    text: string,
    options: TextOptions
  ): Promise<void> {
    const defaultOptions: TextOptions = {
      fontFamily: 'sans-serif',
      fontSize: 16,
      align: 'start',
      lineSpacing: 8,
      rotate: 0,
      flipH: false,
      flipV: false,
      brightness: 128,
      offset: 0,
    };

    const mergedOptions = { ...defaultOptions, ...options };

    const bitmapData = await this.textToBitmap(text, mergedOptions);

    await this.applyOffset(mergedOptions.offset);
    await this.printBitmap(bitmapData);
  }

  /**
   * Render and send an image as part of an already prepared job.
   * @param imageUrl The URL of the image to print.
   * @param options Image formatting options.
   */
  private async printImageContent(
    imageUrl: string,
    options: ImageOptions
  ): Promise<void> {
    const defaultOptions: ImageOptions = {
      dither: 'bayer', // Default to Bayer dithering as suggested
      rotate: 0,
      flipH: false,
      flipV: false,
      brightness: 128,
      offset: 0,
    };

    const mergedOptions = { ...defaultOptions, ...options };

    const bitmapData = await this.imageToBitmap(imageUrl, mergedOptions);

    await this.applyOffset(mergedOptions.offset);
    await this.printBitmap(bitmapData);
  }

  /**
   * Convert text to a bitmap for printing.
   * @param text The text to convert.
   * @param options Text formatting options.
   * @returns A Promise that resolves with the bitmap data.
   */
  private async textToBitmap(
    text: string,
    options: TextOptions
  ): Promise<{ width: number; height: number; data: Uint8Array }> {
    // Create canvas for rendering text
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    // Set canvas dimensions
    canvas.width = DEF_CANVAS_WIDTH;
    canvas.height = 500; // Start with a tall canvas and we'll trim it

    // Clear canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Set text properties
    ctx.fillStyle = 'black';
    const fontWeight = options.fontWeight ? `${options.fontWeight} ` : '';
    ctx.font = `${fontWeight}${options.fontSize}px ${options.fontFamily}`;
    ctx.textAlign =
      options.align === 'start'
        ? 'left'
        : options.align === 'end'
          ? 'right'
          : (options.align as CanvasTextAlign);

    // Measure and draw the text with line breaks
    const lines = text.split('\n');
    const lineHeight = options.fontSize! + (options.lineSpacing || 8);
    let y = options.fontSize!;

    for (const line of lines) {
      const x =
        options.align === 'start'
          ? 0
          : options.align === 'end'
            ? canvas.width
            : canvas.width / 2;

      ctx.fillText(line, x, y);
      y += lineHeight;
    }

    // Trim canvas to actual content height
    const trimmedCanvas = document.createElement('canvas');
    trimmedCanvas.width = canvas.width;
    trimmedCanvas.height = y;

    const trimmedCtx = trimmedCanvas.getContext('2d')!;
    trimmedCtx.drawImage(canvas, 0, 0);

    // Apply transformations if needed
    if (options.rotate !== 0 || options.flipH || options.flipV) {
      const transformCanvas = document.createElement('canvas');
      transformCanvas.width = trimmedCanvas.width;
      transformCanvas.height = trimmedCanvas.height;
      const transformCtx = transformCanvas.getContext('2d')!;

      transformCtx.save();
      transformCtx.translate(
        transformCanvas.width / 2,
        transformCanvas.height / 2
      );

      if (options.rotate && options.rotate !== 0) {
        transformCtx.rotate((options.rotate * Math.PI) / 180);
      }

      if (options.flipH) transformCtx.scale(-1, 1);
      if (options.flipV) transformCtx.scale(1, -1);

      transformCtx.drawImage(
        trimmedCanvas,
        -trimmedCanvas.width / 2,
        -trimmedCanvas.height / 2
      );

      transformCtx.restore();
      trimmedCanvas.width = transformCanvas.width;
      trimmedCanvas.height = transformCanvas.height;
      trimmedCtx.drawImage(transformCanvas, 0, 0);
    }

    // Get image data and convert to bitmap
    const imageData = trimmedCtx.getImageData(
      0,
      0,
      trimmedCanvas.width,
      trimmedCanvas.height
    );
    const rgba = new Uint32Array(imageData.data.buffer);
    const bitmap = rgbaToBits(rgba);

    return {
      width: trimmedCanvas.width,
      height: trimmedCanvas.height,
      data: bitmap,
    };
  }

  private async imageToBitmap(
    imageUrl: string,
    options: ImageOptions
  ): Promise<{
    width: number;
    height: number;
    data: Uint8Array;
    dataurl: string;
  }> {
    // Load the image
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const imageLoadPromise = new Promise<HTMLImageElement>(
      (resolve, reject) => {
        img.onload = () => resolve(img);
        img.onerror = () =>
          reject(new Error(`Failed to load image: ${imageUrl}`));
        img.src = imageUrl;
      }
    );

    const loadedImg = await imageLoadPromise;

    // Create canvas and draw image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    // Force width to printer width and calculate height based on aspect ratio
    const targetWidth = DEF_CANVAS_WIDTH;
    const aspectRatio = loadedImg.width / loadedImg.height;
    const targetHeight = Math.floor(targetWidth / aspectRatio);

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // Clear canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw image, scaling to the new dimensions
    ctx.drawImage(loadedImg, 0, 0, targetWidth, targetHeight);

    // Apply transformations if needed
    if (options.rotate !== 0 || options.flipH || options.flipV) {
      const transformCanvas = document.createElement('canvas');
      transformCanvas.width = canvas.width;
      transformCanvas.height = canvas.height;
      const transformCtx = transformCanvas.getContext('2d')!;

      transformCtx.save();
      transformCtx.translate(
        transformCanvas.width / 2,
        transformCanvas.height / 2
      );

      if (options.rotate && options.rotate !== 0) {
        transformCtx.rotate((options.rotate * Math.PI) / 180);
      }

      if (options.flipH) transformCtx.scale(-1, 1);
      if (options.flipV) transformCtx.scale(1, -1);

      transformCtx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);

      transformCtx.restore();
      canvas.width = transformCanvas.width;
      canvas.height = transformCanvas.height;
      ctx.drawImage(transformCanvas, 0, 0);
    }

    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    let processedImageData = imageData;

    // Apply dithering
    if (options.dither && options.dither !== 'none') {
      if (options.dither === 'threshold') {
        const ditherer = new ThresholdDithering();
        processedImageData = ditherer.dither(imageData, options);
      } else if (options.dither === 'bayer') {
        const ditherer = new BayerDithering();
        processedImageData = ditherer.dither(imageData, options);
      } else if (options.dither === 'floyd-steinberg') {
        const ditherer = new FloydSteinbergDithering();
        processedImageData = ditherer.dither(imageData, options);
      } else if (options.dither === 'dot') {
        const ditherer = new DotDithering();
        processedImageData = ditherer.dither(imageData, options);
      }
      ctx.putImageData(processedImageData, 0, 0); // Put the modified data back to the canvas
    }

    // Get image data again after dithering and convert to bitmap
    const finalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const rgba = new Uint32Array(finalImageData.data.buffer);
    let thresholdValue = 128;
    if (options.dither === 'threshold') {
      thresholdValue =
        options.brightness !== undefined ? options.brightness : 128;
    } else if (options.dither === 'none') {
      thresholdValue =
        options.brightness !== undefined ? options.brightness : 128; // You might want to adjust the default here
    }
    const bitmap = rgbaToBits(rgba, thresholdValue);
    const dataurl = canvas.toDataURL('image/png');

    return {
      width: canvas.width,
      height: canvas.height,
      data: bitmap,
      dataurl: dataurl,
    };
  }

  /**
   * Log debug information to the console if debugging is enabled.
   * @param args Arguments to log.
   */
  private log(...args: any): void {
    if (this.options.debug) {
      console.log('[CatPrinter]', ...args);
    }
  }
}
