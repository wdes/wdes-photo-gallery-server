// Include the cluster module
global.cluster = require('cluster');
const log4js = require('log4js');

log4js.configure({
  appenders: {
    out: { type: 'stdout' },
  },
  categories: { default: { appenders: ['out'], level: 'debug' } },
});
var restartWorkers = true;
let logger;
var workers = [];

if (cluster.isMaster) {
  // Code to run if we're in the master process
  process.title = 'M:Galerie';
  var stdin = process.openStdin();
  const stopServer = function() {
    logger.debug('Received stop command !');
    restartWorkers = false;
    for (var workerId in cluster.workers) {
      if (cluster.workers[workerId].isDead() === false) cluster.workers[workerId].kill();
    }
  };
  process.on('SIGTERM', function() {
    stopServer();
  });
  process.on('SIGINT', function() {
    logger.debug('Received SIGINT');
    stopServer();
  });
  stdin.addListener('data', function(d) {
    // note:  d is an object, and when converted to a string it will
    // end with a linefeed.  so we (rather crudely) account for that
    // with toString() and then trim()

    var input_str = d.toString().trim();
    const args = input_str.split(' ');
    switch (args[0]) {
      case 'reload':
        for (var id in cluster.workers) {
          if (cluster.workers[id].isDead() === false) cluster.workers[id].kill();
        }
        break;
      case 'stop':
        stopServer();
        break;
    }
  });
  logger = log4js.getLogger('master');
  var cpuCount = require('os').cpus().length;
  //TODO users delete on worker death
  for (var i = 0; i < cpuCount; i++) {
    var thread = cluster.fork();
    workers.push(thread);
  }
  cluster.on('exit', (worker, code, signal) => {
    console.log(
      'worker %d died (%s). ' + restartWorkers ? 'restarting...' : '',
      worker.process.pid,
      signal || code
    );
    if (restartWorkers) workers.push(cluster.fork());
    var nbr = 0;
    for (var workerId in workers) {
      //Count alive workers
      if (workers[workerId].isDead() === false) nbr++;
    }
    if (nbr === 0) {
      //Everybody dead, kill master process.
      cluster.disconnect(function() {
        process.exit(0);
      });
    }
  });
  logger.info('master is done', process.pid);
  return;
} else {
  process.title = 'W' + cluster.worker.id + ':Galerie';
  logger = log4js.getLogger('api [' + cluster.worker.id + ']');
  global.logger = logger;
  //Workers code
  require(__dirname + '/src/main.js');
}
