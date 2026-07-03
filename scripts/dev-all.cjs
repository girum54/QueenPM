/**
 * dev:all — Start all dev services in one terminal (Queen Project Variant).
 *
 * Modes:
 *   npm run dev:all     — local mode: tunnel + backend + frontend (all local)
 *   npm run dev:remote  — remote mode: frontend only, pointed at the hosted backend
 *
 * Remote mode reads REMOTE_API_URL from the environment or falls back to
 * the VITE_API_URL value in the root .env file.
 */

const net = require('net');
const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');

const root = path.join(__dirname, '..');
const localDbPort = process.env.DEV_DB_LOCAL_PORT || '5433';
const sshHost = process.env.DEV_DB_SSH_HOST || 'uib-server';

function getLocalIP() {
  try {
    const output = execSync('ipconfig').toString();
    const matches = output.match(/IPv4 Address[ .]*: (192\.168\.\d+\.\d+)/);
    if (matches && matches[1]) {
      return matches[1];
    }
  } catch (e) {
    // ignore
  }
  return null;
}

function updateIP(newIP) {
  // REMOVED: mobile/.env out of the target list
  const envFiles = [
    path.join(__dirname, '../.env'),
    path.join(__dirname, '../backend/.env'),
    path.join(__dirname, '../env/web.development'),
    path.join(__dirname, '../env/backend.development')
  ];

  console.log(`[SYSTEM] Updating LOCAL_IP to ${newIP} in all .env files...`);

  envFiles.forEach(file => {
    if (fs.existsSync(file)) {
      let content = fs.readFileSync(file, 'utf8');
      let updatedContent = content.replace(/^((?:EXPO_PUBLIC_)?LOCAL_IP)=.*/gm, `$1=${newIP}`);
      updatedContent = updatedContent.replace(/http:\/\/(?!\$\{)(?:192\.168\.\d+\.\d+|1\.2\.3\.4)/g, `http://${newIP}`);

      if (content !== updatedContent) {
        fs.writeFileSync(file, updatedContent);
        console.log(`[SYSTEM] ✅ Updated ${file}`);
      } else {
        console.log(`[SYSTEM] ℹ️ No change needed for ${file} (already ${newIP})`);
      }
    }
  });
}

function portOpen(port) {
  return new Promise((resolve) => {
    const s = net.connect({ host: '127.0.0.1', port: Number(port) }, () => {
      s.end();
      resolve(true);
    });
    s.on('error', () => resolve(false));
    s.setTimeout(1500, () => { s.destroy(); resolve(false); });
  });
}

function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }

const COLORS = {
  Tunnel:   '\x1b[33m',
  Backend:  '\x1b[36m',
  Frontend: '\x1b[35m',
  SYSTEM:   '\x1b[34m',
  RESET:    '\x1b[0m',
};

function log(name, line) {
  const c = COLORS[name] || '';
  process.stdout.write(`${c}[${name}]${COLORS.RESET} ${line}\n`);
}

function err(name, line) {
  const c = COLORS[name] || '';
  process.stderr.write(`${c}[${name}]${COLORS.RESET} ${line}\n`);
}

const QR_CHARS = /[\u2588\u2580\u2584]/;

function handleOutput(name, isErr, data) {
  const raw = data.toString().replace(/\x1b\[2J/g, '').replace(/\x1b\[H/g, '').replace(/\x1b\[3J/g, '');
  const lines = raw.split('\n');
  const c = COLORS[name] || '';

  let inQR = false;
  const qrLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line && !inQR) continue;

    if (QR_CHARS.test(line)) {
      inQR = true;
      qrLines.push(line);
    } else {
      if (inQR) {
        process.stdout.write(`\n${c}[${name} — QR Code]${COLORS.RESET}\n`);
        process.stdout.write(qrLines.join('\n') + '\n\n');
        qrLines.length = 0;
        inQR = false;
      }
      if (line.trim()) {
        if (isErr) process.stderr.write(`${c}[${name}]${COLORS.RESET} ${line}\n`);
        else process.stdout.write(`${c}[${name}]${COLORS.RESET} ${line}\n`);
      }
    }
  }

  if (inQR && qrLines.length) {
    process.stdout.write(`\n${c}[${name} — QR Code]${COLORS.RESET}\n`);
    process.stdout.write(qrLines.join('\n') + '\n\n');
  }
}

function resolveDatabaseUrlForTunnel(localPort) {
  const envPath = path.join(__dirname, '../backend/.env');
  if (!fs.existsSync(envPath)) return null;

  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/^DATABASE_URL\s*=\s*["']?(.*?)["']?\s*$/m);
  if (!match) return null;

  try {
    const url = new URL(match[1].trim());
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') {
      return url.toString();
    }

    url.hostname = '127.0.0.1';
    url.port = String(localPort);
    return url.toString();
  } catch (err) {
    return null;
  }
}

function spawnService({ name, cmd, args: cmdArgs, cwd, env }) {
  log('SYSTEM', `Starting ${name}...`);
  const child = spawn(cmd, cmdArgs, { cwd, shell: true, stdio: ['ignore', 'pipe', 'pipe'], env: env ? { ...process.env, ...env } : process.env });
  child.stdout.on('data', (d) => handleOutput(name, false, d));
  child.stderr.on('data', (d) => handleOutput(name, true, d));
  child.on('exit', (code) => log('SYSTEM', `${name} exited (code ${code})`));
  return child;
}

async function main() {
  const isRemote = process.argv.includes('--remote');

  const currentIP = getLocalIP();
  if (currentIP) updateIP(currentIP);

  const active = [];
  let cleaning = false;
  
  const cleanup = () => {
    if (cleaning) return;
    cleaning = true;
    log('SYSTEM', '🛑 Stopping all processes...');
    for (const { child, name } of active) {
      try {
        execSync(`taskkill /F /T /PID ${child.pid}`, { stdio: 'ignore', timeout: 3000 });
      } catch (_) {
        try { child.kill('SIGKILL'); } catch (__) {}
      }
      log('SYSTEM', `✅ ${name} stopped`);
    }
    log('SYSTEM', '👋 Goodbye!');
    process.exit(0);
  };
  
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('SIGHUP', cleanup);

  if (isRemote) {
    // ── Remote mode: tunnel port 3001 and 7880, start frontend pointed at localhost:3001 ──
    const localBackendPort = '3001';
    const localLivekitPort = '7880';
    
    // Check if either port is already in use
    const backendInUse = await portOpen(localBackendPort);
    const livekitInUse = await portOpen(localLivekitPort);
    
    if (backendInUse && livekitInUse) {
      log('SYSTEM', `✅ Backend and LiveKit tunnels already up — skipping tunnel startup`);
    } else {
      log('SYSTEM', `Opening SSH tunnel: local :3001 -> ${sshHost}:3001, local :7880 -> ${sshHost}:7880`);
      const tunnel = spawn('ssh', [
        '-N',
        '-L', `${localBackendPort}:127.0.0.1:3001`,
        '-L', `${localLivekitPort}:127.0.0.1:7880`,
        sshHost
      ], { shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
      tunnel.stdout.on('data', (d) => d.toString().split('\n').filter(Boolean).forEach((l) => log('Tunnel', l)));
      tunnel.stderr.on('data', (d) => d.toString().split('\n').filter(Boolean).forEach((l) => err('Tunnel', l)));
      tunnel.on('exit', (code) => log('SYSTEM', `Tunnel exited (code ${code})`));
      active.push({ child: tunnel, name: 'Tunnel' });

      log('SYSTEM', 'Waiting for tunnels to be ready...');
      let ready = false;
      for (let i = 0; i < 20; i++) {
        await delay(1000);
        if ((await portOpen(localBackendPort)) && (await portOpen(localLivekitPort))) { ready = true; break; }
      }
      if (!ready) log('SYSTEM', '⚠️ Tunnel ports never fully opened. Check SSH access to uib-server. Continuing anyway...');
      else log('SYSTEM', `✅ SSH tunnels ready (Backend :3001, LiveKit :7880)`);
    }

    const remoteApiUrl = 'http://localhost:3001';
    log('SYSTEM', `🌐 Remote mode — frontend → ${remoteApiUrl} (tunneling to ${sshHost})`);

    const frontend = spawnService({
      name: 'Frontend',
      cmd: 'npm',
      args: ['run', 'dev'],
      cwd: root,
      env: { VITE_API_URL: remoteApiUrl },
    });
    active.push({ child: frontend, name: 'Frontend' });
  } else {
    // ── Local mode: tunnel + backend + frontend ───────────────────────────────
    if (await portOpen(localDbPort)) {
      log('SYSTEM', `✅ DB tunnel already up on :${localDbPort} — skipping`);
    } else {
      log('SYSTEM', `Opening DB tunnel  127.0.0.1:${localDbPort} → ${sshHost}:5432`);
      const tunnel = spawn('ssh', ['-N', '-L', `${localDbPort}:127.0.0.1:5432`, sshHost], { shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
      tunnel.stdout.on('data', (d) => d.toString().split('\n').filter(Boolean).forEach((l) => log('Tunnel', l)));
      tunnel.stderr.on('data', (d) => d.toString().split('\n').filter(Boolean).forEach((l) => err('Tunnel', l)));
      tunnel.on('exit', (code) => log('SYSTEM', `Tunnel exited (code ${code})`));
      active.push({ child: tunnel, name: 'Tunnel' });

      log('SYSTEM', 'Waiting for tunnel to be ready...');
      let ready = false;
      for (let i = 0; i < 20; i++) {
        await delay(1000);
        if (await portOpen(localDbPort)) { ready = true; break; }
      }
      if (!ready) log('SYSTEM', '⚠️  Tunnel port never opened. Check SSH access to uib-server. Continuing anyway...');
      else log('SYSTEM', `✅ Tunnel ready on :${localDbPort}`);
    }

    await delay(1500);
    let backendEnv = undefined;
    const tunneledDatabaseUrl = resolveDatabaseUrlForTunnel(localDbPort);
    if (tunneledDatabaseUrl) {
      backendEnv = { DATABASE_URL: tunneledDatabaseUrl };
      log('SYSTEM', `✅ Using local DB tunnel for Backend: ${tunneledDatabaseUrl}`);
    }

    const backend = spawnService({ name: 'Backend', cmd: 'npm', args: ['start'], cwd: path.join(root, 'backend'), env: backendEnv });
    active.push({ child: backend, name: 'Backend' });

    const frontend = spawnService({ name: 'Frontend', cmd: 'npm', args: ['run', 'dev'], cwd: root });
    active.push({ child: frontend, name: 'Frontend' });
  }

  log('SYSTEM', '✨ All services starting. Press Ctrl+C to stop everything.\n');

  setInterval(() => {
    const statuses = active.map(({ child, name }) => {
      const alive = (child.exitCode === null || child.exitCode === undefined);
      const s = alive ? '\x1b[32mRUNNING\x1b[0m' : `\x1b[31mEXITED(${child.exitCode})\x1b[0m`;
      return `${name}:${s}`;
    }).join('  ');
    process.stdout.write(`\x1b[34m[HEALTH]\x1b[0m ${statuses}\n`);
  }, 30_000);

  setInterval(() => {}, 1_000);
}

main().catch((e) => {
  console.error('[SYSTEM] Fatal:', e.message || e);
  process.exit(1);
});