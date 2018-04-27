const pathToRegexp = require('path-to-regexp');
const RequestMid = {
  tokenExists: function(token, onSuccess, onError) {
    if (token.length > 32) {
      onError(400);
      return;
    }
    BasicDB.Function(
      'tokenExists(?)',
      [token],
      function(data) {
        //logger.debug("tokenExists: "+data);
        if (data === 1) {
          onSuccess();
        } else {
          onError();
        }
      },
      function(err) {
        logger.error('Erreur tokenExists : ', err);
        onError();
      }
    );
  },
  hasPermission: function(token, scope, onSuccess, onError) {
    BasicDB.Function(
      'hasPermission(?,?)',
      [token, scope],
      function(has) {
        //logger.debug("hasPermission: "+has);
        if (has === 1) {
          onSuccess();
        } else {
          onError(498);
        }
      },
      function(err) {
        logger.error('Erreur hasPermission : ', err);
        onError(500);
      }
    );
  },
  tokenMid: function(req, res, next) {
    var token = req.headers.authorization;
    if (!token) token = 'PuBlIcWGESsze9tbxgHDQ8PQwhMT0KeN';
    else token = token.replace('Bearer ', '');
    req._token = { token: token };

    var keys = [];
    var re = pathToRegexp('/api/:version(\\d+)/:section/:action*', keys);
    var path = re.exec(req.path);
    if (path == null) {
      next();
      return;
    }
    if (path.length <= 2) {
      next();
      return;
    }
    const scope = path[2] + '.' + path[3];
    RequestMid.tokenExists(
      token,
      function() {
        //logger.debug("Existing token : "+token+"/"+scope);
        RequestMid.hasPermission(
          token,
          scope,
          function() {
            req._token.valid = true;
            //logger.debug("Good token : "+token+"/"+scope);
            next();
          },
          function(code) {
            if (code === 500)
              return res.status(500).send({
                success: false,
                msg: 'Token verification failed.',
              });
            else if (code === 498)
              return res.status(498).send({
                success: false,
                msg: 'Invalid token for requested scope.',
              });
          },
          req
        );
      },
      function() {
        //logger.error("Bad token : "+token+"/"+scope);
        return res.status(401).send({
          success: false,
          msg: 'Invalid token.',
        });
      }
    );
  },
};
module.exports = RequestMid;
