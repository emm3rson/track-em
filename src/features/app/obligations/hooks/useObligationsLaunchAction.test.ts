import { act, renderHook } from "@testing-library/react-native";
import { Alert } from "react-native";

import { useObligationsLaunchAction } from "./useObligationsLaunchAction";

const mockUseRoute = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useRoute: () => mockUseRoute(),
}));

function makeParams({
  launchAction,
  payableMonth,
  payablePlatform,
  payablePaymentId,
  receivableId,
  receivablePaymentId,
  launchNonce = 1,
}: {
  launchAction?: string;
  payableMonth?: string;
  payablePlatform?: string;
  payablePaymentId?: number;
  receivableId?: number;
  receivablePaymentId?: number;
  launchNonce?: number;
} = {}) {
  return {
    params: {
      launchAction,
      payableMonth,
      payablePlatform,
      payablePaymentId,
      receivableId,
      receivablePaymentId,
      launchNonce,
    },
  };
}

function makeHandlers() {
  return {
    setSegment: jest.fn(),
    openFabPayablePaymentModal: jest.fn().mockReturnValue(true),
    openFabReceivablePaymentModal: jest.fn().mockReturnValue(true),
    openAddPayablePayment: jest.fn(),
    openPayablePaymentEditById: jest.fn().mockResolvedValue(true),
    openReceivablesEditById: jest.fn().mockReturnValue(true),
    openReceivablePaymentEditById: jest.fn().mockResolvedValue(true),
  };
}

describe("useObligationsLaunchAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
  });

  it("does nothing when launchAction is undefined", () => {
    mockUseRoute.mockReturnValue({ params: undefined });
    const handlers = makeHandlers();
    renderHook(() =>
      useObligationsLaunchAction({
        payablesInitialLoaded: true,
        receivablesInitialLoaded: true,
        ...handlers,
      })
    );
    expect(handlers.setSegment).not.toHaveBeenCalled();
    expect(handlers.openFabPayablePaymentModal).not.toHaveBeenCalled();
  });

  it("waits for payablesInitialLoaded before acting on addPayablePayment", async () => {
    mockUseRoute.mockReturnValue(makeParams({ launchAction: "addPayablePayment" }));
    const handlers = makeHandlers();
    const { rerender } = renderHook(
      ({ loaded }: { loaded: boolean }) =>
        useObligationsLaunchAction({
          payablesInitialLoaded: loaded,
          receivablesInitialLoaded: true,
          ...handlers,
        }),
      { initialProps: { loaded: false } }
    );

    await act(async () => {});
    expect(handlers.openFabPayablePaymentModal).not.toHaveBeenCalled();

    rerender({ loaded: true });
    await act(async () => {});
    expect(handlers.setSegment).toHaveBeenCalledWith("payables");
    expect(handlers.openFabPayablePaymentModal).toHaveBeenCalledTimes(1);
  });

  it("waits for receivablesInitialLoaded before acting on addReceivablePayment", async () => {
    mockUseRoute.mockReturnValue(makeParams({ launchAction: "addReceivablePayment" }));
    const handlers = makeHandlers();
    const { rerender } = renderHook(
      ({ loaded }: { loaded: boolean }) =>
        useObligationsLaunchAction({
          payablesInitialLoaded: true,
          receivablesInitialLoaded: loaded,
          ...handlers,
        }),
      { initialProps: { loaded: false } }
    );

    await act(async () => {});
    expect(handlers.openFabReceivablePaymentModal).not.toHaveBeenCalled();

    rerender({ loaded: true });
    await act(async () => {});
    expect(handlers.setSegment).toHaveBeenCalledWith("receivables");
    expect(handlers.openFabReceivablePaymentModal).toHaveBeenCalledTimes(1);
  });

  it("consumes a launch key only once across re-renders", async () => {
    mockUseRoute.mockReturnValue(makeParams({ launchAction: "addPayablePayment", launchNonce: 5 }));
    const handlers = makeHandlers();
    const { rerender } = renderHook(
      ({ loaded }: { loaded: boolean }) =>
        useObligationsLaunchAction({
          payablesInitialLoaded: loaded,
          receivablesInitialLoaded: true,
          ...handlers,
        }),
      { initialProps: { loaded: true } }
    );

    await act(async () => {});
    // Trigger another render — same params, same nonce
    rerender({ loaded: true });
    await act(async () => {});
    expect(handlers.openFabPayablePaymentModal).toHaveBeenCalledTimes(1);
  });

  it("switches segment to payables before opening addPayablePayment", async () => {
    mockUseRoute.mockReturnValue(makeParams({ launchAction: "addPayablePayment" }));
    const callOrder: string[] = [];
    const handlers = makeHandlers();
    handlers.setSegment.mockImplementation(() => {
      callOrder.push("setSegment");
    });
    handlers.openFabPayablePaymentModal.mockImplementation(() => {
      callOrder.push("openFab");
      return true;
    });
    renderHook(() =>
      useObligationsLaunchAction({
        payablesInitialLoaded: true,
        receivablesInitialLoaded: true,
        ...handlers,
      })
    );

    await act(async () => {});
    expect(callOrder).toEqual(["setSegment", "openFab"]);
  });

  it("switches segment to receivables before opening addReceivablePayment", async () => {
    mockUseRoute.mockReturnValue(makeParams({ launchAction: "addReceivablePayment" }));
    const handlers = makeHandlers();
    renderHook(() =>
      useObligationsLaunchAction({
        payablesInitialLoaded: true,
        receivablesInitialLoaded: true,
        ...handlers,
      })
    );

    await act(async () => {});
    expect(handlers.setSegment).toHaveBeenCalledWith("receivables");
    expect(handlers.openFabReceivablePaymentModal).toHaveBeenCalledTimes(1);
  });

  it("shows alert and does not call openReceivablesEditById for missing-item editReceivable", async () => {
    mockUseRoute.mockReturnValue(makeParams({ launchAction: "editReceivable", receivableId: 99 }));
    const handlers = makeHandlers();
    handlers.openReceivablesEditById.mockReturnValue(false);
    renderHook(() =>
      useObligationsLaunchAction({
        payablesInitialLoaded: true,
        receivablesInitialLoaded: true,
        ...handlers,
      })
    );

    await act(async () => {});
    expect(Alert.alert).toHaveBeenCalledWith(
      "Unable to open linked transaction",
      "The linked receivable could not be found."
    );
  });

  it("shows alert for missing editPayablePayment linked item", async () => {
    mockUseRoute.mockReturnValue(
      makeParams({ launchAction: "editPayablePayment", payablePaymentId: 42 })
    );
    const handlers = makeHandlers();
    handlers.openPayablePaymentEditById.mockResolvedValue(false);
    renderHook(() =>
      useObligationsLaunchAction({
        payablesInitialLoaded: true,
        receivablesInitialLoaded: true,
        ...handlers,
      })
    );

    await act(async () => {});
    expect(Alert.alert).toHaveBeenCalledWith(
      "Unable to open linked transaction",
      "The linked payable payment could not be found."
    );
  });

  it("consumes editReceivablePayment without acting when receivableId is missing", async () => {
    mockUseRoute.mockReturnValue(
      makeParams({ launchAction: "editReceivablePayment", receivablePaymentId: 10 })
    );
    const handlers = makeHandlers();
    renderHook(() =>
      useObligationsLaunchAction({
        payablesInitialLoaded: true,
        receivablesInitialLoaded: true,
        ...handlers,
      })
    );

    await act(async () => {});
    expect(handlers.openReceivablePaymentEditById).not.toHaveBeenCalled();
    expect(Alert.alert).not.toHaveBeenCalled();
  });
});
