import { spawn } from 'node:child_process';
import { rootPath } from '@docksite/config';

const applications = [
  'apps/platform/server.js',
  'apps/cms/server.js',
  'apps/tools/link-shortener/server.js',
];
const watch = process.argv.includes('--watch');
const children = applications.map((file) =>
  spawn(process.execPath, [...(watch ? ['--watch'] : []), file], {
    cwd: rootPath,
    stdio: 'inherit',
    windowsHide: true,
  }),
);
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
for (const child of children) {
  child.on('error', (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on('exit', (code) => {
    if (!stopping) stop(code || 1);
  });
}
