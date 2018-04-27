const fs = require('fs');
const { GALLERY_STORAGE_DIR } = process.env;
app.post('/api/01/photos/download', function(req, res, next) {
  var years = [];
  BasicDB.Select('files', ['path'], ['uuid_file', '?'], null, [req.body.uuid_file], function(
    err,
    rows
  ) {
    if (err) next(err);
    else {
      if (rows.length > 0) {
        const img = rows[0];
        const imgPath = img.path.replace('{galerie}', GALLERY_STORAGE_DIR);
        if (fs.existsSync(imgPath)) {
          res.sendFile(imgPath);
        } else {
          next(new Error('File does not exist !'));
        }
      } else {
        next(new Error('No file found'));
      }
    }
  });
});
