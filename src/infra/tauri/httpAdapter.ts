import { fetch } from "@tauri-apps/plugin-http";
import type { HttpPort, HttpRequestOptions } from "../../ports/HttpPort";

async function request(url: string, options?: HttpRequestOptions): Promise<Response> {
  const response = await fetch(url, {
    method: options?.method ?? "GET",
    headers: options?.headers,
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
  }
  return response;
}

export function createHttpAdapter(): HttpPort {
  return {
    async getJson<T>(url: string, options?: HttpRequestOptions): Promise<T> {
      const response = await request(url, options);
      return (await response.json()) as T;
    },
    async getBytes(url: string, options?: HttpRequestOptions): Promise<Uint8Array> {
      const response = await request(url, options);
      const buffer = await response.arrayBuffer();
      return new Uint8Array(buffer);
    },
  };
}
