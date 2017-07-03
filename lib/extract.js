'use strict'

const SQL = require('sql-template-strings')

/*
  {
  id:    aka oid, uid, pid
  type: 'post'
  details:
  }

  socdb re-extract
    runs this on every object

  could do extraction as a separate processes farm, but not needed.

 */

/**
 * Given a "new" object, obj, extract the data from t we can,
 * updating various database tables.
 * @param obj - wrapped userdata, postdata, etc
 * @return {Promise} - no useful resolve value
*/
function extract (db, obj) {
  if (obj.type === 'post') {
    db.query(SQL`INSERT INTO posts VALUES something something something`)
  }
}

module.exports = extract
