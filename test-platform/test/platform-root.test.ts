import { strictEqual } from "node:assert";
import { test } from "node:test";

import { BVP_TEST_PLATFORM_NONSHIPPING_SENTINEL } from "../src/platform-root";

test("platform root exposes the non-shipping sentinel", () => {
  strictEqual(
    BVP_TEST_PLATFORM_NONSHIPPING_SENTINEL,
    "BVP_TEST_PLATFORM_NONSHIPPING_SENTINEL",
  );
});
