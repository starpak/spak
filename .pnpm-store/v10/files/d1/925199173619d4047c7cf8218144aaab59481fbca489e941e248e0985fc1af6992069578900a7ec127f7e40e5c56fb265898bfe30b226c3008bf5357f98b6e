# chai-shape

[![Codecov](https://img.shields.io/codecov/c/github/shigma/chai-shape?style=flat-square)](https://codecov.io/gh/shigma/chai-shape)
[![npm](https://img.shields.io/npm/v/chai-shape?style=flat-square)](https://www.npmjs.com/package/chai-shape)

Extend chai with shape assertions.

```js
import { expect, use } from 'chai'
import shape from 'chai-shape'

use(shape)

// use with array
expect([1, 2, 3]).to.have.shape([1, 2])

// use with object
expect({ a: 1, b: 2 }).to.have.shape({ a: 1 })

// use with nested array and object
expect({ a: { b: [1, 2] }}).to.have.shape({ a: { b: [1] }})
```
