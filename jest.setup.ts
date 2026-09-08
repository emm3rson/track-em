import "react-native-gesture-handler/jestSetup";

jest.mock("react-native-worklets", () => ({}));

jest.mock("react-native-reanimated", () => {
  const ReactNative = require("react-native");
  const createAnimatedComponent = (Component: unknown) => Component;

  return {
    __esModule: true,
    default: {
      View: ReactNative.View,
      createAnimatedComponent,
    },
    createAnimatedComponent,
    useSharedValue: <T,>(value: T) => ({ value }),
    useAnimatedStyle: (updater: () => unknown) => updater(),
    useAnimatedProps: (updater: () => unknown) => updater(),
    withTiming: <T,>(toValue: T) => toValue,
    withSpring: <T,>(toValue: T) => toValue,
    runOnJS: (fn: (...args: unknown[]) => unknown) => fn,
  };
});

jest.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file:///",
  cacheDirectory: "file://cache/",
  readAsStringAsync: jest.fn(() => Promise.reject(new Error("ENOENT"))),
  writeAsStringAsync: jest.fn(() => Promise.resolve()),
  EncodingType: { UTF8: "utf8" },
  StorageAccessFramework: {},
}));
