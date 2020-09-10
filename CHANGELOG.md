# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased](https://github.com/pusher/push-notifications-web/compare/1.0.3...HEAD)

## [1.0.3](https://github.com/pusher/push-notifications-web/compare/1.0.2...1.0.3) - 2020-09-10
 - Fix bug in SDK where we weren't waiting for custom Service Workers to become
   ready before starting the SDK
 - Update out of date TypeScript type definitions & add static check to CI
   to ensure they remain correct.

## [1.0.2](https://github.com/pusher/push-notifications-web/compare/1.0.1...1.0.2) - 2020-08-24
- Fix bug in service worker where analytics events would cause runtime errors
  if a notification had been overridden using the `onNotificationReceived` handler

## [1.0.1](https://github.com/pusher/push-notifications-web/compare/1.0.0...1.0.1) - 2020-07-22
- Fix bug in service worker which generated invalid open/delivery events due to
  non-integer timestamps

## [1.0.0](https://github.com/pusher/push-notifications-web/compare/0.9.0...1.0.0) - 2020-07-22
- General availability (GA) release.
