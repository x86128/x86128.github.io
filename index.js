// prom/hello.ts
var BootRom = new Int32Array([
  1359019976,
  1375797216,
  1073745679,
  2686451712,
  1073742879,
  2685403136,
  1073742912,
  2685403136,
  1073742904,
  2685403136,
  1073742898,
  2685403136,
  1073742901,
  2685403136,
  1073742914,
  2685403136,
  1073741868,
  2685403136,
  1073741856,
  2685403136,
  1073742876,
  2685403136,
  1073742904,
  2685403136,
  1073742912,
  2685403136,
  1073741857,
  2685403136,
  1073741857,
  2685403136,
  1073741857,
  2685403136,
  1073745936,
  2686451712,
  1073741926,
  2685403136,
  1073741938,
  2685403136,
  1073741935,
  2685403136,
  1073741933,
  2685403136,
  1073741856,
  2685403136,
  1073741911,
  2685403136,
  1073741929,
  2685403136,
  1073741938,
  2685403136,
  1073741940,
  2685403136,
  1073741928,
  2685403136,
  1073741863,
  2685403136,
  1073741939,
  2685403136,
  1073741856,
  2685403136,
  1073741906,
  2685403136,
  1073741897,
  2685403136,
  1073741907,
  2685403136,
  1073741891,
  2685403136,
  1073741869,
  2685403136,
  1073741877,
  2685403136,
  3892314111
]);
var hello_default = BootRom;

// risc5.ts
var tracing = false;
var opMOV = 0;
var opLSL = 1;
var opASR = 2;
var opROR = 3;
var opAND = 4;
var opANN = 5;
var opIOR = 6;
var opXOR = 7;
var opADD = 8;
var opSUB = 9;
var opMUL = 10;
var opDIV = 11;
var cMI = 0;
var cEQ = 1;
var cCS = 2;
var cVS = 3;
var cLS = 4;
var cLT = 5;
var cLE = 6;
var cT = 7;
var ROMStartAddress = 4294965248;
var ROMEndAddress = 4294967232;
var RAMStartAddress = 0;
var RAMEndAddress = RAMStartAddress + 1048576;
var IOStartAddress = 4294967232;
var bit = (w, b) => {
  return w >>> b & 1;
};
var hex32 = (w) => {
  return `0x${(w >>> 0).toString(16).padStart(8, "0")}`;
};

class Risc5 {
  PC;
  R;
  H;
  N;
  Z;
  C;
  V;
  ram;
  rom;
  devices;
  constructor(ram, rom, devices) {
    this.PC = ROMStartAddress / 4;
    this.R = new Int32Array(16);
    this.H = 0;
    this.N = this.Z = this.C = this.V = false;
    this.rom = rom;
    this.ram = ram;
    this.devices = devices;
  }
  reset() {
    this.PC = ROMStartAddress / 4;
    this.R = new Int32Array(16);
  }
  loadWord(address) {
    let adr = address >>> 0;
    if (adr >= 0 && adr < RAMEndAddress)
      return this.ram[adr >> 2];
    else if (adr >= ROMStartAddress && adr < ROMEndAddress)
      return this.rom[adr - ROMStartAddress >> 2];
    else if (adr >= IOStartAddress)
      return this.loadIO(adr);
    throw Error(`Reading from void: ${adr}`);
  }
  loadIO(address) {
    let adr = address >>> 0;
    let res = 0;
    if (adr == 4294967252) {
      res = 1;
    } else if (adr == 4294967236) {
      res = 0;
    }
    if (tracing)
      console.log(`Load IO: Ra <- (${hex32(adr)}) ; ${hex32(res)}`);
    return res;
  }
  storeWord(address, data) {
    let adr = address >>> 0;
    if (adr >= 0 && adr < RAMEndAddress)
      this.ram[adr >> 2] = data;
    else if (adr >= IOStartAddress)
      this.storeIO(adr, data);
  }
  storeIO(address, data) {
    let adr = address >>> 0;
    if (adr == 4294967236) {
      this.devices["terminal"].setXY(0, 29);
      this.devices["terminal"].puts(`LEDs: ${(data & 255).toString(2)}`);
      if (tracing)
        console.log(`LEDs: ${(data & 255).toString(2)}`);
    } else if (adr == 4294967240) {
      this.devices["terminal"].puts(String.fromCharCode(data & 65535));
    } else if (adr == 4294967264) {
      this.devices["terminal"].setXY(data & 255, data >> 8 & 255);
    }
    if (tracing)
      console.log(`Store IO: (${adr.toString(16)}) <- ${data.toString(16)}`);
  }
  setReg(Ra, A) {
    this.R[Ra >>> 0 & 15] = A;
    this.N = A < 0;
    this.Z = A == 0;
  }
  step() {
    let IR = this.loadWord(this.PC << 2) >>> 0;
    let PC_next = this.PC + 1;
    const p = bit(IR, 31);
    const q = bit(IR, 30);
    const u = bit(IR, 29);
    const v = bit(IR, 28);
    const Ra = IR >>> 24 & 15;
    const Rb = IR >>> 20 & 15;
    const op = IR >>> 16 & 15;
    const Rc = IR & 15;
    let A = this.R[Ra] | 0;
    const B = this.R[Rb] | 0;
    let C = 0;
    if (tracing)
      console.log(`${hex32(this.PC << 2)}: IR:${hex32(IR)}`);
    if (p == 0) {
      if (q == 0) {
        C = this.R[Rc];
      } else {
        if (u == 0) {
          if (v == 0) {
            C = IR & 65535;
          } else {
            C = 4294901760 | IR & 65535;
          }
        } else {
          if (v == 0) {
            C = (IR & 65535) << 16 | 0;
          } else {
            C = this.H;
          }
        }
      }
    }
    if (p == 0) {
      switch (op) {
        case opMOV:
          A = C;
          break;
        case opLSL:
          A = B << C;
          break;
        case opASR:
          A = B >> (C & 31);
          break;
        case opROR:
          A = B >>> (C ^ 31) | B << 32 - (C ^ 31);
          break;
        case opAND:
          A = B & C;
          break;
        case opANN:
          A = B & ~C;
          break;
        case opIOR:
          A = B | C;
          break;
        case opXOR:
          A = B ^ C;
          break;
        case opADD:
          A = B + C;
          break;
        case opSUB:
          A = B - C;
          break;
        case opMUL:
          A = B * C;
          break;
        case opDIV:
          A = B / C;
          this.H = B % C;
          break;
        default:
          throw Error(`Unimpl instr: ${hex32(op)}`);
      }
      this.setReg(Ra, A);
    } else if (p == 1 && q == 0) {
      let adr = IR & 1048575;
      if (adr > 524287)
        adr -= 1048576;
      if (u == 0) {
        A = this.loadWord(adr + B);
        this.setReg(Ra, A);
      } else {
        this.storeWord(adr + B, A);
      }
    } else {
      let cc = Ra;
      let t = false;
      switch (cc & 7) {
        case cMI:
          t = this.N;
          break;
        case cEQ:
          t = this.Z;
          break;
        case cCS:
          t = this.C;
          break;
        case cVS:
          t = this.V;
          break;
        case cLS:
          t = !this.C || this.Z;
          break;
        case cLT:
          t = this.N != this.V;
          break;
        case cLE:
          t = this.N != this.V || this.Z;
          break;
        case cT:
          t = true;
          break;
      }
      if (cc > 7)
        t = !t;
      let link = v == 1;
      if (link) {
        this.R[15] = PC_next << 2;
      }
      let off = IR & 16777215;
      if (off >= 8388608) {
        off -= 16777216;
      }
      if (t) {
        if (u == 0) {
          PC_next = this.R[Rc] >> 2;
        } else {
          PC_next = PC_next + off;
        }
      }
    }
    this.PC = PC_next;
  }
}
var risc5_default = Risc5;

// term.ts
class Terminal {
  #ctx;
  #fontImage;
  #cursorState = false;
  #curX = 0;
  #curY = 0;
  #videoRam = Array(2400);
  constructor(canvas) {
    this.#ctx = canvas.getContext("2d");
    this.#ctx.fillStyle = "black";
    this.#ctx.fillRect(0, 0, 640, 480);
  }
  async loadFont() {
    this.#fontImage = new Image;
    this.#fontImage.src = "img/Main.png";
    return new Promise((resolve, reject) => {
      this.#fontImage.onload = (ev) => {
        resolve(ev);
      };
      this.#fontImage.onerror = (re) => {
        console.log("Font loading err");
        reject(re);
      };
    });
  }
  #drawCursor = () => {
    this.#cursorState = !this.#cursorState;
    this.#ctx.fillRect(this.#curX * 8, this.#curY * 16, 8, 16);
    this.printChar(this.#videoRam[this.#curX + this.#curY * 80]);
    if (this.#cursorState) {
      this.printChar(641);
    }
  };
  printChar = (code) => {
    if (1024 <= code && code <= 1280) {
      code -= 256;
    }
    if (code != 641) {
    }
    const fx = code % 16 * 8;
    const fy = (code / 16 & 65535) * 16;
    this.#ctx.drawImage(this.#fontImage, fx, fy, 8, 16, this.#curX * 8, this.#curY * 16, 8, 16);
  };
  putChar = (char) => {
    let key = char.codePointAt(0);
    this.#ctx.fillRect(this.#curX * 8, this.#curY * 16, 8, 16);
    this.printChar(this.#videoRam[this.#curX + this.#curY * 80]);
    this.#videoRam[this.#curX + this.#curY * 80] = key;
    this.printChar(key);
    this.#curX++;
    if (this.#curX >= 80) {
      this.#curX = 0;
      this.#curY++;
    }
    if (this.#curY >= 30) {
      this.#curY = 0;
    }
  };
  setXY(x, y) {
    this.#curX = x % 80;
    this.#curY = y % 30;
  }
  puts(s) {
    for (let c of s) {
      this.putChar(c);
    }
  }
}
var term_default = Terminal;

// index.ts
var canvas = document.getElementById("screen");
var term2 = new term_default(canvas);
var ram = new Int32Array(262144);
var rom = hello_default;
var cpu = new risc5_default(ram, rom, { terminal: term2 });
term2.loadFont().then(() => {
  for (let i = 0;i < 200; i++) {
    cpu.step();
  }
});
