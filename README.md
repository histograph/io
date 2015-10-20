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

## The MIT License (MIT)

Copyright (C) 2015 [Waag Society](http://waag.org).

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
