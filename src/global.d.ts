export {};

declare global {
  interface Window {
    customFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  }
}
