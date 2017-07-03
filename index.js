'use strict'

// const rp = require('request-promise-native')
const request = require('request')
const Long = require('long')
const SQL = require('sql-template-strings')
const debug = require('debug')('socdb')
const secret = require('./.secret')

// https://www.npmjs.com/package/request#oauth-signing

function client () {

  const socdb = {}

  // asUser * auth

  socdb.loadTimeline = (uid) => {

    return socdb.fetchTimeline(uid)
  }

  const get = (endpoint, qs) => {
    return new Promise((resolve, reject) => {
      const req = {
        url: 'https://api.twitter.com/1.1/' + endpoint,
        oauth: {
          consumer_key: secret.consumer_key,
          consumer_secret: secret.consumer_secret,
          token: secret.access_token_key,
          token_secret: secret.access_token_secret
        },
        qs: qs,
        json: true
      }
      request.get(req, (e, r, body) => {
        if (e) {
          reject(e)
        } else {
          debug('request completed with status', r.statusCode, r.statusMessage)
          debug('rate limit remaining:', r.headers['x-rate-limit-remaining'],
                'of', r.headers['x-rate-limit-limit'])
          if (r.statusCode > 299) {
            reject(body)
          } else {
            if (Array.isArray(body)) {
              debug('fetch returned JSON array of', body.length, 'items')
            }
            resolve(body)
          }
        }
      })
    })
  }

  const twPrefix = 'https://twitter.com/'
  // Given something that might refer to a user, turn it into the kind
  // of thing we can pass to the twitter API: {user_id: ...} or
  // {screen_name: ...}
  const twUserSpec = (uref) => {
    if (typeof uref === 'number') {
      // db id, but only if loaded
      throw new Error()
    }
    if (typeof uref === 'string') {
      if (uref.startsWith(twPrefix)) {
        uref = uref.slice(twPrefix.length)
      }
      if (/^\d+$/.test(uref)) {
        return { user_id: uref }
      }
      if (/^\w+$/.test(uref)) {
        return { screen_name: uref }
      }
    }
    throw new Error()
  }
    
  socdb.fetchUser = (uref) => {
    debug('fetchUser', uref)
    get('users/show.json', twUserSpec(uref))
      .then(body => {
        console.log('body', body)
      })
  }

  // require these from elsewhere?

  // factor out qs?

  // depth based?

  const timelineCommon = {
    count: 200,
    trim_user: false,
    exclude_replies: false,
    include_rts: true
  }
  
  socdb.fetchLatest = (uref) => {
    debug('fetchTimeline', uref) 
    const qs = Object.assign({}, timelineCommon, twUserSpec(uref))
    debug('args:', qs)
    return get('statuses/user_timeline', qs)
  }

  // coordinate with database?  really, these should be in there,
  // and re-set as needed.  I mean, will there be two processes doing
  // this simultaneously?  
  const lowestId = new Map() // us DB instead?!   becomes async.
  const lowestIdMinusOne = (uref) => {
    const i = lowestId.get(uref)
    if (i === undefined) return undefined
    return i.subtract(1).toString()
  }
  const updateLowestId = (posts, uref) => {
    let minId = lowestId.get(uref)
    for (let p of posts) {
      const id = Long.fromString(p.id_str)
      // debug(p.id_str, ' => ', id)
      if (minId === undefined || id.lessThan(minId)) minId = id
    }
    if (minId !== undefined) lowestId.set(uref, minId)
  }
  
  /**
   * Fetch posts from uref's timeline, to the extent allowed by budget.
   * Check budget.spent to see if that's why we stopped.
   * @return (array of posts)
   */
  socdb.fetchTimeline = (uref, budget) => {
    debug('fetchTimeline', uref, budget)
    if (budget.spent) return Promise.resolve([])
    return new Promise((resolve, reject) => {
      const qs = Object.assign({}, timelineCommon, twUserSpec(uref))
      qs.max_id = lowestIdMinusOne(uref)
      debug(' qs', qs)
      get('statuses/user_timeline', qs)
        .then(timeline => {
          budget.spend({fetches: 1, objects: timeline.length})
          if (timeline.length === 0) {
            resolve([])
            return
          }
          updateLowestId(timeline, uref)
          // save posts to database?
          socdb.fetchTimeline(uref, budget)
            .then(t2 => {
              resolve(timeline.concat(t2))
            })
        })
    })
  }


  socdb.loadNear = (uid, budget) => {
    
  }
  
  return socdb
}

const defaultClient = client()
defaultClient.createClient = client

module.exports = defaultClient
