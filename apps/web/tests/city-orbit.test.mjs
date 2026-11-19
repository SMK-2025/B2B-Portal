import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  wrapCityIndex,
  cityOrbitSlots,
  cityDragPosition,
  cityOrbitPose,
  cityDragIntent,
  cityDragRelease,
  cityCaptureEnded,
} from "../src/app/lib/city-orbit.ts";
test("touch capture transferred from a child does not cancel the stage gesture",()=>{
  assert.equal(cityCaptureEnded(7,7,false),false);
  assert.equal(cityCaptureEnded(7,8,true),false);
  assert.equal(cityCaptureEnded(undefined,7,true),false);
  assert.equal(cityCaptureEnded(7,7,true),true);
  const source=readFileSync(new URL('../src/app/components/city-orbit.tsx',import.meta.url),'utf8');
  assert.match(source,/event.target===event.currentTarget/);
  assert.match(source,/current.id !== event.pointerId/);
});
test("horizontal swipes rotate, vertical gestures retain page scrolling, and taps do not advance",()=>{
  assert.equal(cityDragIntent(4,3),'pending');
  assert.equal(cityDragIntent(-25,7),'horizontal');
  assert.equal(cityDragIntent(8,36),'vertical');
  for(const width of [320,390,700,1440]) {
    const spacing=width<=700?width*.39:Math.min(width*.27,325);
    assert.equal(cityDragRelease(0,-50,spacing),1);
    assert.equal(cityDragRelease(0,50,spacing),-1);
    assert.equal(cityDragRelease(0,4,spacing),0);
    assert.equal(cityDragRelease(0,-3*spacing,spacing),3);
    assert.equal(wrapCityIndex(cityDragRelease(0,50,spacing),50),49);
  }
});
test("cards share one horizontal axis and equal side tilt", () => {
  for (const viewport of [390, 1440]) {
    for (const slot of [-2, -1, 0, 1, 2]) {
      assert.ok(cityOrbitPose(slot, viewport).transform.includes(", -50%,"));
    }
    assert.ok(cityOrbitPose(-1, viewport).transform.includes("rotateY(18deg)"));
    assert.ok(cityOrbitPose(-2, viewport).transform.includes("rotateY(18deg)"));
    assert.ok(cityOrbitPose(1, viewport).transform.includes("rotateY(-18deg)"));
    assert.ok(cityOrbitPose(2, viewport).transform.includes("rotateY(-18deg)"));
  }
});
test("drag advances repeatedly before release, in both directions and across wrap", () => {
  for (const dx of [-325, -650, -16250, 325, 650, 16250]) {
    const position = cityDragPosition(0, dx, 325);
    assert.equal(position.active, -dx / 325);
    assert.equal(position.fraction, 0);
  }
  assert.equal(cityDragPosition(0, -162.5, 325).fraction, -0.5);
  const before = cityOrbitPose(0.50001, 1400),
    after = cityOrbitPose(0.49999, 1400);
  assert.ok(Math.abs(before.zIndex - after.zIndex) <= 1);
  assert.ok(cityOrbitPose(0.25, 390).transform.includes("rotateY"));
});
test("city orbit wraps endlessly and keeps five distinct positions including clipped edges", () => {
  assert.equal(wrapCityIndex(-1, 50), 49);
  assert.equal(wrapCityIndex(50, 50), 0);
  assert.equal(wrapCityIndex(101, 50), 1);
  assert.equal(wrapCityIndex(1, 0), 0);
  assert.deepEqual(cityOrbitSlots(50), [-2, -1, 0, 1, 2]);
  for (let length = 0; length <= 50; length++)
    for (let active = 0; active < Math.max(1, length); active++) {
      const indices = cityOrbitSlots(length).map((slot) =>
        wrapCityIndex(active + slot, length),
      );
      assert.equal(new Set(indices).size, indices.length);
      assert.equal(indices.length, Math.min(5, length));
    }
});
test("orbit supports pointer dragging, wheel and keyboard without a scroll bar", () => {
  const source = readFileSync(
    new URL("../src/app/components/city-orbit.tsx", import.meta.url),
    "utf8",
  );
  for (const token of [
    "onPointerDown",
    "onPointerMove",
    "onPointerUp",
    "onPointerCancel",
    "ArrowRight",
    "wheel",
    "suppressClick",
  ])
    assert.ok(source.includes(token));
  const css = readFileSync(
    new URL("../src/app/components/city-orbit.css", import.meta.url),
    "utf8",
  );
  assert.match(css, /perspective:/);
  assert.match(css, /rotateY/);
  assert.doesNotMatch(css, /overflow-x:\s*(auto|scroll)/);
  assert.match(css, /touch-action:\s*pan-y/);
});
test("contribution preview explains equal access and network-specific additional reach", () => {
  const source = readFileSync(
    new URL(
      "../src/app/components/city-contribution-presentation.tsx",
      import.meta.url,
    ),
    "utf8",
  ).replace(/\s+/g, " ");
  for (const token of [
    "9,90",
    "zwölf",
    "genau dieses Stadtnetzwerks",
    "keine bessere persönliche Platzierung",
    "Beitragsvorschau",
    "19 %",
  ])
    assert.ok(source.includes(token), token);
  assert.match(source, /parseMonthlyContribution/);
});
