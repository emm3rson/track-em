import React from "react";
import { Alert } from "react-native";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { ManageCategoriesModal } from "./ManageCategoriesModal";

jest.mock("react-native/Libraries/Lists/FlatList", () => {
  const ReactModule = require("react");

  return {
    __esModule: true,
    default: ({
      data = [],
      renderItem,
      keyExtractor,
      ListEmptyComponent,
    }: {
      data?: unknown[];
      renderItem: (info: {
        item: unknown;
        index: number;
        separators: {
          highlight: () => void;
          unhighlight: () => void;
          updateProps: () => void;
        };
      }) => React.ReactNode;
      keyExtractor?: (item: unknown, index: number) => string;
      ListEmptyComponent?: React.ReactNode;
    }) => {
      const separators = {
        highlight: () => {},
        unhighlight: () => {},
        updateProps: () => {},
      };
      const children = data.length
        ? data.map((item, index) =>
            ReactModule.createElement(
              ReactModule.Fragment,
              { key: keyExtractor?.(item, index) ?? String(index) },
              renderItem({ item, index, separators })
            )
          )
        : ListEmptyComponent;

      return ReactModule.createElement(ReactModule.Fragment, null, children);
    },
  };
});

// --- service mock -----------------------------------------------------------

const mockLoadCategories = jest.fn();
const mockCreateCategory = jest.fn();
const mockRenameCategory = jest.fn();
const mockDeleteCategory = jest.fn();
const mockDeleteCategoryWithReassign = jest.fn();
const mockGetCategoryUsageCount = jest.fn();

jest.mock("../../service", () => ({
  loadCategories: (...args: unknown[]) => mockLoadCategories(...args),
  createCategory: (...args: unknown[]) => mockCreateCategory(...args),
  renameCategory: (...args: unknown[]) => mockRenameCategory(...args),
  deleteCategory: (...args: unknown[]) => mockDeleteCategory(...args),
  deleteCategoryWithReassign: (...args: unknown[]) => mockDeleteCategoryWithReassign(...args),
  getCategoryUsageCount: (...args: unknown[]) => mockGetCategoryUsageCount(...args),
}));

// --- animation / gesture mocks -----------------------------------------------

jest.mock("react-native-reanimated", () => {
  const ReactNative = require("react-native");
  const createAnimatedComponent = (C: unknown) => C;
  return {
    __esModule: true,
    default: { View: ReactNative.View, createAnimatedComponent },
    createAnimatedComponent,
    useSharedValue: <T,>(v: T) => ({ value: v }),
    useAnimatedStyle: () => ({}),
    withTiming: <T,>(v: T) => v,
    withSpring: <T,>(v: T) => v,
    runOnJS: (fn: (...a: unknown[]) => unknown) => fn,
    interpolate: () => 0,
    Extrapolation: { CLAMP: "clamp" },
    Easing: { bezier: () => () => 0, linear: () => 0 },
  };
});

jest.mock("react-native-gesture-handler", () => {
  const { View } = require("react-native");
  const chain: Record<string, unknown> = {};
  ["enabled", "minDistance", "onBegin", "onUpdate", "onEnd", "onFinalize"].forEach((k) => {
    chain[k] = () => chain;
  });
  return {
    Gesture: { Pan: () => chain },
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
    GestureHandlerRootView: View,
  };
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// --- UI mocks ----------------------------------------------------------------

jest.mock("../../../../theme/ThemeProvider", () => ({
  useTheme: () => ({
    colors: require("../../../../theme/colors").getThemeColors("light", "green"),
  }),
}));

jest.mock("../../../../components/Themed", () => {
  const { View, Text } = require("react-native");
  return { Card: View, Text };
});

jest.mock("lucide-react-native", () => ({
  Lock: () => null,
  Pencil: () => null,
  Trash: () => null,
}));

jest.mock("../../../../utils/useGlobalSwipeLock", () => ({
  useGlobalSwipeLock: () => {},
}));

jest.mock("../../../../utils/confirm", () => ({
  confirmDiscardChanges: (fn: () => void) => fn(),
}));

jest.mock("../../../../styles/shadows", () => ({
  getActionShadowStyle: () => ({}),
  getFieldShadowStyle: () => ({}),
}));

jest.mock("../../../../components/ui/ArchiveModalShell", () => ({
  ArchiveModalShell: ({
    visible,
    children,
    onRequestClose,
  }: {
    visible: boolean;
    children: React.ReactNode;
    onRequestClose: () => void;
    [k: string]: unknown;
  }) => {
    if (!visible) return null;
    const { View, Pressable, Text } = require("react-native");
    const React = require("react");
    return React.createElement(
      View,
      null,
      React.createElement(
        Pressable,
        { onPress: onRequestClose, accessibilityLabel: "Close modal" },
        React.createElement(Text, null, "Close")
      ),
      children
    );
  },
}));

jest.mock("../../../../components/ui/ActionBottomSheet", () => ({
  ActionBottomSheet: ({
    visible,
    actions,
  }: {
    visible: boolean;
    title: string;
    actions: { key: string; label: string; onPress: () => void }[];
    onClose: () => void;
    [k: string]: unknown;
  }) => {
    if (!visible) return null;
    const { View, Text, Pressable } = require("react-native");
    const React = require("react");
    return React.createElement(
      View,
      { testID: "action-sheet" },
      ...actions.map((a) =>
        React.createElement(
          Pressable,
          { key: a.key, onPress: a.onPress, accessibilityLabel: a.label },
          React.createElement(Text, null, a.label)
        )
      )
    );
  },
}));

jest.mock("./CategoryFormModal", () => ({
  CategoryFormModal: ({
    visible,
    title,
    nameInput,
    onNameChange,
    saving,
    onSave,
    onCancel,
  }: {
    visible: boolean;
    title: string;
    nameInput: string;
    onNameChange: (v: string) => void;
    saving: boolean;
    onSave: () => void;
    onCancel: () => void;
  }) => {
    if (!visible) return null;
    const { View, Text, TextInput, Pressable } = require("react-native");
    const React = require("react");
    return React.createElement(
      View,
      { testID: "form-modal" },
      React.createElement(Text, { testID: "form-title" }, title),
      React.createElement(TextInput, {
        value: nameInput,
        onChangeText: onNameChange,
        testID: "category-name-input",
      }),
      React.createElement(
        Pressable,
        { onPress: onSave, accessibilityLabel: "Save" },
        React.createElement(Text, null, saving ? "Saving..." : "Save")
      ),
      React.createElement(
        Pressable,
        { onPress: onCancel, accessibilityLabel: "Cancel form" },
        React.createElement(Text, null, "Cancel")
      )
    );
  },
}));

jest.mock("./CategoryDeleteMergeModal", () => ({
  CategoryDeleteMergeModal: ({
    target,
    usageCount,
    saving,
    onClose,
    onSubmit,
  }: {
    target: { name: string; id: number } | null;
    usageCount: number;
    saving: boolean;
    onClose: () => void;
    onSubmit: () => void;
    [k: string]: unknown;
  }) => {
    if (!target) return null;
    const { View, Text, Pressable } = require("react-native");
    const React = require("react");
    return React.createElement(
      View,
      { testID: "delete-modal" },
      React.createElement(
        Text,
        { testID: "delete-usage-text" },
        `${target.name} has ${usageCount} ${usageCount === 1 ? "expense entry" : "expense entries"}`
      ),
      React.createElement(
        Pressable,
        { onPress: onSubmit, accessibilityLabel: "Delete" },
        React.createElement(Text, null, saving ? "Deleting..." : "Delete")
      ),
      React.createElement(
        Pressable,
        { onPress: onClose, accessibilityLabel: "Cancel delete" },
        React.createElement(Text, null, "Cancel")
      )
    );
  },
}));

// --- fixtures ----------------------------------------------------------------

const PROTECTED_CAT = { id: 1, name: "Others", sortOrder: 0 };
const CAT_A = { id: 2, name: "Food", sortOrder: 1 };
const CAT_B = { id: 3, name: "Transport", sortOrder: 2 };
const defaultCategories = [PROTECTED_CAT, CAT_A, CAT_B];

function setup(onCategoriesChanged = jest.fn()) {
  const onClose = jest.fn();
  mockLoadCategories.mockResolvedValue(defaultCategories);
  const utils = render(
    <ManageCategoriesModal visible onClose={onClose} onCategoriesChanged={onCategoriesChanged} />
  );
  return { ...utils, onClose, onCategoriesChanged };
}

// --- tests -------------------------------------------------------------------

describe("ManageCategoriesModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders all category names including the protected one", async () => {
    const { getByText } = setup();
    await waitFor(() => expect(getByText("Others")).toBeTruthy());
    expect(getByText("Food")).toBeTruthy();
    expect(getByText("Transport")).toBeTruthy();
  });

  it("pressing a non-protected row opens the action sheet with Rename and Delete", async () => {
    const { getByText, queryByTestId } = setup();
    await waitFor(() => expect(getByText("Food")).toBeTruthy());

    expect(queryByTestId("action-sheet")).toBeNull();
    fireEvent.press(getByText("Food"));
    expect(queryByTestId("action-sheet")).toBeTruthy();
    expect(getByText("Rename")).toBeTruthy();
    expect(getByText("Delete")).toBeTruthy();
  });

  it("pressing the protected Others row does not open the action sheet", async () => {
    const { getByText, queryByTestId } = setup();
    await waitFor(() => expect(getByText("Others")).toBeTruthy());

    fireEvent.press(getByText("Others"));
    expect(queryByTestId("action-sheet")).toBeNull();
  });

  it("pressing Rename opens the form modal pre-filled with the category name", async () => {
    const { getByText, getByTestId } = setup();
    await waitFor(() => expect(getByText("Food")).toBeTruthy());

    fireEvent.press(getByText("Food"));
    fireEvent.press(getByText("Rename"));

    expect(getByTestId("form-modal")).toBeTruthy();
    expect(getByTestId("form-title").props.children).toBe("Rename Category");
    expect(getByTestId("category-name-input").props.value).toBe("Food");
  });

  it("pressing Add Category opens the form modal with an empty name input", async () => {
    const { getByText, getByTestId, getByLabelText } = setup();
    await waitFor(() => expect(getByText("Others")).toBeTruthy());

    fireEvent.press(getByLabelText("Add category"));

    expect(getByTestId("form-modal")).toBeTruthy();
    expect(getByTestId("form-title").props.children).toBe("Add Category");
    expect(getByTestId("category-name-input").props.value).toBe("");
  });

  it("closing the modal with no changes does not call onCategoriesChanged", async () => {
    const onCategoriesChanged = jest.fn();
    const { getByLabelText } = setup(onCategoriesChanged);
    await waitFor(() => expect(mockLoadCategories).toHaveBeenCalled());

    fireEvent.press(getByLabelText("Close modal"));
    expect(onCategoriesChanged).not.toHaveBeenCalled();
  });

  it("closing the modal after a successful add calls onCategoriesChanged", async () => {
    mockCreateCategory.mockResolvedValue(undefined);
    const onCategoriesChanged = jest.fn();
    const { getByText, getByTestId, getByLabelText } = setup(onCategoriesChanged);
    await waitFor(() => expect(getByText("Food")).toBeTruthy());

    fireEvent.press(getByLabelText("Add category"));
    fireEvent.changeText(getByTestId("category-name-input"), "New Cat");

    mockLoadCategories.mockResolvedValue([
      ...defaultCategories,
      { id: 4, name: "New Cat", sortOrder: 3 },
    ]);
    await act(async () => {
      fireEvent.press(getByLabelText("Save"));
    });

    fireEvent.press(getByLabelText("Close modal"));
    expect(onCategoriesChanged).toHaveBeenCalledTimes(1);
  });

  it("delete with usage opens merge modal with usage count; confirm calls deleteCategoryWithReassign", async () => {
    mockGetCategoryUsageCount.mockResolvedValue(5);
    mockDeleteCategoryWithReassign.mockResolvedValue(undefined);
    const onCategoriesChanged = jest.fn();
    const { getByText, getByTestId, getByLabelText, queryByTestId } = setup(onCategoriesChanged);
    await waitFor(() => expect(getByText("Food")).toBeTruthy());

    fireEvent.press(getByText("Food"));
    await act(async () => {
      fireEvent.press(getByLabelText("Delete"));
    });

    await waitFor(() => expect(queryByTestId("delete-modal")).toBeTruthy());
    expect(getByTestId("delete-usage-text").props.children).toContain("5");
    expect(getByTestId("delete-usage-text").props.children).toContain("expense entries");

    await act(async () => {
      fireEvent.press(getByLabelText("Delete"));
    });

    expect(mockDeleteCategoryWithReassign).toHaveBeenCalledWith(CAT_A.id, PROTECTED_CAT.id);

    fireEvent.press(getByLabelText("Close modal"));
    expect(onCategoriesChanged).toHaveBeenCalledTimes(1);
  });

  it("delete with zero usage invokes Alert.alert with the confirm dialog", async () => {
    mockGetCategoryUsageCount.mockResolvedValue(0);
    const alertSpy = jest.spyOn(Alert, "alert");
    const { getByText, getByLabelText } = setup();
    await waitFor(() => expect(getByText("Food")).toBeTruthy());

    fireEvent.press(getByText("Food"));
    await act(async () => {
      fireEvent.press(getByLabelText("Delete"));
    });

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        "Delete category?",
        expect.any(String),
        expect.any(Array)
      )
    );
  });
});
