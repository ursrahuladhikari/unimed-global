// =========================================================================
// DOM ELEMENTS
// =========================================================================
const canvas = document.getElementById('scroll-canvas');
const preloader = document.getElementById('preloader');
const progressPercent = document.getElementById('loader-percentage');

// =========================================================================
let scene, camera, renderer;
let earthMesh, cloudsMesh, atmosphereMesh, karmanRing;
let leftSprite, rightSprite, khivaSprite;
let sunLight, ambientLight, atmosphereMaterial;
let raycaster, mouse;
let isLeftHovered = false;
let isRightHovered = false;
let isKhivaHovered = false;
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
// 1. THREE.JS LOADING MANAGER & PRELOADER CONTROLLER
// =========================================================================
function hidePreloader() {
  if (preloader && !preloader.classList.contains('fade-out')) {
    if (progressPercent) progressPercent.textContent = '100%';
    setTimeout(() => {
      preloader.classList.add('fade-out');
    }, 200);
  }
}

// Fail-safe: guarantee preloader fades out within 1.5s max even if remote textures delay or fail
setTimeout(hidePreloader, 1500);

const loadingManager = new THREE.LoadingManager();

loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
  const percent = Math.round((itemsLoaded / itemsTotal) * 100);
  if (progressPercent) {
    progressPercent.textContent = `${percent}%`;
  }
};

loadingManager.onLoad = () => {
  hidePreloader();
};

loadingManager.onError = (url) => {
  console.warn('Asset load error:', url);
  hidePreloader();
};

// =========================================================================
// 2. INITIALIZE THREE.JS SCENE
// =========================================================================
function initThree() {
  if (!canvas) {
    hidePreloader();
    return;
  }

  // 1. Scene
  scene = new THREE.Scene();

  // 2. Camera
  const heroSection = canvas ? canvas.closest('.hero-section') : null;
  const initW = heroSection ? heroSection.offsetWidth : window.innerWidth;
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

  // Load equirectangular maps (using local assets)
  const earthDiffuseMap = textureLoader.load('assets/landing_page/earth-blue-marble.jpg');
  const earthBumpMap = textureLoader.load('assets/landing_page/earth-topology.png');
  const cloudAlphaMap = textureLoader.load('assets/landing_page/earth_clouds_2048.png');
  const leftTexture = textureLoader.load('assets/landing_page/st_basils.png?v=2026_tight3d');
  const rightTexture = textureLoader.load('assets/landing_page/st_isaacs.png?v=2026_tight3d');
  const khivaTexture = textureLoader.load('assets/landing_page/khiva.png');
  const planeTexture = textureLoader.load('assets/landing_page/plane.png');

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

  // 10. Landmark 3D Sprite Components (Left, and Right Landmarks)
  // Left Landmark (St. Basil's domes, loaded via leftTexture)
  const leftMaterial = new THREE.SpriteMaterial({
    map: leftTexture,
    transparent: true,
    rotation: 0 // 90 degrees straight upright
  });
  leftSprite = new THREE.Sprite(leftMaterial);
  leftSprite.renderOrder = 3;
  scene.add(leftSprite); // Added to scene to remain stationary when Earth rotates

  // Right Landmark (St. Isaac's gold dome, loaded via rightTexture)
  const rightMaterial = new THREE.SpriteMaterial({
    map: rightTexture,
    transparent: true,
    rotation: -29 * (Math.PI / 180) // Rotate 29 degrees clockwise (1 deg anticlockwise from -30)
  });
  rightSprite = new THREE.Sprite(rightMaterial);
  rightSprite.renderOrder = 3;
  scene.add(rightSprite); // Added to scene to remain stationary when Earth rotates

  // Khiva Landmark (Khiva mosque, loaded via khivaTexture)
  const khivaMaterial = new THREE.SpriteMaterial({
    map: khivaTexture,
    transparent: true,
    rotation: 30 * (Math.PI / 180) // Rotate 30 degrees anticlockwise
  });
  khivaSprite = new THREE.Sprite(khivaMaterial);
  khivaSprite.renderOrder = 3;
  scene.add(khivaSprite); // Added to scene to remain stationary when Earth rotates


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


    // 2. Left Landmark
    if (leftSprite) {
      const intersects = raycaster.intersectObject(leftSprite);
      if (intersects.length > 0) {
        if (!isLeftHovered) {
          isLeftHovered = true;
          gsap.to(leftSprite.position, { y: leftSprite.hoverY, duration: 0.45, ease: 'power2.out' });
          gsap.to(leftSprite.scale, { x: 1.83, y: 2.50, duration: 0.45, ease: 'power2.out' });
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
          gsap.to(leftSprite.scale, { x: 1.68, y: 2.30, duration: 0.45, ease: 'power2.out' });
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
          gsap.to(rightSprite.scale, { x: 1.87, y: 1.62, duration: 0.45, ease: 'power2.out' });
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
          gsap.to(rightSprite.scale, { x: 1.66, y: 1.44, duration: 0.45, ease: 'power2.out' });
        }
      }
    }

    // 4. Khiva Landmark (Khiva mosque) - Positioned on the left side
    if (khivaSprite) {
      const intersects = raycaster.intersectObject(khivaSprite);
      if (intersects.length > 0) {
        if (!isKhivaHovered) {
          isKhivaHovered = true;
          gsap.to(khivaSprite.position, { y: khivaSprite.hoverY, duration: 0.45, ease: 'power2.out' });
          gsap.to(khivaSprite.scale, { x: 2.25, y: 2.25, duration: 0.45, ease: 'power2.out' });
        }
        const hoverTime = Date.now() * 0.0035;
        // Bob gently around hoverY
        khivaSprite.position.y = khivaSprite.hoverY + Math.sin(hoverTime) * 0.012;
      } else {
        if (isKhivaHovered) {
          isKhivaHovered = false;
          gsap.killTweensOf(khivaSprite.position);
          gsap.killTweensOf(khivaSprite.scale);
          gsap.to(khivaSprite.position, { y: khivaSprite.restingY, duration: 0.45, ease: 'power2.out' });
          gsap.to(khivaSprite.scale, { x: 2.00, y: 2.00, duration: 0.45, ease: 'power2.out' });
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
  const width = heroSection ? heroSection.offsetWidth : window.innerWidth;
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
  let earthX = 0.35; // Shift globe and 3D elements a bit right
  if (width < 768) {
    // Mobile viewports (portrait): pushed downside by 5%, shifted slightly right
    camera.position.z = 5.0;
    earthY = -4.46;
    earthX = 0.20;
  } else {
    // Desktop viewports (landscape): pushed downside by 5%, shifted right
    camera.position.z = 4.0;
    earthY = -4.30;
    earthX = 0.35;
  }

  meshes.forEach(mesh => {
    if (mesh) {
      mesh.position.x = earthX;
      mesh.position.y = earthY;
      mesh.scale.set(scaleVal, scaleVal, scaleVal);
    }
  });


  if (leftSprite) {
    leftSprite.restingY = earthY + 2.48 * scaleVal; // Moved a bit more up
    leftSprite.hoverY = earthY + 2.495 * scaleVal;  // Micro-jump on hover
    leftSprite.baseX = earthX + 0.0 * scaleVal; // Shifted right with globe
    leftSprite.rotation.z = 0; // 90 degrees straight upright

    // Apply position immediately if not currently in a hover tween state
    if (!isLeftHovered) {
      leftSprite.position.set(leftSprite.baseX, leftSprite.restingY, 0);
      leftSprite.scale.set(1.68, 2.30, 1.0);
    }
  }

  if (rightSprite) {
    rightSprite.restingY = earthY + 2.058 * scaleVal; // Moved down by 2% towards Kármán line
    rightSprite.hoverY = earthY + 2.073 * scaleVal; // Micro-jump on hover
    rightSprite.baseX = earthX + 1.00 * scaleVal; // Balanced position towards St. Basil's
    rightSprite.rotation.z = -29 * (Math.PI / 180); // Rotate 29 degrees clockwise

    // Apply position immediately if not currently in a hover tween state
    if (!isRightHovered) {
      rightSprite.position.set(rightSprite.baseX, rightSprite.restingY, 0);
      rightSprite.scale.set(1.66, 1.44, 1.0);
    }
  }

  if (khivaSprite) {
    khivaSprite.restingY = earthY + 1.941 * scaleVal; // 2% closer to Kármán line
    khivaSprite.hoverY = earthY + 1.956 * scaleVal;  // Micro-jump
    khivaSprite.baseX = earthX - 1.10 * scaleVal;    // Shifted right with globe

    // Apply position immediately if not currently in a hover tween state
    if (!isKhivaHovered) {
      khivaSprite.position.set(khivaSprite.baseX, khivaSprite.restingY, 0);
      khivaSprite.scale.set(2.00, 2.00, 1.0);
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

      // Only prevent reload if the full destination (path + query params) is identical to current page
      if (linkUrl.origin === window.location.origin &&
        resolvedLinkPath === resolvedCurrentPath &&
        linkUrl.search === window.location.search) {
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

  // Make entire university card (.dest-card) clickable for better UX
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.dest-card');
    if (card) {
      const clickedLink = e.target.closest('a[href]');
      if (clickedLink) {
        return; // Allow standard anchor click behavior
      }
      const link = card.querySelector('a[href]');
      if (link) {
        const targetHref = link.getAttribute('href') || link.href;
        if (targetHref) {
          window.location.href = targetHref;
        }
      }
    }
  });

  // Setup sticky stacking cards depth animation
  initStackingCards();
});

// =========================================================================
// GSAP + SCROLLTRIGGER STACKED HEADER CARD DECK SCROLL
// =========================================================================
function initStackingCards() {
  if (typeof gsap === 'undefined') return;

  if (typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
  }

  const wrappers = document.querySelectorAll('.why-stacking-wrapper');
  if (!wrappers.length) return;

  wrappers.forEach((wrapper) => {
    const cards = Array.from(wrapper.querySelectorAll('.stack-card'));
    if (cards.length <= 1) return;

    const isMobile = window.innerWidth <= 768;
    const headerOffset = isMobile ? 36 : 42;
    const topPinOffset = isMobile ? 75 : 95;

    function buildStack() {
      let maxCardHeight = 0;
      cards.forEach((card) => {
        card.style.position = 'relative';
        card.style.transform = 'none';
        const img = card.querySelector('.stack-card-image-wrap');
        if (img) img.style.opacity = '1';
        const h = card.offsetHeight;
        if (h > maxCardHeight) maxCardHeight = h;
      });

      const totalWrapperHeight = maxCardHeight + (cards.length - 1) * headerOffset;

      wrapper.style.position = 'relative';
      wrapper.style.height = `${totalWrapperHeight}px`;
      wrapper.style.overflow = 'hidden';

      cards.forEach((card, i) => {
        card.style.position = 'absolute';
        card.style.top = '0';
        card.style.left = '0';
        card.style.right = '0';
        card.style.width = '100%';
        card.style.zIndex = i + 10;
        card.style.margin = '0';

        const img = card.querySelector('.stack-card-image-wrap');
        if (img) gsap.set(img, { opacity: 1 });

        if (i > 0) {
          gsap.set(card, { y: totalWrapperHeight + 100 });
        } else {
          gsap.set(card, { y: 0 });
        }
      });

      return { maxCardHeight, totalWrapperHeight };
    }

    const { totalWrapperHeight } = buildStack();

    if (typeof ScrollTrigger !== 'undefined') {
      const scrollDistance = Math.max(2800, cards.length * 950);

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: wrapper,
          start: `top top+=${topPinOffset}`,
          end: `+=${scrollDistance}`,
          pin: true,
          pinSpacing: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true
        }
      });

      for (let i = 1; i < cards.length; i++) {
        // Hold active card in view for reading
        tl.to({}, { duration: 0.7 });

        const prevImage = cards[i - 1].querySelector('.stack-card-image-wrap');
        const targetY = i * headerOffset;

        // Next card slides up from bottom to its stacked header position
        tl.to(cards[i], {
          y: targetY,
          ease: 'power1.inOut',
          duration: 1.2
        });

        // Simultaneously fade out previous card's image as it gets covered
        if (prevImage) {
          tl.to(prevImage, {
            opacity: 0,
            ease: 'power1.inOut',
            duration: 0.6
          }, '<');
        }
      }

      // Final hold phase after all card headings are stacked together
      tl.to({}, { duration: 0.9 });
    }

    window.addEventListener('resize', () => {
      buildStack();
      if (typeof ScrollTrigger !== 'undefined') {
        ScrollTrigger.refresh();
      }
    });
  });
}


// =========================================================================
// FLOATING SIDE WIDGETS SCROLL TRIGGER & VISIBILITY
// =========================================================================
function initFloatingSideWidgets() {
  const container = document.getElementById('floatingSideWidgets');
  if (!container) return;

  function updateSideVisibility() {
    // Target Why Choose Us section on landing page or default threshold
    const whySection = document.querySelector('.home-why-section') ||
      document.querySelector('.why-choose-us-section') ||
      document.querySelector('#why-choose-us') ||
      document.querySelector('.why-section');

    let threshold = 250; // Default scroll threshold
    if (whySection) {
      threshold = Math.max(150, whySection.offsetTop - 100);
    }

    if (window.scrollY >= threshold) {
      container.style.opacity = '1';
      container.style.pointerEvents = 'auto';
      container.style.transform = 'translateY(-50%) translateX(0)';
    } else {
      container.style.opacity = '0';
      container.style.pointerEvents = 'none';
      container.style.transform = 'translateY(-50%) translateX(40px)';
    }
  }

  updateSideVisibility();
  window.addEventListener('scroll', updateSideVisibility, { passive: true });
}

// =========================================================================
// SMOOTH HASH NAVIGATION (About Us & Section Anchor Links)
// =========================================================================
function initHashNavigation() {
  document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a[href*="#"]');
    if (anchor) {
      try {
        const url = new URL(anchor.href, window.location.href);
        const linkPath = (url.pathname.split('/').pop() || 'index.html').replace('.html', '');
        const currentPath = (window.location.pathname.split('/').pop() || 'index.html').replace('.html', '');

        if (url.origin === window.location.origin && linkPath === currentPath && url.hash && url.hash !== '#') {
          const targetEl = document.querySelector(url.hash);
          if (targetEl) {
            e.preventDefault();
            const elementPosition = targetEl.getBoundingClientRect().top + window.pageYOffset;
            const offsetPosition = elementPosition - 85;

            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            });

            if (window.history && window.history.pushState) {
              window.history.pushState(null, '', url.hash);
            }
          }
        }
      } catch (err) { }
    }
  });

  if (window.location.hash && window.location.hash !== '#') {
    setTimeout(() => {
      const targetEl = document.querySelector(window.location.hash);
      if (targetEl) {
        const elementPosition = targetEl.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - 85;
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }, 350);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initFloatingSideWidgets();
    initHashNavigation();
  });
} else {
  initFloatingSideWidgets();
  initHashNavigation();
}
