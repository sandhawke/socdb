--  Doing this will delete everthing and create and empty database.  You'll
--  need to re-fetch everything from the platform providers.
--
--  psql < create_detail_tables.sql
--

DROP TABLE details;

CREATE TABLE details (
  id SERIAL PRIMARY KEY,
  fetched_at timestamp without time zone NOT NULL,
  item_type char (8),    -- eg 'post', 'user', ...
  url varchar (255),
  details text
);

