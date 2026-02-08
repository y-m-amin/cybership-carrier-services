import nock from "nock";
import { afterAll, afterEach, beforeAll } from "vitest";

beforeAll(() => {
  nock.disableNetConnect();
});

afterEach(() => {
  // if any mocks were not used, fail fast
  if (!nock.isDone()) {
    const pending = nock.pendingMocks();
    nock.cleanAll();
    throw new Error(`Not all nock interceptors were used:\n${pending.join("\n")}`);
  }
  nock.cleanAll();
});

afterAll(() => {
  nock.enableNetConnect();
});
