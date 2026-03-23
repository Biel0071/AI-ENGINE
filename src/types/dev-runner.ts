import { exec } from 'child_process';

export interface DevRunnerResult {
  command: string;
  pid: number;
}

export function runDev(command = 'npm run dev', cwd = process.cwd()): Promise<DevRunnerResult> {
  return new Promise((resolve, reject) => {
    const child = exec(command, { cwd }, (error) => {
      if (error) {
        reject(error);
      }
    });

    if (!child.pid) {
      reject(new Error('Could not start dev process.'));
      return;
    }

    resolve({ command, pid: child.pid });
  });
}
