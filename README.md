[![Build Status](https://travis-ci.org/pusher/push-notifications-web.svg?branch=master)](https://travis-ci.org/pusher/push-notifications-web)
# Push Notifications Web

**Warning: This SDK is currently a work in progress**

## Usage
### Configuring the SDK for Your Instance
Use your instance id and secret (you can get these from the [dashboard](https://dash.pusher.com/beams)) to create a Beams PushNotifications instance:
```javascript
PusherPushNotifications.init({
  instanceId: 'YOUR_INSTANCE_ID_HERE',
})
  .then(beamsClient => beamsClient.start()) // Register for push notifications
  .then(() => console.log('Beams Web client started'))
  .catch(console.error);
```
