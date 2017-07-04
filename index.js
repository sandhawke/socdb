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

  process.on('exit', close)
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
