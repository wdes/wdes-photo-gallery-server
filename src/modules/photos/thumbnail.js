const epeg = require('epeg');
const path = require('path');
const fs = require('fs');
const { GALLERY_STORAGE_DIR } = process.env;
app.post('/api/01/photos/thumbnail', function(req, res, next) {
  var years = [];
  BasicDB.Select('files', ['path'], ['uuid_file', '?'], null, [req.body.uuid_file], function(
    err,
    rows
  ) {
    if (err) next(err);
    else {
      if (rows.length > 0) {
        const img = rows[0];
        var newWidthInPixels = 348;
        var newHeightInPixels = 225;
        var saveQualityPercent = 30;
        const imgPath = img.path.replace('{galerie}', GALLERY_STORAGE_DIR);
        if (fs.existsSync(imgPath)) {
          try {
            const cachePath = path.join(
              GALLERY_STORAGE_DIR,
              'Cache',
              'epeg_' + path.basename(imgPath)
            );
            if (fs.existsSync(cachePath) === false) {
              //logger.debug(imgPath, cachePath);
              image = new epeg.Image({ path: imgPath });
              image
                .downsize(newWidthInPixels, newHeightInPixels, saveQualityPercent)
                .saveTo(cachePath);
            }
            res.sendFile(cachePath);
          } catch (err) {
            if (err instanceof TypeError) {
              res.sendFile(imgPath);
            } else {
              logger.debug('Error on file ', imgPath, err.code);
              next(err);
            }
          }
        } else {
          next(new Error('File does not exist !'));
        }
      } else {
        next(new Error('No file found'));
      }
    }
  });
});
