import { useEffect, useState } from "react";
import * as Updates from "expo-updates";

type OTAUpdateState = {
  updateReady: boolean;
  updateMessage: string | undefined;
  applyUpdate: () => Promise<void>;
  dismiss: () => void;
};

export function useOTAUpdate(): OTAUpdateState {
  const [updateReady, setUpdateReady] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (__DEV__) return;

    let active = true;

    void (async () => {
      try {
        const checkResult = await Updates.checkForUpdateAsync();
        if (!checkResult.isAvailable || !active) return;

        // EAS Update stores the --message flag value at manifest.metadata.message.
        // The metadata field is opaque in TypeScript but EAS populates it at runtime.
        const meta = (checkResult.manifest as unknown as { metadata?: { message?: string } })
          .metadata;
        const message = meta?.message;

        await Updates.fetchUpdateAsync();

        if (active) {
          setUpdateMessage(message);
          setUpdateReady(true);
        }
      } catch {
        // silently ignore - no update or network unavailable
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return {
    updateReady,
    updateMessage,
    applyUpdate: () => Updates.reloadAsync(),
    dismiss: () => setUpdateReady(false),
  };
}
