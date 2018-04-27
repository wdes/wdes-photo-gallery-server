app.get('/api/01/api/index', function(req, res) {
  res.send({ status: 'online', description: 'API Galerie' });
});
