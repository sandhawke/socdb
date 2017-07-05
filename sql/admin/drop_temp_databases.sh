#!/bin/sh
psql -t -c "select concat('drop database ', datname, ';') from pg_database where datname ~ 'socdb_temp_\d+_\d+';" | psql
