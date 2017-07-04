
CREATE TABLE objects (
  oid SERIAL PRIMARY KEY,
  fetched_at timestamp without time zone NOT NULL,
  item_type char (8),    -- eg 'post', 'user', ...
  url varchar (255),
  json text
);
