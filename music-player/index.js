const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false, // to play media
    },
    autoHideMenuBar: true,
  });

  mainWindow.loadURL('http://localhost:3000');
}

app.on('ready', createWindow);

ipcMain.handle('upload-files', async (event, fileData) => {
  const userDataPath = app.getPath('userData');
  const audioPath = path.join(userDataPath, 'audioFiles');

  if (!Array.isArray(fileData) || fileData.length === 0) {
    throw new Error('No file data provided.');
  }

  if (!fs.existsSync(audioPath)) {
    fs.mkdirSync(audioPath, { recursive: true });
  }

  try {
    fileData.forEach(({ name, buffer }) => {
      const destPath = path.join(audioPath, name);
      fs.writeFileSync(destPath, buffer); // Write the buffer to the file
    });
    return 'Upload successful';
  } catch (error) {
    throw new Error(`Failed to upload files: ${error.message}`);
  }
});


ipcMain.handle('delete-file', async (event, filePath) => {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('Invalid file path');
  }

  try {
    fs.unlinkSync(filePath);
    return 'File deleted successfully';
  } catch (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
});

// Send userData path to renderer
ipcMain.on('get-user-data-path', (event) => {
  event.returnValue = app.getPath('userData');
});
