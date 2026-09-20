/** Adapter template only: not registered and not a working integration. */
export function createExampleProvider(client) {
  return {
    id: 'example', name: 'My workspace',
    async status() { return {connected: false, name: '', openId: '', status: 'not_configured'}; },
    async search({query}) {
      // Authenticate to your chosen platform and map the results to {id,name}.
      throw new Error('Implement read-only conversation search');
    },
    async messages({chat,count=50}) {
      // Apply platform access rules and pagination, then return normalized messages.
      // See docs/EXTENDING.md. Do not register this template before implementing it.
      throw new Error('Implement read-only message retrieval');
    },
  };
}
