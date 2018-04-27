var crypto = require('crypto');
var useragent = require('express-useragent');
const bodySchema = {
  body: {
    username: joi.string().required(),
    password: joi.string().required(),
  },
};
const getIP = function get(req) {
  var ip_address = req.connection.remoteAddress
    ? req.connection.remoteAddress
    : req.remoteAddress;
  if (typeof req.headers['cf-connecting-ip'] === 'undefined') {
    return ip_address;
  } else {
    return req.headers['cf-connecting-ip'];
  }
};
app.post('/api/01/auth/login', useragent.express(), validationMid(bodySchema), function(
  req,
  res,
  next
) {
  var { username, password } = req.body;
  /*{
    "isMobile":false,
    "isDesktop":true,
    "isBot":false,
    .....
    "browser":"Chrome",
    "version":"17.0.963.79",
    "os":"Windows 7",
    "platform":"Microsoft Windows",
    "source":"Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/535.11 (KHTML, like Gecko) Chrome/17.0.963.79..."
  }*/
  const browserTag =
    req.useragent.browser +
    '||' +
    req.useragent.os +
    '||' +
    (req.useragent.isMobile ? '1' : '0') +
    (req.useragent.isDesktop ? '1' : '0') +
    (req.useragent.isBot ? '1' : '0');
  //            (table_name,columns,where,supp,binds,onSuccess)
  BasicDB.Select(
    'users',
    ['uuid_user', 'username', 'password', 'nom', 'prenom'],
    ['username', '?'],
    null,
    [username],
    function(err, rows_user, fields) {
      if (err) next(err);
      else {
        if (rows_user.length === 0) {
          res.status(400).send({ success: false, msg: 'Compte introuvable !' });
        } else {
          password = crypto
            .createHash('sha1')
            .update(password)
            .digest('hex');
          if (rows_user[0].password === password) {
            BasicDB.Select(
              null,
              [
                'RandString(32) as idSession',
                'RandString(32) as token',
                'DATE_ADD(UTC_TIMESTAMP(), INTERVAL 2 DAY) as expires',
                'UNIX_TIMESTAMP(DATE_ADD(UTC_TIMESTAMP(), INTERVAL 2 DAY)) as expirest',
              ],
              null,
              null,
              [],
              function(err, rands, fields) {
                if (err) next(new Error('Token generation error'));
                else {
                  /*
											 * Insertion de la session
											 */
                  BasicDB.Insert(
                    'Sessions',
                    ['uuid_user', 'idSession', 'token', 'expires', 'ip', 'tag'],
                    [
                      {
                        uuid_user: rows_user[0].uuid_user,
                        idSession: rands[0].idSession,
                        token: rands[0].token,
                        expires: rands[0].expires,
                        ip: getIP(req),
                        tag: browserTag,
                      },
                    ],
                    function(err, rowsc, fields) {
                      if (err) {
                        next(new Error('Session creation error'));
                      } else {
                        res.status(202).send({
                          success: true,
                          idSession: rands[0].idSession,
                          token: rands[0].token,
                          username: rows_user[0].username,
                          nom: rows_user[0].nom,
                          prenom: rows_user[0].prenom,
                          expires: rands[0].expirest,
                        });
                      }
                    }
                  );
                }
              }
            );
          } else {
            //Sending same for security purposes
            res.status(400).send({ success: false, msg: 'Mot de passe incorrect !' });
          }
        }
      }
    }
  );
});
