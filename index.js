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
          resolve(body)
        }
      })
    })
  }
    
  socdb.fetchUser = (userspec) => {
    debug('fetchUser', userspec)
    get('users/show.json', {screen_name: userspec})
      .then(body => {
        console.log('body', body)
      })
  }
  
  /*
  const fetchTimeline = (uid) => {
    debug('fetchTimeline', uid) // limits?
    
    const myDefaults = {
      user_id: uid,
      count: 200,
      trim_user: false,
      exclude_replies: false,
      include_rts: true
    }
    Object.assign(myDefaults, opts)
    debug('args', myDefaults)
    const options = {
      uri: '/statuses/user_timeline' + base....,
      qs: { foo:bar  }
      json: true
      //     resolveWithFullResponse: true    //  <---  <---  <---  <--- 
        
    }
    return rp(options)
    return (
      promiseGet('/statuses/user_timeline', myDefaults)
        .then(savePosts)
    )
  }
  */

  return socdb
}

const defaultClient = client()
defaultClient.createClient = client

module.exports = defaultClient
