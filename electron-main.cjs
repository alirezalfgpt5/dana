const { app, BrowserWindow, Menu, dialog } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const http = require("http");
const fs2 = require("fs");
const net = require("net");

let mainWindow = null;
let splashWindow = null;
let serverProcess = null;
let PORT = 3000;
let isAppQuitting = false;

function ensureLogDirectory() {
  const logDirectory = path.join(app.getPath("userData"), "logs");
  fs2.mkdirSync(logDirectory, { recursive: true });
  for (const fileName of ["application-errors.jsonl", "session-expired.log"]) {
    fs2.closeSync(fs2.openSync(path.join(logDirectory, fileName), "a"));
  }
  return logDirectory;
}

function writeElectronDiagnostic(event, error, details = {}) {
  try {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    const sanitizedMessage = message
      .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, "Bearer ***REDACTED***")
      .replace(/((?:password|passwd|pwd|secret|token|authorization)\s*[:=]\s*["']?)([^"'\s,;]+)/gi, "$1***REDACTED***");
    const entry = {
      timestamp: new Date().toISOString(),
      level: event.includes("crashed") || event.includes("gone") ? "fatal" : "error",
      source: "electron",
      event,
      message: sanitizedMessage.slice(0, 12000),
      ...(stack ? { stack: stack.slice(0, 12000) } : {}),
      details,
    };
    const logPath = path.join(ensureLogDirectory(), "application-errors.jsonl");
    fs2.appendFileSync(logPath, `${JSON.stringify(entry)}\n`, "utf8");
  } catch (writeError) {
    try {
      fs2.writeSync(2, `Failed to write Electron diagnostic log: ${String(writeError)}\n`);
    } catch {}
  }
}

process.on("uncaughtExceptionMonitor", (error, origin) => {
  writeElectronDiagnostic("uncaught_main_process_exception", error, { origin });
});

if (process.env.NODE_ENV !== "development") process.env.NODE_ENV = "production";
const isDev = process.env.NODE_ENV === "development";

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
  });
}

process.env.IS_ELECTRON = "true";

async function startServer() {
  PORT = await getFreePort();
  process.env.PORT = PORT.toString();
  
  const userDataPath = app.getPath("userData");
  process.env.APP_ROOT = __dirname;
  process.env.APP_VERSION = app.getVersion();
  if (!isDev) {
    process.env.USER_DATA_PATH = userDataPath;
    process.env.DB_PATH = path.join(userDataPath, "database.sqlite");
    process.env.UPLOAD_DIR = path.join(userDataPath, "uploads");
    process.env.STORAGE_DIR = path.join(userDataPath, "storage");
    process.chdir(userDataPath);
  }

  if (splashWindow) {
    splashWindow.webContents.executeJavaScript(`updateProgress('درحال راه‌اندازی سرور داخلی (پورت ${PORT})...', 50);`);
  }

  if (isDev) {
    return new Promise((resolve, reject) => {
      const serverPath = path.join(__dirname, "server.ts");
      serverProcess = spawn("npx", ["tsx", serverPath], {
        env: { ...process.env, NODE_ENV: "development" },
        stdio: "pipe",
        shell: true,
      });

      serverProcess.stdout.on("data", (data) => console.log(`🖥️ ${data}`));
      serverProcess.stderr.on("data", (data) => console.error(`❌ ${data}`));
      serverProcess.on("error", reject);
      serverProcess.on("exit", (code, signal) => {
        if (!isAppQuitting) {
          writeElectronDiagnostic("server_process_exited_unexpectedly", `Server exited with code ${code}`, { code, signal });
        }
      });

      const checkServer = () => {
        const req = http.get(`http://localhost:${PORT}/api/health`, (res) => {
          if (res.statusCode === 200) {
              if (splashWindow) splashWindow.webContents.executeJavaScript(`updateProgress('ارتباط با سرور برقرار شد...', 70);`);
            console.log("✅ Server ready");
            if (splashWindow) splashWindow.webContents.executeJavaScript(`updateProgress('ارتباط با سرور برقرار شد...', 70);`);
            resolve(true);
          } else setTimeout(checkServer, 300);
        });
        req.on("error", () => setTimeout(checkServer, 300));
        req.setTimeout(3000, () => {
          req.destroy();
          setTimeout(checkServer, 300);
        });
      };
      setTimeout(checkServer, 1000);
    });
  } else {
    return new Promise((resolve, reject) => {
      try {
        const serverPath = path.join(__dirname, "dist", "server.cjs");
        if (!fs2.existsSync(serverPath)) {
          reject(new Error(`Server file not found: ${serverPath}`));
          return;
        }
        
        // Require the built server file directly
        require(serverPath);
        
        let attempts = 0;
        const checkServer = () => {
          attempts++;
          if (attempts > 30) {
            reject(new Error("Server took too long to start"));
            return;
          }
          const req = http.get(`http://localhost:${PORT}/api/health`, (res) => {
            if (res.statusCode === 200) {
              resolve(true);
            } else setTimeout(checkServer, 300);
          });
          req.on("error", () => setTimeout(checkServer, 300));
          req.setTimeout(3000, () => {
            req.destroy();
          });
        };
        setTimeout(checkServer, 500);
      } catch (err) {
        reject(err);
      }
    });
  }
}

async function createWindow() {
  splashWindow = new BrowserWindow({
    width: 450,
    height: 300,
    frame: false,
    transparent: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
    icon: path.join(__dirname, "public", "favicon.ico"),
    alwaysOnTop: true,
    center: true,
  });

  const splashHtml = `
    <html dir="rtl">
    <body style="display:flex;align-items:center;justify-content:center;flex-direction:column;font-family:'Segoe UI', Tahoma, sans-serif;background:#1a1a1a;color:#ffffff;text-align:center;padding:20px;margin:0;border-radius:8px;border:1px solid #333;box-shadow:0 8px 32px rgba(0,0,0,0.8);height:100vh;box-sizing:border-box;overflow:hidden;">
      
      <!-- Logo or Icon placeholder -->
      <div style="width:64px;height:64px;background:linear-gradient(135deg, #2563eb, #1e40af);border-radius:16px;display:flex;align-items:center;justify-content:center;margin-bottom:20px;box-shadow:0 4px 15px rgba(37,99,235,0.4);">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
      </div>

      <h2 style="margin:0;font-size:18px;font-weight:600;letter-spacing:0.5px;">${app.getName()}</h2>
      <p style="margin-top:5px;font-size:12px;color:#888;">نسخه ${app.getVersion()}</p>
      
      <div style="margin-top:30px;width:100%;max-width:300px;">
        <p id="status" style="color:#aaa;font-size:13px;margin:0 0 8px 0;text-align:right;">در حال آماده‌سازی محیط...</p>
        <!-- Progress Bar -->
        <div style="width:100%;height:4px;background:#333;border-radius:2px;overflow:hidden;">
          <div id="progress" style="width:10%;height:100%;background:#3b82f6;border-radius:2px;transition:width 0.3s ease;"></div>
        </div>
      </div>
      <script>
        window.updateProgress = function(text, percent) {
          const statusEl = document.getElementById('status');
          const progressEl = document.getElementById('progress');
          if(statusEl) statusEl.innerText = text;
          if(progressEl) progressEl.style.width = percent + '%';
        }
      </script>
    </body>
    </html>
  `;

  await splashWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(splashHtml));

  try {
    if (splashWindow) {
      splashWindow.webContents.executeJavaScript(`updateProgress('درحال بررسی پایگاه داده...', 20);`);
    }
    await startServer();
  } catch (err) {
    writeElectronDiagnostic("server_startup_failed", err);
    console.error("❌ Failed to start server:", err);
    if (splashWindow) splashWindow.close();
    dialog.showErrorBox("خطا در راه‌اندازی", "متأسفانه سرور داخلی سامانه با مشکل مواجه شد.\n\nتوضیحات خطا:\n" + err.message);
    app.quit();
    return;
  }

  if (splashWindow) {
    splashWindow.webContents.executeJavaScript(`updateProgress('سرور آماده است. درحال بازکردن برنامه...', 80);`);
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
    icon: path.join(__dirname, "public", "favicon.ico"),
    show: false,
  });

  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    writeElectronDiagnostic("renderer_process_gone", "Electron renderer process exited unexpectedly.", details);
  });
  mainWindow.webContents.on("unresponsive", () => {
    writeElectronDiagnostic("renderer_unresponsive", "Electron renderer stopped responding.");
  });
  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (isMainFrame) {
      writeElectronDiagnostic("renderer_load_failed", errorDescription, { errorCode, validatedURL });
    }
  });
  

  try {
    if (isDev) {
      await mainWindow.loadURL("http://localhost:5173");
      mainWindow.webContents.openDevTools();
    } else {
      // IMPORTANT: loadURL with PORT instead of file:// to make API requests work
      await mainWindow.loadURL(`http://localhost:${PORT}`);
    }
  } catch (err) {
    writeElectronDiagnostic("renderer_navigation_failed", err);
    console.error("Failed to load URL:", err);
  }

  if (splashWindow) {
    splashWindow.webContents.executeJavaScript(`updateProgress('برنامه بارگذاری شد...', 100);`);
    setTimeout(() => {
      if (splashWindow) {
        splashWindow.close();
        splashWindow = null;
      }
      if (mainWindow) {
        mainWindow.show();
        mainWindow.maximize();
      }
    }, 500);
  } else {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.maximize();
    }
  }

  mainWindow.on("ready-to-show", () => {
    // Handled in did-finish-load for better progress sync
  });
  mainWindow.on("closed", () => { mainWindow = null; });
}

app.whenReady().then(() => {
  ensureLogDirectory();
  Menu.setApplicationMenu(null);
  return createWindow();
}).catch((error) => {
  writeElectronDiagnostic("application_startup_failed", error);
  console.error(error);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  isAppQuitting = true;
});

app.on("will-quit", () => {
  if (serverProcess) {
    if (process.platform === "win32") {
      const { spawn } = require("child_process");
      spawn("taskkill", ["/pid", serverProcess.pid, "/f", "/t"]);
    } else {
      serverProcess.kill();
    }
  }
});

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
