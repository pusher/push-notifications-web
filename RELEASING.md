# Release Process
1. Update version in package manifest
2. Update version in changelog
3. Commit
4. Check you are part of the @pusher npm org
5. Check you are logged in to npm `npm whoami`
6. If not, login via `npm login`
7. `git tag <VERSION e.g. 1.2.3>`
8. `git push --tags`
9. `npm run publish-please`
10. Upload `./dist/push-notifications-cdn` to the appropriate S3 buckets:
  - Major/minor version:
    - `/pusher-js-cloudfront/beams/<MAJOR>.<MINOR>`
    - `/pusher-js-cloudfront/beams/<MAJOR>.<MINOR>.0`
  - Patch version:
    - `/pusher-js-cloudfront/beams/<MAJOR>.<MINOR>`
    - `/pusher-js-cloudfront/beams/<MAJOR>.<MINOR>.<PATCH>`
11. If any changes have been made to the service worker:
  - `npm run build:sw`
  - Upload `./dist/service-worker.js` to S3:
    - `/pusher-js-cloudfront/beams/service-worker.js`
