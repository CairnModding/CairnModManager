import { useCallback, useState } from "react";
import { logAppError } from "../state/appLogStore";

/** The run/busy/error/log-on-failure pattern every page needs around a fire-from-a-click async
 * call — one hook instead of every page hand-rolling its own try/catch. `key` distinguishes
 * concurrent actions on a list (e.g. which row's Disable button is spinning) from a single page
 * action (pass a constant key like `"action"`). */
export function useAsyncAction<K extends string = string>() {
  const [busyKey, setBusyKey] = useState<K>();
  const [error, setError] = useState<string>();

  const run = useCallback(async (key: K, action: () => Promise<void>) => {
    setError(undefined);
    setBusyKey(key);
    try {
      await action();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      logAppError(message);
    } finally {
      setBusyKey(undefined);
    }
  }, []);

  return { run, busyKey, isBusy: (key: K) => busyKey === key, error, setError };
}
