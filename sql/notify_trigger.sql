CREATE FUNCTION notify_trigger() RETURNS trigger AS $$
DECLARE
BEGIN
  PERFORM pg_notify('watchers', TG_TABLE_NAME || ',id,' || NEW.id );
  RETURN new;
END;
$$ LANGUAGE plpgsql;

