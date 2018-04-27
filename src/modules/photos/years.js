app.get('/api/01/photos/years', function(req, res, next) {
  var years = [];
  BasicDB.Select(
    'files',
    ['COUNT(*) as nbr', 'YEAR(MinDate) as year'],
    null,
    'GROUP BY YEAR(MinDate)',
    [],
    function(err, rows) {
      if (err) next(err);
      else
        for (var key in rows) {
          var row = rows[key];
          years.push(row);
        }
      res.send({ years: years });
    }
  );
});
