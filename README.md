socdb -- a decentralized database running over social networks

Very much in-progress

The idea is that instead of multi-user applications needing a central
server, each user posts their activity so their social networks, and
watches for posts from other people.  There are a lot of details to
making that work well.

Initial platform targets:
* Twitter, for being well-known and fairly open
* Mastodon, for being open source, decentralized, customizable

## Internal database

For now, we're using postgres.  For suggestions on setting it up (on Ubuntu, at least) see [using-postgres](./using-postgres.md).

Really, we use it for two or three things:

1. A bulk object store, keeping our own raw copy of data we pull from the social networks, because they have rate limits and might be far away.  We keep this in the `details` table, but it could easily go in S3, or even the filesystem.

2. A set of tables extracted from those details, for fast access to what we need. These are updated as `details` grows, and can be entirely regenerated when we modify the schema.

3. A set of application-specific tables, for whatever the app wants.  Or maybe we'll just do these as views, or just in memory, or something.   But it could be more postgres tables.

