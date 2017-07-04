'use strict'

const test = require('tape')
const socdb = require('..')
const SQL = socdb.SQL

process.on('unhandledRejection', (reason, p) => {
  console.error(process.argv[1], 'Unhandled Rejection at: Promise', p, 'reason:', reason)
  process.exit()
})

test('load some files in priority order', t => {
  const data = {
    'https://www.w3.org/People/Sandro/simple-test-files/1': 10,
    'https://www.w3.org/People/Sandro/simple-test-files/2': 20,
    'https://www.w3.org/People/Sandro/simple-test-files/3': 30,
    'https://www.w3.org/People/Sandro/simple-test-files/4': 40,
    'https://www.w3.org/People/Sandro/simple-test-files/5': 50,
    'https://www.w3.org/People/Sandro/simple-test-files/6': 60,
    'https://www.w3.org/People/Sandro/simple-test-files/7': 70,
    'https://www.w3.org/People/Sandro/simple-test-files/8': 80,
    'https://www.w3.org/People/Sandro/simple-test-files/9': 90
  }

  // we were using testing=pid to let us run multiple simultaneous tests at
  // once, but we ended up with garbage left when tests failed

  const all = []
  all.push(socdb.query(SQL`DELETE FROM page_scan WHERE testing IS NOT NULL`))

  for (let u of Object.keys(data)) {
    const p = data[u]
    all.push(socdb.query(SQL`INSERT INTO page_scan (url, priority, testing) VALUES (${u}, ${p}, 1)`))
  }
  Promise.all(all)
    .then(results => {
      socdb.startInProcessFetchers()
      socdb.on('fetchQueueEmpty', () => {
        socdb.query(SQL`SELECT * from page_scan WHERE testing=1 AND done_at IS NOT NULL ORDER BY url`)
          .then(res => {
            t.equal(res.rowCount, 9)
            t.equal(res.rows[0].starts, '1\n')
            // console.log(res.rows)
            socdb.stopFetchers()
            t.end()
          })
      })
    })
})
