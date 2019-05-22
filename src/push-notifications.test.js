import { init } from './push-notifications';

test('PushNotifications', () => {
  expect(typeof init).toBe('function');
});

test('Constructor will throw if there is no config object given', () => {
  expect(init()).rejects.toThrow('Config object required');
});

test('Constructor will throw if there is no instance ID specified', () => {
  expect(init({})).rejects.toThrow('Instance ID is required');
});

test('Constructor will throw if instance ID is not a string', () => {
  const instanceId = null;
  expect(init({ instanceId })).rejects.toThrow('Instance ID must be a string');
});

test('Constructor will throw if the instance id is the empty string', () => {
  const instanceId = '';
  expect(init({ instanceId })).rejects.toThrow('Instance ID cannot be empty');
});
