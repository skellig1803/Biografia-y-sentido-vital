import http from 'http';

function resolvePort(): number {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const cliPort = parseInt(process.argv[portArgIndex + 1], 10);
    if (!Number.isNaN(cliPort) && cliPort > 0 && cliPort !== 8080) {
      return cliPort;
    }
  }
  if (process.env.APP_PORT) {
    const p = parseInt(process.env.APP_PORT, 10);
    if (!Number.isNaN(p) && p > 0) return p;
  }
  if (process.env.DEFAULT_APP_PORT) {
    const p = parseInt(process.env.DEFAULT_APP_PORT, 10);
    if (!Number.isNaN(p) && p > 0) return p;
  }
  if (process.env.PORT && process.env.PORT !== '8080') {
    const p = parseInt(process.env.PORT, 10);
    if (!Number.isNaN(p) && p > 0) return p;
  }
  return 3000;
}

let loadedApp: any = null;
let appLoadPromise: Promise<any> | null = null;

function ensureAppLoaded(httpServer?: http.Server): Promise<any> {
  if (!appLoadPromise) {
    appLoadPromise = import('./server/app.js')
      .then(async (mod) => {
        if (httpServer) {
          await mod.attachAppToServer(httpServer);
        }
        loadedApp = mod.default;
        return mod.default;
      })
      .catch((err) => {
        console.error('Failed to initialize Express app:', err);
        throw err;
      });
  }
  return appLoadPromise;
}

// Only start standalone HTTP server when not running in serverless environments like Vercel
if (!process.env.VERCEL) {
  const port = resolvePort();

  const httpServer = http.createServer(async (req, res) => {
    if (loadedApp) {
      return loadedApp(req, res);
    }

    // Respond immediately to health probes during cold module loading
    if (req.url === '/api/health' || req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', warmingUp: true }));
      return;
    }

    try {
      const appInstance = await ensureAppLoaded(httpServer);
      return appInstance(req, res);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Server failed to initialize' }));
    }
  });

  httpServer.on('error', (err) => {
    console.error('HTTP server error:', err);
  });

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Faro Biográfico server running on port ${port}`);
    // Defer heavy backend + Vite loading until the listening socket is ready to accept probes
    setImmediate(() => {
      ensureAppLoaded(httpServer).catch(() => {});
    });
  });
}

export default async function handler(req: any, res: any) {
  const appInstance = await ensureAppLoaded();
  return appInstance(req, res);
}
