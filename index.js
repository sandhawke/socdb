'use strict'

const debug = require('debug')('socdb')
const EventEmitter = require('eventemitter3')
const pgPool = require('./lib/pg_pool')
const Fetcher = require('./lib/fetcher')
const FetchBoss = require('./lib/fetchboss')
const secret = require('./.secret')

class SocDB extends EventEmitter {
  constructor () {
    super()
    debug('socdb instance created')
    this.query = pgPool.query
    this.SQL = pgPool.SQL
    this.twitter = {
      consumer_key: secret.consumer_key,
      consumer_secret: secret.consumer_secret,
      developer_token: secret.access_token_key,
      developer_token_secret: secret.access_token_secret
    }
  }

  startInProcessFetchers () {
    this.boss = new FetchBoss(this)
    this.fetcher = new Fetcher(this, this.boss)
    this.fetcher.start()
  }

  stopFetchers () {
    this.fetcher.stop()
  }
}

const defaultInstance = new SocDB()
defaultInstance.SocDB = SocDB

module.exports = defaultInstance
