var P = Object.defineProperty;
var M = (s, t, e) => t in s ? P(s, t, { enumerable: !0, configurable: !0, writable: !0, value: e }) : s[t] = e;
var D = (s, t, e) => M(s, typeof t != "symbol" ? t + "" : t, e);
const B = 44848, q = 44592, H = 44545, V = 44546, L = 384, O = 32, G = 24e3, W = 100, k = 200, z = 20, X = 16, Y = 3e4, _ = new Uint8Array([
  170,
  85,
  23,
  56,
  68,
  95,
  95,
  95,
  68,
  56,
  44
]), b = new Uint8Array([
  170,
  85,
  23,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  23
]);
var l = /* @__PURE__ */ ((s) => (s[s.ApplyEnergy = 190] = "ApplyEnergy", s[s.GetDeviceState = 163] = "GetDeviceState", s[s.GetDeviceInfo = 168] = "GetDeviceInfo", s[s.UpdateDevice = 169] = "UpdateDevice", s[s.SetDpi = 164] = "SetDpi", s[s.Lattice = 166] = "Lattice", s[s.Retract = 160] = "Retract", s[s.Feed = 161] = "Feed", s[s.Speed = 189] = "Speed", s[s.Energy = 175] = "Energy", s[s.Bitmap = 162] = "Bitmap", s))(l || {}), T = /* @__PURE__ */ ((s) => (s[s.Transfer = 0] = "Transfer", s[s.Response = 1] = "Response", s))(T || {});
function N(s) {
  let t = 0;
  for (const e of s) {
    t ^= e;
    for (let i = 0; i < 8; i++)
      t & 128 ? t = t << 1 ^ 7 : t <<= 1;
    t &= 255;
  }
  return t;
}
function A(s, t = 128) {
  const e = new Uint8Array(Math.ceil(s.length / 8));
  for (let i = 0; i < s.length; i++) {
    const r = Math.floor(i / 8), n = i % 8, a = s[i], o = a & 255, h = a >> 8 & 255, c = a >> 16 & 255;
    (o + h + c) / 3 < t && (e[r] |= 1 << n);
  }
  return e;
}
function f(s, t = 1) {
  const e = 2 ** (8 * t) - 1;
  let i = Math.max(0, Math.min(e, Math.round(s)));
  const r = new Uint8Array(t);
  for (let n = 0; n < t; n++)
    r[n] = i & 255, i = Math.floor(i / 256);
  return r;
}
function x(s) {
  return new Promise((t) => setTimeout(t, s));
}
class I {
  /**
   * Applies threshold dithering to the image data.
   * @param imageData The ImageData object.
   * @param options Image options, specifically the brightness threshold.
   * @returns The dithered ImageData.
   */
  dither(t, e) {
    const i = t.data, r = e.brightness !== void 0 ? e.brightness : 128;
    for (let n = 0; n < i.length; n += 4) {
      const o = (i[n] + i[n + 1] + i[n + 2]) / 3 < r ? 0 : 255;
      i[n] = i[n + 1] = i[n + 2] = o;
    }
    return t;
  }
}
class C {
  constructor() {
    D(this, "thresholdMap", [
      [0, 2],
      [3, 1]
    ]);
  }
  /**
   * Applies Bayer dithering to the image data.
   * @param imageData The ImageData object.
   * @param _options Image options (not directly used in this algorithm).
   * @returns The dithered ImageData.
   */
  dither(t, e) {
    const i = t.data, r = t.width, n = t.height;
    for (let a = 0; a < n; a++)
      for (let o = 0; o < r; o++) {
        const h = (a * r + o) * 4, c = i[h], d = i[h + 1], u = i[h + 2], E = (c + d + u) / 3, v = (this.thresholdMap[a % 2][o % 2] + 1) * (255 / 5), w = E < v ? 0 : 255;
        i[h] = i[h + 1] = i[h + 2] = w;
      }
    return t;
  }
}
class R {
  /**
   * Applies Floyd-Steinberg dithering to the image data.
   * @param imageData The ImageData object.
   * @param _options Image options (not directly used in this algorithm).
   * @returns The dithered ImageData.
   */
  dither(t, e) {
    const i = t.data, r = t.width, n = t.height;
    for (let a = 0; a < n; a++)
      for (let o = 0; o < r; o++) {
        const h = (a * r + o) * 4, c = i[h], d = i[h + 1], u = i[h + 2], v = (c + d + u) / 3 < 128 ? 0 : 255, w = v, p = v, m = v;
        i[h] = w, i[h + 1] = p, i[h + 2] = m;
        const S = c - w, g = d - p, y = u - m;
        this.distributeError(
          i,
          r,
          o + 1,
          a,
          S * 7 / 16,
          g * 7 / 16,
          y * 7 / 16
        ), this.distributeError(
          i,
          r,
          o - 1,
          a + 1,
          S * 3 / 16,
          g * 3 / 16,
          y * 3 / 16
        ), this.distributeError(
          i,
          r,
          o,
          a + 1,
          S * 5 / 16,
          g * 5 / 16,
          y * 5 / 16
        ), this.distributeError(
          i,
          r,
          o + 1,
          a + 1,
          S * 1 / 16,
          g * 1 / 16,
          y * 1 / 16
        );
      }
    return t;
  }
  distributeError(t, e, i, r, n, a, o) {
    if (i >= 0 && i < e && r >= 0 && r < t.length / (e * 4)) {
      const h = (r * e + i) * 4;
      t[h] = Math.max(0, Math.min(255, t[h] + n)), t[h + 1] = Math.max(0, Math.min(255, t[h + 1] + a)), t[h + 2] = Math.max(0, Math.min(255, t[h + 2] + o));
    }
  }
}
class F {
  dither(t, e) {
    const i = t.data, r = t.width, n = t.height, a = 4, o = new Uint8ClampedArray(i.length);
    for (let h = 3; h < i.length; h += 4)
      o[h] = i[h];
    for (let h = 0; h < n; h++)
      for (let c = 0; c < r; c++) {
        const d = (h * r + c) * 4, u = (i[d] + i[d + 1] + i[d + 2]) / 3, E = Math.floor((255 - u) / 50), v = Math.floor(c / a) * a, w = Math.floor(h / a) * a, p = c - v, m = h - w, g = Math.sqrt(
          (p - a / 2) ** 2 + (m - a / 2) ** 2
        ) < E ? 0 : 255;
        o[d] = o[d + 1] = o[d + 2] = g;
      }
    return new ImageData(o, r, n);
  }
}
const $ = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  BayerDithering: C,
  DotDithering: F,
  FloydSteinbergDithering: R,
  ThresholdDithering: I
}, Symbol.toStringTag, { value: "Module" }));
class j {
  /**
   * Creates an instance of the CatPrinter.
   * @param options Optional settings for the SDK.
   */
  constructor(t = {}) {
    D(this, "device", null);
    D(this, "server", null);
    D(this, "txCharacteristic", null);
    D(this, "rxCharacteristic", null);
    D(this, "printerState", {
      outOfPaper: !1,
      coverOpen: !1,
      overheat: !1,
      lowPower: !1,
      paused: !1,
      busy: !1
    });
    D(this, "options");
    D(this, "modelName", "");
    /**
     * Command bytes queued but not yet written to the printer.
     * See {@link send} and {@link flush}.
     */
    D(this, "pending", []);
    this.options = {
      debug: !1,
      speed: 32,
      energy: 24e3,
      finishFeed: 100,
      mtu: 200,
      chunkDelay: 20,
      leadIn: 16,
      lattice: !0,
      startRetract: 0,
      ...t
    };
  }
  /**
   * Connect to a Cat Printer device.
   * @returns A Promise that resolves with the initial printer state when connected.
   * @throws Error if Bluetooth is not available or connection fails.
   */
  async connect() {
    if (!navigator.bluetooth)
      throw new Error("Bluetooth API is not available in this browser");
    try {
      if (this.device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [44848] }],
        optionalServices: [44592]
      }), this.modelName = this.device.name || "", this.log(`Connected to printer model: ${this.modelName}`), !this.device.gatt)
        throw new Error("Bluetooth GATT not available");
      this.server = await this.device.gatt.connect();
      const t = await this.server.getPrimaryService(44592);
      return this.txCharacteristic = await t.getCharacteristic(44545), this.rxCharacteristic = await t.getCharacteristic(44546), await this.rxCharacteristic.startNotifications(), this.rxCharacteristic.addEventListener(
        "characteristicvaluechanged",
        this.handleNotification.bind(this)
      ), this.pending = [], await this.getDeviceState(), this.printerState;
    } catch (t) {
      throw console.error("Connection error:", t), t;
    }
  }
  /**
   * Disconnect from the printer.
   * @returns A Promise that resolves when disconnected.
   */
  async disconnect() {
    if (this.rxCharacteristic)
      try {
        await this.rxCharacteristic.stopNotifications();
      } catch (t) {
        this.log("Error stopping notifications:", t);
      }
    this.server && this.server.connected && this.server.disconnect(), this.device = null, this.server = null, this.txCharacteristic = null, this.rxCharacteristic = null, this.pending = [], this.log("Disconnected from printer");
  }
  /**
   * Get the current printer state.
   * @returns The current printer state object.
   */
  getState() {
    return { ...this.printerState };
  }
  /**
   * Check if the printer is currently connected.
   * @returns True if connected, false otherwise.
   */
  isConnected() {
    var t;
    return ((t = this.server) == null ? void 0 : t.connected) === !0 && this.txCharacteristic !== null;
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
  async printText(t, e = {}) {
    this.assertConnected(), await this.prepare(this.options.speed, this.options.energy), await this.printTextContent(t, e), await this.finish(this.options.finishFeed);
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
  async printImage(t, e = {}) {
    this.assertConnected(), await this.prepare(this.options.speed, this.options.energy), await this.printImageContent(t, e), await this.finish(this.options.finishFeed);
  }
  /**
   * Print multiple items (text or images) in sequence as a single job.
   * @param items An array of items to print, each with a type ('text' or 'image'), content, and optional options.
   * @returns A Promise that resolves when all items are printed.
   * @throws Error if the printer is not connected.
   */
  async printMultiple(t) {
    this.assertConnected(), await this.prepare(this.options.speed, this.options.energy);
    for (const e of t)
      e.type === "text" ? await this.printTextContent(
        e.content,
        e.options || {}
      ) : e.type === "image" && await this.printImageContent(
        e.content,
        e.options || {}
      );
    await this.finish(this.options.finishFeed);
  }
  /**
   * Feed paper forward by a specified number of lines.
   * @param lines The number of lines to feed.
   * @returns A Promise that resolves when the feed command is sent.
   */
  async feed(t) {
    t <= 0 || await this.transmit(l.Feed, f(t, 2));
  }
  /**
   * Retract paper (reverse feed) by a specified number of lines.
   * @param lines The number of lines to retract.
   * @returns A Promise that resolves when the retract command is sent.
   */
  async retract(t) {
    t <= 0 || await this.transmit(l.Retract, f(t, 2));
  }
  /**
   * Set the print speed.
   * @param speed The print speed value (0-255, lower is faster).
   * @returns A Promise that resolves when the speed command is sent.
   */
  async setSpeed(t) {
    await this.transmit(l.Speed, f(t, 1));
  }
  /**
   * Set the print energy/density.
   * @param energy The energy value (0-65535).
   * @returns A Promise that resolves when the energy command is sent.
   */
  async setEnergy(t) {
    await this.transmit(l.Energy, f(t, 2));
  }
  /**
   * Apply the current energy settings to the printer.
   * @returns A Promise that resolves when the apply energy command is sent.
   */
  async applyEnergy() {
    await this.transmit(l.ApplyEnergy, f(1, 1));
  }
  /**
   * Set the print resolution to 200 DPI (the only mode supported).
   * @returns A Promise that resolves when the command is sent.
   */
  async setDpi() {
    await this.transmit(l.SetDpi, f(50, 1));
  }
  /**
   * Ask the printer to apply its updated settings.
   * @returns A Promise that resolves when the command is sent.
   */
  async updateDevice() {
    await this.transmit(l.UpdateDevice, f(0, 1));
  }
  /**
   * Send the "lattice start" sequence that has to precede bitmap data.
   * @returns A Promise that resolves when the command is sent.
   */
  async startLattice() {
    await this.transmit(l.Lattice, _);
  }
  /**
   * Send the "lattice end" sequence that has to follow bitmap data.
   * @returns A Promise that resolves when the command is sent.
   */
  async endLattice() {
    await this.transmit(l.Lattice, b);
  }
  /**
   * Get the current device state from the printer.
   * The state is updated asynchronously when the printer answers.
   * @returns A Promise that resolves with the last known printer state.
   */
  async getDeviceState() {
    return await this.transmit(l.GetDeviceState, f(0, 1)), this.printerState;
  }
  /**
   * Prepare the printer for a print job: query state, set DPI, speed and
   * energy, and open the lattice so bitmap lines are accepted.
   * @param speed The print speed.
   * @param energy The print energy/density.
   * @returns A Promise that resolves when the prepare commands are sent.
   */
  async prepare(t, e) {
    await this.flush(), await this.queue(l.GetDeviceState, f(0, 1)), await this.queue(l.SetDpi, f(50, 1)), await this.queue(l.Speed, f(t, 1)), await this.queue(l.Energy, f(e, 2)), await this.queue(l.ApplyEnergy, f(1, 1)), this.options.lattice && (await this.queue(l.UpdateDevice, f(0, 1)), await this.queue(l.Lattice, _)), this.options.startRetract > 0 && (await this.queue(l.Speed, f(8, 1)), await this.queue(
      l.Retract,
      f(this.options.startRetract, 2)
    ), await this.queue(l.Speed, f(t, 1)));
    const i = new Uint8Array(384 / 8);
    for (let r = 0; r < this.options.leadIn; r++)
      await this.queue(l.Bitmap, i);
    await this.flush();
  }
  /**
   * Finish a print job: close the lattice and optionally feed paper.
   * @param feed The number of lines to feed at the end of printing. Default is 0.
   * @returns A Promise that resolves when the finish commands are sent.
   */
  async finish(t = 0) {
    await this.flush(), this.options.lattice && await this.queue(l.Lattice, b), await this.queue(l.Speed, f(8, 1)), t > 0 && await this.queue(l.Feed, f(t, 2)), await this.queue(l.GetDeviceState, f(0, 1)), await this.flush();
  }
  /**
   * Draw a single line of bitmap data to the printer.
   * @param line The bitmap line data as a Uint8Array (1 bit per pixel, LSB first).
   * @returns A Promise that resolves when the draw command is sent.
   * @throws Error if the printer is not connected.
   */
  async draw(t) {
    this.assertConnected(), await this.transmit(l.Bitmap, t);
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
  async printBitmap(t) {
    const { width: e, height: i, data: r } = t, n = Math.ceil(e / 8), a = (c) => {
      const d = c * n;
      for (let u = d; u < d + n; u++)
        if (r[u] !== 0) return !1;
      return !0;
    };
    let o = 0;
    for (; o < i && a(o); ) o++;
    let h = i - 1;
    for (; h > o && a(h); ) h--;
    for (let c = o; c <= h; c++) {
      const d = r.subarray(c * n, (c + 1) * n);
      await this.queue(l.Bitmap, d);
    }
    await this.flush();
  }
  /**
   * Write every queued command to the printer.
   * Waits while the printer reports that it is paused (its buffer is full).
   * @returns A Promise that resolves when the queue is empty.
   */
  async flush() {
    if (this.pending.length === 0) return;
    const t = new Uint8Array(this.pending);
    this.pending = [], await this.writeChunk(t);
  }
  // Private methods
  /**
   * Throw if the printer is not connected.
   */
  assertConnected() {
    if (!this.isConnected())
      throw new Error("Printer not connected");
  }
  /**
   * Queue a command. Commands are batched up to `mtu` bytes and written by
   * {@link flush}. A command that does not fit in the current batch causes
   * the batch to be written first.
   * @param command The command to send.
   * @param payload The data payload for the command.
   */
  async queue(t, e) {
    await this.send(this.makeCommand(t, e));
  }
  /**
   * Queue a command and write it immediately.
   * @param command The command to send.
   * @param payload The data payload for the command.
   */
  async transmit(t, e) {
    await this.queue(t, e), await this.flush();
  }
  /**
   * Add a complete command packet to the outgoing queue.
   * @param packet The command packet.
   */
  async send(t) {
    const e = Math.max(1, this.options.mtu);
    if (this.pending.length > 0 && this.pending.length + t.length > e && await this.flush(), t.length > e) {
      for (let i = 0; i < t.length; i += e)
        await this.writeChunk(t.subarray(i, i + e));
      return;
    }
    for (let i = 0; i < t.length; i++)
      this.pending.push(t[i]);
  }
  /**
   * Write one chunk to the printer, honouring pause notifications and the
   * configured delay between writes.
   * @param chunk The bytes to write.
   */
  async writeChunk(t) {
    await this.waitWhilePaused(), await this.write(t);
    const e = this.options.chunkDelay;
    e > 0 && await x(e);
  }
  /**
   * Wait while the printer reports that it is paused.
   * @throws Error if the printer stays paused longer than the timeout.
   */
  async waitWhilePaused() {
    const t = Date.now();
    for (; this.printerState.paused; ) {
      if (Date.now() - t > 3e4)
        throw new Error(
          "Printer stayed paused for too long (check paper and cover)"
        );
      await x(100);
    }
  }
  /**
   * Create a command packet to send to the printer.
   * @param command The command to send.
   * @param payload The data payload for the command.
   * @param type The type of command (Transfer or Response). Default is Transfer.
   * @returns The complete command packet as a Uint8Array.
   */
  makeCommand(t, e, i = T.Transfer) {
    return new Uint8Array([
      81,
      120,
      t,
      i,
      e.length & 255,
      e.length >> 8,
      ...e,
      N(e),
      255
    ]);
  }
  /**
   * Send data to the printer via the TX characteristic.
   * @param data The data to send as a Uint8Array.
   * @returns A Promise that resolves when the data is written.
   * @throws Error if the printer is not properly connected.
   */
  async write(t) {
    if (!this.txCharacteristic)
      throw new Error("Printer not properly connected");
    this.log(
      "Sending data:",
      Array.from(t).map((e) => e.toString(16).padStart(2, "0")).join(" ")
    );
    try {
      await this.txCharacteristic.writeValueWithoutResponse(t);
    } catch (e) {
      throw this.log("Error writing to printer:", e), e;
    }
  }
  /**
   * Handle incoming notifications from the printer via the RX characteristic.
   * @param event The characteristicvaluechanged event.
   */
  handleNotification(t) {
    const i = t.target.value;
    if (!i) return;
    const r = new Uint8Array(
      i.buffer,
      i.byteOffset,
      i.byteLength
    );
    if (this.log(
      "Received notification:",
      Array.from(r).map((n) => n.toString(16).padStart(2, "0")).join(" ")
    ), r.length >= 7 && r[2] === l.GetDeviceState) {
      const n = r[6];
      this.printerState = {
        outOfPaper: !!(n & 1),
        coverOpen: !!(n & 2),
        overheat: !!(n & 4),
        lowPower: !!(n & 8),
        paused: !!(n & 16),
        busy: !!(n & 128)
      }, this.log("Printer state updated:", this.printerState);
    }
  }
  /**
   * Feed or retract paper before printing an item.
   * @param offset Lines to feed (positive) or retract (negative).
   */
  async applyOffset(t) {
    !t || t === 0 || (await this.setSpeed(8), t > 0 ? await this.feed(t) : await this.retract(-t), await this.setSpeed(this.options.speed));
  }
  /**
   * Render and send text as part of an already prepared job.
   * @param text The text to print.
   * @param options Text formatting options.
   */
  async printTextContent(t, e) {
    const r = { ...{
      fontFamily: "sans-serif",
      fontSize: 16,
      align: "start",
      lineSpacing: 8,
      rotate: 0,
      flipH: !1,
      flipV: !1,
      brightness: 128,
      offset: 0
    }, ...e }, n = await this.textToBitmap(t, r);
    await this.applyOffset(r.offset), await this.printBitmap(n);
  }
  /**
   * Render and send an image as part of an already prepared job.
   * @param imageUrl The URL of the image to print.
   * @param options Image formatting options.
   */
  async printImageContent(t, e) {
    const r = { ...{
      dither: "bayer",
      // Default to Bayer dithering as suggested
      rotate: 0,
      flipH: !1,
      flipV: !1,
      brightness: 128,
      offset: 0
    }, ...e }, n = await this.imageToBitmap(t, r);
    await this.applyOffset(r.offset), await this.printBitmap(n);
  }
  /**
   * Convert text to a bitmap for printing.
   * @param text The text to convert.
   * @param options Text formatting options.
   * @returns A Promise that resolves with the bitmap data.
   */
  async textToBitmap(t, e) {
    const i = document.createElement("canvas"), r = i.getContext("2d");
    i.width = 384, i.height = 500, r.fillStyle = "white", r.fillRect(0, 0, i.width, i.height), r.fillStyle = "black";
    const n = e.fontWeight ? `${e.fontWeight} ` : "";
    r.font = `${n}${e.fontSize}px ${e.fontFamily}`, r.textAlign = e.align === "start" ? "left" : e.align === "end" ? "right" : e.align;
    const a = t.split(`
`), o = e.fontSize + (e.lineSpacing || 8);
    let h = e.fontSize;
    for (const w of a) {
      const p = e.align === "start" ? 0 : e.align === "end" ? i.width : i.width / 2;
      r.fillText(w, p, h), h += o;
    }
    const c = document.createElement("canvas");
    c.width = i.width, c.height = h;
    const d = c.getContext("2d");
    if (d.drawImage(i, 0, 0), e.rotate !== 0 || e.flipH || e.flipV) {
      const w = document.createElement("canvas");
      w.width = c.width, w.height = c.height;
      const p = w.getContext("2d");
      p.save(), p.translate(
        w.width / 2,
        w.height / 2
      ), e.rotate && e.rotate !== 0 && p.rotate(e.rotate * Math.PI / 180), e.flipH && p.scale(-1, 1), e.flipV && p.scale(1, -1), p.drawImage(
        c,
        -c.width / 2,
        -c.height / 2
      ), p.restore(), c.width = w.width, c.height = w.height, d.drawImage(w, 0, 0);
    }
    const u = d.getImageData(
      0,
      0,
      c.width,
      c.height
    ), E = new Uint32Array(u.data.buffer), v = A(E);
    return {
      width: c.width,
      height: c.height,
      data: v
    };
  }
  async imageToBitmap(t, e) {
    const i = new Image();
    i.crossOrigin = "anonymous";
    const n = await new Promise(
      (g, y) => {
        i.onload = () => g(i), i.onerror = () => y(new Error(`Failed to load image: ${t}`)), i.src = t;
      }
    ), a = document.createElement("canvas"), o = a.getContext("2d"), h = 384, c = n.width / n.height, d = Math.floor(h / c);
    if (a.width = h, a.height = d, o.fillStyle = "white", o.fillRect(0, 0, a.width, a.height), o.drawImage(n, 0, 0, h, d), e.rotate !== 0 || e.flipH || e.flipV) {
      const g = document.createElement("canvas");
      g.width = a.width, g.height = a.height;
      const y = g.getContext("2d");
      y.save(), y.translate(
        g.width / 2,
        g.height / 2
      ), e.rotate && e.rotate !== 0 && y.rotate(e.rotate * Math.PI / 180), e.flipH && y.scale(-1, 1), e.flipV && y.scale(1, -1), y.drawImage(a, -a.width / 2, -a.height / 2), y.restore(), a.width = g.width, a.height = g.height, o.drawImage(g, 0, 0);
    }
    const u = o.getImageData(0, 0, a.width, a.height);
    let E = u;
    e.dither && e.dither !== "none" && (e.dither === "threshold" ? E = new I().dither(u, e) : e.dither === "bayer" ? E = new C().dither(u, e) : e.dither === "floyd-steinberg" ? E = new R().dither(u, e) : e.dither === "dot" && (E = new F().dither(u, e)), o.putImageData(E, 0, 0));
    const v = o.getImageData(0, 0, a.width, a.height), w = new Uint32Array(v.data.buffer);
    let p = 128;
    (e.dither === "threshold" || e.dither === "none") && (p = e.brightness !== void 0 ? e.brightness : 128);
    const m = A(w, p), S = a.toDataURL("image/png");
    return {
      width: a.width,
      height: a.height,
      data: m,
      dataurl: S
    };
  }
  /**
   * Log debug information to the console if debugging is enabled.
   * @param args Arguments to log.
   */
  log(...t) {
    this.options.debug && console.log("[CatPrinter]", ...t);
  }
}
export {
  B as CAT_ADV_SRV,
  V as CAT_PRINT_RX_CHAR,
  q as CAT_PRINT_SRV,
  H as CAT_PRINT_TX_CHAR,
  j as CatPrinter,
  l as Command,
  T as CommandType,
  L as DEF_CANVAS_WIDTH,
  z as DEF_CHUNK_DELAY,
  G as DEF_ENERGY,
  W as DEF_FINISH_FEED,
  X as DEF_LEAD_IN,
  k as DEF_MTU,
  Y as DEF_PAUSE_TIMEOUT,
  O as DEF_SPEED,
  $ as Dithering,
  b as LATTICE_END,
  _ as LATTICE_START,
  N as crc8,
  x as delay,
  f as intToBytes,
  A as rgbaToBits
};
