const PROVIDER_TIMEOUT_MS = 10_000;

export function providerFetch(
  input: Parameters<typeof fetch>[0],
  init: Parameters<typeof fetch>[1] = {},
): Promise<Response> {
  return fetch(input, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
}
