const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const path = require('node:path');
const pty = require('node-pty');
const { loadConfig, resolveLaunch, writeDefaultConfig } = require('./config');

const SMOKE = process.env.DESKTOP_SMOKE === '1';
const SMOKE_MARKER = 'smoke-marker-42';
const sessions = new Map(); // webContents.id -> pty

function configPath() {
  return process.env.DESKTOP_CONFIG || path.join(app.getPath('userData'), 'config.json');
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    backgroundColor: '#0f1115',
    title: '__PLATFORM__ Desktop',
    show: !SMOKE,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  const id = win.webContents.id;
  win.on('closed', () => killSession(id));
  return win;
}

function killSession(id) {
  const p = sessions.get(id);
  if (p) {
    try { p.kill(); } catch {}
    sessions.delete(id);
  }
}

ipcMain.handle('pty:start', (event, { cols, rows }) => {
  const id = event.sender.id;
  killSession(id);
  const cfg = loadConfig(configPath());
  if (SMOKE) {
    cfg.command = process.platform === 'win32' ? 'cmd.exe' : '/bin/sh';
    cfg.args = process.platform === 'win32' ? ['/c', 'echo smoke-marker-%NUMBER%'] : ['-c', 'echo smoke-marker-$((40+2))'];
    cfg.env = { NUMBER: '42' };
  }
  const launch = resolveLaunch(cfg);
  let proc;
  try {
    proc = pty.spawn(launch.file, launch.args, { name: 'xterm-256color', cols, rows, cwd: launch.cwd, env: launch.env });
  } catch (e) {
    return { ok: false, error: `Could not start "${launch.file}": ${e.message}`, configPath: configPath() };
  }
  sessions.set(id, proc);
  proc.onData((data) => {
    if (!event.sender.isDestroyed()) event.sender.send('pty:data', data);
  });
  proc.onExit(({ exitCode }) => {
    if (sessions.get(id) === proc) sessions.delete(id);
    if (!event.sender.isDestroyed()) event.sender.send('pty:exit', exitCode);
  });
  return { ok: true, title: cfg.title, command: [launch.file, ...launch.args].join(' '), usingShell: launch.usingShell, configPath: configPath(), configError: cfg.configError };
});

ipcMain.on('pty:input', (event, data) => sessions.get(event.sender.id)?.write(data));
ipcMain.on('pty:resize', (event, { cols, rows }) => {
  try { sessions.get(event.sender.id)?.resize(cols, rows); } catch {}
});
ipcMain.on('config:open', () => {
  writeDefaultConfig(configPath());
  shell.openPath(configPath());
});
ipcMain.on('smoke:seen', () => {
  if (!SMOKE) return;
  console.log('SMOKE OK: pty output rendered in xterm');
  app.exit(0);
});

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'New Window', accelerator: 'CmdOrCtrl+N', click: () => createWindow() },
        { label: 'Restart Agent', accelerator: 'CmdOrCtrl+R', click: (_, win) => win?.webContents.send('pty:restart') },
        { label: 'Edit Config', accelerator: 'CmdOrCtrl+,', click: () => { writeDefaultConfig(configPath()); shell.openPath(configPath()); } },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    { role: 'editMenu' },
    { label: 'View', submenu: [{ role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'resetZoom' }, { type: 'separator' }, { role: 'toggleDevTools' }, { role: 'togglefullscreen' }] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

if (SMOKE) {
  setTimeout(() => {
    console.error('SMOKE FAIL: marker not seen within 30s');
    app.exit(1);
  }, 30000).unref();
}

app.whenReady().then(() => {
  buildMenu();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  for (const id of [...sessions.keys()]) killSession(id);
  if (process.platform !== 'darwin' || SMOKE) app.quit();
});

module.exports = { SMOKE_MARKER };
