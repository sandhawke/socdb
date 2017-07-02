'use strict'

// const rp = require('request-promise-native')
const request = require('request')
const SQL = require('sql-template-strings')
const debug = require('debug')('socdb')
const secret = require('./.secret')

// https://www.npmjs.com/package/request#oauth-signing

function client () {

  const socdb = {}

  // asUser * auth
  // some budget stuff?

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
          if (r.statusCode > 299) {
            reject(body)
          } else {
            resolve(body)
          }
        }
      })
    })
  }
    
  socdb.fetchUser = (screen_name) => {
    debug('fetchUser', userspec)
    get('users/show.json', {screen_name})
      .then(body => {
        console.log('body', body)
      })
  }
  
  socdb.fetchTimeline = (screen_name) => {
    debug('fetchTimeline', screen_name) 
    
    const qs = {
      screen_name,
      count: 200,
      trim_user: false,
      exclude_replies: false,
      include_rts: true
    }
    // Object.assign(myDefaults, opts)   max_id, start_at, user_id
    debug('args', qs)
    return get('statuses/user_timeline', qs)
  }

  return socdb
}

const defaultClient = client()
defaultClient.createClient = client

module.exports = defaultClient
