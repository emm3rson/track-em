import React from "react";

import { InstitutionLogo } from "./InstitutionLogo";
import { ThemedSelect } from "./ThemedSelect";

export type AccountSelectOption = {
  id: number;
  name: string;
  institution?: string | null;
  balance?: number | null;
  type?: string | null;
};

type LeadingItem<T> = { label: string; value: T };

type Props<T extends number | string> = {
  accounts: AccountSelectOption[];
  selectedValue: T | undefined;
  onValueChange: (value: T) => void;
  /** Items rendered before accounts, without a logo (e.g. "No account", "All accounts"). */
  leadingItems?: LeadingItem<T>[];
  /** Custom label renderer. Defaults to account.name. */
  labelFn?: (account: AccountSelectOption) => string;
  accessibilityLabel?: string;
  placeholder?: string;
  muted?: boolean;
};

export function AccountSelect<T extends number | string>({
  accounts,
  selectedValue,
  onValueChange,
  leadingItems,
  labelFn,
  accessibilityLabel,
  placeholder = "Select an account",
  muted,
}: Props<T>) {
  const accountItems = accounts.map((a) => ({
    label: labelFn ? labelFn(a) : a.name,
    value: a.id as unknown as T,
    icon: <InstitutionLogo institution={a.institution} accountName={a.name} size={22} />,
  }));

  const items = leadingItems
    ? [...leadingItems.map((item) => ({ label: item.label, value: item.value })), ...accountItems]
    : accountItems;

  return (
    <ThemedSelect
      items={items}
      selectedValue={selectedValue}
      onValueChange={onValueChange}
      placeholder={placeholder}
      accessibilityLabel={accessibilityLabel}
      muted={muted}
    />
  );
}
