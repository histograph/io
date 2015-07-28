# Histograph IO

Express routing middleware for [Histograph API](https://github.com/histograph/api). IO is automatically loaded by the API.

With Histograph IO, you can:

- import [Newline delimited JSON](http://ndjson.org/) files into [Histograph](http://histograph.io),
- add/update/view datasets & metadata.

## Queue format

IO adds PIT and relation changes onto Histograph's Redis queue.

IO uses the adds messages of the following form, as stringified JSON objects:

```js
{
  "dataset": "dataset1",
  "type": "pit|relation",
  "action": "add|delete|update",
  "data": {
    // PIT/relation data
  }
}
```

The `data` field contains PIT and relation data, conforming to the [Histograph JSON schemas](https://github.com/histograph/schemas/tree/master/json).

## License

Copyright (C) 2015 [Waag Society](http://waag.org).

The source for Histograph is released under the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
