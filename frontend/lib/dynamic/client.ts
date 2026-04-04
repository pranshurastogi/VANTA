import { createDynamicClient } from '@dynamic-labs-sdk/client';
import { addEvmExtension } from '@dynamic-labs-sdk/evm';

let _client: ReturnType<typeof createDynamicClient> | null = null;

/**
 * Returns the singleton Dynamic JS SDK client.
 * Initialises it on first call (client-side only).
 * Registers the EVM extension immediately after creation as required by the SDK.
 */
export function getDynamicClient() {
  if (typeof window === 'undefined') return null;

  if (!_client) {
    _client = createDynamicClient({
      environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID!,
      metadata: {
        name: 'VANTA',
      },
    });

    // Must be registered immediately after createDynamicClient, before init completes
    addEvmExtension();
  }

  return _client;
}
