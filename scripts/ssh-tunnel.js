const fs = require('fs');
const net = require('net');
const { spawn } = require('child_process');

const LOCAL_PORT = 5433;
const SSH_HOST = 'uib-server';
const DEFAULT_SSH = process.platform === 'win32'
  ? 'C:\\Windows\\System32\\OpenSSH\\ssh.exe'
  : 'ssh';
const SSH_CMD = fs.existsSync(DEFAULT_SSH) ? DEFAULT_SSH : 'ssh';
const TUNNEL_ARGS = [
  '-o', 'ExitOnForwardFailure=yes',
  '-o', 'ConnectTimeout=10',
  '-o', 'ServerAliveInterval=60',
  '-L', `127.0.0.1:${LOCAL_PORT}:localhost:5432`,
  SSH_HOST,
  '-N',
];

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      resolve(false);
    });
    socket.connect(port, '127.0.0.1');
  });
}

function keepAlive() {
  console.log(`Reusing active tunnel on 127.0.0.1:${LOCAL_PORT}`);
  setInterval(() => {}, 1_000_000);
}

(async () => {
  const open = await isPortOpen(LOCAL_PORT);
  if (open) {
    keepAlive();
    return;
  }

  console.log(`SSH command: ${SSH_CMD} ${TUNNEL_ARGS.join(' ')}`);
  console.log(`Starting SSH tunnel to ${SSH_HOST} on 127.0.0.1:${LOCAL_PORT}`);
  const ssh = spawn(SSH_CMD, TUNNEL_ARGS, { stdio: 'inherit' });

  ssh.on('error', (err) => {
    console.error('SSH tunnel startup failed:', err.message);
    process.exit(1);
  });

  ssh.on('exit', (code, signal) => {
    if (signal) {
      console.error(`SSH tunnel exited with signal ${signal}`);
      process.exit(1);
    }
    console.error(`SSH tunnel exited with code ${code}`);
    process.exit(code);
  });

  process.on('SIGINT', () => ssh.kill('SIGINT'));
  process.on('SIGTERM', () => ssh.kill('SIGTERM'));
})();
