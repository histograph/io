# Histograph IO

With Histograph IO, you can import [Newline delimited JSON](http://ndjson.org/) files into [Histograph](http://histograph.github.io).

Prerequisites, because Histograph IO uses [`sort`](http://en.wikipedia.org/wiki/Sort_%28Unix%29) before parsing NDJSON files:

- All lines in `pits.ndjson` files must start with `{"id": ...`
- All lines in `relations.ndjson` files must start with `{"from": ...`

## Redis

Histograph IO needs Redis!

Install Redis:

    brew install redis

Start Redis:

    redis-server /usr/local/etc/redis.conf
