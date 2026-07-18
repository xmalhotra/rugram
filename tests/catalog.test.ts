import assert from "node:assert/strict";
import test from "node:test";
import { creatorProfiles, initialPublications, routineComponents } from "../src/lib/catalog";

test("central routine components have unique IDs and attributable sources", () => {
  const ids = routineComponents.map((component) => component.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const component of routineComponents) {
    assert.match(component.sourceUrl, /^https:\/\//);
    assert.ok(component.sourceLabel.length > 0);
    assert.equal(component.evidenceLevel, "reported");
  }
});

test("every public creator publication points to a central component", () => {
  const ids = new Set(routineComponents.map((component) => component.id));
  const creatorIds = new Set(creatorProfiles.map((creator) => creator.id));
  for (const publications of Object.values(initialPublications)) {
    for (const publication of publications) {
      assert.ok(creatorIds.has(publication.creatorId));
      assert.ok(ids.has(publication.componentId));
      assert.match(publication.startTime, /^\d{2}:\d{2}$/);
    }
  }
});
