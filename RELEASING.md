# Release Process
1. Check you are part of the @pusher npm org
2. Check you are logged in to npm `npm whoami`
3. If not, login via `npm login`
4. Update version in package manifest
5. Commit
6. `git tag <VERSION e.g. 1.2.3>`
7. `git push --follow-tags`
8. `npm run publish-please`
