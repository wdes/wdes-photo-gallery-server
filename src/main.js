require('dotenv').config({ path: __dirname + '/../.env' });
const express = require('express');
const bodyParser = require('body-parser');
const glob = require('glob');
const path = require('path');
const fs = require('fs');
const errorHandler = require('errorhandler');
const toobusy = require('toobusy-js');
const webdav = require('webdav-server').v2;
const { GALLERY_STORAGE_DIR, GALLERY_STORAGE_DIR_INPUT } = process.env;

const userManager = new webdav.SimpleUserManager();
const user = userManager.addUser('test', 'test', true);

// Privilege manager (tells which users can access which files/folders)
const privilegeManager = new webdav.SimplePathPrivilegeManager();
privilegeManager.setRights(user, '/', ['all']);

const server = new webdav.WebDAVServer({
  // HTTP Digest authentication with the realm 'Default realm'
  httpAuthentication: new webdav.HTTPDigestAuthentication(userManager, 'Default realm'),
  privilegeManager: privilegeManager,
  port: 2000, // Load the server on the port 2000 (if not specified, default is 1900)
  autoSave: {
    // Will automatically save the changes in the 'data.json' file
    treeFilePath: 'data.json',
  },
});
server.rootFileSystem().addSubTree(server.createExternalContext(), {
  folder1: {
    // /folder1
    'file1.txt': webdav.ResourceType.File, // /folder1/file1.txt
    'file2.txt': webdav.ResourceType.File, // /folder1/file2.txt
  },
  'file0.txt': webdav.ResourceType.File, // /file0.txt
  Galerie: {
    '2000': {},
    '2001': {},
  },
});
server.setFileSystem(
  '/Entree',
  new webdav.PhysicalFileSystem(GALLERY_STORAGE_DIR_INPUT),
  success => {
    server.start(() => logger.info('READY'));
  }
);

global.joi = require('joi');
global.app = express();
global.BasicDB = require(__dirname + '/static/BasicDB');
logger.info('Démarrage du worker n°%d', cluster.worker.id);

const tokenMid = require(__dirname + '/static/RequestMid').tokenMid;
global.validationMid = require(__dirname + '/static/ValidationMid')(joi);

app.disable('x-powered-by');
app.disable('etag');
app.set('view engine', 'pug');
app.set('env', process.env.NODE_ENV || 'ZOMBIE');
logger.info('Environnement : %s', app.get('env'));
app.all('/*', function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'DELETE,GET,POST,OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Content-type,Origin,Accept,Authorization,X-Requested-With,Cache-Control'
  );
  res.setHeader('Access-Control-Allow-Credentials', true);
  if (req.method == 'OPTIONS') {
    res.status(200).end();
  } else {
    next();
  }
});
app.use(function(req, res, next) {
  if (toobusy()) {
    res.status(503).send({ msg: "503: I'm busy right now, sorry", code: 503 });
  } else {
    next();
  }
});
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.get('/api/verifphotos', function(req, res, next) {
  BasicDB.Select('files', ['path', 'basename'], null, null, [], function(err, rows, fields) {
    if (err) next(err);
    else {
      var result = { ok: 0, nop: 0, nops: [] };
      rows.forEach(function(element) {
        var path = element.path;
        path = path.replace('{galerie}', GALLERY_STORAGE_DIR);

        if (fs.existsSync(path)) {
          //logger.debug(path);
          result.ok++;
        } else {
          result.nop++;
          result.nops.push(path);
          logger.error(element);
        }
      });
      res.send(result);
    }
  });
});
app.get('/api/error500', function(req, res, next) {
  next(new Error('Aide moi !'));
});
app.use(tokenMid);

glob.sync(__dirname + '/modules/**/*.js').forEach(function(file) {
  //logger.info("Loaded : "+file);
  require(path.resolve(file));
});

app.use(function(req, res) {
  res.status(404).send({ msg: '404: Page not Found', code: 404 });
});
if (app.get('env') == 'development') {
  app.use(errorHandler());
}
app.use(function(err, req, res, next) {
  if (app.get('env') == 'test') {
    //logger.error(err);
  }
  res.status(500).send({ success: false, msg: err.message });
});
const PORT = process.env.PORT || 80;
global._server = app.listen(PORT, function() {
  var port = _server.address().port;
  logger.info('Serveur Galerie démarré sur le port : %s', port);
  app.emit('appStarted');
});

app.on('appStop', function() {
  _server.close(function() {
    app.emit('close');
  });
});

app.on('close', function() {
  BasicDB.end();
  toobusy.shutdown();
  process.exit();
});

module.exports = app;
