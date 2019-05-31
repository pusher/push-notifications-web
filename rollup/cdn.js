import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';

export default [
  {
    input: 'src/push-notifications.js',
    output: {
      name: 'PusherPushNotifications',
      file: './dist/push-notifications-cdn.js',
      format: 'iife',
    },
    plugins: [
      resolve(),
      commonjs(),
      babel({
        runtimeHelpers: true,
        presets: ['@babel/preset-env'],
        plugins: ['@babel/plugin-transform-runtime'],
        exclude: ['node_modules/**'],
      }),
    ],
  },
];
