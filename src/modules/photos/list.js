app.get('/api/01/photos/list', function(req, res, next) {
  var photos = [];
  BasicDB.Select(
    'files',
    ['uuid_file', 'status', 'basename', 'filemtime', 'filectime', 'MinDate'],
    null,
    null,
    [],
    function(err, rows) {
      if (err) next(err);
      else
        for (var key in rows) {
          var row = rows[key];
          photos.push(row);
        }
      res.send({ photos: photos });
    }
  );
});
const bodySchema = {
  body: {
    year: joi.number().required(),
  },
};
app.post('/api/01/photos/list', validationMid(bodySchema), function(req, res, next) {
  var photos = [];
  BasicDB.Select(
    ['files', 'users'],
    [
      'uuid_file',
      'status',
      'basename',
      'filemtime',
      'filectime',
      'MinDate',
      'users.nom as addedByNom',
      'users.prenom as addedByPrenom',
    ],
    ['files.added_by', 'users.uuid_user', 'YEAR(MinDate)', '?'],
    'ORDER BY files.MinDate DESC',
    [req.body.year],
    function(err, rows) {
      if (err) next(err);
      else {
        for (var key in rows) {
          var row = rows[key];
          photos.push(row);
        }
        res.send({ photos: photos });
      }
    }
  );
});
