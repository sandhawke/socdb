
Right now, we use Postgres to store everything.  Let's not get into why.

Permissions are a little tricky because the node-postgres (pg) module
wants to talk to the server over the network, even when you're on the
same host (at least on recent Ubuntu distributions).  Here's one way
to set it up.  If you know your way around Postgres, you can probably
improve on the below process.  If not, hopefully this works.

### Install Postgres

```
sudo apt-get install -y postgresql
```

### Create database user and table

```
sudo -u postgres psql -c "CREATE USER social CREATEDB;"
sudo -u postgres psql -c "CREATE DATABASE social;"
```

### Set and record a password for this user

```
GEN=`node -e "console.log(crypto.randomBytes(16).toString('hex'))"`
echo Picked password $GEN
sudo -u postgres psql -c "ALTER ROLE social UNENCRYPTED PASSWORD '"$GEN"';"
echo export PGHOST=localhost PGUSER=social PGDATABASE=social PGPASSWORD=$GEN > .env.pg
```

### Tell Postgres to allow localhost connections

```
echo 'host social social 127.0.0.1/32 password' | sudo tee -a /etc/postgresql/*/main/pg_hba.conf
sudo /etc/init.d/postgresql restart
```

The first "social" is the table name, the second is the user name.
Here, we're only allowing access from localhost, authenticated by the
user's password.

### Try it out

```
. .env.pg
psql
```

output should be something like:

```
psql (9.6.3)
SSL connection (protocol: TLSv1.2, cipher: ECDHE-RSA-AES256-GCM-SHA384, bits: 256, compression: off)
Type "help" for help.

social=> 
```

(ctl-d to exit)

In general, you'll want to do an `. .env.pg` in any shell before
working with this postgres database.