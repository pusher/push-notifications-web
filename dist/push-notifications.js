(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = global || self, global.PushNotifications = factory());
}(this, function () { 'use strict';

  function PushNotifications() {
    function start() {
      console.log('starting');
    }

    function setUserId() {
      console.log('hey');
    }

    return {
      start,
      setUserId
    };
  }

  return PushNotifications;

}));
