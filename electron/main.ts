import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'
import https from 'node:https'
import { execFile } from 'node:child_process'
import { createRequire } from 'node:module'
import { autoUpdater } from 'electron-updater'

// Cấu hình Updater
autoUpdater.logger = console;
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.js
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(process.env.VITE_PUBLIC as string, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      // nodeIntegration: true, // Recommended to keep false for security
      // contextIsolation: true,
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  // Set Content-Security-Policy
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        // Disable Content-Security-Policy temporarily for dev if needed
        // 'Content-Security-Policy': ["default-src 'self' 'unsafe-inline' 'unsafe-eval' data:"]
      }
    })
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
    // Open dev tool if needed
    // win.webContents.openDevTools()
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  createWindow()

  // Bật tự động kiểm tra bản cập nhật khi app đã mở (trong môi trường Production)
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify().catch(err => {
      console.error("Lỗi khi kiểm tra cập nhật:", err);
    });
  }
})

// Các sự kiện của autoUpdater
autoUpdater.on('update-available', () => {
  if (win) {
    dialog.showMessageBox(win, {
      type: 'info',
      title: 'Có bản cập nhật mới',
      message: 'Hệ thống đang tiến hành tải xuống bản cập nhật mới ở nền. Vui lòng chờ đợi...'
    });
  }
});

autoUpdater.on('update-downloaded', () => {
  if (win) {
    dialog.showMessageBox(win, {
      type: 'info',
      title: 'Tải xong bản cập nhật',
      message: 'Bản cập nhật đã được tải xong. Ứng dụng sẽ tự động khởi động lại sau 3 giây để cài đặt.'
    });
  }
  setTimeout(() => {
    autoUpdater.quitAndInstall();
  }, 3000);
});

// --- FFMPEG & IPC HANDLERS ---
function getFfmpegPath() {
  const require = createRequire(import.meta.url);
  let binaryPath = require('ffmpeg-static') as string;
  if (app.isPackaged) {
    binaryPath = binaryPath.replace('app.asar', 'app.asar.unpacked');
  }
  return binaryPath;
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        downloadFile(response.headers.location as string, dest).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
      }
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

ipcMain.handle('check-ffmpeg', async () => ({ found: fs.existsSync(getFfmpegPath()) }));

ipcMain.handle('download-file-to-folder', async (_event, { url, folderPath, fileName }) => {
  try {
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    const destPath = path.join(folderPath, fileName);
    await downloadFile(url, destPath);
    return { success: true, destPath };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

// Select file dialog
ipcMain.handle('select-file', async (_event, options) => {
  if (!win) return null;
  const res = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: options.filters
  });
  if (res.canceled || res.filePaths.length === 0) return null;
  return res.filePaths[0];
});

// Update function
ipcMain.handle('execute-ffmpeg-combine-urls', async (_event, { urls, localPaths, projectName, srtPath, audioPath }) => {
  if (!win) return { success: false, error: 'No active window' };

  const safeProjectName = (projectName || 'Project').replace(/[^a-z0-9]/gi, '_');
  const res = await dialog.showSaveDialog(win, {
    title: 'Lưu Video Ghép',
    defaultPath: `Combined_${safeProjectName}_${Date.now()}.mp4`,
    filters: [{ name: 'MP4', extensions: ['mp4'] }]
  });

  if (res.canceled || !res.filePath) return { success: false, canceled: true };

  const outputFilePath = res.filePath;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'video-merge-'));
  const listPath = path.join(tempDir, `list.txt`);
  const tempFiles: string[] = [];

  try {
    let finalFiles: string[] = [];

    if (localPaths && localPaths.length > 0) {
      finalFiles = localPaths.filter((p: string) => fs.existsSync(p));
      if (finalFiles.length === 0) {
        return { success: false, error: 'Các file video không tồn tại trên máy.' };
      }
    } else if (urls && urls.length > 0) {
      for (let i = 0; i < urls.length; i++) {
        tempFiles.push(path.join(tempDir, `vid_${i}.mp4`));
      }
      const downloadPromises = urls.map((url: string, i: number) => downloadFile(url, tempFiles[i]));
      await Promise.all(downloadPromises);
      finalFiles = tempFiles;
    } else {
      return { success: false, error: 'Không nhận được đường dẫn video nào' };
    }

    const listContent = finalFiles.map((f: string) => `file '${f.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`).join('\n');
    fs.writeFileSync(listPath, listContent);

    const ffmpegPath = getFfmpegPath();
    const args: string[] = ['-f', 'concat', '-safe', '0', '-i', listPath];
    const hasAudio = audioPath && fs.existsSync(audioPath);
    const hasSrt = srtPath && fs.existsSync(srtPath);

    if (hasAudio) {
      args.push('-i', audioPath);
    }

    if (hasSrt && hasAudio) {
      const safeSrtPath = path.join(tempDir, 'sub.srt');
      fs.copyFileSync(srtPath, safeSrtPath);
      args.push('-filter_complex', `[0:v]subtitles=sub.srt[v_out]`);
      args.push('-map', '[v_out]', '-map', '1:a');
      args.push('-c:v', 'libx264', '-preset', 'fast', '-c:a', 'aac', '-shortest');
    } else if (hasSrt && !hasAudio) {
      const safeSrtPath = path.join(tempDir, 'sub.srt');
      fs.copyFileSync(srtPath, safeSrtPath);
      args.push('-vf', `subtitles=sub.srt`);
      args.push('-c:v', 'libx264', '-preset', 'fast', '-c:a', 'copy');
    } else if (!hasSrt && hasAudio) {
      args.push('-map', '0:v', '-map', '1:a');
      args.push('-c:v', 'copy', '-c:a', 'aac', '-shortest');
    } else {
      args.push('-c:v', 'copy', '-c:a', 'copy');
    }

    args.push('-y', outputFilePath);

    console.log("==> FFMPEG EXECUTE START:");
    console.log("Working Dir:", tempDir);
    console.log("Args:", args.join(' '));

    await new Promise<void>((resolve, reject) => {
      execFile(ffmpegPath, args, { cwd: tempDir, maxBuffer: 1024 * 1024 * 50 }, (err, _stdout, stderr) => {
        if (err) {
          console.error("FFMPEG ERR:", stderr);
          reject(new Error(stderr || err.message));
        }
        else resolve();
      });
    });

    return { success: true, filePath: outputFilePath };
  } catch (err: any) {
    return { success: false, error: err.message };
  } finally {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (cleanupErr) {
      console.error("Failed to cleanup temp dir:", cleanupErr);
    }
  }
});

ipcMain.handle('select-directory', async () => {
  if (!win) return null;
  const res = await dialog.showOpenDialog(win, {
    properties: ['openDirectory']
  });
  if (res.canceled || res.filePaths.length === 0) return null;
  return res.filePaths[0];
});

ipcMain.handle('download-file-local', async (_event, { url, outputPath }) => {
  try {
    const parentDir = path.dirname(outputPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    await downloadFile(url, outputPath);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('copy-file-local', async (_event, { sourcePath, outputPath }) => {
  try {
    const parentDir = path.dirname(outputPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.copyFileSync(sourcePath, outputPath);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('execute-ffmpeg-merge-local', async (_event, { videoUrl, audioUrl, outputFilePath }) => {
  if (!win) return { success: false, error: 'No active window' };

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'local-merge-'));
  const tempVideo = path.join(tempDir, 'temp_video.mp4');
  let tempAudio = path.join(tempDir, 'temp_audio.wav');

  try {
    // 1. Download video
    if (videoUrl.startsWith('http')) {
      await downloadFile(videoUrl, tempVideo);
    } else if (fs.existsSync(videoUrl)) {
      fs.copyFileSync(videoUrl, tempVideo);
    } else {
      throw new Error(`Video file not found: ${videoUrl}`);
    }

    // 2. Download audio
    if (audioUrl.startsWith('http')) {
      await downloadFile(audioUrl, tempAudio);
    } else if (fs.existsSync(audioUrl)) {
      // It might be absolute path
      fs.copyFileSync(audioUrl, tempAudio);
    } else {
      throw new Error(`Audio file not found: ${audioUrl}`);
    }

    // 3. Merge using ffmpeg
    const ffmpegPath = getFfmpegPath();
    const args: string[] = [
      '-y',
      '-i', tempVideo,
      '-i', tempAudio,
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-map', '0:v:0',
      '-map', '1:a:0',
      outputFilePath
    ];

    console.log("==> LOCAL FFMPEG MERGE START:");
    console.log("Args:", args.join(' '));

    await new Promise<void>((resolve, reject) => {
      execFile(ffmpegPath, args, { cwd: tempDir, maxBuffer: 1024 * 1024 * 50 }, (err, _stdout, stderr) => {
        if (err) {
          console.error("FFMPEG ERR:", stderr);
          reject(new Error(stderr || err.message));
        } else resolve();
      });
    });

    return { success: true, filePath: outputFilePath };
  } catch (err: any) {
    return { success: false, error: err.message };
  } finally {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (cleanupErr) {
      console.error("Failed to cleanup temp dir:", cleanupErr);
    }
  }
});

ipcMain.handle('execute-voice-conversion-local', async (_event, { videoUrl, audioUrl, outputFilePath, aiSvcUrl }) => {
  if (!win) return { success: false, error: 'No active window' };

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vc-merge-'));
  const tempVideo = path.join(tempDir, 'temp_video.mp4');
  const tempTargetAudio = path.join(tempDir, 'temp_target.wav');
  const tempSourceAudio = path.join(tempDir, 'temp_source.wav');
  const tempConvertedAudio = path.join(tempDir, 'temp_converted.wav');

  try {
    // 1. Download Video
    if (videoUrl.startsWith('http')) {
      await downloadFile(videoUrl, tempVideo);
    } else if (fs.existsSync(videoUrl)) {
      fs.copyFileSync(videoUrl, tempVideo);
    } else {
      throw new Error(`Video not found: ${videoUrl}`);
    }

    // 2. Download Target Audio (Giọng mẫu)
    if (audioUrl.startsWith('http')) {
      await downloadFile(audioUrl, tempTargetAudio);
    } else if (fs.existsSync(audioUrl)) {
      fs.copyFileSync(audioUrl, tempTargetAudio);
    } else {
      throw new Error(`Audio not found: ${audioUrl}`);
    }

    // 3. Extract Source Audio (Tách tiếng thật từ Video)
    const ffmpegPath = getFfmpegPath();
    console.log("==> EXTRACTING SOURCE AUDIO...");
    await new Promise<void>((resolve, reject) => {
      execFile(ffmpegPath, ['-y', '-i', tempVideo, '-q:a', '0', '-map', 'a', tempSourceAudio], { cwd: tempDir }, (err, _stdout, stderr) => {
        if (err) reject(new Error(stderr || err.message));
        else resolve();
      });
    });

    // 4. Call AI Service (Seed-VC)
    console.log("==> CALLING SEED-VC AI...");
    const apiUrl = aiSvcUrl || 'http://127.0.0.1:8000'; 
    // @ts-ignore
    const response = await fetch(`${apiUrl}/vc/convert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_audio: tempSourceAudio,
        target_audio: tempTargetAudio,
        output_path: tempConvertedAudio
      })
    });
    
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI Service Error: ${errText}`);
    }

    // 5. Merge Converted Audio with Original Video
    console.log("==> MERGING CONVERTED AUDIO TO VIDEO...");
    await new Promise<void>((resolve, reject) => {
      execFile(ffmpegPath, [
        '-y',
        '-i', tempVideo,
        '-i', tempConvertedAudio,
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-map', '0:v:0',
        '-map', '1:a:0',
        outputFilePath
      ], { cwd: tempDir }, (err, _stdout, stderr) => {
        if (err) reject(new Error(stderr || err.message));
        else resolve();
      });
    });

    return { success: true, filePath: outputFilePath };
  } catch (err: any) {
    console.error("VC Merge Error:", err);
    return { success: false, error: err.message };
  } finally {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (e) {
      console.error("Failed to cleanup VC temp dir:", e);
    }
  }
});


ipcMain.handle('merge-videos-in-folder', async (_event, { folderPath }) => {
  if (!win) return { success: false, error: 'No active window' };

  try {
    const files = fs.readdirSync(folderPath);
    const mp4Files = files
      .filter(f => f.toLowerCase().endsWith('.mp4'))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
      .map(f => path.join(folderPath, f));

    if (mp4Files.length === 0) {
      return { success: false, error: 'Không tìm thấy file .mp4 nào trong thư mục này.' };
    }

    const outputFilePath = path.join(folderPath, `Combined_All_Videos_${Date.now()}.mp4`);
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'folder-merge-'));
    const listPath = path.join(tempDir, `list.txt`);

    const listContent = mp4Files.map((f: string) => `file '${f.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`).join('\n');
    fs.writeFileSync(listPath, listContent);

    const ffmpegPath = getFfmpegPath();
    const args: string[] = [
      '-f', 'concat',
      '-safe', '0',
      '-i', listPath,
      '-c', 'copy',
      '-y', outputFilePath
    ];

    console.log("==> LOCAL FOLDER MERGE START:");
    console.log("Working Dir:", tempDir);
    console.log("Args:", args.join(' '));

    await new Promise<void>((resolve, reject) => {
      execFile(ffmpegPath, args, { cwd: tempDir, maxBuffer: 1024 * 1024 * 50 }, (err, _stdout, stderr) => {
        if (err) {
          console.error("FFMPEG ERR:", stderr);
          reject(new Error(stderr || err.message));
        } else resolve();
      });
    });

    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (e) {
      console.error("Failed to cleanup temp dir:", e);
    }

    return { success: true, filePath: outputFilePath };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});
