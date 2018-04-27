const bodySchema = {
  body: {
    idSession: joi.string().required(),
  },
};
app.delete('/api/01/auth/logout', validationMid(bodySchema), function(req, res, next) {
  BasicDB.Delete(
    'Sessions',
    ['idSession', '?', 'token', '?'],
    [req.body.idSession, req._token.token],
    function(err, rows, fields) {
      if (err) {
        next(new Error('Error deleting session'));
      } else {
        res.status(200).send({ success: true });
      }
    }
  );
});
