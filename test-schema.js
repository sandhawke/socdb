'use strict'

const test = require('tape')
const socdb = require('./server')
const datapages = require('datapages')
// const datasent = require('data-sentence')
const debug = require('debug')('socdb_test')
const atEnd = require('tape-end-hook')

// helper functions

async function newServer (t) {
  const serverDB = new datapages.InMem()
  // atEnd(t, () => serverDB.close())   InMem doesn't need close
  const server = new socdb.Server({db: serverDB, useSessions: false})
  atEnd(t, () => server.close())
  await server.start()
  debug('started')
  return server
}

function newClient (t, server) {
  const db = new datapages.DB({serverAddress: server.address,
                               useSessions: false})
  atEnd(t, () => db.close())
  return db
}

function sleep (ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

// real tests

test('added object shows up as message in db', async (t) => {
  t.plan(1)
  const todoSchema = {
    name: 'todo',
    filter: {
      isToDo: true,
      desc: {type: 'string', required: true}
    },
    defs: [
      'item for my to-do list: [desc]'
    ]
  }

  const server = await newServer(t)
  const db = newClient(t, server)
  db.view(todoSchema)
  db.add({isToDo: true, desc: 'get this thing working!'})
  await sleep(100)
  const messages = Array.from(server.db)
  // console.log('MSG:', messages)
  t.deepEqual(messages, [
    { isMessage: true,
      text: 'item for my to-do list: "get this thing working!"',
      __localID: -1 }
  ])

  t.end()
})

  /*
  const altTodoSchema = {
    name: 'todo',
    filter: {
      isToDoItem: true,
      description: {type: 'string', required: true}
    },
    defs: [
      'item for my to-do list: [desc]'
    ]
  }

  const db2 = new datapages.DB({serverAddress: server.address})
  const v2 = db2.view(altTodoSchema)
  v2.on('appear', page => {
    console.log('\n\n\n\n\n\n\nappear REALLY!!!', page)
    t.equal(page.description, 'get this thing working!')
    t.equal(page.isToDoItem, true)
    end()
  })

  await sleep(100)
  */
