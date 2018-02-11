## socdb: a decentralized database, running over social networks

Very much in-progress

SocDB (from "social database") is for web app developers who want:
* Autonomy for themselves, keeping their app safe from platform lock-in with something like Google's Firebase
* Autonomy for their users, allowing them to switch apps at any time, keeping their own data, even shared/social data
* Account management and security delegated to other services, chosen by the end users
* The simplicity of developing apps in the browser, with no need for backend coding
* Minimal operational responsibility, without complex server configuration, backups, maintenance, and associated liabilities
* An ecosystem of cooperating compatible apps, so your users get increasing functionality without you having to implement features outside your own area of specialty
* Schema-versioned data, so you can grow and change your database schema while retaing interoperability (when meaningful) with data and applications using an newer and older schema.

The key idea is that instead of each multi-user application needing
its own central servers, each user posts their activity to their
social networks and watches for relevant posts from other people
they're willing to interact with.  Of course, the users don't do the
posting or the watching themselves -- they just use normal-seeming apps,
and the apps rely on SocDB to interact with the social media platforms.

Initial platform targets:
* Twitter, for being well-known and fairly open
* Mastodon, for being open source, decentralized, customizable

This initial version of SocDB is a proof-of-concept suitable for some
application areas, but it is not yet ready for many others. Some
features not currently supported:

- private or access-controlled data (eg for personal health data)
- large data sets (eg for fine-grained location traces)
- multi-media content (eg for photo sharing)
- high security (eg for financial transactions)
- high speed (eg for reflex-based games)

Each of those is an area for future work, as the platform improves.

## Using SocDB in Your WebApp

The client library works in NodeJS and modern browsers.

Using CommonJS:

```js
const socdb = require('socdb')

const todos = socdb.view({
  name: 'todos',
  defs: [
    'Here is a new item for my to-do list, description: [desc]'
  ],
  filter: {
    isToDo: true,
    desc: { required: true, type: 'string' }
  }
})
socdb.view({
  name: 'done',
  defs: [
    'This item is now done.'
  ],
  inReplyToProperty: 'self',
  filter: {
    isToDo: true,
    done: true
  }
})

todos.on('change', () => {
  let html = ''
  todos.forEach(item => {
    const style = item.done ? 'text-decoration: line-through' | ''
    html += `<li style="${style}">${item.desc}</li>`                     
  })
  document.body.innerHTML= `<ol>${html}</ol>`
})

const item1 = { desc: 'Write a socdb demo todo app' }
todos.add(item1)

// let's have a timer mark it done, for the full version see Examples
setTimeout(() => { todos.overlay(item1, {done: true}) }, 1000)
```

## Running the Server


```
sudo apt-get install -y postgresql    # or something like that
npm install -g socdb
sudo socdb setup-postgres  # creates database user "socdb" w/random pw, etc
```

```
socdb stats
```

```
socdb load-user sandhawke
```

```
socdb load-near-user sandhawke
```

## Internal database details

For now, we're using postgres.  For suggestions (almost a script) on setting it up (on Ubuntu, at least) see [using-postgres](./using-postgres.md).

Really, we use it for several different things:

1. Keeping user authentication tokens

2. A bulk object store, keeping our own raw copy of data we pull from the social networks, because they have rate limits and might be slow.  We keep this in the `details` table, but it could easily go in an object store like S3, or even the filesystem.

3. A set of tables extracted from `details`, for fast access to what we need. These are updated as `details` grows, and can be entirely regenerated when we modify the schema.

4. A set of application-specific tables, for whatever the app wants.  Or maybe we'll just do these as views, or just in memory, or something.   But it could be more postgres tables.

## Credits and Disclaimer

This material is based upon work supported by the National Science
Foundation under Grant No. 1313789.  Any opinions, findings, and
conclusions or recommendations expressed in this material are those of
the author(s) and do not necessarily reflect the views of the National
Science Foundation.
