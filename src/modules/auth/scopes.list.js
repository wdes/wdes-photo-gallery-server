app.get('/api/01/scopes/list', function(req, res, next) {
  var scopes = [];
  BasicDB.Select(
    ['Api__TokenAlias', 'Api__TokenScopes', 'Api__Scopes'],
    ['DISTINCT Api__Scopes.name'],
    [
      'Api__TokenAlias.alias',
      'Api__TokenScopes.groupName',
      'Api__Scopes.name',
      'Api__TokenScopes.name',
      'Api__TokenAlias.token',
      '?',
    ],
    null,
    [req._token.token],
    function(err, rows) {
      if (err) next(err);
      for (var key in rows) {
        var row = rows[key];
        scopes.push(row.name);
      }
      res.send({ scopes: scopes });
    }
  );
});
app.get('/api/01/scopes/list_descriptions', function(req, res, next) {
  var scopes = [];
  BasicDB.Select(
    ['Api__TokenAlias', 'Api__TokenScopes', 'Api__Scopes'],
    ['DISTINCT Api__Scopes.name', 'Api__Scopes.description'],
    [
      'Api__TokenAlias.alias',
      'Api__TokenScopes.groupName',
      'Api__Scopes.name',
      'Api__TokenScopes.name',
      'Api__TokenAlias.token',
      '?',
    ],
    null,
    [req._token.token],
    function(err, rows) {
      if (err) next(err);
      for (var key in rows) {
        var row = rows[key];
        scopes.push({ name: row.name, description: row.description });
      }
      res.send({ scopes: scopes });
    }
  );
});
