--
--  Doing this will delete all the auth information, making everyone
--  have to log in + authorize again.
--
--  YOU BETTER HAVE BACKUPS.
--
--  pg_dump -t twitter_users > .user-dump-`date +%Y-%m-%d-%H%M%S`.sql && psql < create_auth_tables.sql
--

-- DROP TABLE auth;

CREATE TABLE auth (
  created_at timestamp without time zone NOT NULL,
  service varchar not null,
  id_str varchar not null,
  token varchar,
  token_secret varchar
);
