'use strict'

const url = require('url')
// const debug = require('debug')('prioritize')

/**
 * In what order should we fetch all the different things we want to
 * fetch from the internet, especially from the Twitter API?
 *
 * Look in the database to see what would be good to fetch, and for
 * each time call q.add, with a priority.  Highest priority first.
 *
 * Stop at some point?
 *
 * q items have:
 *
 *    key - string, used to prevent duplicates
 *    priority - numeric, higher === sooner
 *    // parsedURL?
 *    service - eg 'twitter.com'
 *    type - eg 'post', 'timeline',
 *       current_posts, earlier_posts, later_posts
 *       current_likes, earlier_likes, ...
 *
 */

function prioritize (socdb, setPriority, done) {
  const all = []  // okay to run these concurrently

  all.push(
    socdb.query(`SELECT priority, url FROM page_scan 
                 WHERE done_at IS NULL OR redo_at < now()`)
      .then(res => {
        for (let row of res.rows) {
          // debug('row: ', row)
          setPriority(row.priority, {
            service: 'page summary',
            url: url.parse(row.url)
          })
        }
      })
  )

  all.push(
    socdb.query('SELECT * FROM twitter_users WHERE posts_earlier_complete=false')
      .then(res => {
        for (let user of res.rows) {
          // make a timeline item for this user
          if (user.posts_earlier_url) {
            setPriority(100, {   // decreasing somehow?  by count or time?
              service: 'twitter.com',
              type: 'earlier_posts',
              url: user.posts_earlier_url,
              requestedBy: '23556190',
              ofUid: user.twid
            })
          } else {
            setPriority(200, {
              service: 'twitter.com',
              type: 'current_posts',
              requestedBy: '23556190',
              ofUid: user.twid
            })
          }
        }
      })
  )

  Promise.all(all).then(done)
}

      /*
        socdb.loadAccounts()
        .then(accts => {
        for (let acct of accts) {

        // each account gets some juice (to) to spend on itself
        // and its SUBJECT -- if it's looking at someone, and then
        // spread out the to the contacts of the account & subject....

        // figure score

        // check if we have their likes, timeslines, blocks, followeds
        // if any are missing, queue those, priority, decreasing as
        // we go back in time for the timeline

        // given what we DID load for them, figure out a score of their
        // people.
        //
        // then load THOSE people, with a share of this score.
        //
        // score below 1 is cut off, maybe.
        }
        })

        // load all the accounts [ with their scores? ]
        // try to load their likes, timelines, blocks, followeds
        //   -- anything missing, queue it; try again next round
        // score the contacts
        // for each contact,

        // anything on the queue that matches something claimed,
        // check the timestamp on the claim; time to retry?
        */

module.exports = prioritize
