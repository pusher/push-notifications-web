import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';
import json from 'rollup-plugin-json';

export default [
  {
    input: 'src/service-worker.js',
    output: {
      name: 'serviceWorker',
      file: './dist/service-worker.js',
      format: 'cjs',
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
