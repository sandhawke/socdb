'use strict'

const url = require('url')
const request = require('request')
const debug = require('debug')('fetcher')

class Fetcher {
  constructor (socdb, boss) {
    const activeCount = new Map()
    this.socdb = socdb
  }

  run () {
    const result = this.boss.next()
    if (result.done) {
      // check again in 10ms because we don't have a way
      // to request being notified.  sad.
      setTimeout(this.run.bind(this), 10)
    } else {
      this.fetch(result.value)
      // let's wait until it's done before trying another one
      // just for debugging for now; should be able to fire and
      // forget, although... we do kind of want to prioritize CPU
      // somehow...   maybe sleep a little before starting the next
      // one?
        .then(() => {
          // and let's sleep a little, again to help with debugging
          setTimeout(this.run.bind(this), 2000)
        })
    }
  }
  
  fetch (item) {
    return new Promise((resolve, reject) => {

      if (item.service === 'twitter.com') {
        this.socdb.loadAuth(item.requestedBy)
          .then(auth => {
            console.assert(this.socdb.twitter.consumer_key)
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

            function doit () {
              return new Promise((resolve, reject) => {
                request.get(req, (e, r, body) => {
                  if (e) {
                    reject(e)
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

            function gotPosts (posts) {
              // really these are all promises, Promise.all() them
              // and return the promise
              updateLowestId(posts, uref)
              posts.forEach(save)
              posts.forEach(extract)
              for (let post of posts) {
                
              }
            }
            
            switch (item.type) {
            case 'current_posts':
              req.url += 'statuses/user_timeline'
              resolve(doit().then(gotPosts))
              break
            case 'earlier_posts':
              req.url += 'statuses/user_timeline'
              req.qs = { max_id: item.max_id } // prioritize sets max_id
              resolve(doit().then(gotPosts))
              break
            }


          })
      }
    })
  }

}

module.exports = Fetcher
