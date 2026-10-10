import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequestId } from "../lib/request-id.ts";

test("HTTP browser without randomUUID can create valid unique request IDs", () => {
  const httpCrypto = { getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto) };
  const ids = Array.from({ length: 100 }, () => createRequestId(httpCrypto));
  assert.equal(new Set(ids).size, 100);
  for (const id of ids) assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
