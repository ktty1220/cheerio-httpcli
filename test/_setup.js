const path = require('path');
const { spawn } = require('child_process');
const colors = require('colors/safe');

const startServer = () =>
  new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [path.join(__dirname, '_server.js')]);
    proc.stdout.on('data', (buf) => {
      const data = buf.toString();
      const m = data.match(/@@@ server ready ({.+}) @@@/);
      if (m) {
        global._testServer = proc;
        const port = JSON.parse(m[1]);
        console.info(port);
        process.env.CHEERIO_HTTPCLI_TEST_SERVER_PORT_HTTP = port.http;
        process.env.CHEERIO_HTTPCLI_TEST_SERVER_PORT_HTTPS = port.https;
        resolve();
        return;
      }
      console.info(data);
    });
    proc.stderr.on('data', (buf) => {
      console.error(colors.red.bold(buf.toString()));
    });
  });

module.exports = async () => {
  await startServer();
};
