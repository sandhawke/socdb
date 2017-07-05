'use strict'

const test = require('tape')
const socdb = require('..')
const SQL = socdb.SQL
const debug = require('debug')('test_timeline')

process.on('unhandledRejection', (reason, p) => {
  console.error(process.argv[1], 'Unhandled Rejection at: Promise', p, 'reason:', reason)
  process.exit()
})

test('load current tweets', t => {
  socdb.tempDB()
    .then(db => {

      db.on('twitter_users', twid => {
        db.loadUser(twid)
          .then(user => {
            debug('LOADED', user)
            console.log(user.posts_earlier_count, 'posts fetched')
            if (user.posts_earlier_complete) {
              console.log('done fetching posts')
              db.close()
              t.assert(user.posts_earlier_count > 2000)
              t.end()
            }
          })
      })
      const secret = require('../.sandhawke-secret')
      db.query(secret)
        .then(() => {
          db.query('INSERT INTO twitter_users (twid, fetched_at) VALUES (23556190, now())')
        })
        .then(() => {
          db.start()
        })

      // do something so that prioritize will pick it up

    })
})


      /*
      
      const all = []
      debug('1000')
      all.push(db.query(SQL`DELETE FROM page_scan WHERE testing IS NOT NULL`))

      for (let u of Object.keys(data)) {
        const p = data[u]
        all.push(db.query(SQL`INSERT INTO page_scan (url, priority, testing) VALUES (${u}, ${p}, 1)`))
      }
      debug('2000')
      Promise.all(all)
        .then(results => {
          debug('3000')
          db.startInProcessFetchers()
          debug('4000')
          db.on('fetchQueueEmpty', () => {
            debug('5000')
            db.query(SQL`SELECT * from page_scan WHERE testing=1 AND done_at IS NOT NULL ORDER BY url`)
              .then(res => {
                t.equal(res.rowCount, 9)
                t.equal(res.rows[0].starts, '1\n')
                // console.log(res.rows)
                db.close()
                t.end()
              })
          })
        })
    })
})
*/
