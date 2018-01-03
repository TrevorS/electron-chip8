import { app, BrowserWindow } from 'electron';

import * as path from 'path';
import * as url from 'url';

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
}

app.on('ready', onReady);
app.on('window-all-closed', () => app.quit());

console.log(`Electron Version: ${app.getVersion()}`);
