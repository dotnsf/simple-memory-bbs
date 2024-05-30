# Simple-Memory-BBS


## Overview

Simple BBS with in-memory data storage.


## Prerequisits

- PostgreSQL

  - `$ docker run -d --name postgres -p 5432:5432 -e POSTGRES_USER=user -e POSTGRES_PASSWORD=pass -e POSTGRES_DB=db postgres`

  - `$ docker container exec -it postgres bash`

  - `# psql -U user -d db`

  - `db=# drop table mycaptchas;`

  - `db=# create table if not exists mycaptchas( id varchar(50) not null primary key, username varchar(50) not null, body text, mode varchar(50) not null, formula varchar(50) not null, msec bigint default 0, created bigint default 0, updated bigint default 0 );`


## Licensing

This code is licensed under MIT.


## Copyright

2024  [K.Kimura @ Juge.Me](https://github.com/dotnsf) all rights reserved.
