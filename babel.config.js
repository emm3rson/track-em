const path = require("path");

module.exports = function (api) {
  api.cache(true);
  const config = {
    presets: [path.join(__dirname, "node_modules/babel-preset-expo")],
    plugins: [
      path.join(__dirname, "node_modules/react-native-reanimated/plugin/index.js"),
    ], // must be last
  };
  return config;
};
