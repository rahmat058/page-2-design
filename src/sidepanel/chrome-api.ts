import { createMessage, createRequestId, parseMessage } from '../shared/messages';
import type { ExtensionMessage } from '../shared/messages';

export async function sendRuntime(message: {
  type: ExtensionMessage['type'];
  requestId: string;
  scanId?: string;
  payload?: unknown;
}): Promise<ExtensionMessage | null> {
  const payload = createMessage({ ...message, requestId: message.requestId || createRequestId() });
  const response = await chrome.runtime.sendMessage(payload);
  return parseMessage(response);
}

export function onRuntimeMessage(handler: (message: ExtensionMessage) => void): () => void {
  const listener = (raw: unknown) => {
    const message = parseMessage(raw);
    if (message) handler(message);
  };
  chrome.runtime.onMessage.addListener(listener);
  return () => chrome.runtime.onMessage.removeListener(listener);
}
