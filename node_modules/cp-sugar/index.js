'use strict';

var exec           = require('child_process').exec;
var spawn          = require('cross-spawn-async');
var promisifyEvent = require('promisify-event');
var toArgv         = require('shell-quote').parse;
var Promise        = require('pinkie-promise');

module.exports = {
    exec: function (command) {
        return new Promise(function (resolve, reject) {
            exec(command, function (err, stdout) {
                if (err)
                    reject(err);
                else
                    resolve(stdout.trim());
            });
        });
    },

    spawn: function (command, silent) {
        var args = toArgv(command);

        command = args.shift();

        var stdio = silent ? 'ignore' : 'inherit';
        var proc  = spawn(command, args, { stdio: stdio });

        var error = promisifyEvent(proc, 'error')
            .catch(function (err) {
                throw new Error('Command `' + command + '` thrown error: \n' + err.message);
            });

        var completion = promisifyEvent(proc, 'exit')
            .then(function (code) {
                code = Array.isArray(code) ? code[0] : code;

                if (code !== 0)
                    throw new Error('Command `' + command + '` exited with code ' + code + '.');
            });

        return Promise.race([completion, error]);
    }
};
