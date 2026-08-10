import type { HostRequest, PluginMessage } from "../../shared/messages";

export type PluginMessageHandler = (message: PluginMessage) => void;

/** Sends a typed request from the Vue iframe to the Penpot plugin host. */
export function sendPluginRequest(message: HostRequest): void {
  window.parent.postMessage(message, "*");
}

/** Subscribes to host messages and returns a cleanup function for Vue unmount. */
export function subscribeToPluginMessages(
  handler: PluginMessageHandler,
): () => void {
  const listener = (event: MessageEvent<PluginMessage>) => {
    if (event.source !== window.parent) return;
    handler(event.data);
  };

  window.addEventListener("message", listener);
  return () => window.removeEventListener("message", listener);
}

