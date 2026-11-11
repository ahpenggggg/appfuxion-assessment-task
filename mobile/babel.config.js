module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ios.ts', '.android.ts', '.ts', '.tsx', '.js', '.json'],
        alias: {
          '@app': './src/app',
          '@core': './src/core',
          '@ui': './src/ui',
          '@modules': './src/modules',
          '@shared': '../shared',
        },
      },
    ],
  ],
};
