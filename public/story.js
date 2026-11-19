import * as THREE from "three";
import { buildCoffee, studioEnvironment } from "./coffee-model.js";
import { buildSilk } from "./silk.js";

const root = document.documentElement;
const story = document.querySelector(".story");
const header = document.querySelector(".story-nav");
const chapters = [...story.querySelectorAll(".chapter")];
const copies = chapters.map((chapter) => chapter.querySelector(".chapter-copy"));
const navLinks = [...header.querySelectorAll("nav a")];
const motion = matchMedia("(prefers-reduced-motion: reduce)");
const mobile = matchMedia("(max-width: 760px)");
const canvas = document.querySelector("#gl");

function dismissLoader(animate) {
  clearTimeout(window.storyFallback);
  const loader = document.querySelector("#loader");
  if (animate) {
    loader?.classList.add("out");
    loader?.addEventListener("transitionend", () => loader.remove(), { once: true });
    setTimeout(() => loader?.remove(), 1500);
  } else {
    loader?.remove();
  }
  root.classList.remove("loading");
}

function updateHeader(active, inStore) {
  header.classList.toggle("is-shop", inStore);
  for (const link of navLinks) {
    if (link.hash === active) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  }
}

const smooth = (value) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

function setup() {
  let renderer;
  try {
    if (!window.WebGL2RenderingContext) throw Error("WebGL 2 no disponible");
    const context = canvas.getContext("webgl2", { antialias: true });
    if (!context) throw Error("WebGL 2 no disponible");
    renderer = new THREE.WebGLRenderer({ canvas, context, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.autoClear = false;
  } catch {
    dismissLoader(false);
    return;
  }

  const scene = new THREE.Scene();
  const environment = studioEnvironment(renderer);
  scene.environment = environment.texture;
  const coffee = buildCoffee();
  scene.add(coffee.model);
  const camera = new THREE.PerspectiveCamera(23, 1, .005, 10);
  const stage = new THREE.Scene();
  const stageCamera = new THREE.PerspectiveCamera(38, 1, .1, 200);
  const uniforms = buildSilk(THREE, stage);

  const colors = (values) => values.map((value) => new THREE.Color(value).toArray());
  const worlds = [
    ["#070a14","#394269","#0a0f20","#26335b","#65739d","#c3c9e6"],
    ["#080912","#30365a","#0b1023","#29304c","#61709b","#b9c4e4"],
    ["#0d0b16","#594054","#1d1324","#594055","#977a93","#d7b5d4"],
    ["#090a18","#353368","#101022","#373160","#797cab","#d1cdff"],
    ["#060911","#28334f","#101629","#273652","#637da6","#cbd8ff"],
    ["#090910","#443951","#161224","#4a3555","#947a9f","#e0c4ec"],
    ["#060813","#393c67","#11142b","#303762","#7882ad","#d1d8ef"],
    ["#070b16","#353e5f","#0d1223","#313f62","#6e82a5","#bfcff0"],
    ["#07081a","#3b3b70","#11112a","#2b2f63","#7279ab","#dcd9ff"],
  ].map(colors);
  // Distance, azimuth, elevation, screen offsets, and the cup, saucer and grain poses.
  const shots = [
    [.67, 8, 36, -.095, .01, -.28, .06, 0, 0],
    [.55, 46, 38, -.096, 0, -.08, .08, .021, .4],
    [.61, 65, 51, 0, -.087, .30, .04, .038, 1],
    [.56, -38, 55, .099, 0, -.10, .01, .045, .34],
    [.56, 10, 61, -.093, 0, .48, .02, .012, .12],
    [.46, -18, 64, .094, 0, -.35, .01, 0, 0],
    [.65, 115, 26, 0, -.085, -.05, .045, .005, 0],
    [.65, 30, 40, -.098, 0, .44, .045, .015, .30],
    [.64, -12, 38, .092, 0, -.22, .055, 0, 0],
  ];
  const shot = new Float64Array(shots[0].length);
  const stageViews = [
    [0,3.3,9.5,0,2.3,0], [-3.2,2.7,7.2,-.6,2.6,-2], [.5,4.8,8.2,0,1,-3],
    [2.5,3,8.5,.5,2.6,-1], [0,2.2,9,0,1.6,0], [3.6,2.9,8.6,1.2,2.1,-1],
    [-2.5,2.6,7.5,-.5,2.8,-2], [0,6.4,6.2,0,1.4,-3], [-1.6,2.2,9.6,.4,3.6,0],
  ];
  const worldsUniforms = [uniforms.uSkyA, uniforms.uSkyB, uniforms.uDeep, uniforms.uMid, uniforms.uPale, uniforms.uSheen];
  const projected = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  const target = new THREE.Vector3();
  const callouts = [...document.querySelectorAll(".detail")].map((element) => ({
    element,
    chapter: +element.dataset.chapter,
    anchor: element.dataset.part === "bean" ? coffee.grains[4].grain : coffee.surface,
  }));
  let offsets;
  let storeOffset;
  let guideOffset;
  let headerHeight;
  let width;
  let height;
  let scroll = window.scrollY;
  let p = 0;
  let lastHeader = "";
  let lastTime = performance.now();
  let intro = 1;
  let renderedScroll;
  let renderedCopyProgress;
  let previousReduced;

  function resize() {
    headerHeight = header.offsetHeight;
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = stageCamera.aspect = width / height;
    camera.updateProjectionMatrix();
    stageCamera.updateProjectionMatrix();
    offsets = chapters.map((chapter) => chapter.getBoundingClientRect().top + window.scrollY);
    storeOffset = story.getBoundingClientRect().bottom + window.scrollY;
    guideOffset = document.querySelector("#madrid").getBoundingClientRect().top + window.scrollY;
    scroll = window.scrollY;
    renderedScroll = undefined;
  }

  function progress() {
    const index = offsets.findIndex((top, i) => i > 0 && scroll < top);
    if (index < 0) return offsets.length - 1;
    return index - 1 + Math.max(0, scroll - offsets[index - 1]) / (offsets[index] - offsets[index - 1]);
  }

  function frame(now) {
    const dt = Math.max(0, Math.min(.05, (now - lastTime) / 1000));
    lastTime = now;
    const reduced = motion.matches;
    const motionChanged = previousReduced !== reduced;
    previousReduced = reduced;
    const inStore = scroll >= storeOffset - headerHeight - 1;
    const next = progress();
    const active = inStore ? (scroll >= guideOffset - headerHeight - 1 ? "#madrid" : "#cafes") : "#" + chapters[Math.round(next)].id;
    if (lastHeader !== active) {
      lastHeader = active;
      updateHeader(active, inStore);
      if (inStore) callouts.forEach(({ element }) => { element.style.opacity = 0; });
    }
    if (inStore) {
      p = next;
      intro = 1;
      renderedScroll = undefined;
      return;
    }
    if (reduced && !motionChanged && renderedScroll === scroll) return;
    renderedScroll = reduced ? scroll : undefined;

    p = reduced ? next : THREE.MathUtils.damp(p, next, 5.5, dt);
    if (Math.abs(p - next) < .0001) p = next;
    intro = reduced ? 1 : Math.min(1, intro + dt / 2.2);
    const entrance = 1 - smooth(intro);
    const time = reduced ? 0 : now / 1000;
    const from = Math.floor(p);
    const to = Math.min(from + 1, shots.length - 1);
    const t = smooth(p - from);
    const read = (a, b) => THREE.MathUtils.lerp(a, b, t);
    shot.forEach((_, i) => { shot[i] = read(shots[from][i], shots[to][i]); });
    const [distance, azimuth, elevation, x, y, rotation, tilt, lift, spread] = shot;
    const aspect = camera.aspect;
    const portrait = aspect < 1;
    const d = distance * Math.min(Math.max(1, (portrait ? 1.04 : 1.3) / aspect), 2.4) * (1 + entrance ** 2 * .5);
    const az = THREE.MathUtils.degToRad(azimuth + entrance * 18);
    const el = THREE.MathUtils.degToRad(elevation);
    direction.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    right.set(Math.cos(az), 0, -Math.sin(az));
    up.crossVectors(direction, right);
    target.set(0, .037 + lift * .35, 0);
    target.addScaledVector(right, portrait ? 0 : x * Math.min(1, aspect / 1.6) * d);
    target.addScaledVector(up, (portrait ? -.084 : y) * d);
    camera.position.copy(target).addScaledVector(direction, d);
    camera.lookAt(target);
    camera.updateMatrixWorld();

    coffee.model.rotation.y = rotation;
    coffee.cup.rotation.x = tilt;
    coffee.cup.position.y = .008 + lift + entrance * .012 + Math.sin(time * 1.25) * .0013 * Math.min(1, lift * 30);
    coffee.plate.position.y = -lift * .13;
    coffee.grains.forEach(({ grain, rest, angle }, i) => {
      const bob = reduced ? 0 : Math.sin(time * 1.6 + i * 1.3) * .0028 * spread;
      grain.position.set(rest.x * (1 + .30 * spread), rest.y + spread * (.017 + i % 3 * .012) + bob, rest.z * (1 + .22 * spread));
      grain.rotation.set(spread * (i % 3 - 1), angle + spread * i * .45, spread * .36);
    });

    const cameraAt = (i) => read(stageViews[from][i], stageViews[to][i]);
    stageCamera.position.set(cameraAt(0) + Math.sin(time * .11) * .18, cameraAt(1), cameraAt(2) + entrance * 2.5);
    stageCamera.lookAt(cameraAt(3), cameraAt(4), cameraAt(5));
    uniforms.uTime.value = time;
    uniforms.uPhase.value = p * 2.8;
    uniforms.uAmp.value = .75 + .4 * Math.sin(p * .64) ** 2;
    uniforms.uFreq.value = .85 + .29 * Math.sin(p * .84) ** 2;
    worldsUniforms.forEach(({ value }, i) => {
      const a = worlds[from][i];
      const b = worlds[to][i];
      value.setRGB(read(a[0], b[0]), read(a[1], b[1]), read(a[2], b[2]));
    });

    renderer.clear();
    renderer.render(stage, stageCamera);
    renderer.clearDepth();
    renderer.render(scene, camera);

    if (renderedCopyProgress !== p || motionChanged) {
      renderedCopyProgress = p;
      copies.forEach((copy, index) => {
        const local = p - index;
        const opacity = (index === 0 ? 1 : smooth((local + .50) / .32)) *
          (index === copies.length - 1 ? 1 : 1 - smooth((local - .36) / .22));
        copy.style.opacity = opacity.toFixed(3);
        copy.style.transform = reduced ? "" : `translateY(${(1 - opacity) * (local < .2 ? 26 : -26)}px)`;
        copy.style.pointerEvents = opacity > .5 ? "" : "none";
      });
    }

    if (mobile.matches) return;
    for (const { element, chapter, anchor } of callouts) {
      const local = p - chapter;
      const opacity = smooth((local + .12) / .12) * (1 - smooth((local - .32) / .12));
      if (!opacity) {
        element.style.opacity = 0;
        continue;
      }
      anchor.getWorldPosition(projected).project(camera);
      const x = (.5 + .5 * projected.x) * width;
      const y = (.5 - .5 * projected.y) * height;
      element.style.transform = `translate(${x}px, ${y}px)`;
      element.style.opacity = x > 0 && x < width - 150 && y > 72 && y < height && Math.abs(projected.z) < 1 ? opacity : 0;
    }
  }

  function onScroll() {
    scroll = window.scrollY;
  }

  const fragment = document.getElementById(location.hash.slice(1));
  const restoredAtFragment = fragment && Math.abs(fragment.getBoundingClientRect().top) <= header.offsetHeight + 2;
  root.classList.add("has-gl");
  // Stretch the chapters before resolving an incoming fragment.
  if (fragment && (scrollY < 1 || restoredAtFragment)) fragment.scrollIntoView({ behavior: "instant" });
  resize();
  p = progress();
  intro = motion.matches || scroll > 10 ? 1 : 0;
  if (!intro) {
    root.classList.add("entering");
    setTimeout(() => root.classList.remove("entering"), 1400);
  }
  canvas.addEventListener("webglcontextlost", () => {
    renderer.setAnimationLoop(null);
    removeEventListener("scroll", onScroll);
    removeEventListener("resize", resize);
    root.classList.remove("has-gl", "entering");
    copies.forEach((copy) => {
      copy.style.removeProperty("opacity");
      copy.style.removeProperty("transform");
      copy.style.removeProperty("pointer-events");
    });
    header.classList.remove("is-shop");
    dismissLoader(false);
  }, { once: true });
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", resize);
  frame(performance.now());
  dismissLoader(!motion.matches);
  renderer.setAnimationLoop(frame);
}

setup();
