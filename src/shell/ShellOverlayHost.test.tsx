import React from "react";
import { Text } from "react-native";
import { render } from "@testing-library/react-native";

const mockUpdatePromptModal = jest.fn((props: unknown) => props);

jest.mock("../hooks/useOTAUpdate", () => ({
  useOTAUpdate: jest.fn(() => ({
    updateReady: false,
    updateMessage: undefined,
    applyUpdate: jest.fn(),
    dismiss: jest.fn(),
  })),
}));
jest.mock("../theme/ThemeProvider", () => ({
  useTheme: jest.fn(() => ({
    colors: {
      primaryBg: "#123456",
      primaryText: "#ffffff",
      surface: "#ffffff",
      mutedText: "#666666",
    },
    fontFamily: "System",
  })),
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: jest.fn(() => ({
    top: 24,
    right: 0,
    bottom: 0,
    left: 0,
  })),
}));
jest.mock("../components/ui/IntroAnimation", () => ({
  IntroAnimation: () => null,
}));
jest.mock("./UpdatePromptModal", () => ({
  UpdatePromptModal: (props: unknown) => {
    mockUpdatePromptModal(props);
    return null;
  },
}));

import { useOTAUpdate } from "../hooks/useOTAUpdate";
import { ShellOverlayHost } from "./ShellOverlayHost";

describe("ShellOverlayHost", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders children with overlays hidden by default", () => {
    const { getByText, queryByText } = render(
      <ShellOverlayHost>
        <Text>inner</Text>
      </ShellOverlayHost>
    );

    expect(getByText("inner")).toBeTruthy();
    expect(queryByText("Demo Mode Active")).toBeNull();
  });

  it("renders the demo banner when explicitly enabled", () => {
    const { getByText } = render(
      <ShellOverlayHost showDemoBanner={true}>
        <Text>inner</Text>
      </ShellOverlayHost>
    );

    expect(getByText("Demo Mode Active")).toBeTruthy();
  });

  it("wires update state into UpdatePromptModal", () => {
    (useOTAUpdate as jest.Mock).mockReturnValueOnce({
      updateReady: true,
      updateMessage: "New build ready",
      applyUpdate: jest.fn(),
      dismiss: jest.fn(),
    });

    render(
      <ShellOverlayHost>
        <Text>inner</Text>
      </ShellOverlayHost>
    );

    expect(mockUpdatePromptModal).toHaveBeenCalledWith(
      expect.objectContaining({
        visible: true,
        message: "New build ready",
      })
    );
  });
});
