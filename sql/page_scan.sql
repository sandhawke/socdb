
CREATE TABLE page_scan (
  url varchar PRIMARY KEY,
  priority float NOT NULL,
  testing int,
  done_at timestamp without time zone,
  redo_at timestamp without time zone,
  headers text,
  starts varchar,
  type varchar,
  misc text
);

