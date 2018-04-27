const path = require('path');
const fs = require('fs');
const sqlFormatter = require('sql-formatter');

const read = function(name, cbSuccess) {
  fs.readFile(name, 'utf8', function(err, data) {
    if (err) {
      return console.log(err);
    }
    cbSuccess(data);
  });
};
const write = function(name, data, format = true) {
  if (format) data = sqlFormatter.format(data);

  fs.writeFile(name, data, function(err) {
    if (err) {
      return console.log(err);
    }
    console.log(`Fichier ${name} écrit !`);
  });
};
const getMatchs = function(regex, data, cbMatch) {
  let m;
  while ((m = regex.exec(data)) !== null) {
    // This is necessary to avoid infinite loops with zero-width matches
    if (m.index === regex.lastIndex) {
      regex.lastIndex++;
    }
    cbMatch(m);
    /*
        // The result can be accessed through the `m`-variable.
        m.forEach((match, groupIndex) => {
            console.log(`Found match, group ${groupIndex}: ${match}`);
        });
      */
  }
};

/**
 * Processing views
 */
read('./views/views.sql', function(data) {
  const regex = /CREATE (.*)VIEW `(\w+)`\.`(\w+)` AS(.*);/g;
  getMatchs(regex, data, function(m) {
    write(`./views/${m[2]}.${m[3]}.sql`, m[0]);
  });
});
/**
 * Processing routines
 */
read('./routines/routines.sql', function(data) {
  const regex = /^(.|\n)+USE `(\w+)`;/g;
  getMatchs(regex, data, function(m) {
    const header = m[0];
    const dbname = m[2];
    var routines = [];

    var mdata = data.replace(header, 'DELIMITER ;');
    mdata = mdata.replace(/;;/g, '££');

    mdata = mdata.replace(/DELIMITER ££/g, '====££££====');
    //console.log(mdata);
    const regex2 = /DELIMITER ;([\s\S]*?)(?:\s££)/g;
    getMatchs(regex2, mdata, function(m) {
      const regex3 = /(FUNCTION|PROCEDURE) `(\w+)`/g;

      getMatchs(regex3, m[0], function(m3) {
        mdata = mdata.replace(m[0], '');
        m[0] = m[0].replace(/====££££====/g, 'DELIMITER ££');
        m[0] = m[0].replace(/££/g, ';;');
        routines.push({
          nom: dbname + '.' + m3[2],
          type: m3[1].toLowerCase(),
          data: header + '\r\n\r\n' + m[0],
        });
      });
    });
    mdata = mdata.replace(/\n\n/g, '');
    mdata = mdata.replace(/\r\r/g, '');
    mdata = mdata.replace(/\r\n\r\n/g, '');
    for (var i = 0; i < routines.length; i++) {
      routines[i].data += mdata;
      write(`./routines/${routines[i].type}/${routines[i].nom}.sql`, routines[i].data, false);
    }
  });
});
