const fs = require('fs/promises');
const path = require('path');

const TARGET_FOLDERS = ['controllers', 'services', 'routes', 'repositories'];

async function collectTasks(rootPath) {
  const tasks = [];

  for (const folderName of TARGET_FOLDERS) {
    const folderPath = path.join(rootPath, folderName);

    try {
      const files = await fs.readdir(folderPath);

      for (const fileName of files) {
        if (!fileName.endsWith('.js')) {
          continue;
        }

        const filePath = path.join(folderPath, fileName);
        const content = await fs.readFile(filePath, 'utf8');

        if (/catch \{\s*\/\/ ignore/.test(content)) {
          tasks.push(`Review silent error handling in ${folderName}/${fileName}`);
        }

        if (/TODO|FIXME/.test(content)) {
          tasks.push(`Resolve TODO markers in ${folderName}/${fileName}`);
        }

        if (content.split(/\r?\n/).length > 220) {
          tasks.push(`Refactor large file ${folderName}/${fileName}`);
        }
      }
    } catch {
      // ignore missing folders
    }
  }

  return tasks;
}

async function generateTasks(rootPath = process.cwd()) {
  const tasks = await collectTasks(rootPath);
  const tasksDir = path.join(rootPath, 'tasks');
  await fs.mkdir(tasksDir, { recursive: true });
  const markdown = ['# Development Tasks', '', ...tasks.map((task) => `- ${task}`)].join('\n');
  await fs.writeFile(path.join(tasksDir, 'todo.md'), markdown || '# Development Tasks\n');
  return tasks;
}

if (require.main === module) {
  generateTasks().then((tasks) => {
    console.log(`Generated ${tasks.length} tasks.`);
  });
}

module.exports = {
  generateTasks,
};
