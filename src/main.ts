import { app, BrowserWindow } from 'electron';

import * as path from 'path';
import * as url from 'url';
import * as fs from 'fs';

import MMU from './chip8/mmu';
import CPU from './chip8/cpu';

let mainWindow: Electron.BrowserWindow;

const onReady = () => {
  mainWindow = new BrowserWindow({
    height: 600,
    width: 800,
  });

  const pathname = path.join(__dirname, '../index.html');
  const mainURL = url.format({
    pathname,
    protocol: 'file:',
    slashes: true,
  });

  mainWindow.loadURL(mainURL);
  mainWindow.webContents.openDevTools();

  mainWindow.on('close', () => {
    app.quit();
  });

  start();
}

function start() {
  const romFilename = path.join(__dirname, '../roms/TETRIS')
  const rom = fs.readFileSync(romFilename);

  const mmu = new MMU();
  mmu.load_rom(rom);

  const cpu = new CPU(mmu);

  while (true) {
    cpu.step();
  }
}

app.on('ready', onReady);
app.on('window-all-closed', () => app.quit());
