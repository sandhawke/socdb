'use strict'

// based on datapages/server.js, by copy-and-edit, because I don't
// know where I'm going with this well enough to factor out the common
// bits, yet.
//
// started with: https://github.com/sandhawke/datapages/blob/4a72a35cced88becbb09206ffaced7d94fd1bb44/server.js

const DB = require('pg-live-view')
const webgram = require('webgram')
const datapages = require('datapages')
const datasent = require('data-sentence')
const IDMapper = require('../datapages/idmapper')
const debugModule = require('debug')
const debug = require('debug')('socdb_server')

let connCount = 0

class Server extends webgram.Server {
  constructor (config) {
    super(config)   // it copies config to this.*

    this.homeContext = {}

    const maxID = 1 // needs to come from storage
    
    this.maxSeq = maxID
    this.idmapper = new IDMapper(maxID)


    if (!this.msgs) {
      if (!this.db) {
        debug('opening DB, using postgres')
        this.db = new DB(this.databaseOptions)
        this.closeDB = true
      } else {
        debug('Thanks for making the DB for us')
      }
      this.msgs = this.db.view({
        name: 'socdb_msgs',
        filter: {
          isMessage: true, //  ? skip for postgres
          text: {type: 'string'},
          who: {type: 'id'},
          when_: {type: 'date'},   // when is sql keyword :-(
          inReplyTo: {type: 'id'}
        },
        createIfMissing: true
      })
    }

    // this.msgs.add({text: 'hello'})

    this.app.get('/', async (req, res) => {
      const m = await this.msgs.lookup(req.query.id)
      if (m) {
        res.send(m)
      } else {
        res.sendStatus(404)
      }
    })

    this.msgs.on('appear', async(m) => {
      debug('new message visible in msgs: %o:', m)
    })

    // might be nice if the hooks worked together to give us $ready,
    // or sessions hid $connect until the sessions was active.
    const readyEvent = this.useSessions ? '$session-active' : '$connect'
    debug('watching for connections using %j', readyEvent)
    this.on(readyEvent, this.session.bind(this))

    this.answer.delta = async (conn, delta) => {
      return conn.deltaHandler(delta)
    }
  }

  session (conn) {
    if (!this.useSessions) conn.sessionData = {_sessionID: 'testmode'}
    
    conn.debug = debugModule('socdb_server_conn_' + ++connCount)
    conn.debug('new connection, _sessionID=%s', conn.sessionData._sessionID)
    const cdb = new datapages.DB({localMode: true})
    const trans = new datasent.Translator()
    // conn.debug('msgs: %o', this.msgs)
    /* const bridge = */
    trans.bridge(this.msgs, cdb)

    conn.on('view-start', async (viewspec) => {
      conn.debug('view-start %O', viewspec)

      // TODO idmapper mapTree on each of the .values of the
      // clausified filter expressions, so we can have prop=obj
      
      const v = cdb.view(viewspec)
      
      // Do we need to tell bridge that the schema has just changed?
      // At the moment it doesn't care.  Later, maybe the schema will
      // implement on.changed?


      const sendDelta = (target, key, who, when) => {
        if (key.startsWith('__')) return
        let value = target[key]
        const targetLocalId = (this.idmapper
                               .fromContext(this.homeContext, target)
                               .intoContext(conn))
        value = this.idmapper.mapTree(this.homeContext, conn, value)
        const viewName = viewspec.name
        const delta = { targetLocalId, key, value, who, when, viewName }
        conn.debug('sending delta %o', delta)
        conn.send('delta', delta)
      }
        
      // At this point we suddenly want to send the object and its
      // deltas because they're in-view.  But we don't have access to
      // those deltas, do we?  Not unless we kept a provenance trace
      // in building up the object...

      v.on('appear', page => {
        conn.debug('handling APPEAR %o', page)
        for (const key of Object.keys(page)) {
          sendDelta(page, key)  /* TODO find the other prov data! */
        }
      })

      v.on('change', (page, delta) => {
        conn.debug('handling DELTA %o %O', page, delta)
        sendDelta(page, delta.key, delta.who, delta.when)
      })

    })
    conn.on('add', async(page) => {
      // do we care?   right now, all that matters is deltas, I think.
    })

    // changes made by this client, which will be bridged to this.msgs
    conn.deltaHandler = async (delta) => {
      // FROM datapages/server.js
      conn.debug('handling delta %o', delta)
      delta.who = conn.sessionData._sessionID
      delta.when = new Date()
      delta.seq = ++this.maxSeq

      const idmap = this.idmapper.fromContext(conn, delta.targetLocalID)
      delta.targetLocalID = idmap.intoContext(this.homeContext)

      conn.debug('premap value:', delta.value)
      delta.value = this.idmapper.mapTree(conn, this.homeContext, delta.value)
      conn.debug('........post:', delta.value)

      cdb.deltas.push(delta)  // do we need this?   bad encapsulation
      cdb.applyDeltaLocally(delta)
      // maybe that's it...?
    }

/*
  DONT send things unless they're within some view 

    // changes made by other clients, seen via bridge from this.msgs
    cdb.on('change', (page, delta) => {
      conn.debug('maybe sending out delta %O', delta)
      // dup'ing code from datapages/client.js  :-(
      const {key} = delta
      if (key.startsWith('__')) return
      conn.debug('sending out delta %O', delta)

      // needs target ID

      conn.send('delta', delta)
    })
*/
  }

  async close () {
    debug('close() called')
    if (this.closeDB) {
      debug('closing DB')
      await this.db.close()
    }
    await super.close()
  }
}

/*
    this.maxSeq = undefined // set by start()
    this.idmapper = undefined // set by start()

    this.on('$close', (conn) => {
      debug('closing connection, remove subscribers')
      this.off('$delta-saved', conn.deltaSavedHandler)
    })

    this.on('subscribe', async (conn, options) => {
      debug('handling subscribe', options)
      // We need to buffer all the notifications that occur between
      // now and the time the from-disk reply is done.  LevelDB will
      // only replay up to the delta where the replay started, even if
      // more are added during the replay.
      let buffer = []
      const send = pair => {
        const [idmap, delta] = pair
        delta.targetLocalID = idmap.intoContext(conn)
        conn.send('delta', delta)
      }
      conn.deltaSavedHandler = (...pair) => {
        if (buffer) {
          buffer.push(pair)
        } else {
          send(pair)
        }
      }
      this.on('$delta-saved', conn.deltaSavedHandler)

      if (options.since !== undefined) {
        await this.runReplay(conn)
        debug('from-disk replay done')
      }
      debug('starting from-memory replay')
      for (let pair of buffer) send(pair)
      buffer = false
      debug('from-memory replay done; now we are live')
    })

    this.answer.delta = async (conn, delta) => {
      debug('handling delta', delta)
      delta.who = conn.sessionData._sessionID
      delta.when = new Date()
      delta.seq = ++this.maxSeq

      const idmap = this.idmapper.fromContext(conn, delta.targetLocalID)
      delta.targetLocalID = idmap.intoContext(this.deltaDB)

      debug('premap value:', delta.value)
      delta.value = this.idmapper.mapTree(conn, this.deltaDB, delta.value)
      debug('........post:', delta.value)
      /*
      if (delta.type === 'ref') {
        const idmap = this.idmapper.fromContext(conn, delta.value)
        delta.value = idmap.intoContext(this.deltaDB)
      }
      * /

      this.deltaDB.put(delta.seq, delta)
      debug('saved delta %o', delta)

      this.emit('$delta-saved', idmap, delta)
      /*
      debug('distributing delta to subscribers, %o', this.subscribers)
      for (let w of this.subscribers) {
        debug('subscriber: %o', w)
        // send it back to sender...?  hrmmm.  confirms we got it, and
        // lets them know if we assign a global ID or something... I guess.
        delta.targetLocalID = idmap.intoContext(w)
        try {
          w.send('delta', delta)
        } catch (e) {
          console.error('subscriber error', e)
        }
      }
      * /
      return true // confirming that we got it, just in case you're
                  // not subscribed or don't want to track it that
                  // way.    We COULD make the return trip optional.
    }
  }

  async innerStart () {
    debug('start() called')
    const replay = await this.bootReplay()
    debug('replay stats: %o', replay)
    this.maxSeq = replay.maxSeq
    this.idmapper = new IDMapper(replay.id)
    debug('calling super.start()')
    await super.innerStart()
    debug('super.start() returned')
    console.log('ws at', this.address)
  }

  openDB () {
    debug('openDB')
    this.deltaDB = level(this.deltasDBName || 'data.deltas', {
      keyEncoding: bytewise,
      valueEncoding: cbor
    })
    // similar to JSON, but handles binary values nicely, and
    // even cyclical and lattice structures
    this.deltaDB._codec.encodings.cbor = {
      encode: cbor.encode,
      decode: cbor.decode,
      buffer: true,
      type: 'cbor'
    }
    // sorts numbers in order, which is important for deltas
    this.deltaDB._codec.encodings.bytewise = {
      encode: bytewise.encode,
      decode: bytewise.decode,
      buffer: true,
      type: 'bytewise'
    }
    this.closeDB = true
  }

  bootReplay () {
    return new Promise((resolve, reject) => {
      let count = 0
      let maxSeq = 0
      let id = 0
      debug('running bootReplay')
      this.deltaDB.createReadStream()
        .on('data', function (data) {
          count++
          debug('    %i => %j', data.key, data.value)
          if (data.key > maxSeq) maxSeq = data.key
          const thisID = data.value.targetLocalID
          if (thisID > id) id = thisID
        })
        .on('error', function (err) {
          console.log('Error', err)
          reject(err)
        })
        .on('end', function () {
          console.log('Database has', count, 'deltas, maxSeq=',
                      maxSeq, 'maxTarget', id)
          resolve({maxSeq, id})
        })
    })
  }

  // stream all the deltas to conn
  //
  // in the future allow args to limit how far back we go, and maybe
  // to ignore certain kinds of deltas
  //
  runReplay (conn) {
    return new Promise((resolve, reject) => {
      debug('replaying database for subscriber')
      let count = 0
      this.deltaDB.createReadStream()
        .on('data', function (data) {
          count++
          // debug('    ', data.key, ' => ', data.value)
          const delta = data.value

          // we DO NOT do id-mapping here, because we assume/know that
          // (1) it was always sharedIds (pos ints) written to the log
          // (since we never do a fromContext from the log)
          // and (2) the client never asks for a replay when it's created
          // objects...     Maybe we could check that?
          // idmapper.empty(conn) ?

          conn.send('delta', delta)
        })
        .on('error', function (err) {
          console.log('Error', err)
          reject(err)
        })
        .on('end', function () {
          conn.send('replay-complete')
          debug(count, 'deltas sent in replay')
          resolve()
        })
    })
  }
}
*/

module.exports.Server = Server
