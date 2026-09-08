import { Alert } from "react-native";

export function confirmDiscardChanges(onDiscard: () => void) {
  Alert.alert("Discard changes?", "You have unsaved changes.", [
    { text: "Keep editing", style: "cancel" },
    { text: "Discard", style: "destructive", onPress: onDiscard },
  ]);
}
