import {createFeishuProvider} from './feishu.mjs';
import {createWecomProvider} from './wecom.mjs';

export function createProviders(runCli, options={}) {
  // Register additional read-only adapters here; the HTTP routes are shared.
  const providers=[createFeishuProvider(runCli),createWecomProvider(options.wecom)];
  return new Map(providers.map(provider=>[provider.id,provider]));
}
