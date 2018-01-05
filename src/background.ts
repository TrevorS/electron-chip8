import { ipcRenderer } from 'electron';

import MMU from './chip8/mmu';
import CPU from './chip8/cpu';

let mmu: MMU;
let cpu: CPU;

ipcRenderer.on('emulator-start', (event, { rom }) => start(rom));

function start(rom) {
  console.log('Background window, starting!');

  mmu = new MMU();
  mmu.load_rom(rom);

  cpu = new CPU(mmu);

  while (true) {
    cpu.step();
  }
}
