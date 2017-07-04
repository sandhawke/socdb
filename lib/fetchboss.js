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
 */

const debug = require('debug')('fetchboss')
const FastPriorityQueue = require('fastpriorityqueue')
const prioritize = require('./prioritize')
const stringify = require('json-stable-stringify')

// return a usable map key for this item, masking out 'priority' since
// that can change while we still consider this equal.
function key (obj) {
  const priority = obj.priority
  delete obj.priority
  const result = stringify(obj)
  obj.priority = priority
  return result
}

class FetchBoss {
  constructor (socdb) {
    this.claimed = new Map()
    this.queue = null
    this.socdb = socdb
  }

  /**
   * Rebuild the priority queue, because the database has changed, or
   * something.  Async, but no way to tell when it's really done.
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
    const q = new FastPriorityQueue((a, b) => a.priority > b.priority)
    const done = () => {
      this.queue = q // then install it when done
      debug('rethink done')
      this.rethinking = false
      if (this.rethinkNeeded) {
        debug('but flagged to restart')
        this.rethinkNeeded = false
        setTimeout(this.rethink.bind(this), 20)
      }
    }

    prioritize(this.socdb, q, done)
  }

  /**
   * Return done-flag and most-urgent job, and mark it as claimed by
   * this worker.  (Makes FetchBoss usable as JS iterator, with null
   * workerId, if you want)
   */
  next (workerId) {
    debug('next')
    const now = Date.now()
    while (this.queue && !this.queue.isEmpty()) {
      const value = this.queue.poll()
      // debug('dequeued', value)

      // what if we're hammering this host too hard?  We'd want to
      // de-prioritize it for now, or even not put it in the queue?
      // Like prioritize() should know Fetcher.activeCount and something
      // about rate limits???  Or like we just skip them if we've hit
      // limits and wait for them to come up in the next prioritization?

      // claimed things get put back in the queue, often, by
      // rethink, so we need to skip them here
      const claim = this.claimed.get(value.key)
      if (claim) {
        const age = (now - claim.now) / 1000
        if (age > 2) {
          // this may mean a worker has died, or we have network problems
          console.log(`Warning: ${age}-second-old claim: ${value.key} by ${claim.workerId}`)
        }
        continue
      } else {
        this.claimed.set(value.key, { now, workerId })
      }
      return {done: false, value}
    }
    this.rethink()
    return {done: true}
  }
}

module.exports = FetchBoss
