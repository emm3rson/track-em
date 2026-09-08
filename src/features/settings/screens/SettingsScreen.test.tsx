import React from "react";
import { render } from "@testing-library/react-native";

import SettingsScreen from "./SettingsScreen";

jest.mock("lucide-react-native", () => ({
  Check: () => null,
  FolderDown: () => null,
  FolderUp: () => null,
  FolderX: () => null,
  MoonStar: () => null,
  Palette: () => null,
  Sprout: () => null,
  Type: () => null,
}));

jest.mock("../../../config/appVersion", () => ({
  getAppVersionLabel: () => "4.0.0",
}));

jest.mock("../hooks/useSettingsScreenController", () => ({
  useSettingsScreenController: () => ({
    exporting: false,
    importing: false,
    lastImportSummary: null,
    resetting: false,
    demoMode: false,
    switchingDemoMode: false,
    handleExport: jest.fn(),
    confirmAndImport: jest.fn(),
    confirmResetAllData: jest.fn(),
    confirmEnterDemoMode: jest.fn(),
    confirmExitDemoMode: jest.fn(),
  }),
}));

jest.mock("../../../styles/shadows", () => ({
  getActionShadowStyle: () => ({}),
  getFieldShadowStyle: () => ({}),
}));

jest.mock("../../../ui/components/AppScreen", () => ({
  AppScreen: ({ header, children }: { header?: React.ReactNode; children: React.ReactNode }) => {
    const ReactLib = require("react");
    const { View: MockView } = require("react-native");
    return ReactLib.createElement(MockView, null, header, children);
  },
}));

jest.mock("../../../components/ui/SectionCard", () => ({
  SectionCard: ({ children }: { children: React.ReactNode }) => {
    const ReactLib = require("react");
    const { View: MockView } = require("react-native");
    return ReactLib.createElement(MockView, null, children);
  },
}));

jest.mock("../../../components/ui/PrimaryButton", () => ({
  PrimaryButton: ({ children }: { children: React.ReactNode }) => {
    const ReactLib = require("react");
    const { Text: MockText } = require("react-native");
    return ReactLib.createElement(MockText, null, children);
  },
}));

jest.mock("../../../theme/ThemeProvider", () => ({
  useTheme: () => ({
    colors: require("../../../theme/colors").getThemeColors("light", "green"),
    scheme: "light",
    toggleScheme: jest.fn(),
    fontType: "sans",
    setFontType: jest.fn(),
    primaryColor: "green",
    setPrimaryColor: jest.fn(),
  }),
}));

describe("SettingsScreen version header", () => {
  it("renders the runtime version label from appVersion accessor", () => {
    const { getByText } = render(<SettingsScreen />);

    expect(getByText("Version 4.0.0")).toBeTruthy();
  });
});
