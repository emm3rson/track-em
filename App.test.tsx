import React from "react";
import { render } from "@testing-library/react-native";

import App from "./App";

jest.mock("./src/app/AppRoot", () => {
  const ReactLib = require("react");
  const { Text: NativeText } = require("react-native");

  return function MockAppRoot() {
    return ReactLib.createElement(NativeText, null, "App Root Smoke");
  };
});

describe("App root", () => {
  it("renders the AppRoot entry component", () => {
    const { getByText } = render(<App />);
    expect(getByText("App Root Smoke")).toBeTruthy();
  });
});
