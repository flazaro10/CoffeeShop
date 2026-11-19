import * as THREE from "three";

export function studioEnvironment(renderer) {
  const studio = new THREE.Scene();
  const box = new THREE.BoxGeometry();
  const panels = [
    [0.4, [0, 0, 0], [20, 20, 20], THREE.BackSide],
    [0.08, [0, -9.8, 0], [20, .2, 20]],
    [2.4, [0, 9.7, 0], [8, .2, 6]],
    [5, [-9.7, 2, 1.5], [.2, 10, 4]],
    [4, [9.7, 3, 1.5], [.2, 10, 3]],
    [1.7, [0, 4, 9.7], [12, 5, .2]],
    [2.3, [3, 6, -9.7], [9, 4, .2]],
  ];
  for (const [intensity, position, size, side = THREE.FrontSide] of panels) {
    const panel = new THREE.Mesh(box, new THREE.MeshBasicMaterial({
      color: new THREE.Color().setScalar(intensity),
      side,
    }));
    panel.position.fromArray(position);
    panel.scale.fromArray(size);
    studio.add(panel);
  }
  const generator = new THREE.PMREMGenerator(renderer);
  const target = generator.fromScene(studio, .03);
  generator.dispose();
  box.dispose();
  studio.children.forEach((mesh) => mesh.material.dispose());
  return target;
}

function coffeeTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 768;
  const ctx = canvas.getContext("2d");
  const crema = ctx.createRadialGradient(325, 300, 20, 384, 384, 440);
  crema.addColorStop(0, "#eea650");
  crema.addColorStop(.38, "#d98b3f");
  crema.addColorStop(.78, "#af5527");
  crema.addColorStop(1, "#69291b");
  ctx.fillStyle = crema;
  ctx.fillRect(0, 0, 768, 768);

  let seed = 9327;
  for (let i = 0; i < 12000; i++) {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    const x = seed % 768;
    const y = (seed >>> 11) % 768;
    ctx.fillStyle = i % 2 ? "#ffe4a321" : "#48201923";
    ctx.fillRect(x, y, 1 + i % 3, 1 + i % 2);
  }

  ctx.fillStyle = "#f7e3bd";
  ctx.strokeStyle = "#f7e3bd";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(384, 550);
  ctx.quadraticCurveTo(405, 405, 379, 228);
  ctx.stroke();

  for (let i = 0; i < 8; i++) {
    const y = 256 + i * 30;
    const width = 31 + Math.sin((i + 1) / 10 * Math.PI) * 127;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(385, y);
      ctx.bezierCurveTo(385 + side * width * .4, y - 55, 385 + side * width, y - 37, 385 + side * width, y - 9);
      ctx.bezierCurveTo(385 + side * width * .98, y + 13, 385 + side * width * .56, y - 17, 385, y + 11);
      ctx.fill();
    }
  }
  ctx.beginPath();
  ctx.moveTo(383, 248);
  ctx.bezierCurveTo(335, 224, 358, 190, 382, 215);
  ctx.bezierCurveTo(408, 183, 435, 224, 383, 248);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export function buildCoffee() {
  const model = new THREE.Group();
  const cup = new THREE.Group();
  const porcelain = new THREE.MeshPhysicalMaterial({
    color: "#303556", metalness: .15, roughness: .26, clearcoat: .85, clearcoatRoughness: .18,
  });
  const plateMaterial = porcelain.clone();
  plateMaterial.color.set("#252a43");
  const lathe = (points, material) => new THREE.Mesh(
    new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), 112), material,
  );
  const plate = lathe([
    [0,0], [.065,0], [.082,.001], [.093,.006], [.099,.012], [.099,.015],
    [.097,.017], [.091,.016], [.077,.011], [.054,.008], [.035,.007], [0,.007],
  ], plateMaterial);
  const body = lathe([
    [0,0], [.023,0], [.026,.002], [.032,.006], [.040,.012], [.047,.020],
    [.052,.031], [.055,.044], [.056,.054], [.056,.061], [.055,.064],
    [.0535,.065], [.052,.063], [.051,.054], [.049,.043], [.045,.031],
    [.039,.021], [.029,.012], [.016,.009], [0,.009],
  ], porcelain);
  const handleCurve = new THREE.CubicBezierCurve3(
    new THREE.Vector3(.051,.051,0), new THREE.Vector3(.107,.080,0),
    new THREE.Vector3(.098,.017,0), new THREE.Vector3(.041,.020,0),
  );
  const handle = new THREE.Mesh(new THREE.TubeGeometry(handleCurve, 54, .0068, 16), porcelain);
  const surface = new THREE.Mesh(new THREE.CircleGeometry(.0515, 96), new THREE.MeshPhysicalMaterial({
    map: coffeeTexture(), metalness: .02, roughness: .34, clearcoat: .3, clearcoatRoughness: .22,
  }));
  surface.rotation.x = -Math.PI / 2;
  surface.position.y = .056;
  cup.position.y = .008;
  cup.add(body, handle, surface);

  const beans = new THREE.Group();
  const roast = new THREE.MeshPhysicalMaterial({ color: "#723916", roughness: .34, clearcoat: .21 });
  const crease = new THREE.MeshStandardMaterial({ color: "#2c1712", roughness: .69 });
  const half = new THREE.SphereGeometry(1, 22, 14);
  const positions = [
    [-.076, .017, .017], [-.051, .015, .062], [-.025, .016, .075], [.052, .015, .057],
    [.083, .018, .021], [-.075, .017, -.038], [.057, .016, -.05], [.079, .019, -.042],
  ];
  const grains = positions.map((position, index) => {
    const grain = new THREE.Group();
    for (const side of [-1, 1]) {
      const kernel = new THREE.Mesh(half, roast);
      kernel.scale.set(.0034, .0037, .0068);
      kernel.position.set(side * .0019, 0, side * .00035);
      kernel.rotation.y = side * .11;
      grain.add(kernel);
    }
    const groove = new THREE.Mesh(half, crease);
    groove.scale.set(.00047, .00036, .0048);
    groove.position.y = .00325;
    grain.add(groove);
    grain.position.fromArray(position);
    grain.rotation.y = index * 2.4;
    beans.add(grain);
    return { grain, rest: grain.position.clone(), angle: grain.rotation.y };
  });

  model.add(plate, cup, beans);
  return { model, cup, plate, grains, surface };
}
