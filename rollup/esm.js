import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';
import json from 'rollup-plugin-json';

export default [
  {
    input: 'src/push-notifications.js',
    output: {
      file: './dist/push-notifications-esm.js',
      format: 'esm',
    },
    plugins: [
      json(),
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
