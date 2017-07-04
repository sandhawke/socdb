'use strict'

/**
 * Manage a virtual priority queue for all the fetchers. This is
 * nothing like first-come-first-serve, it's "what's most useful to
 * fetch next?".  Assume there are more useful fetches to do than
 * we'll ever have resources to complete, so we need to prioritize.
 *
 * Can be run in the same process as the fetcher(s), communicating via
 * function calls, or in another process, communicating via restful
 * API or whatever.
 *
 * We don't actually use a priority-queue structure (eg
 * fastpriorityqueue) because we also need to do a bunch of filtering,
 * like for rate-limiting.  And I think the queue will be small enough
 * that traversing it every time we need to pick a best item will be
 * fine.
 */

const debug = require('debug')('fetchboss')
const prioritize = require('./prioritize')
const stringify = require('json-stable-stringify')

class FetchBoss {
  constructor (socdb) {
    this.items = new Map()
    this.socdb = socdb
  }

  /**
  * Put a work-item on the queue, or just change its priority.  The
  * item is expected to be a new object, which we'll match to an
  * existing object, if there is one, so that folks can keep
  * properties on the existing objects.  Priority < approx 0 means
  * delete.
  */
  setPriority (pri, item) {
    const key = stringify(item)
    let obj = this.items.get(key)
    if (obj === undefined) {
      this.items.set(key, item)
      obj = item
    } else {
      this.maybeStale.delete(key)
    }
    obj.priority = pri
  }

  /**
   * Reset priorities on things, because the database has changed, or
   * something.  Async, but doesn't report to the outside when it's done.
   *
   * BUG, this should delete all items NOT touched in a run through.
   * Somehow....
   */
  rethink () {
    debug('rethink')
    // let ourselves be called whenever and return, while processing.
    // If called again before we're done, just set a flag that we need
    // to run again as soon as we're done (after a tiny sleep)
    if (this.rethinking) {
      this.rethinkNeeded = true
      debug('rethink already in progress')
      return
    }
    this.rethinkNeeded = false
    this.rethinking = true
    // build our copy in a temp space
    const done = () => {
      debug('prioritize done')

      for (let key of this.maybeStale) {
        debug('stale, deleting', key)
        this.items.delete(key)
      }
      debug('after removing stale, items.size=', this.items.size)
      this.maybeStale = null

      debug('rethink done')
      this.rethinking = false
      if (this.rethinkNeeded) {
        debug('but flagged to restart; will do that very soon')
        this.rethinkNeeded = false
        setTimeout(this.rethink.bind(this), 20)
      }
    }

    this.maybeStale = new Set(this.items.keys())
    debug('running prioritize')
    prioritize(this.socdb, this.setPriority.bind(this), done)
  }

  /**
   * Return done-flag and most-urgent job, and mark it as claimed by
   * this worker.  (Makes FetchBoss usable as JS iterator, with null
   * workerId, if you want)
   */
  next (workerId) {
    debug('next, items.size=', this.items.size)
    const now = Date.now()
    let best = { priority: 0 }
    for (let item of this.items.values()) {
      if (item.priority < best.priority) continue
      if (item.claimed) {
        const age = (now - item.claimed.time) / 1000
        if (age > 2) {
          // this may mean a worker has died, or we have network problems
          console.log(`Warning: aging claim (${age}s) on`, item)
        }
        continue
      }
      // if rate limit says it's too soon, continue
      best = item
    }
    if (best.priority > 0) {
      best.claimed = {time: now, workerId}
      return {done: false, value: best}
    } else {
      this.socdb.emit('fetchQueueEmpty')
      this.rethink()
      return {done: true}
    }
  }
}

module.exports = FetchBoss
