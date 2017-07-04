--  Doing this will delete everthing and create and extract tables; these
--  can be regenerated
--
--  psql < create_extract_tables.sql
--

CREATE TABLE twitter_users (
  twid bigint PRIMARY KEY,
  screen_name varchar,
  fetched_at timestamp without time zone NOT NULL,
  posts_next_max_id bigint,
  posts_next_since_id bigint,
  likes_next_max_id bigint,
  likes_next_since_id bigint
);

CREATE TABLE twitter_posts (
  twid bigint PRIMARY KEY,
  contig boolean NOT NULL,
  posted_at timestamp without time zone NOT NULL,
  fetched_at timestamp without time zone NOT NULL,
  from_user bigint NOT NULL,
  text text NOT NULL,
  in_reply_to_post bigint,
  boost_count integer,
  like_count integer,
  details text
);

CREATE TABLE follows (
  follower bigint NOT NULL,
  followed bigint NOT NULL,
  seen_at timestamp without time zone NOT NULL
);

CREATE TABLE likes (
  userid bigint NOT NULL,
  post bigint NOT NULL,
  contig boolean NOT NULL,  
  seen_at timestamp without time zone NOT NULL
);
