## socdb: a decentralized database, running over social networks

Very much in-progress

The idea is that instead of multi-user applications needing a central
server, each user posts their activity to their social networks and
watches for posts from other people.  There are a lot of details to
making that work well.

Initial platform targets:
* Twitter, for being well-known and fairly open
* Mastodon, for being open source, decentralized, customizable

## Command line

```
npm install -g socdb
socdb init
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

## Internal database

For now, we're using postgres.  For suggestions (almost a script) on setting it up (on Ubuntu, at least) see [using-postgres](./using-postgres.md).

Really, we use it for several different things:

1. Keeping user authentication tokens

2. A bulk object store, keeping our own raw copy of data we pull from the social networks, because they have rate limits and might be slow.  We keep this in the `details` table, but it could easily go in an object store like S3, or even the filesystem.

3. A set of tables extracted from `details`, for fast access to what we need. These are updated as `details` grows, and can be entirely regenerated when we modify the schema.

4. A set of application-specific tables, for whatever the app wants.  Or maybe we'll just do these as views, or just in memory, or something.   But it could be more postgres tables.

