import assert from "node:assert/strict";
import test from "node:test";
import { routineComponents } from "../src/lib/catalog";
import { recommendFromCatalog } from "../src/lib/recommendations";

test("running recommendations use the curated library and skip routines already in the profile", () => {
  const result = recommendFromCatalog("I want to build a running habit", {
    components: routineComponents,
    timeline: [{ id: "existing-run", componentId: "easy-run", scheduledFor: null, startTime: null, sourceCreatorId: null, timeZone: "UTC" }],
  });

  assert.equal(result.engine, "catalog");
  assert.ok(result.recommendations.length > 0);
  assert.ok(!result.recommendations.some((recommendation) => recommendation.componentId === "easy-run"));
  assert.ok(result.recommendations.some((recommendation) => recommendation.componentId === "bolt-fuel"));
  assert.ok(result.recommendations.every((recommendation) => routineComponents.some((component) => component.id === recommendation.componentId)));
});

test("sleep goals surface a smaller schedule and preparation choice", () => {
  const result = recommendFromCatalog("I want to sleep more consistently", { components: routineComponents, timeline: [] });
  assert.equal(result.recommendations[0]?.componentId, "sleep-window");
  assert.ok(result.recommendations.some((recommendation) => recommendation.componentId === "messi-prep"));
});
