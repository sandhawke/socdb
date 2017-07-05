#!/bin/sh
$(psql -t -c "select concat('psql -d ', datname, '') from pg_database where datname ~ 'socdb_temp_\d+_\d+' order by datname desc limit 1;")
