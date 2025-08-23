import {
  defaultShouldDehydrateQuery,
  isServer,
  MutationCache,
  QueryClient,
} from "@tanstack/react-query";

// copied from this: https://github.com/TanStack/query/issues/8277#issuecomment-2533437804
// To fix nextjs's DynamicIO: true error
export class MutationCache_TEMP_FIX extends MutationCache {
  constructor() {
    const old = Date.now;
    Date.now = () => Math.round(performance.timeOrigin + performance.now());
    super();
    Date.now = old;
  }
}

function makeQueryClient() {
  return new QueryClient({
    mutationCache: new MutationCache_TEMP_FIX(),
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
      dehydrate: {
        // include pending queries in dehydration
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
  if (isServer) {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    // This is very important, so we don't re-make a new client if React
    // suspends during the initial render. This may not be needed if we
    // have a suspense boundary BELOW the creation of the query client
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}
