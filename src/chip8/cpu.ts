import MMU from './mmu';

const REGISTERS_SIZE = 16;
const STACK_SIZE = 16;
const VIDEO_SIZE = 2048;
const INPUT_SIZE = 16;

const FLAG = 0xF;

const UNSIGNED_8_BIT_MIN = 0;
const UNSIGNED_8_BIT_MAX = 255;

export default class CPU {
  private mmu: MMU;
  private registers: Uint8Array;
  private stack: Uint16Array;
  private video: Uint8Array;
  private input: Uint8Array;
  private delayTimer: number;
  private soundTimer: number;
  private sp: number;
  private pc: number;
  private i: number;

  constructor(mmu: MMU) {
    this.mmu = mmu;

    this.reset();
  }

  reset(): void {
    this.registers = new Uint8Array(REGISTERS_SIZE);
    this.stack = new Uint16Array(STACK_SIZE);
    this.video = new Uint8Array(VIDEO_SIZE);
    this.input = new Uint8Array(INPUT_SIZE);

    this.delayTimer = 0;
    this.soundTimer = 0;
    this.sp = 0;
    this.pc = 0x200;
    this.i = 0;
  }

  getVideoBuffer(): Uint8Array {
    return this.video;
  }

  step(): void {
    console.log('Address:', this.pc.toString(16));

    const instruction = this.mmu.read_word(this.pc);

    this.execute(instruction);

    if (this.delayTimer > 0) {
      this.delayTimer--;
    }

    if (this.soundTimer > 0) {
      if (this.soundTimer === 1) {
        console.log('BEEP');
      }

      this.soundTimer--;
    }
  }

  execute(instruction: number): void {
    console.log('Instruction:', instruction.toString(16));

    if (instruction === 0x00E0) {
      this.cls();
    } else if (instruction === 0x00EE) {
      this.ret();
    } else if (instruction >= 0x1000 && instruction <= 0x1FFF) {
      this.jp(instruction);
    } else if (instruction >= 0x2000 && instruction <= 0x2FFF) {
      this.call(instruction);
    } else if (instruction >= 0x3000 && instruction <= 0x3FFF) {
      this.seV(instruction);
    } else if (instruction >= 0x4000 && instruction <= 0x4FFF) {
      this.sneV(instruction);
    } else if (instruction >= 0x6000 && instruction <= 0x6FFF) {
      this.ldV(instruction);
    } else if (instruction >= 0x7000 && instruction <= 0x7FFF) {
      this.addV(instruction);
    } else if (instruction >= 0x8000 && instruction <= 0x8FFF) {
      const maskedInstruction = instruction & 0x000F;

      if (maskedInstruction === 0x0000) {
        this.ldVV(instruction);
      } else {
        this.missingInstruction(instruction);
      }

    } else if (instruction >= 0x9000 && instruction <= 0x9FFF) {
      this.sneVV(instruction);
    } else if (instruction >= 0xA000 && instruction <= 0xAFFF) {
      this.ldI(instruction);
    } else if (instruction >= 0xC000 && instruction <= 0xCFFF) {
      this.rndV(instruction);
    } else if (instruction >= 0xD000 && instruction <= 0xDFFF) {
      this.drwVV(instruction);
    } else if (instruction >= 0xE000 && instruction <= 0xEFFF) {
      const maskedInstruction = instruction & 0x00FF;

      if (maskedInstruction === 0x009E) {
        this.skpV(instruction);
      } else if (maskedInstruction === 0x00A1) {
        this.sknpV(instruction);
      } else {
        this.missingInstruction(instruction);
      }

    } else if (instruction >= 0xF000 && instruction <= 0xFFFF) {
      const maskedInstruction = instruction & 0x00FF;

      if (maskedInstruction === 0x0007) {
        this.ldVDt(instruction);
      } else if (maskedInstruction === 0x0015) {
        this.ldDtV(instruction);
      } else if (maskedInstruction === 0x001E) {
        this.addIV(instruction);
      } else {
        this.missingInstruction(instruction);
      }

    }
    else {
      this.missingInstruction(instruction);
    }
  }

  // 0x00E0
  cls(): void {
    this.video = new Uint8Array(VIDEO_SIZE);

    this.pc += 2;
  }

  // 0x00EE
  ret(): void {
    this.sp -= 1;
    this.pc = this.stack[this.sp] + 2;
  }

  // 0x1nnn
  jp(instruction: number): void {
    this.pc = instruction & 0x0FFF;
  }

  // 0x2nnn
  call(instruction: number): void {
    this.stack[this.sp] = this.pc;
    this.sp += 1;
    this.pc = instruction & 0x0FFF;
  }

  // 0x3xkk
  seV(instruction: number): void {
    const [register, value] = this.registerAndValueFrom(instruction);

    if (this.registers[register] === value) {
      this.pc += 4;
    } else {
      this.pc += 2;
    }
  }

  // 0x4xkk
  sneV(instruction: number): void {
    const [register, value] = this.registerAndValueFrom(instruction);

    if (this.registers[register] !== value) {
      this.pc += 4;
    } else {
      this.pc += 2;
    }
  }

  // 0x6xkk
  ldV(instruction: number): void {
    const [register, value] = this.registerAndValueFrom(instruction);

    this.registers[register] = value;

    this.pc += 2;
  }

  // 0x7xkk
  addV(instruction: number): void {
    const [register, value] = this.registerAndValueFrom(instruction);

    const original = this.registers[register];

    this.registers[register] = original + value;

    if (original > this.registers[register]) {
      this.registers[FLAG] = 1;
    } else {
      this.registers[FLAG] = 0;
    }

    this.pc += 2;
  }

  // 0x8xy0
  ldVV(instruction: number) {
    const [x, y] = this.registersFrom(instruction);

    this.registers[x] = this.registers[y];

    this.pc += 2;
  }

  // 0x9xy0
  sneVV(instruction: number): void {
    const [x, y] = this.registersFrom(instruction);

    if (this.registers[x] !== this.registers[y]) {
      this.pc += 4;
    } else {
      this.pc += 2;
    }
  }

  // 0xAnnn
  ldI(instruction: number): void {
    this.i = instruction & 0x0FFF;
    this.pc += 2;
  }

  // 0xCxkk
  rndV(instruction: number): void {
    const [register, value] = this.registerAndValueFrom(instruction);

    const randomValue = this.getRandomValue();

    this.registers[register] = value & randomValue;

    this.pc += 2;
  }

  // 0xDxyn
  drwVV(instruction: number): void {
    const vx = (instruction & 0x0F00) >> 8;
    const vy = (instruction & 0x00F0) >> 4;

    const x = this.registers[vx];
    const y = this.registers[vy];

    const height = instruction & 0x000F;

    let pixel: number;

    this.registers[FLAG] = 0;

    for (let yline = 0; yline < height; yline++) {
      pixel = this.mmu.read_byte(this.i + yline);

      for (let xline = 0; xline < 8; xline++) {
        if ((pixel & (0x80 >> xline)) !== 0) {
          const vc = this.videoCoordinates(x, y, xline, yline);

          if (this.video[vc] === 1) {
            this.registers[FLAG] = 1;
          }

          this.video[vc] ^= 1;
        }
      }
    }

    this.pc += 2;
  }

  // 0xEx9E
  skpV(instruction: number): void {
    const register = this.registerFrom(instruction);
    const key = this.registers[register];

    if (this.input[key] === 1) {
      this.pc += 4;
    } else {
      this.pc += 2;
    }
  }

  // 0xExA1
  sknpV(instruction: number): void {
    const register = this.registerFrom(instruction);
    const key = this.registers[register];

    if (this.input[key] !== 1) {
      this.pc += 4;
    } else {
      this.pc += 2;
    }
  }

  // 0xFx07
  ldVDt(instruction: number): void {
    const register = this.registerFrom(instruction);

    this.registers[register] = this.delayTimer;

    this.pc += 2;
  }

  // 0xFx15
  ldDtV(instruction: number): void {
    const register = this.registerFrom(instruction);

    this.delayTimer = this.registers[register];

    this.pc += 2;
  }

  // 0xFx1E
  addIV(instruction: number): void {
    const register = this.registerFrom(instruction);

    this.i += this.registers[register];

    this.pc += 2;
  }

  registerFrom(instruction: number): number {
    return this.registersFrom(instruction)[0];
  }

  registersFrom(instruction: number): [number, number] {
    const x = (instruction & 0x0F00) >> 8;
    const y = (instruction & 0x00F0) >> 4;

    return [x, y];
  }

  registerAndValueFrom(instruction: number): [number, number] {
    const register = (instruction & 0x0F00) >> 8;
    const value = instruction & 0x00FF;

    return [register, value];
  }

  videoCoordinates(x: number, y: number, xline: number, yline: number): number {
    return x + xline + ((y + yline) * 64);
  }

  getRandomValue(): number {
    const max = UNSIGNED_8_BIT_MAX;
    const min = UNSIGNED_8_BIT_MIN;

    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  missingInstruction(instruction): void {
    throw `Missing instruction: ${instruction}`
  }
}
