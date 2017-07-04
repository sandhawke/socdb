'use strict'

const test = require('tape')
const socdb = require('..')

process.on('unhandledRejection', (reason, p) => {
  console.error(process.argv[1], 'Unhandled Rejection at: Promise', p, 'reason:', reason)
  process.exit()
})

test('tempdb results are different', t => {
  socdb.tempDB()
    .then(t1 => {
      socdb.tempDB()
        .then(t2 => {
          t1.query(t1.SQL`CREATE TABLE x1 (id int)`)
            .then(() => {
              // we'll get a database error if these are in the same database
              t2.query(t2.SQL`CREATE TABLE x1 (id int)`)
                .then(() => {
                  t.pass()
                  t1.close()
                  t2.close()
                  t.end()
                })
            })
        })
    })
})

test('tempdb has initialized tables', t => {
  socdb.tempDB()
    .then(t1 => {
      t1.query(t1.SQL`INSERT INTO page_scan (url, priority) VALUES ('x', 1)`)
        .then(() => {
          t1.query(t1.SQL`SELECT url, priority FROM page_scan`)
            .then(res => {
              t.equal(res.rowCount, 1)
              t1.close()
              t.end()
            })
        })
    })
})
