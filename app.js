// =========================================================================
// DOM ELEMENTS
// =========================================================================
const canvas = document.getElementById('scroll-canvas');
const preloader = document.getElementById('preloader');
const progressPercent = document.getElementById('loader-percentage');

// =========================================================================
let scene, camera, renderer;
let earthMesh, cloudsMesh, atmosphereMesh, karmanRing;
let centerSprite, leftSprite, rightSprite, building2Sprite, building1Sprite;
let sunLight, ambientLight, atmosphereMaterial;
let raycaster, mouse;
let isCenterHovered = false;
let isLeftHovered = false;
let isRightHovered = false;
let isBuilding2Hovered = false;
let isBuilding1Hovered = false;
let baseEarthRotation = 0;
let baseCloudsRotation = 0;
let scrollOffset = 0; // Driven by drag coordinates in single-page mode

// Plane and Smoke Trail variables
let planeSprite;
let planeActive = false;
let planeProgress = 0;
let planeSpeed = 0.05; // Speed coefficient (takes ~15 seconds to cross, slower)
let planeDelayTimer = 2.0; // Initial delay before first flight (seconds)
let planeStartX = -5;
let planeStartY = 0;
let planeEndX = 5;
let planeEndY = 3;
let smokeParticles = [];
let spawnTimer = 0;
const clock = new THREE.Clock();

// Setup a unique cache buster per asset query load
const cacheBuster = Date.now();

// =========================================================================
// 1. THREE.JS LOADING MANAGER (COORDINATES LOADER SCREEN)
// =========================================================================
const loadingManager = new THREE.LoadingManager();

loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
  const percent = Math.round((itemsLoaded / itemsTotal) * 100);
  if (progressPercent) {
    progressPercent.textContent = `${percent}%`;
  }
};

loadingManager.onLoad = () => {
  // Fade out loader once textures are loaded
  setTimeout(() => {
    if (preloader) {
      preloader.classList.add('fade-out');
    }
  }, 400);
};

// =========================================================================
// 2. INITIALIZE THREE.JS SCENE
// =========================================================================
function initThree() {
  // 1. Scene
  scene = new THREE.Scene();

  // 2. Camera
  const heroSection = canvas ? canvas.closest('.hero-section') : null;
  const initW = heroSection ? heroSection.offsetWidth  : window.innerWidth;
  const initH = heroSection ? heroSection.offsetHeight : window.innerHeight;
  camera = new THREE.PerspectiveCamera(45, initW / initH, 0.1, 1000);
  camera.position.z = 4.0;

  // 3. Renderer (Enable alpha for transparency to display CSS backgrounds)
  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(initW, initH);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  // 4. Lighting
  const isLight = document.documentElement.classList.contains('light-theme');
  // Solar directional light shining from top-right-front, casting realistic shadows
  sunLight = new THREE.DirectionalLight(0xffffff, isLight ? 1.0 : 1.5);
  sunLight.position.set(5, 3, 5);
  scene.add(sunLight);

  // Soft ambient light to keep the shadow side of the Earth subtly visible
  ambientLight = new THREE.AmbientLight(isLight ? 0xffffff : 0x222630, isLight ? 1.8 : 0.4);
  scene.add(ambientLight);

  // 5. Textures Loading
  const textureLoader = new THREE.TextureLoader(loadingManager);

  // Load equirectangular maps
  const earthDiffuseMap = textureLoader.load(`https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg?v=${cacheBuster}`);
  const earthBumpMap = textureLoader.load(`https://unpkg.com/three-globe/example/img/earth-topology.png?v=${cacheBuster}`);
  const cloudAlphaMap = textureLoader.load(`https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_2048.png?v=${cacheBuster}`);
  const centerTexture = textureLoader.load(`assets/building-4.png?v=${cacheBuster}`);
  const leftTexture = textureLoader.load(`assets/st_basils.png?v=${cacheBuster}`);
  const rightTexture = textureLoader.load(`assets/st_isaacs.png?v=${cacheBuster}`);
  const building2Texture = textureLoader.load(`assets/building-2.png?v=${cacheBuster}`);
  const building1Texture = textureLoader.load(`assets/building-1.png?v=${cacheBuster}`);
  const planeTexture = textureLoader.load(`assets/plane.png?v=${cacheBuster}`);

  // 6. Earth Mesh Layer
  const earthGeometry = new THREE.SphereGeometry(2, 64, 64);
  const earthMaterial = new THREE.MeshStandardMaterial({
    map: earthDiffuseMap,
    bumpMap: earthBumpMap,
    bumpScale: 0.08,
    roughness: 0.85,
    metalness: 0.1
  });
  earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
  earthMesh.renderOrder = 5; // Rendered after sprite, ring, and atmosphere to mask their bases
  scene.add(earthMesh);

  // 7. Transparent Outer Clouds Layer
  const cloudsGeometry = new THREE.SphereGeometry(2.025, 64, 64);
  const cloudsMaterial = new THREE.MeshStandardMaterial({
    alphaMap: cloudAlphaMap,
    transparent: true,
    blending: THREE.AdditiveBlending,
    opacity: 0.35,
    color: 0xffffff
  });
  cloudsMesh = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
  cloudsMesh.renderOrder = 6; // Rendered after Earth
  scene.add(cloudsMesh);

  // 8. Kármán Line (Atmospheric Halo Glow) - Uses Uniform Color for toggling theme
  const atmosphereGeometry = new THREE.SphereGeometry(2.045, 64, 64);
  atmosphereMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(isLight ? 0xffffff : 0x00ccff) } // Neon blue or white depending on theme
    },
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying vec3 vNormal;
      void main() {
        // Fresnel equation: glowing rim highlight
        float intensity = pow(0.78 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
        gl_FragColor = vec4(uColor, 1.0) * intensity;
      }
    `,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false // Prevent depth testing masking issues on overlay sprites
  });
  atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
  atmosphereMesh.renderOrder = 2; // Rendered before sprite
  scene.add(atmosphereMesh);

  // 9. Kármán Line (Neon Boundary Ring)
  const ringGeometry = new THREE.RingGeometry(2.06, 2.065, 96);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: isLight ? 0xffffff : 0x00f2fe, // Neon cyan or white
    side: THREE.DoubleSide,
    transparent: true,
    opacity: isLight ? 0.65 : 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false // Prevent depth clipping St. Basil's Sprite
  });
  karmanRing = new THREE.Mesh(ringGeometry, ringMaterial);
  karmanRing.rotation.x = Math.PI / 2.3; // Orbit tilt angle
  karmanRing.rotation.y = Math.PI / 10;
  karmanRing.renderOrder = 1; // Rendered first (behind sprite)
  scene.add(karmanRing);

  // 10. Landmark 3D Sprite Components (Center, Left, and Right Landmarks)
  // Center Landmark (Hermitage Museum / building-4.png, loaded via centerTexture)
  const centerMaterial = new THREE.SpriteMaterial({
    map: centerTexture,
    transparent: true
  });
  centerSprite = new THREE.Sprite(centerMaterial);
  centerSprite.renderOrder = 4; // Rendered in front of left and right sprites (renderOrder = 3)
  scene.add(centerSprite); // Added to scene to remain stationary when Earth rotates

  // Left Landmark (St. Basil's domes, loaded via leftTexture)
  const leftMaterial = new THREE.SpriteMaterial({
    map: leftTexture,
    transparent: true,
    rotation: 18 * (Math.PI / 180) // Rotate 18 degrees counter-clockwise
  });
  leftSprite = new THREE.Sprite(leftMaterial);
  leftSprite.renderOrder = 3;
  scene.add(leftSprite); // Added to scene to remain stationary when Earth rotates

  // Right Landmark (St. Isaac's gold dome, loaded via rightTexture)
  const rightMaterial = new THREE.SpriteMaterial({
    map: rightTexture,
    transparent: true,
    rotation: -32 * (Math.PI / 180) // Rotate 32 degrees clockwise
  });
  rightSprite = new THREE.Sprite(rightMaterial);
  rightSprite.renderOrder = 3;
  scene.add(rightSprite); // Added to scene to remain stationary when Earth rotates

  // Building 2 Landmark (Kremlin Palace + Alexander Column, loaded via building2Texture)
  const building2Material = new THREE.SpriteMaterial({
    map: building2Texture,
    transparent: true,
    rotation: -13 * (Math.PI / 180) // Rotate 13 degrees clockwise
  });
  building2Sprite = new THREE.Sprite(building2Material);
  building2Sprite.renderOrder = 3;
  scene.add(building2Sprite); // Added to scene to remain stationary when Earth rotates

  // Building 1 Landmark (left of St. Basil's, loaded via building1Texture)
  const building1Material = new THREE.SpriteMaterial({
    map: building1Texture,
    transparent: true,
    rotation: 27 * (Math.PI / 180) // Rotate 27 degrees counter-clockwise
  });
  building1Sprite = new THREE.Sprite(building1Material);
  building1Sprite.renderOrder = 3;
  scene.add(building1Sprite); // Added to scene to remain stationary when Earth rotates

  // Plane Sprite (for flying sequence)
  const planeMaterial = new THREE.SpriteMaterial({
    map: planeTexture,
    transparent: true
  });
  planeSprite = new THREE.Sprite(planeMaterial);
  planeSprite.renderOrder = 2.5; // Rendered behind the buildings (order 3, 4)
  planeSprite.visible = false;
  scene.add(planeSprite);

  // Initialize Raycasting variables for mouse hover tracking
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2(-9999, -9999); // Start off-screen

  // Listen for mouse moves to track ray coordinates
  window.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  // Trigger initial resize positioning
  resizeCanvas();
  
  // Begin animation rendering loop
  animate();
}

// =========================================================================
// 3. MOUSE/TOUCH DRAG INTERACTION (SCROLLING REMOVED)
// =========================================================================
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

function initDragInteraction() {
  // Mouse listeners
  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    previousMousePosition = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - previousMousePosition.x;
    // Increment the orbital offset on horizontal mouse sweep
    scrollOffset += deltaX * 0.0035;
    previousMousePosition = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // Touch listeners (Mobile devices support)
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      isDragging = true;
      previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - previousMousePosition.x;
    scrollOffset += deltaX * 0.0035;
    previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });

  window.addEventListener('touchend', () => {
    isDragging = false;
  });
}

// =========================================================================
// 4. THEME CONTROL TOGGLE CONTROLLERS (COORDINATED WITH THEME.JS)
// =========================================================================
function initThemeToggles() {
  window.addEventListener('themeChanged', (e) => {
    const theme = e.detail.theme;
    if (theme === 'dark') {
      // Cinematic transition back to shadowy night lighting
      gsap.to(ambientLight, { intensity: 0.4, duration: 0.8, ease: 'power1.out' });
      gsap.to(sunLight, { intensity: 1.5, duration: 0.8, ease: 'power1.out' });
      
      // Fade Kármán line atmosphere glow to neon blue
      if (atmosphereMaterial) {
        gsap.to(atmosphereMaterial.uniforms.uColor.value, { r: 0.0, g: 0.8, b: 1.0, duration: 0.8 });
      }
      // Fade Kármán boundary ring to neon cyan
      if (karmanRing) {
        gsap.to(karmanRing.material.color, { r: 0.0, g: 0.95, b: 1.0, duration: 0.8 });
        gsap.to(karmanRing.material, { opacity: 0.35, duration: 0.8 });
      }
    } else {
      // Cinematic transition to bright daylight (fully illuminated globe structures)
      gsap.to(ambientLight, { intensity: 1.8, duration: 0.8, ease: 'power1.out' });
      gsap.to(sunLight, { intensity: 1.0, duration: 0.8, ease: 'power1.out' });
      
      // Fade Kármán line atmosphere glow to pure white
      if (atmosphereMaterial) {
        gsap.to(atmosphereMaterial.uniforms.uColor.value, { r: 1.0, g: 1.0, b: 1.0, duration: 0.8 });
      }
      // Fade Kármán boundary ring to pure white
      if (karmanRing) {
        gsap.to(karmanRing.material.color, { r: 1.0, g: 1.0, b: 1.0, duration: 0.8 });
        gsap.to(karmanRing.material, { opacity: 0.65, duration: 0.8 });
      }
    }
  });
}

// =========================================================================
// 5. ANIMATION RENDERING LOOP (AUTO-ROTATION + INTERACTIVE OFFSET)
// =========================================================================
function animate() {
  requestAnimationFrame(animate);

  // Time-based slow continuous rotation
  baseEarthRotation += 0.0012;
  baseCloudsRotation += 0.0015;

  // Earth mesh rotation = auto rotation + drag offset
  if (earthMesh) {
    earthMesh.rotation.y = baseEarthRotation + scrollOffset;
  }

  // Clouds mesh rotation
  if (cloudsMesh) {
    cloudsMesh.rotation.y = baseCloudsRotation + scrollOffset * 1.05;
  }

  // Kármán ring rotation (spinning slowly around local Z-axis of the tilted ring)
  if (karmanRing) {
    karmanRing.rotation.z = baseEarthRotation * 0.35 + scrollOffset * 0.25;
  }

  // Raycast hover animation for Landmark sprites
  if (raycaster && mouse) {
    raycaster.setFromCamera(mouse, camera);

    // 1. Center Landmark
    if (centerSprite) {
      const intersects = raycaster.intersectObject(centerSprite);
      if (intersects.length > 0) {
        if (!isCenterHovered) {
          isCenterHovered = true;
          gsap.to(centerSprite.position, { y: centerSprite.hoverY, duration: 0.45, ease: 'power2.out' });
          gsap.to(centerSprite.scale, { x: 2.95, y: 2.95, duration: 0.45, ease: 'power2.out' });
        }
        const hoverTime = Date.now() * 0.0035;
        // Bob gently around hoverY
        centerSprite.position.y = centerSprite.hoverY + Math.sin(hoverTime) * 0.012;
      } else {
        if (isCenterHovered) {
          isCenterHovered = false;
          gsap.killTweensOf(centerSprite.position);
          gsap.killTweensOf(centerSprite.scale);
          gsap.to(centerSprite.position, { y: centerSprite.restingY, duration: 0.45, ease: 'power2.out' });
          gsap.to(centerSprite.scale, { x: 2.75, y: 2.75, duration: 0.45, ease: 'power2.out' });
        }
      }
    }

    // 2. Left Landmark
    if (leftSprite) {
      const intersects = raycaster.intersectObject(leftSprite);
      if (intersects.length > 0) {
        if (!isLeftHovered) {
          isLeftHovered = true;
          gsap.to(leftSprite.position, { y: leftSprite.hoverY, duration: 0.45, ease: 'power2.out' });
          gsap.to(leftSprite.scale, { x: 1.90, y: 2.50, duration: 0.45, ease: 'power2.out' });
        }
        const hoverTime = Date.now() * 0.0035;
        // Bob gently around hoverY
        leftSprite.position.y = leftSprite.hoverY + Math.sin(hoverTime) * 0.012;
      } else {
        if (isLeftHovered) {
          isLeftHovered = false;
          gsap.killTweensOf(leftSprite.position);
          gsap.killTweensOf(leftSprite.scale);
          gsap.to(leftSprite.position, { y: leftSprite.restingY, duration: 0.45, ease: 'power2.out' });
          gsap.to(leftSprite.scale, { x: 1.70, y: 2.30, duration: 0.45, ease: 'power2.out' });
        }
      }
    }

    // 3. Right Landmark (St. Isaac's golden dome) - Shifted aside
    if (rightSprite) {
      const intersects = raycaster.intersectObject(rightSprite);
      if (intersects.length > 0) {
        if (!isRightHovered) {
          isRightHovered = true;
          gsap.to(rightSprite.position, { y: rightSprite.hoverY, duration: 0.45, ease: 'power2.out' });
          gsap.to(rightSprite.scale, { x: 1.80, y: 1.80, duration: 0.45, ease: 'power2.out' });
        }
        const hoverTime = Date.now() * 0.0035;
        // Bob gently around hoverY
        rightSprite.position.y = rightSprite.hoverY + Math.sin(hoverTime) * 0.012;
      } else {
        if (isRightHovered) {
          isRightHovered = false;
          gsap.killTweensOf(rightSprite.position);
          gsap.killTweensOf(rightSprite.scale);
          gsap.to(rightSprite.position, { y: rightSprite.restingY, duration: 0.45, ease: 'power2.out' });
          gsap.to(rightSprite.scale, { x: 1.60, y: 1.60, duration: 0.45, ease: 'power2.out' });
        }
      }
    }

    // 4. Building 2 Landmark (just right of center building 4)
    if (building2Sprite) {
      const intersects = raycaster.intersectObject(building2Sprite);
      if (intersects.length > 0) {
        if (!isBuilding2Hovered) {
          isBuilding2Hovered = true;
          gsap.to(building2Sprite.position, { y: building2Sprite.hoverY, duration: 0.45, ease: 'power2.out' });
          gsap.to(building2Sprite.scale, { x: 2.10, y: 2.10, duration: 0.45, ease: 'power2.out' });
        }
        const hoverTime = Date.now() * 0.0035;
        // Bob gently around hoverY
        building2Sprite.position.y = building2Sprite.hoverY + Math.sin(hoverTime) * 0.012;
      } else {
        if (isBuilding2Hovered) {
          isBuilding2Hovered = false;
          gsap.killTweensOf(building2Sprite.position);
          gsap.killTweensOf(building2Sprite.scale);
          gsap.to(building2Sprite.position, { y: building2Sprite.restingY, duration: 0.45, ease: 'power2.out' });
          gsap.to(building2Sprite.scale, { x: 1.90, y: 1.90, duration: 0.45, ease: 'power2.out' });
        }
      }
    }

    // 5. Building 1 Landmark (left of St. Basil's)
    if (building1Sprite) {
      const intersects = raycaster.intersectObject(building1Sprite);
      if (intersects.length > 0) {
        if (!isBuilding1Hovered) {
          isBuilding1Hovered = true;
          gsap.to(building1Sprite.position, { y: building1Sprite.hoverY, duration: 0.45, ease: 'power2.out' });
          gsap.to(building1Sprite.scale, { x: 1.80, y: 2.40, duration: 0.45, ease: 'power2.out' });
        }
        const hoverTime = Date.now() * 0.0035;
        building1Sprite.position.y = building1Sprite.hoverY + Math.sin(hoverTime) * 0.012;
      } else {
        if (isBuilding1Hovered) {
          isBuilding1Hovered = false;
          gsap.killTweensOf(building1Sprite.position);
          gsap.killTweensOf(building1Sprite.scale);
          gsap.to(building1Sprite.position, { y: building1Sprite.restingY, duration: 0.45, ease: 'power2.out' });
          gsap.to(building1Sprite.scale, { x: 1.60, y: 2.20, duration: 0.45, ease: 'power2.out' });
        }
      }
    }
  }

  // Update Plane and Smoke Trail
  const deltaTime = Math.min(clock.getDelta(), 0.1);
  if (planeSprite) {
    if (planeActive) {
      planeProgress += deltaTime * planeSpeed;
      if (planeProgress >= 1.0) {
        planeActive = false;
        planeSprite.visible = false;
        planeProgress = 0;
        planeDelayTimer = 4.0 + Math.random() * 6.0; // 4 to 10 seconds delay
      } else {
        planeSprite.position.x = planeStartX + (planeEndX - planeStartX) * planeProgress;
        planeSprite.position.y = planeStartY + (planeEndY - planeStartY) * planeProgress;
        planeSprite.position.z = -0.15; // Fly behind buildings (which are at Z = 0)

        // Spawn smoke trail particles
        spawnTimer += deltaTime;
        if (spawnTimer >= 0.04) {
          const angle = planeSprite.material.rotation;
          // Offset tail slightly backwards
          const offsetX = -Math.cos(angle) * 0.15;
          const offsetY = -Math.sin(angle) * 0.15;
          spawnSmokeParticle(planeSprite.position.x + offsetX, planeSprite.position.y + offsetY, planeSprite.position.z - 0.01);
          spawnTimer = 0;
        }
      }
    } else {
      planeDelayTimer -= deltaTime;
      if (planeDelayTimer <= 0) {
        planeActive = true;
        planeSprite.visible = true;
        planeProgress = 0;
        planeSprite.position.set(planeStartX, planeStartY, -0.15);
      }
    }
  }

  // Update all smoke particles
  for (let i = smokeParticles.length - 1; i >= 0; i--) {
    const p = smokeParticles[i];
    p.age += deltaTime;
    if (p.age >= p.maxAge) {
      scene.remove(p.sprite);
      p.sprite.material.dispose();
      smokeParticles.splice(i, 1);
    } else {
      const t = p.age / p.maxAge;
      p.sprite.material.opacity = (1 - t) * 0.45;
      const currentScale = p.startScale + (p.endScale - p.startScale) * t;
      p.sprite.scale.set(currentScale, currentScale, 1);
      p.sprite.position.addScaledVector(p.velocity, deltaTime);
    }
  }

  renderer.render(scene, camera);
}

// Helper to create/retrieve a reusable smoke particle texture
let smokeTexture = null;
function getSmokeTexture() {
  if (smokeTexture) return smokeTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(220, 220, 220, 0.55)');
  grad.addColorStop(0.3, 'rgba(180, 180, 180, 0.3)');
  grad.addColorStop(1, 'rgba(140, 140, 140, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  smokeTexture = new THREE.CanvasTexture(canvas);
  return smokeTexture;
}

function spawnSmokeParticle(x, y, z) {
  const texture = getSmokeTexture();
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    blending: THREE.AdditiveBlending
  });
  const sprite = new THREE.Sprite(material);
  sprite.position.set(x, y, z);
  sprite.renderOrder = 2.4; // Rendered behind the buildings
  
  const startScale = 0.06 + Math.random() * 0.04;
  sprite.scale.set(startScale, startScale, 1);
  scene.add(sprite);

  smokeParticles.push({
    sprite: sprite,
    age: 0,
    maxAge: 1.0 + Math.random() * 0.5,
    velocity: new THREE.Vector3(
      (Math.random() - 0.5) * 0.1 - 0.12, // drift slightly left (backward)
      (Math.random() - 0.5) * 0.1 - 0.05, // drift slightly down
      (Math.random() - 0.5) * 0.04
    ),
    startScale: startScale,
    endScale: 0.35 + Math.random() * 0.15
  });
}

// =========================================================================
// 6. VIEWPORT ADJUSTMENT HANDLER
// =========================================================================
function resizeCanvas() {
  if (!camera || !renderer) return;

  const heroSection = canvas ? canvas.closest('.hero-section') : null;
  const width  = heroSection ? heroSection.offsetWidth  : window.innerWidth;
  const height = heroSection ? heroSection.offsetHeight : window.innerHeight;

  // Update camera projection parameters
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Reposition and scale Earth, clouds, atmosphere, and Kármán ring to cover the bottom area (pushed a bit higher)
  const meshes = [earthMesh, cloudsMesh, atmosphereMesh, karmanRing];
  const scaleVal = 1.9;

  let earthY;
  if (width < 768) {
    // Mobile viewports (portrait): scale up and push down to target ~28% height visibility
    camera.position.z = 5.0;
    earthY = -4.25;
  } else {
    // Desktop viewports (landscape): scale up and push down to target ~38% height visibility
    camera.position.z = 4.0;
    earthY = -4.1;
  }

  meshes.forEach(mesh => {
    if (mesh) {
      mesh.position.y = earthY;
      mesh.scale.set(scaleVal, scaleVal, scaleVal);
    }
  });

  // Calculate and store world space coordinates for stationary sprites (raised above the Earth's curve)
  if (centerSprite) {
    centerSprite.restingY = earthY + 2.25 * scaleVal;
    centerSprite.hoverY = earthY + 2.265 * scaleVal; // Micro-jump (0.015 offset)
    centerSprite.baseX = 0;

    // Apply position immediately if not currently in a hover tween state
    if (!isCenterHovered) {
      centerSprite.position.set(centerSprite.baseX, centerSprite.restingY, 0);
      centerSprite.scale.set(2.75, 2.75, 1.0);
    }
  }

  if (leftSprite) {
    leftSprite.restingY = earthY + 2.15 * scaleVal;
    leftSprite.hoverY = earthY + 2.165 * scaleVal; // Micro-jump (0.015 offset)
    leftSprite.baseX = -0.65 * scaleVal; // Spaced slightly wider for larger scale
 
    // Apply position immediately if not currently in a hover tween state
    if (!isLeftHovered) {
      leftSprite.position.set(leftSprite.baseX, leftSprite.restingY, 0);
      leftSprite.scale.set(1.70, 2.30, 1.0);
    }
  }

  if (rightSprite) {
    rightSprite.restingY = earthY + 1.90 * scaleVal; // Lowered further downside
    rightSprite.hoverY = earthY + 1.915 * scaleVal; // Micro-jump (0.015 offset)
    rightSprite.baseX = 1.18 * scaleVal; // Shifted further right
 
    // Apply position immediately if not currently in a hover tween state
    if (!isRightHovered) {
      rightSprite.position.set(rightSprite.baseX, rightSprite.restingY, 0);
      rightSprite.scale.set(1.60, 1.60, 1.0);
    }
  }

  if (building2Sprite) {
    building2Sprite.restingY = earthY + 2.05 * scaleVal; // Moved downside from 2.15
    building2Sprite.hoverY = earthY + 2.065 * scaleVal; // Micro-jump (0.015 offset)
    building2Sprite.baseX = 0.58 * scaleVal;

    if (!isBuilding2Hovered) {
      building2Sprite.position.set(building2Sprite.baseX, building2Sprite.restingY, 0);
      building2Sprite.scale.set(1.90, 1.90, 1.0);
    }
  }

  if (building1Sprite) {
    building1Sprite.restingY = earthY + 2.00 * scaleVal; // Raised slightly up the left curve
    building1Sprite.hoverY = earthY + 2.015 * scaleVal; // Micro-jump (0.015 offset)
    building1Sprite.baseX = -1.30 * scaleVal; // Left of St. Basil's (which is at -0.65 * scaleVal)

    if (!isBuilding1Hovered) {
      building1Sprite.position.set(building1Sprite.baseX, building1Sprite.restingY, 0);
      building1Sprite.scale.set(1.60, 2.20, 1.0);
    }
  }

  // Calculate dynamic screen boundaries at Z = 0
  const vFov = (camera.fov * Math.PI) / 180;
  const zDist = camera.position.z;
  const visibleHeight = 2 * Math.tan(vFov / 2) * zDist;
  const visibleWidth = visibleHeight * camera.aspect;

  // Set start and end coordinates based on the bounds
  planeStartX = -visibleWidth / 2 - 0.8; // start off-screen
  planeStartY = 0; // middle height
  planeEndX = visibleWidth / 2 + 0.8; // end off-screen
  planeEndY = visibleHeight / 2 - 0.2; // top-right corner area

  if (planeSprite) {
    planeSprite.scale.set(0.65, 0.65, 1.0); // Size of the plane
    
    // Calculate angle of trajectory
    const dx = planeEndX - planeStartX;
    const dy = planeEndY - planeStartY;
    planeSprite.material.rotation = Math.atan2(dy, dx);
  }
}

// =========================================================================
// APPLICATION STARTUP
// =========================================================================
window.addEventListener('DOMContentLoaded', () => {
  // Initialize Three.js scene (loads images and fades loader screen automatically)
  initThree();

  // Setup layout triggers
  window.addEventListener('resize', resizeCanvas);
  
  // Setup mouse/touch drag system
  initDragInteraction();

  // Setup day/night toggle inputs
  initThemeToggles();

  // Prevent page reload on Home/Logo click when already on the landing page
  const allLinks = document.querySelectorAll('a');
  allLinks.forEach(link => {
    try {
      const linkUrl = new URL(link.href, window.location.href);
      const linkPath = linkUrl.pathname.split('/').pop() || 'index.html';
      const currentPath = window.location.pathname.split('/').pop() || 'index.html';
      
      const resolvedLinkPath = (linkPath === 'index.html' || linkPath === '') ? 'index.html' : linkPath;
      const resolvedCurrentPath = (currentPath === 'index.html' || currentPath === '') ? 'index.html' : currentPath;

      if (linkUrl.origin === window.location.origin && resolvedLinkPath === resolvedCurrentPath) {
        link.addEventListener('click', (e) => {
          if (!linkUrl.hash || linkUrl.hash === '#') {
            e.preventDefault();
            window.scrollTo({
              top: 0,
              behavior: 'smooth'
            });
          }
        });
      }
    } catch (err) {
      // Ignore invalid URLs
    }
  });
});
