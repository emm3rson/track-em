import { useMemo, useRef } from "react";
import { ScrollView } from "react-native";
import { useNavigation, useRoute, useScrollToTop, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useGlobalSwipeLock } from "../../../../utils/useGlobalSwipeLock";
import type { RootStackParamList } from "../../../../navigation/types";
import { useTransactionHistoryEntryActions } from "./useTransactionHistoryEntryActions";
import { useTransactionHistoryFiltersData } from "./useTransactionHistoryFiltersData";

export function useTransactionHistoryScreenController() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "TransactionHistory">>();
  const scrollRef = useRef<ScrollView | null>(null);
  useScrollToTop(scrollRef);

  const {
    rowsRef,
    rows,
    loading,
    loadingMore,
    loadedOnce,
    hasMore,
    errorMessage,
    refresh,
    loadMore,
    accountOptions,
    selectedAccountId,
    changeAccountFilter,
    datePreset,
    changeDatePreset,
    customFromDate,
    customToDate,
    changeCustomFromDate,
    changeCustomToDate,
    showFromDatePicker,
    setShowFromDatePicker,
    showToDatePicker,
    setShowToDatePicker,
  } = useTransactionHistoryFiltersData();

  const initialRouteEntry = route.params?.initialEntry;
  const initialRouteMode = route.params?.initialMode ?? "actions";
  const refreshRows = useMemo(() => refresh, [refresh]);

  const {
    entryActionTarget,
    openEntryActions,
    closeEntryActions,
    entrySheetActions,
    editingEntry,
    editAccountId,
    setEditAccountId,
    editDirection,
    setEditDirection,
    editAmountText,
    setEditAmountText,
    editNote,
    setEditNote,
    editDate,
    setEditDate,
    showEditDate,
    setShowEditDate,
    savingEdit,
    attemptCloseEditModal,
    saveEdit,
  } = useTransactionHistoryEntryActions({
    navigation,
    initialRouteEntry: initialRouteEntry,
    initialRouteMode,
    rowsRef,
    refreshRows,
  });

  const swipeLocked =
    !!entryActionTarget || !!editingEntry || showFromDatePicker || showToDatePicker || showEditDate;
  useGlobalSwipeLock(swipeLocked);

  return {
    scrollRef,
    rows,
    loading,
    loadingMore,
    loadedOnce,
    hasMore,
    errorMessage,
    refresh,
    loadMore,
    accountOptions,
    selectedAccountId,
    changeAccountFilter,
    datePreset,
    changeDatePreset,
    customFromDate,
    customToDate,
    changeCustomFromDate,
    changeCustomToDate,
    showFromDatePicker,
    setShowFromDatePicker,
    showToDatePicker,
    setShowToDatePicker,
    entryActionTarget,
    openEntryActions,
    closeEntryActions,
    entrySheetActions,
    editingEntry,
    editAccountId,
    setEditAccountId,
    editDirection,
    setEditDirection,
    editAmountText,
    setEditAmountText,
    editNote,
    setEditNote,
    editDate,
    setEditDate,
    showEditDate,
    setShowEditDate,
    savingEdit,
    attemptCloseEditModal,
    saveEdit,
  };
}
