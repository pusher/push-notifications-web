import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';

export default [
  {
    input: 'src/push-notifications.js',
    output: {
      file: './dist/push-notifications-esm.js',
      format: 'esm',
    },
    plugins: [
      resolve(),
      commonjs(),
      babel({
        plugins: ['@babel/proposal-object-rest-spread'],
        exclude: ['node_modules/**'],
      }),
    ],
  },
];
