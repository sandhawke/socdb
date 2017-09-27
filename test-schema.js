'use strict'

const test = require('tape')
const socdb = require('./server')
const datapages = require('datapages')
// const datasent = require('data-sentence')
const debug = require('debug')('socdb_test')
const atEnd = require('tape-end-hook')

test.skip(async (t) => {
  setTimeout(() => { t.end() }, 5000)
})

/* 
  needs a different place to put its levelDB files

test(async (t) => {
  const server = new socdb.Server({port: 6001})
  await server.start()
  t.ok(true, 'just checking')
  atEnd(t, () => server.close())
  debug('started')
  t.end()
  debug('t.end() returned')
})

test('does tape get here when server is stopped?', async (t) => {
  t.pass()
  t.end()
})
*/

test(async (t) => {
  t.plan(2)
  const serverDB = new datapages.InMem()
  const server = new socdb.Server({db: serverDB})
  await server.start()
  debug('started')

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

  const db = new datapages.DB({serverAddress: server.address})
  db.view(todoSchema)
  db.add({isToDo: true, desc: 'get this thing working!'})
  await sleep(100)
  const messages = Array.from(serverDB)
  console.log('MSG:', messages)
  t.deepEqual(messages, [
    { isMessage: true,
      text: 'item for my to-do list: "get this thing working!"',
      __localID: -1 }
  ])

  end()

  async function end () {
    debug('ending, tying to stop server...')
    await db.close()
    await server.stop()
    debug('stopped')
    t.pass()
    t.end()
  }
  // setTimeout(end, 2000)
  debug('returning')
})

function sleep (ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}
