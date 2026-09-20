import {createFeishuProvider} from './feishu.mjs';

export function createProviders(runCli) {
  // Register additional read-only adapters here; the HTTP routes are shared.
  const providers=[createFeishuProvider(runCli)];
  return new Map(providers.map(provider=>[provider.id,provider]));
}
