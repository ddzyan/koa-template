const Koa = require('koa');
const http = require('http');
const cluster = require('cluster');

const initLoad = require('./common/initLoad');

const {
  server: { port },
} = require('./config');

const app = new Koa();

const unhandledRejection = new Map();
const MAX_TIME = 1000;

app.on('error', (err, ctx) => {
  console.error('server error', err, ctx);
});

initLoad.middlewareLoad(app);

const server = http.createServer(app.callback());

server.listen(port);

server.on('error', error => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
});

server.on('listening', () => {
  const addr = server.address();
  const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr.port}`;
  console.log(`Listening on ${bind}`);
});

process.on('uncaughtException', error => {
  console.log('uncaughtException :', error);

  const killTimer = setTimeout(() => {
    process.exit(1);
  }, 1000);

  killTimer.unref(); // 一次事件轮询结束后执行

  server.close();
  if (cluster.worker) {
    cluster.worker.disconnect();
  }
});

process.on('unhandledRejection', (reason, promise) => {
  unhandledRejection.set(promise, reason);

  setTimeout(() => {
    unhandledRejection.delete(promise);
    console.log('unhandledRejection :', reason);
  }, MAX_TIME);
});

process.on('rejectionHandled', promise => {
  if (unhandledRejection.has(promise)) {
    unhandledRejection.delete(promise);
    console.log('移除未被捕获的promise map');
  }
});

module.exports = server;
