const mysql = require('mysql2');

const { DB_HOST, DB_USER, DB_PASS, DB_DB } = process.env;
logger.debug(`[BasicDB] config {DB_HOST:${DB_HOST}, DB_USER:${DB_USER}, DB_DB:${DB_DB}}`);
var mysql_pool = mysql.createPool({
  connectionLimit: 50,
  multipleStatements: true,
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASS,
  database: DB_DB,
  debug: false,
});
const _ = require('lodash');

const BasicDB = {
  processWhereChain: function(where) {
    if (Array.isArray(where)) {
      let wherechain = '';
      for (var i = 0; i < where.length; i = i + 2) {
        if (where[i + 1] === '?') wherechain += where[i] + '=?';
        else if (!_.includes(where[i + 1], '.') && !_.includes(where[i + 1], '('))
          //.replace('"','\\"')
          wherechain += where[i] + '="' + where[i + 1] + '"';
        //.replace('"','\\"')
        else wherechain += where[i] + '=' + where[i + 1];
        if (i + 2 != where.length) {
          wherechain += ' AND ';
        } else {
          wherechain += ' ';
        }
      }
      where = wherechain;
    }
    return where;
  },
  insert: function(start, table_name, columns, data) {
    var binds = [];
    var req = start + ' ' + table_name + ' ( ' + columns.join() + ' ) VALUES ';
    for (var i = 0; i < data.length; i++) {
      var item = data[i];
      for (var j = 0; j < columns.length; j++) {
        var col = columns[j];
        if (j === 0) req += '( ?';
        else if (j + 1 === columns.length) req += '? )';
        else req += '?';

        if (j + 1 != columns.length) req += ' , ';

        binds.push(item[col]);
      }
      if (i + 1 != data.length) req += ' , ';
    }
    return { binds, req };
  },
  select: function(table_name, columns, where, supp) {
    let request = 'SELECT ' + columns.join();
    if (table_name !== null) request += ' FROM ' + table_name;
    if (where !== null) request += ' WHERE ' + where;
    if (supp !== null) request += ' ' + supp;
    return request;
  },
  Select: function(table_name, columns, where, supp, binds, onSuccess) {
    if (Array.isArray(table_name)) table_name = table_name.join();
    if (where !== null) where = BasicDB.processWhereChain(where);
    BasicDB.query(BasicDB.select(table_name, columns, where, supp), binds, onSuccess);
  },
  Function: function(function_name, binds, onSuccess, onError) {
    BasicDB.query('SELECT ' + function_name + ' as pval', binds, function(err, rows) {
      if (err) {
        onError(err);
      } else {
        onSuccess(rows[0].pval);
      }
    });
  },
  Procedure: function(procedure_name, binds, onSuccess, onError) {
    BasicDB.query('CALL ' + procedure_name, binds, function(err, rows) {
      if (err) {
        onError(err);
      } else {
        onSuccess(rows);
      }
    });
  },
  // generateOnDuplicate : function(columns){
  //   var chunk = " ON DUPLICATE KEY UPDATE ";
  //     for(var i=0; i < columns.length ;i++){
  //       chunk+=columns[i]+"=VALUES("+columns[i]+")";
  //       if(i+1 != columns.length)
  //         chunk += " , ";
  //     }
  //     return chunk;
  // },
  insertMode: function(table_name, columns, columnsd, data, onSuccess, mode) {
    let prereq = BasicDB.insert(mode, table_name, columns, data);
    //prereq.req += BasicDB.generateOnDuplicate(columnsd);
    //console.warn(prereq.req);
    BasicDB.query(prereq.req, prereq.binds, onSuccess);
  },
  InsertUpdate: function(table_name, columns, columnsd, data, onSuccess) {
    BasicDB.insertMode(
      table_name,
      columns,
      columnsd,
      data,
      onSuccess,
      'INSERT OR REPLACE INTO'
    );
  },
  Insert: function(table_name, columns, data, onSuccess) {
    BasicDB.insertMode(table_name, columns, null, data, onSuccess, 'INSERT INTO');
  },
  Delete: function(table_name, where, binds, onSuccess) {
    where = BasicDB.processWhereChain(where);

    BasicDB.query('DELETE FROM ' + table_name + ' WHERE ' + where, binds, onSuccess);
  },
  query: function(request, binds, cb) {
    logger.debug('[MYSQL] ' + request + ' | ' + JSON.stringify(binds));
    return mysql_pool.execute(request, binds, cb);
  },
  batchRequests: function(batch, success, error) {
    var req = '';
    var binds = [];
    batch.forEach(function(request) {
      req += request.sql;
      binds.push(...request.binds);
    });
    mysql_pool.getConnection(function(err, connection) {
      connection.beginTransaction(function(err) {
        if (err) {
          error(err);
        } else {
          connection.query(req, binds, function(err, rows) {
            if (err) {
              return connection.rollback(function() {
                error(err);
              });
            } else
              connection.commit(function(err) {
                if (err) {
                  return connection.rollback(function() {
                    error(err);
                  });
                } else success(rows);
              });
          });
        }
      });
    });
  },
  end: function() {
    mysql_pool.end();
  },
  fromJSON: JSON.parse,
};

module.exports = BasicDB;
