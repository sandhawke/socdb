'use strict'

// const url = require('url')
const request = require('request')
const qs = require('qs')
const Long = require('long')
const SQL = require('sql-template-strings')
const debug = require('debug')('fetcher')

class Fetcher {
  constructor (socdb, boss) {
    // const activeCount = new Map()
    this.socdb = socdb
    this.boss = boss
    this.pleaseStop = false
  }

  start () {
    this.pleaseStop = false
    this.run()
  }

  stop () {
    this.pleaseStop = true
  }

  run () {
    if (this.pleaseStop) return
    debug('calling next')
    const {done, value} = this.boss.next()
    // debug('going to handle', item)
    if (done) {
      // check again in 10ms because we don't have a way
      // to request being notified.  sad.
      debug('will fetcher.run() again soon')
      setTimeout(this.run.bind(this), 1000)
    } else {
      this.fetch(value)
      // let's wait until it's done before trying another one
      // just for debugging for now; should be able to fire and
      // forget, although... we do kind of want to prioritize CPU
      // somehow...   maybe sleep a little before starting the next
      // one?
        .then(() => {
          // and let's sleep a little, again to help with debugging
          setTimeout(this.run.bind(this), 10)
        })
    }
  }

  fetch (item) {
    return new Promise((resolve, reject) => {
      debug('.fetch item=', item)

      if (item.service === 'page summary') {
        const req = {
          url: item.url
        }
        request.get(req, (e, r, body) => {
          if (e) { reject(e); return }
          // console.log('got body', body)
          const starts = body.slice(0, 64)
          resolve(this.socdb.query(SQL`UPDATE page_scan SET done_at=now(), starts=${starts} WHERE url=${item.url.href}`))
        })
        return
      }

      if (item.service === 'twitter.com') {
        this.socdb.loadUser(item.ofUid)
          .then(ofUser => {
            this.socdb.loadAuth(item.requestedBy)
              .then(auth => {
                console.assert(this.socdb.twitter.consumer_key)
                console.assert(auth)
                const oauth = {
                  consumer_key: this.socdb.twitter.consumer_key,
                  consumer_secret: this.socdb.twitter.consumer_secret,
                  token: auth.twitter_primary_access_token_key,
                  token_secret: auth.twitter_primary_access_token_secret
                }

                const req = {
                  url: 'https://api.twitter.com/1.1/',
                  oauth,
                  json: true
                }

                function useWeb () {
                  return new Promise((resolve, reject) => {
                    debug('useWeb request', req)
                    request.get(req, (e, r, body) => {
                      if (e) {
                        reject(e)
                        return
                      } else {
                        // item.rateLimitInfo(...)  to pass feedback back to boss???
                        debug('request completed with status', r.statusCode, r.statusMessage)
                        debug('rate limit remaining:', r.headers['x-rate-limit-remaining'],
                              'of', r.headers['x-rate-limit-limit'])
                        if (r.statusCode > 299) {
                          reject(body)
                        } else {
                          if (Array.isArray(body)) {
                            debug('fetch returned JSON array of', body.length, 'items')
                          }
                        }
                        resolve(body)
                      }
                    })
                  })
                }

                function updateEarlierURL (posts) {
                  // twitter doesn't give us rel=next/prev links
                  // so we compute them ourselves.
                  //
                  // see https://dev.twitter.com/rest/public/timelines
                  let id = Long.fromString(posts.slice(-1).id_str)
                  id = id.subtract(1)
                  const u = (
                    'https://api.twitter.com/1.1/statuses/user_timeline' +
                      qs.stringify({user_id: ofUser.twid, max_id: id}))
                  debug('timeline earlier', u)
                  ofUser.twitter_posts_earlier_url = u
                  return this.socdb.query(SQL` 
                     UPDATE twitter_users 
                     SET posts_earlier_url=${u}
                     WHERE twid=${ofUser.twid}`)
                }

                function gotPosts (posts) {
                  /*
                  const all = []
                  for (let post of posts) {
                    all.push(save(post))
                    all.push(extract(post))
                  }
                  return Promise.all(all)
                  */
                }

                switch (item.type) {
                  case 'current_posts':
                    req.url += 'statuses/user_timeline'
                    resolve(useWeb()
                          .then(updateEarlierURL)
                          .then(gotPosts))
                    break
                  case 'earlier_posts':
                    req.url = ofUser.twitter_posts_earlier_url
                    resolve(useWeb()
                          .then(updateEarlierURL)
                          .then(gotPosts))
                    break
                }
              })
          })
      }
    })
  }
}

module.exports = Fetcher
