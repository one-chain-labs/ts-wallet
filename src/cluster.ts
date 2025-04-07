const endpoint = {
  http: {
    devnet: 'http://hchain-api-server-svc.dev.svc.cluster.local:8080',
    testnet: '',
    mainnet: '',
  },
  https: {
    devnet: 'https://api.devnet.solana.com',
    testnet: '',
    mainnet: '',
  },
};

export type Cluster = 'devnet' | 'testnet' | 'mainnet';

/**
 * Retrieves the HTTP API URL for the specified cluster
 * @param {Cluster} [cluster="devnet"] - The cluster name of the HTTP API URL to use. Possible options: 'devnet' | 'testnet' | 'mainnet'
 * @param {boolean} [tls="http"] - Use TLS when connecting to cluster.
 *
 * @returns {string} URL string of the http endpoint
 */
export function clusterApiUrl(cluster?: Cluster, tls?: boolean): string {
  const key = tls === false ? 'http' : 'https';

  if (!cluster) {
    return endpoint[key]['devnet'];
  }

  const url = endpoint[key][cluster];
  if (!url) {
    throw new Error(`Unknown ${key} cluster: ${cluster}`);
  }
  return url;
}
