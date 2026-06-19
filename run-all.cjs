#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const path = require('path');

const isWindows = process.platform === 'win32';

const FRONTEND_PORT = 5173;
const BACKEND_PORT = 3000;

// Kill processes running on specific ports
function killPortProcesses(port) {
  try {
    if (isWindows) {
      execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf-8', stdio: 'pipe' })
        .split('\n')
        .forEach((line) => {
          const match = line.match(/LISTENING\s+(\d+)/);
          if (match) {
            const pid = match[1];
            try {
              execSync(`taskkill /PID ${pid} /F`, { stdio: 'pipe' });
              console.log(`✓ Killed process on port ${port} (PID: ${pid})`);
            } catch (e) {
              // Process might not exist
            }
          }
        });
    } else {
      // Unix-like systems
      const output = execSync(`lsof -i :${port} -t`, { encoding: 'utf-8', stdio: 'pipe' }).trim();
      if (output) {
        output.split('\n').forEach((pid) => {
          if (pid) {
            try {
              execSync(`kill -9 ${pid}`, { stdio: 'pipe' });
              console.log(`✓ Killed process on port ${port} (PID: ${pid})`);
            } catch (e) {
              // Process might not exist
            }
          }
        });
      }
    }
  } catch (err) {
    // No processes found on this port, that's fine
  }
}

console.log('🚀 Starting QueenPM - Backend & Frontend\n');
console.log('🔪 Cleaning up old processes...');

killPortProcesses(FRONTEND_PORT);
killPortProcesses(BACKEND_PORT);

console.log('');

// Frontend process
const frontendProcess = spawn(isWindows ? 'npm.cmd' : 'npm', ['run', 'dev'], {
  cwd: path.join(__dirname),
  stdio: 'inherit',
  shell: isWindows,
});

// Backend process
const backendProcess = spawn(isWindows ? 'npm.cmd' : 'npm', ['run', 'start:dev'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit',
  shell: isWindows,
});

// Handle process termination
const handleTermination = (signal) => {
  console.log(`\n${signal} received, shutting down gracefully...\n`);
  frontendProcess.kill(signal);
  backendProcess.kill(signal);
  process.exit(0);
};

process.on('SIGINT', () => handleTermination('SIGINT'));
process.on('SIGTERM', () => handleTermination('SIGTERM'));

// Handle process errors
frontendProcess.on('error', (err) => {
  console.error('❌ Frontend process error:', err);
  process.exit(1);
});

backendProcess.on('error', (err) => {
  console.error('❌ Backend process error:', err);
  process.exit(1);
});

// Handle process exit
frontendProcess.on('exit', (code) => {
  if (code !== null && code !== 0) {
    console.error(`❌ Frontend process exited with code ${code}`);
    backendProcess.kill();
    process.exit(code);
  }
});

backendProcess.on('exit', (code) => {
  if (code !== null && code !== 0) {
    console.error(`❌ Backend process exited with code ${code}`);
    frontendProcess.kill();
    process.exit(code);
  }
});
