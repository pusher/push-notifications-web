export default function PushNotifications(config) {
  if (config === null || config === undefined) {
    throw new Error('Push Notifications config object is required');
  }
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
