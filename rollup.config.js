import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

export default [
  {
    input: 'src/push-notifications.js',
    output: {
      name: 'PusherPushNotifications',
      file: 'push-notifications.js',
      format: 'umd'
    },
    plugins: [resolve(), commonjs()]
  }
];
