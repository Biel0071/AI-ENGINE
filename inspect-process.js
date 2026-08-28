
console.log(JSON.stringify({
  pid: process.pid,
  ppid: process.ppid,
  argv: process.argv,
  execArgv: process.execArgv,
  cwd: process.cwd(),
  env: {
    NODE_ENV: process.env.NODE_ENV,
    FENIX_ACTIVE_PROJECT: process.env.FENIX_ACTIVE_PROJECT,
    FENIX_WORKSPACE_ROOT: process.env.FENIX_WORKSPACE_ROOT,
    PORT: process.env.PORT
  }
}, null, 2));
