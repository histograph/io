# Histograph IO

With Histograph IO, you can import [Newline delimited JSON](http://ndjson.org/) files into [Histograph](https://github.com/erfgoed-en-locatie/histograph).

Prerequisites, because Histograph IO uses `sort` before parsing NDJSON files:

- `pits.ndjson` files must start with `{"id": ...`
- `relations.ndjson` files must start with `{"from": ...`

## Redis

Histograph IO needs Redis!

Install Redis:

    brew install redis

Start Redis:

    redis-server /usr/local/etc/redis.conf
