import { useEffect, useRef } from "react";
import { Alert } from "react-native";
import { useRoute, type RouteProp } from "@react-navigation/native";

import type { TabParamList } from "../../../../navigation/types";
import type { PayableEntryTarget } from "../types";

type UseObligationsLaunchActionParams = {
  setSegment: (segment: "payables" | "receivables") => void;
  payablesInitialLoaded: boolean;
  receivablesInitialLoaded: boolean;
  openFabPayablePaymentModal: () => boolean;
  openFabReceivablePaymentModal: () => boolean;
  openAddPayablePayment: (target: PayableEntryTarget) => void;
  openPayablePaymentEditById: (paymentId: number) => Promise<boolean>;
  openReceivablesEditById: (receivableId: number) => boolean | Promise<boolean>;
  openReceivablePaymentEditById: (receivableId: number, paymentId: number) => Promise<boolean>;
};

export function useObligationsLaunchAction({
  setSegment,
  payablesInitialLoaded,
  receivablesInitialLoaded,
  openFabPayablePaymentModal,
  openFabReceivablePaymentModal,
  openAddPayablePayment,
  openPayablePaymentEditById,
  openReceivablesEditById,
  openReceivablePaymentEditById,
}: UseObligationsLaunchActionParams) {
  const route = useRoute<RouteProp<TabParamList, "Obligations">>();
  const consumedLaunchKeyRef = useRef<string | null>(null);

  const launchAction = route.params?.launchAction;
  const launchNonce = route.params?.launchNonce ?? 0;
  const launchPayableMonth = route.params?.payableMonth;
  const launchPayablePlatform = route.params?.payablePlatform;
  const launchPayablePaymentId = route.params?.payablePaymentId;
  const launchReceivableId = route.params?.receivableId;
  const launchReceivablePaymentId = route.params?.receivablePaymentId;

  useEffect(() => {
    if (!launchAction) return;
    const consumeKey = [
      launchAction,
      launchPayableMonth ?? "",
      launchPayablePlatform ?? "",
      launchPayablePaymentId ?? "",
      launchReceivableId ?? "",
      launchReceivablePaymentId ?? "",
      launchNonce,
    ].join(":");
    if (consumedLaunchKeyRef.current === consumeKey) return;

    const run = async () => {
      if (launchAction === "addPayablePayment") {
        if (!payablesInitialLoaded) return;
        setSegment("payables");
        openFabPayablePaymentModal();
        consumedLaunchKeyRef.current = consumeKey;
        return;
      }

      if (launchAction === "addReceivablePayment") {
        if (!receivablesInitialLoaded) return;
        setSegment("receivables");
        openFabReceivablePaymentModal();
        consumedLaunchKeyRef.current = consumeKey;
        return;
      }

      if (launchAction === "openPayablePayment") {
        if (!launchPayableMonth || !launchPayablePlatform) {
          consumedLaunchKeyRef.current = consumeKey;
          return;
        }
        if (!payablesInitialLoaded) return;
        setSegment("payables");
        openAddPayablePayment({ month: launchPayableMonth, platform: launchPayablePlatform });
        consumedLaunchKeyRef.current = consumeKey;
        return;
      }

      if (launchAction === "editPayablePayment") {
        if (typeof launchPayablePaymentId !== "number") {
          consumedLaunchKeyRef.current = consumeKey;
          return;
        }
        if (!payablesInitialLoaded) return;
        setSegment("payables");
        const opened = await openPayablePaymentEditById(launchPayablePaymentId);
        if (!opened) {
          Alert.alert(
            "Unable to open linked transaction",
            "The linked payable payment could not be found."
          );
        }
        consumedLaunchKeyRef.current = consumeKey;
        return;
      }

      if (launchAction === "editReceivable") {
        if (typeof launchReceivableId !== "number") {
          consumedLaunchKeyRef.current = consumeKey;
          return;
        }
        if (!receivablesInitialLoaded) return;
        setSegment("receivables");
        const opened = await openReceivablesEditById(launchReceivableId);
        if (!opened) {
          Alert.alert(
            "Unable to open linked transaction",
            "The linked receivable could not be found."
          );
        }
        consumedLaunchKeyRef.current = consumeKey;
        return;
      }

      if (launchAction === "editReceivablePayment") {
        if (
          typeof launchReceivableId !== "number" ||
          typeof launchReceivablePaymentId !== "number"
        ) {
          consumedLaunchKeyRef.current = consumeKey;
          return;
        }
        if (!receivablesInitialLoaded) return;
        setSegment("receivables");
        const opened = await openReceivablePaymentEditById(
          launchReceivableId,
          launchReceivablePaymentId
        );
        if (!opened) {
          Alert.alert(
            "Unable to open linked transaction",
            "The linked receivable payment could not be found."
          );
        }
        consumedLaunchKeyRef.current = consumeKey;
        return;
      }

      consumedLaunchKeyRef.current = consumeKey;
    };

    void run();
  }, [
    launchAction,
    launchNonce,
    launchPayableMonth,
    launchPayablePaymentId,
    launchPayablePlatform,
    launchReceivableId,
    launchReceivablePaymentId,
    openAddPayablePayment,
    openFabPayablePaymentModal,
    openFabReceivablePaymentModal,
    openPayablePaymentEditById,
    openReceivablesEditById,
    openReceivablePaymentEditById,
    payablesInitialLoaded,
    receivablesInitialLoaded,
    setSegment,
  ]);
}
