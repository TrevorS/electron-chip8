import { app, BrowserWindow } from 'electron';

import * as path from 'path';
import * as url from 'url';
import * as fs from 'fs';

let mainWindow: Electron.BrowserWindow;
let backgroundWindow: Electron.BrowserWindow;

function createMainWindow(): Electron.BrowserWindow {
  let newWindow = new BrowserWindow({
    height: 600,
    width: 800,
  });

  const pathname = path.join(__dirname, '../templates/index.html');
  const mainURL = url.format({
    pathname,
    protocol: 'file:',
    slashes: true,
  });

  newWindow.loadURL(mainURL);
  newWindow.webContents.openDevTools();

  newWindow.on('close', () => app.quit());

  return newWindow;
}

function createBackgroundWindow(): Electron.BrowserWindow {
  const newWindow = new BrowserWindow({
    show: false,
  });

  const pathname = path.join(__dirname, '../templates/background.html');
  const backgroundURL = url.format({
    pathname,
    protocol: 'file:',
    slashes: true,
  });

  newWindow.loadURL(backgroundURL);

  return newWindow;
}

function onReady() {
  mainWindow = createMainWindow();
  backgroundWindow = createBackgroundWindow();

  backgroundWindow.webContents.on('did-finish-load', () => {
    console.log('got did-finish-load');

    const romFilename = path.join(__dirname, '../roms/TETRIS')
    const rom = fs.readFileSync(romFilename);

    backgroundWindow.webContents.send('emulator-start', { rom });
  });
}

app.on('ready', onReady);
app.on('window-all-closed', () => app.quit());
