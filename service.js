var Service = require('node-linux').Service;
// Create a new service object
var svc = new Service({
  name: 'galerie',
  description: 'Serveur galerie',
  author: 'William Desportes',
  mode: 'systemd',
  script: __dirname + '/server.js',
  user: 'root',
  group: 'root',
  env: {
    name: 'NODE_ENV',
    value: 'production',
  },
});

svc.on('install', function() {
  svc.start();
});
svc.on('start', function() {
  console.log('Démarrage du service');
});
svc.on('stop', function() {
  console.log('Arrêt du service');
});
svc.on('doesnotexist', function() {
  svc.install();
});
svc.on('uninstall', function() {
  svc.install();
});
svc.uninstall();
