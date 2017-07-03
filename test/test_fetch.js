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
  const tid = process.pid
  const all = []
  // better to remove stuff from previous test runs than encounter it here
  all.push(socdb.query(SQL`DELETE FROM page_summary_request WHERE test_run IS NOT NULL`))
  // all.push(socdb.query(SQL`DELETE FROM page_summary_request WHERE test_run=${tid}`))
  for (let u of Object.keys(data)) {
    const p = data[u]
    all.push(socdb.query(SQL`INSERT INTO page_summary_request (url, priority, test_run) VALUES (${u}, ${p}, ${tid})`))
  }
  Promise.all(all)
    .then(results => {
      socdb.startInProcessFetchers()
      // values inserted...
    })
})
