import PushNotifications from './push-notifications';

test('PushNotifications', () => {
  expect(typeof PushNotifications).toBe('function');
});

test('Errors', () => {
  expect(() => PushNotifications()).toThrow(
    'Push Notifications config object is required'
  );
});
