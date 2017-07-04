'use strict'

const path = require('path')
const fs = require('fs')
const debug = require('debug')('socdb')
const EventEmitter = require('eventemitter3')
const pg = require('pg')
const Fetcher = require('./lib/fetcher')
const FetchBoss = require('./lib/fetchboss')
const secret = require('./.secret')
const SQL = require('sql-template-strings')

class SocDB extends EventEmitter {
  constructor (options = {database: 'social'}) {
    super()

    this._pool = new pg.Pool({database: options.database})
    // stylistically, we don't want folks using 2nd and 3rd arguments
    this.query = text => this._pool.query(text)

    this.SQL = SQL
    this.twitter = {
      consumer_key: secret.consumer_key,
      consumer_secret: secret.consumer_secret,
      developer_token: secret.access_token_key,
      developer_token_secret: secret.access_token_secret
    }
    debug('socdb instance created')
  }

  /**
   * Assume we're on a fresh database; create tables and stuff as
   * needed.  Needs to be in here for tempDB, for testing.
   *
   * Implemented as feeding sql/*.sql to pool.query
   *
   * Feeling okay with making filesystem operations be syncronous
   *
   */
  dbInit () {
    const all = []
    const dir = path.join(path.dirname(__filename), ('sql'))
    const files = fs.readdirSync(dir)
    for (let file of files) {
      if (file.endsWith('.sql')) {
        const data = fs.readFileSync(path.join(dir, file), 'utf-8')
        const cleaned = data.replace(/--.*$/gm, '')
        for (let part of cleaned.split(';')) {
          // debug('SQL: ', part)
          all.push(this._pool.query(part))
        }
      }
    }
    return Promise.all(all)
  }

  start () {
    this.startInProcessFetchers()
  }
  
  startInProcessFetchers () {
    this.boss = new FetchBoss(this)
    this.fetcher = new Fetcher(this, this.boss)
    this.fetcher.start()
  }

  stopFetchers () {
    if (this.fetcher) this.fetcher.stop()
  }

  close () {
    debug('closing')
    this.emit('close')
    this.stopFetchers()
    this._pool.end()
      .then(() => {
        debug('pool end resolved')
      })
  }

  loadUser (twid) {
    // have a ram version of this!
    return (
      this.query(SQL`SELECT * FROM twitter_users WHERE twid=${twid}`)
        .then(res => {
          debug('twitter_users', twid, 'rowCount=', res.rowCount)
          if (res.rowCount) {
            const user = res.rows[0]
            // user.twid = user.id_str
            return user
          }
          return null
        })
    )
  }

  loadAuth (twid) {
    console.assert(twid)
    debug('loadAuth twid', twid, SQL`${twid}`)
    return (
      this.query(SQL`SELECT token, token_secret FROM auth 
                     WHERE service='twitter' AND id_str=${twid}`)
        .then(res => {
          debug('auth results', res)
          for (let row of res.rows) {
            const auth = {
              twitter_primary_access_token_key: row.token,
              twitter_primary_access_token_secret: row.token_secret
            }
            // eh, just use the first one for now I guess
            debug('returning auth', auth)
            return auth
          }
        })
    )
  }
}


let dbCounter = 1
function tempDB () {
  const client = new pg.Client()
  const dbname = 'temp_' + process.pid + '_' + dbCounter++
  let open = false

  function close () {
    debug('tempDB close called')
    if (open) {
      open = false
      debug('shutting down; dropping database', dbname)
      client.query('DROP DATABASE ' + dbname)
        .then(() => {
          client.end()
          debug('dropped temp database', dbname)
        })
    }
  }

  // can't use process.on('exit', ...) because that's only for sync stuff
  // process.on('SIGINT', close)
  //    eh, postgres complains because pool is using it.
  
  debug('creating temp database', dbname)
  return new Promise((resolve, reject) => {
    client.connect(err => {
      if (err) throw err
      open = true
      client.query('CREATE DATABASE ' + dbname)
        .then(() => {
          const db = new SocDB({database: dbname})
          db.on('close', close)
          db.dbInit()
            .then(() => {
              debug('initialized temp database', dbname)
              resolve(db)
            })
        })
    })
  })
}

// const defaultInstance = new SocDB()
// defaultInstance.SocDB = SocDB
// module.exports = defaultInstance

module.exports.SocDB = SocDB
module.exports.tempDB = tempDB
module.exports.SQL = SQL
