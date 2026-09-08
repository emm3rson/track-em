import React, { useMemo } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { resolveInstitutionLogoSource } from "../../features/accounts/institutionLogoResolver";
import { useTheme } from "../../theme/ThemeProvider";
import { semantic } from "../../styles/tokens";
import CashIcon from "../../../assets/icons/expense.svg";

type Props = {
  institution?: string | null;
  accountName?: string | null;
  size?: number;
};

function isCashAccount(institution?: string | null, accountName?: string | null): boolean {
  const check = (v?: string | null) => v?.trim().toLowerCase() === "cash";
  return check(institution) || check(accountName);
}

export function InstitutionLogo({ institution, accountName, size = 36 }: Props) {
  const { colors } = useTheme();
  const cashAccount = isCashAccount(institution, accountName);
  const resolution = useMemo(
    () => resolveInstitutionLogoSource({ institution, accountName }),
    [institution, accountName]
  );

  if (cashAccount) {
    return (
      <View
        style={[
          styles.baseContainer,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.surfaceMuted,
          },
        ]}
      >
        <CashIcon width={size * 0.62} height={size * 0.62} color={colors.icon} />
      </View>
    );
  }

  if (resolution.kind === "local") {
    return (
      <View
        style={[
          styles.baseContainer,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.surfaceRaised,
            overflow: "hidden",
          },
        ]}
      >
        <Image
          source={resolution.source}
          style={{ width: size, height: size, opacity: semantic.institutionLogo.imageOpacity }}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.baseContainer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.surfaceMuted,
        },
      ]}
    >
      <Text
        style={{
          color: colors.mutedText,
          fontWeight: "800",
          fontSize: Math.max(10, size * 0.34),
        }}
      >
        {resolution.fallbackLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  baseContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
});
