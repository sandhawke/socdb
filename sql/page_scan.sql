
CREATE TABLE page_scan (
  id SERIAL,
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

CREATE TRIGGER page_scan_notify
    AFTER UPDATE OR INSERT ON page_scan
    FOR EACH ROW
    -- in example but doesnt work:   WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE PROCEDURE notify_trigger();



