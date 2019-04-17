import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

export default [
  // browser-friendly UMD build
  {
    input: 'src/push-notifications.js',
    output: {
      name: 'PushNotifications',
      file: 'dist/push-notifications.js',
      format: 'umd'
    },
    plugins: [resolve(), commonjs()]
  }
];
