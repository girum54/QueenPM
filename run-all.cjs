#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const isWindows = process.platform === 'win32';

console.log('🚀 Starting QueenPM - Backend & Frontend\n');

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
