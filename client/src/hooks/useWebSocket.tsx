import { useEffect, useState } from 'react';

let _ws;

interface UseWebSocketConfig {
  url: string;
  onopen: () => void;
  onmessage: (event: MessageEvent) => void;
}

export const useWebSocket = (config: UseWebSocketConfig) => {
  const ws = (_ws = _ws ?? new WebSocket(config.url));
  const { url, ...configFunctions } = config;

  const functionKeys = Object.keys(configFunctions) as Array<
    keyof Omit<UseWebSocketConfig, 'url'>
  >;

  // bind all websocket functions passed into the hook, to the ws object
  functionKeys.forEach((key) => {
    ws[key] = configFunctions[key];
  });

  return ws;
};
