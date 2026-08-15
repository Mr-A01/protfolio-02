/**
 * Living black-hole — MUST visibly spin every frame
 * Fixed version: keyframes sorted, proper interpolation, always spinning
 */

let scene, camera, renderer;
let blackHole, disk, particles, stars, photonRing, glowSprite;
let clock;
let mouse = { x: 0, y: 0 };
let targetMouse = { x: 0, y: 0 };
let isVisible = true;
let animationId = null;
let progress = 0;
let smoothProgress = 0;
let rotY = 0;
let diskRot = 0;

// Keyframes sorted by p (progress) ascending
// First keyframe p=0 is the starting view, last p=1 is the ending view
const KF = [
  { p: 0.00, cam: [10, .5, 5], look: [10, 0, 0], fov: 50, bh: [10, -2, 1], sc: 1.1, sp: 1.2, dop: 0.85, fog: 0.024 },
  { p: 0.12, cam: [5.5, 0.5, 8.2], look: [-2.5, 0, 0], fov: 45, bh: [-4.0, -0.7, 0.2], sc: 1.3, sp: 1.4, dop: 0.95, fog: 0.016 },
  { p: 0.24, cam: [3.8, 1.0, 7.4], look: [-1.6, 0.1, 0], fov: 44, bh: [-3.0, -0.7, 0], sc: 1.22, sp: 1.5, dop: 0.95, fog: 0.014 },
  { p: 0.36, cam: [2.2, 1.7, 6.8], look: [-0.8, -0.1, 0], fov: 42, bh: [-2.4, -0.7, 0], sc: 1.35, sp: 1.6, dop: 1.0, fog: 0.012 },
  { p: 0.48, cam: [0.1, 0.15, 4.0], look: [0, 0, -0.4], fov: 38, bh: [0, -.5, 1.3], sc: 1.6, sp: 2.0, dop: 1.0, fog: 0.009 },
  { p: 0.60, cam: [-2.8, 0.5, 6.4], look: [1.3, 0, 0], fov: 43, bh: [2.6,- 0.6, -0.15], sc: 1.25, sp: 1.5, dop: 0.9, fog: 0.013 },
  { p: 0.72, cam: [-3.8, 0.75, 6.8], look: [1.9, 0, 0], fov: 45, bh: [3.4, -0.65, 0.1], sc: 1.12, sp: 1.3, dop: 0.8, fog: 0.016 },
  { p: 0.84, cam: [1.6, 0.3, 7.2], look: [-0.6, 0, 0], fov: 46, bh: [-2.0, -0.58, 0], sc: 1.05, sp: 1.1, dop: 0.7, fog: 0.02 },
  { p: 1.00, cam: [2.8, 0.25, 7.0], look: [-1.1, 0, 0], fov: 47, bh: [-2.8, -0.58, 0], sc: 0.95, sp: 0.9, dop: 0.55, fog: 0.024 },
];

// State object (interpolated values)
const S = {
  cam: [...KF[0].cam], look: [...KF[0].look], fov: KF[0].fov,
  bh: [...KF[0].bh], sc: KF[0].sc, sp: KF[0].sp, dop: KF[0].dop, fog: KF[0].fog,
};

export function setGlobalProgress(p) {
  progress = Math.max(0, Math.min(1, Number(p) || 0));
}

export function setSectionState() {
  // placeholder for external state
}

export function initThreeScene(canvas) {
  if (typeof THREE === "undefined") {
    console.error("[scene] THREE is not loaded");
    return null;
  }

  clock = new THREE.Clock();
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x020208, 0.024);

  const w = window.innerWidth || 1280;
  const h = window.innerHeight || 720;
  camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 120);
  camera.position.set(0, 0.3, 11);

  const mobile = isMobile();

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !mobile,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setSize(w, h, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.4 : 2));
  renderer.setClearColor(0x020208, 1);

  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";

  // Lighting
  scene.add(new THREE.AmbientLight(0x12101c, 0.7));
  const key = new THREE.PointLight(0xb5a8e0, 2.8, 42, 2);
  key.position.set(4, 3, 6);
  scene.add(key);
  const fill = new THREE.PointLight(0x3a3560, 1.0, 30, 2);
  fill.position.set(-5, -2, 3);
  scene.add(fill);

  try {
    buildBlackHole(mobile);
    buildDisk(mobile);
    buildPhotonRing(mobile);
    buildParticles(mobile);
    buildStars(mobile);
  } catch (err) {
    console.error("[scene] build failed", err);
    window.__bh = { status: "build-error", error: String(err) };
    buildFallback();
  }

  window.addEventListener("resize", onResize, { passive: true });
  window.addEventListener("mousemove", onMouse, { passive: true });
  document.addEventListener("visibilitychange", () => {
    isVisible = !document.hidden;
    if (isVisible && !animationId) tick();
  });

  // External scroll progress (if parent sets it)
  window.__scrollProgress = window.__scrollProgress ?? 0;

  console.info("[scene] ready");
  window.__bh = { status: "ready" };
  tick();
  return { scene, camera, renderer };
}

// ---------- Fallback if build fails ----------
function buildFallback() {
  const mesh = new THREE.Mesh(
    new THREE.TorusGeometry(1.5, 0.15, 16, 48),
    new THREE.MeshBasicMaterial({ color: 0x9b8ec8, wireframe: true })
  );
  blackHole = mesh;
  scene.add(mesh);
}

// ---------- Build black hole ----------
function buildBlackHole(mobile) {
  const g = new THREE.Group();
  const seg = mobile ? 48 : 80;

  // Solid core
  g.add(new THREE.Mesh(
    new THREE.SphereGeometry(0.75, seg, seg),
    new THREE.MeshBasicMaterial({ color: 0x000000 })
  ));

  // Bright rim (basic)
  const rim = new THREE.Mesh(
    new THREE.SphereGeometry(0.78, seg, seg),
    new THREE.MeshBasicMaterial({
      color: 0xd8d0f0,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.BackSide,
    })
  );
  g.add(rim);

  // Outer glow shells
  const shell1 = new THREE.Mesh(
    new THREE.SphereGeometry(1.15, 32, 32),
    new THREE.MeshBasicMaterial({
      color: 0x7c6bb0,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.BackSide,
    })
  );
  g.add(shell1);

  const shell2 = new THREE.Mesh(
    new THREE.SphereGeometry(1.55, 24, 24),
    new THREE.MeshBasicMaterial({
      color: 0x3d3558,
      transparent: true,
      opacity: 0.1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.BackSide,
    })
  );
  g.add(shell2);

  // Shader rim (premium)
  try {
    const edgeMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0xf2eaff) } },
      vertexShader: `
        varying vec3 vN;
        void main() {
          vN = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        varying vec3 vN;
        void main() {
          float fres = pow(1.0 - abs(dot(vN, vec3(0.0, 0.0, 1.0))), 4.0);
          float band = smoothstep(0.1, 0.5, fres) * smoothstep(0.95, 0.55, fres);
          float pulse = 0.8 + 0.2 * sin(uTime * 1.5);
          gl_FragColor = vec4(uColor * band * pulse * 2.4, band * 0.95);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const edge = new THREE.Mesh(new THREE.SphereGeometry(0.77, seg, seg), edgeMat);
    g.add(edge);
    g.userData.edgeMat = edgeMat;
  } catch (e) {
    console.warn("[scene] shader rim skipped", e);
  }

  blackHole = g;
  scene.add(blackHole);
}

// ---------- Build accretion disk ----------
function buildDisk(mobile) {
  let mat;
  try {
    mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uOp: { value: 0.9 } },
      vertexShader: `
        varying vec3 vP;
        void main() {
          vP = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uOp;
        varying vec3 vP;
        void main() {
          float d = length(vP.xy);
          float n = (d - 0.95) / (3.2 - 0.95);
          float radial = smoothstep(0.0, 0.06, n) * smoothstep(1.0, 0.38, n);
          float angle = atan(vP.y, vP.x);
          float spiral = 0.65 + 0.35 * sin(angle * 7.0 - uTime * 2.4 + n * 9.0);
          float arm = 0.75 + 0.25 * sin(angle * 2.5 - uTime * 1.1);
          vec3 inner = vec3(0.9, 0.82, 1.0);
          vec3 mid   = vec3(0.6, 0.42, 0.9);
          vec3 outer = vec3(0.18, 0.12, 0.32);
          vec3 col = mix(inner, mid, smoothstep(0.0, 0.3, n));
          col = mix(col, outer, smoothstep(0.25, 1.0, n));
          gl_FragColor = vec4(col, radial * spiral * arm * uOp);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  } catch (e) {
    // Fallback
    mat = new THREE.MeshBasicMaterial({
      color: 0x9b8ec8,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }

  disk = new THREE.Mesh(
    new THREE.RingGeometry(0.95, 3.2, mobile ? 96 : 160, 1),
    mat
  );
  disk.rotation.x = Math.PI * 0.5;
  if (mat.uniforms) blackHole.userData.diskMat = mat;
  scene.add(disk);
}

// ---------- Photon ring ----------
function buildPhotonRing(mobile) {
  photonRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.88, 0.018, 12, mobile ? 64 : 100),
    new THREE.MeshBasicMaterial({
      color: 0xe8e0ff,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  photonRing.rotation.x = Math.PI * 0.5;
  scene.add(photonRing);
}

// ---------- Particles ----------
function buildParticles(mobile) {
  const count = mobile ? 220 : 520;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const base = new THREE.Color(0xb0a0e0);

  for (let i = 0; i < count; i++) {
    const r = 2.3 + Math.random() * 6.2;
    const theta = Math.random() * Math.PI * 2;
    const phi = (Math.random() - 0.5) * 0.35;
    pos[i * 3] = r * Math.cos(theta) * Math.cos(phi);
    pos[i * 3 + 1] = r * Math.sin(phi);
    pos[i * 3 + 2] = r * Math.sin(theta) * Math.cos(phi);
    const v = 0.4 + Math.random() * 0.6;
    col[i * 3] = base.r * v;
    col[i * 3 + 1] = base.g * v;
    col[i * 3 + 2] = base.b * v;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));

  particles = new THREE.Points(geo, new THREE.PointsMaterial({
    size: mobile ? 0.032 : 0.028,
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  }));
  scene.add(particles);
}

// ---------- Stars ----------
function buildStars(mobile) {
  const count = mobile ? 450 : 1100;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 25 + Math.random() * 55;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    pos[i * 3 + 2] = r * Math.cos(phi);
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  stars = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 0.05,
    color: 0xc8c0d8,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
    sizeAttenuation: true,
  }));
  scene.add(stars);
}

// ---------- Helpers ----------
function isMobile() {
  return (window.innerWidth || 0) < 768 || "ontouchstart" in window;
}

function lerp(a, b, t) { return a + (b - a) * t; }
function lerp3(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }

// Sample keyframes with smoothstep interpolation
function sample(p) {
  // Clamp p to [0,1]
  p = Math.max(0, Math.min(1, p));
  let i = 0;
  while (i < KF.length - 1 && KF[i + 1].p < p) i++;
  const a = KF[i];
  const b = KF[Math.min(i + 1, KF.length - 1)];
  const span = b.p - a.p || 1;
  let t = (p - a.p) / span;
  t = t * t * (3 - 2 * t); // smoothstep

  return {
    cam: lerp3(a.cam, b.cam, t),
    look: lerp3(a.look, b.look, t),
    fov: lerp(a.fov, b.fov, t),
    bh: lerp3(a.bh, b.bh, t),
    sc: lerp(a.sc, b.sc, t),
    sp: lerp(a.sp, b.sp, t),
    dop: lerp(a.dop, b.dop, t),
    fog: lerp(a.fog, b.fog, t),
  };
}

// ---------- Event handlers ----------
function onMouse(e) {
  targetMouse.x = (e.clientX / (window.innerWidth || 1)) * 2 - 1;
  targetMouse.y = -(e.clientY / (window.innerHeight || 1)) * 2 + 1;
}

function onResize() {
  if (!camera || !renderer) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile() ? 1.4 : 2));
}

// ---------- Main animation loop ----------
function tick() {
  if (!isVisible) {
    animationId = null;
    return;
  }
  animationId = requestAnimationFrame(tick);
  if (!renderer || !scene || !camera) return;

  // Use performance.now for reliable delta
  const time = performance.now() / 1000;
  const dt = Math.min(1 / 60, 0.05); // fixed 60fps step to avoid jitter

  // Read external scroll progress
  if (typeof window.__scrollProgress === "number") {
    progress = Math.max(0, Math.min(1, window.__scrollProgress));
  }
  smoothProgress = lerp(smoothProgress, progress, Math.min(1, dt * 6));

  // Mouse smoothing
  mouse.x = lerp(mouse.x, targetMouse.x, 0.07);
  mouse.y = lerp(mouse.y, targetMouse.y, 0.07);

  // Breathing
  const breath = 1 + Math.sin(time * 0.7) * 0.03 + Math.sin(time * 0.35) * 0.015;

  // Sample keyframes
  const T = sample(smoothProgress);
  const k = Math.min(1, dt * 8);

  // Interpolate state
  S.cam = lerp3(S.cam, T.cam, k);
  S.look = lerp3(S.look, T.look, k);
  S.fov = lerp(S.fov, T.fov, k);
  S.bh = lerp3(S.bh, T.bh, k);
  S.sc = lerp(S.sc, T.sc, k);
  S.sp = lerp(S.sp, T.sp, k);
  S.dop = lerp(S.dop, T.dop, k);
  S.fog = lerp(S.fog, T.fog, k);

  // Update camera
  camera.position.set(
    S.cam[0] + mouse.x * 0.45 + Math.sin(time * 0.15) * 0.05,
    S.cam[1] + mouse.y * 0.28 + Math.cos(time * 0.12) * 0.04,
    S.cam[2]
  );
  camera.lookAt(S.look[0], S.look[1], S.look[2]);
  if (Math.abs(camera.fov - S.fov) > 0.02) {
    camera.fov = S.fov;
    camera.updateProjectionMatrix();
  }

  // ---------- ALWAYS-ON SPIN (visible every frame) ----------
  const spinSpeed = Math.max(1.0, S.sp * .5); // increased base speed
  rotY += spinSpeed * dt;
  diskRot += spinSpeed * 1.4 * dt;

  // Black hole position & scale
  const bx = S.bh[0] + mouse.x * 0.1;
  const by = S.bh[1] + mouse.y * 0.06;
  const bz = S.bh[2];
  const sc = S.sc * breath;

  if (blackHole) {
    blackHole.position.set(bx, by, bz);
    blackHole.scale.setScalar(sc);
    // Rotate: slight tilt + continuous Y spin
    blackHole.rotation.set(
      Math.sin(time * 0.15) * 0.08,
      rotY,
      Math.cos(time * 0.11) * 0.04
    );
    if (blackHole.userData.edgeMat) {
      blackHole.userData.edgeMat.uniforms.uTime.value = time;
    }
  }

  // Disk
  if (disk) {
    disk.position.set(bx, by, bz);
    disk.scale.setScalar(sc);
    disk.rotation.x = Math.PI * 0.5;
    disk.rotation.z = diskRot;
    const dm = blackHole?.userData?.diskMat;
    if (dm?.uniforms) {
      dm.uniforms.uTime.value = time;
      dm.uniforms.uOp.value = Math.max(0.5, S.dop);
    }
  }

  // Photon ring
  if (photonRing) {
    photonRing.position.set(bx, by, bz);
    photonRing.scale.setScalar(sc);
    photonRing.rotation.x = Math.PI * 0.5;
    photonRing.rotation.z = -diskRot * 0.7;
    photonRing.material.opacity = 0.4 + S.dop * 0.3;
  }

  // Particles
  if (particles) {
    particles.position.set(bx, by, bz);
    particles.rotation.y = rotY * 0.4;
    particles.rotation.x = Math.sin(time * 0.08) * 0.05;
  }

  // Stars
  if (stars) {
    stars.rotation.y = time * 0.008;
    stars.rotation.x = Math.sin(time * 0.03) * 0.015;
  }

  // Fog
  if (scene.fog) scene.fog.density = S.fog;

  renderer.render(scene, camera);

  // Debug info
  window.__bh = {
    status: "ticking",
    progress: +smoothProgress.toFixed(4),
    rotY: +(rotY % 6.28).toFixed(2),
    x: +bx.toFixed(2),
    scale: +sc.toFixed(2),
    spinSpeed: +spinSpeed.toFixed(2),
  };
}

// ---------- Cleanup ----------
export function dispose() {
  if (animationId) cancelAnimationFrame(animationId);
  window.removeEventListener("resize", onResize);
  window.removeEventListener("mousemove", onMouse);
  renderer?.dispose();

  // Dispose geometries & materials (basic cleanup)
  if (blackHole) {
    blackHole.traverse((child) => {
      if (child.isMesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose?.());
        } else {
          child.material?.dispose();
        }
      }
    });
  }
  if (disk) {
    disk.geometry?.dispose();
    disk.material?.dispose?.();
  }
  if (photonRing) {
    photonRing.geometry?.dispose();
    photonRing.material?.dispose?.();
  }
  if (particles) {
    particles.geometry?.dispose();
    particles.material?.dispose?.();
  }
  if (stars) {
    stars.geometry?.dispose();
    stars.material?.dispose?.();
  }
}