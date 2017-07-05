'use strict'

const test = require('tape')
const socdb = require('..')
const SQL = socdb.SQL
const debug = require('debug')('test_notify')

process.on('unhandledRejection', (reason, p) => {
  console.error(process.argv[1], 'Unhandled Rejection at: Promise', p, 'reason:', reason)
  process.exit()
})

test('pg notify', t => {
  t.plan(1)
  socdb.tempDB()
    .then(db => {
      db.on('notification', (...args) => {
        debug('got args', args)
        const [tablename] = args[0].payload.split(',')
        t.equal(tablename, 'page_scan')
        db.close()
        t.end()
      })

      db.query(SQL`insert into page_scan (url, priority) values ('http://example.org', 999);
`)
    })
})
