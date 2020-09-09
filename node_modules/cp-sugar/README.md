# cp-sugar
[![Build Status](https://api.travis-ci.org/inikulin/cp-sugar.svg)](https://travis-ci.org/inikulin/cp-sugar)

*Some sugar for child_process module.*

## Install
```
npm install cp-sugar
```

## API

### .exec(cmd)
```js
const exec = require('cp-sugar').exec;

exec('git status --porcelain')
    .then(stdout => console.log(stdout))
    .catch(err => console.log(err.message));
```

**What's cool about it:**

* Promise-based
* Trims stdout

### .spawn(cmd, silent)
```js
const spawn = require('cp-sugar').spawn;

spawn('git status --porcelain')
    .then(() => ...)
    .catch(err => console.log(err.message));
```

**What's cool about it:**

* Promise-based
* Accepts command string as `exec` instead of executable and array of args in the original implementation
* [Windows-frienldy](https://github.com/IndigoUnited/node-cross-spawn-async#why)
* Rejects on both error and non-zero exit code
* Has `silent` mode (ignore child's stdio)

## Author
[Ivan Nikulin](https://github.com/inikulin) (ifaaan@gmail.com)
