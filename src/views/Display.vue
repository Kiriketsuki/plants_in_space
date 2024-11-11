<template>
    <div
        v-if="error"
        class="fixed inset-0 flex items-center justify-center bg-gray-900">
        <div class="text-white text-center">
            <p class="text-xl mb-4">{{ error }}</p>
            <button
                @click="redirectHome"
                class="px-4 py-2 bg-blue-500 rounded hover:bg-blue-600 transition-colors">
                Return Home
            </button>
        </div>
    </div>

    <div
        v-else
        class="h-screen w-screen">
        <div
            ref="bg"
            class="h-screen w-screen fixed top-0 left-0 -z-1"></div>

        <div class="growth-scene h-screen w-screen fixed top-0 left-0 z-0">
            <canvas
                ref="canvas"
                class="w-full h-full">
            </canvas>
        </div>

        <div
            v-if="isLoading"
            class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
            <div class="text-white text-xl">Loading model...</div>
        </div>
    </div>
</template>

<script setup>
    import { ref, onMounted, onUnmounted } from "vue";
    import { useRouter } from "vue-router";
    import * as THREE from "three";
    import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
    import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

    import { firebaseConfig } from "../../secrets";
    import { initializeApp } from "firebase/app";
    import { getStorage, ref as storageRef, getDownloadURL } from "firebase/storage";
    import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";

    const props = defineProps({
        id: {
            type: String,
            required: true,
        },
    });

    const router = useRouter();
    const canvas = ref(null);
    const error = ref(null);
    const isLoading = ref(true);

    // Scene variables
    let scene, camera, renderer, controls;

    // Firebase initialization
    const app = initializeApp(firebaseConfig);
    const storage = getStorage(app);
    const db = getFirestore(app);

    // BG
    const bg = ref(null);
    let bg_scene, bg_camera, bg_renderer, bg_animationFrameId;
    let cloudGeo,
        cloudMaterial,
        cloudParticles = [];
    let light_one, light_two, light_three;

    const createStars = () => {
        const starsGeometry = new THREE.BufferGeometry();
        const starsMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.15,
            transparent: true,
            opacity: 0.6,
            sizeAttenuation: true,
            blending: THREE.AdditiveBlending,
            fog: true,
        });

        const starsVertices = [];

        // Generate stars in view frustum
        for (let i = 0; i < 1500; i++) {
            // Calculate spread based on camera FOV and distance
            // At z = -500, calculate visible width/height
            const z = -(Math.random() * 400 + 100); // Closer range: -500 to -100

            // Calculate visible width at this z distance (using FOV)
            const visibleHeight = 2 * Math.tan((60 * Math.PI) / 180 / 2) * Math.abs(z);
            const visibleWidth = visibleHeight * (window.innerWidth / window.innerHeight);

            // Generate positions within visible area
            const x = (Math.random() - 0.5) * visibleWidth;
            const y = (Math.random() - 0.5) * visibleHeight;

            starsVertices.push(x, y, z);
        }

        starsGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starsVertices, 3));
        const starSystem = new THREE.Points(starsGeometry, starsMaterial);
        return starSystem;
    };

    const initBG = () => {
        bg_scene = new THREE.Scene();

        // Create camera - positioned to look down -Z axis
        bg_camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 3000); // Increased far plane
        bg_camera.position.set(0, 0, -10);
        bg_camera.lookAt(0, 0, -100);

        // Create renderer
        bg_renderer = new THREE.WebGLRenderer({ antialias: true });
        bg_renderer.setSize(window.innerWidth, window.innerHeight);
        bg.value.appendChild(bg_renderer.domElement);

        // Fog - reduced density to see further
        bg_scene.fog = new THREE.FogExp2(0x111111, 0.0004);
        bg_renderer.setClearColor(bg_scene.fog.color);

        // loader
        let loader = new THREE.TextureLoader();

        // In the init function, modify the texture loader section:

        loader.load("../assets/polyclouds.png", (texture) => {
            // Improve texture filtering
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.anisotropy = bg_renderer.capabilities.getMaxAnisotropy();

            cloudGeo = new THREE.PlaneGeometry(600, 600);
            cloudMaterial = new THREE.MeshLambertMaterial({
                map: texture,
                transparent: true,
                opacity: 0.3,
                emissive: 0x111111,
                emissiveIntensity: 0.5,
                side: THREE.DoubleSide,
                fog: true,
                // Add alpha settings to reduce sharp edges
                alphaTest: 0.01,
                depthWrite: false, // Helps with transparency sorting
            });

            // Helper function to create a gaussian-like random number
            const gaussianRand = () => {
                // Box-Muller transform for gaussian distribution
                const theta = 2 * Math.PI * Math.random();
                const rho = Math.sqrt(-2 * Math.log(1 - Math.random()));
                return (rho * Math.cos(theta) + 1) / 2; // Normalize to 0-1 range
            };

            // Modified cloud generation
            for (let p = 0; p < 25; p++) {
                let cloud = new THREE.Mesh(cloudGeo, cloudMaterial);

                // Create bias towards center using gaussian distribution
                const xSpread = 1200;
                const ySpread = 600;
                const zSpread = 200;

                // Convert gaussian (0-1) to position with bias towards center
                const x = (gaussianRand() * 2 - 1) * xSpread * 0.5; // Multiply by 0.5 to tighten spread
                const y = (gaussianRand() * 2 - 1) * ySpread * 0.5;
                const z = -700 + gaussianRand() * zSpread; // Keep depth range similar but bias towards front

                cloud.position.set(x, y, z);
                cloud.rotateZ(Math.random() * Math.PI * 2);
                cloudParticles.push(cloud);
                bg_scene.add(cloud);
            }
        });

        // Add ambient light to provide base illumination
        const ambientLight = new THREE.AmbientLight(0x333333, 1);
        bg_scene.add(ambientLight);

        // Adjust point lights - increased intensity and brought closer to clouds
        light_one = new THREE.PointLight(0xff0033, 15, 1000, 1);
        light_two = new THREE.PointLight(0x0033ff, 15, 1000, 1);
        light_three = new THREE.PointLight(0x00ff00, 15, 1000, 1);

        let helper_one = new THREE.PointLightHelper(light_one, 30);
        let helper_two = new THREE.PointLightHelper(light_two, 30);
        let helper_three = new THREE.PointLightHelper(light_three, 30);

        // Position lights between camera and clouds
        light_one.position.set(0, 300, -300);
        light_two.position.set(200, -300, -300);
        light_three.position.set(-200, -300, -300);

        bg_scene.add(light_one);
        bg_scene.add(light_two);
        bg_scene.add(light_three);

        bg_scene.add(helper_one);
        bg_scene.add(helper_two);
        bg_scene.add(helper_three);

        const stars = createStars();
        bg_scene.add(stars);

        // animate_bg();
    };

    const animate_bg = () => {
        // bg_animationFrameId = requestAnimationFrame(animate_bg);

        // Animate lights in the XY plane (parallel to viewport)
        const time = Date.now() * 0.001;
        light_one.position.x = Math.sin(time * 0.7) * 300;
        light_one.position.y = Math.cos(time * 0.5) * 300;
        light_one.position.z = -300 + Math.sin(time * 0.3) * 100;

        light_two.position.x = Math.cos(time * 0.3) * 300;
        light_two.position.y = Math.sin(time * 0.5) * 300;
        light_two.position.z = -300 + Math.cos(time * 0.4) * 100;

        light_three.position.x = Math.sin(time * 0.7) * 300;
        light_three.position.y = Math.sin(time * 0.5) * 300;
        light_three.position.z = -300 + Math.sin(time * 0.5) * 100;

        // Animate cloud rotation
        cloudParticles.forEach((cloud, i) => {
            // Rotate each cloud at slightly different speeds
            cloud.rotation.z += ((i % 3) + 1) * 0.00015;

            // Add subtle wobble to make it more organic
            cloud.rotation.x = Math.sin(time * 0.2) * 0.01;
            cloud.rotation.y = Math.cos(time * 0.3) * 0.01;

            // Calculate distance from center for wave-like group scaling
            const distanceFromCenter = new THREE.Vector3().copy(cloud.position).distanceTo(new THREE.Vector3(0, 0, -700)); // Center point of cloud distribution

            // Create wave that moves outward from center
            const waveScale = 0.95 + Math.sin(time * Math.PI - distanceFromCenter * 0.005) * 0.005;

            // Add subtle individual breathing
            const individualScale = 1 + Math.sin(time * 0.5 + i * 0.2) * 0.02;

            // Combine both scaling effects
            const finalScale = waveScale * individualScale;
            cloud.scale.set(finalScale, finalScale, finalScale);
        });

        bg_renderer.render(bg_scene, bg_camera);
    };

    // Initialize Three.js scene
    function initScene() {
        scene = new THREE.Scene();

        // Camera setup
        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        // camera.position.set(8, 3.5, 0);
        camera.position.set(20, 0, 20);

        // Renderer setup
        renderer = new THREE.WebGLRenderer({
            canvas: canvas.value,
            antialias: true,
            alpha: true,
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);

        renderer.setClearColor(0x000000, 0);
        renderer.toneMapping = THREE.NeutralToneMapping;
        renderer.toneMappingExposure = 1;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Controls setup
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.125);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 5, 5);
        scene.add(directionalLight);
    }

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        animate_bg();
        controls?.update();
        renderer?.render(scene, camera);
    }

    // Handle window resize
    function onWindowResize() {
        if (camera && renderer) {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }

    // Load model from Firebase Storage
    async function loadModel() {
        try {
            isLoading.value = true;
            const filename = `${props.id}.glb`;
            const fileRef = storageRef(storage, `plants/${filename}`);

            try {
                // Get download URL
                const url = await getDownloadURL(fileRef);

                // Load the model
                const loader = new GLTFLoader();
                const gltf = await loader.loadAsync(url);

                // Clear any existing models
                scene.clear();

                // Add and configure lights
                const ambientLight = new THREE.AmbientLight(0xffffff, 0.125);
                scene.add(ambientLight);

                const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
                directionalLight.position.set(5, 15, 5);
                directionalLight.castShadow = true;

                // Configure shadow properties
                directionalLight.shadow.mapSize.width = 2048;
                directionalLight.shadow.mapSize.height = 2048;
                directionalLight.shadow.camera.near = 0.1;
                directionalLight.shadow.camera.far = 100;
                directionalLight.shadow.camera.left = -15;
                directionalLight.shadow.camera.right = 15;
                directionalLight.shadow.camera.top = 15;
                directionalLight.shadow.camera.bottom = -15;
                directionalLight.shadow.bias = -0.001;

                scene.add(directionalLight);

                // Enable shadows for all meshes in the model
                gltf.scene.traverse((node) => {
                    if (node.isMesh) {
                        if (node.name !== "Object_1001" || node.name !== "Object_1001_1") {
                            node.castShadow = true;
                            node.receiveShadow = true;
                        }

                        // Ensure materials are configured for shadows
                        if (node.material) {
                            // Handle both single materials and material arrays
                            const materials = Array.isArray(node.material) ? node.material : [node.material];

                            materials.forEach((material) => {
                                // Enable shadow properties
                                material.shadowSide = THREE.FrontSide;

                                // Ensure proper material settings
                                // if (material.map) material.map.encoding = THREE.sRGBEncoding;
                                // if (material.emissiveMap) material.emissiveMap.encoding = THREE.sRGBEncoding;

                                // Update material to ensure changes take effect
                                material.needsUpdate = true;
                            });
                        }
                    }
                });

                // Add the model to the scene
                scene.add(gltf.scene);

                // Update controls
                controls.update();
            } catch (error) {
                console.error("Error loading model:", error);
                error.value = "Plant not found";
                setTimeout(redirectHome, 2000);
                return;
            }
        } catch (error) {
            console.error("Error:", error);
            error.value = "Error loading plant";
            setTimeout(redirectHome, 2000);
        } finally {
            isLoading.value = false;
        }
    }

    function redirectHome() {
        router.push("/");
    }

    // Lifecycle hooks
    onMounted(async () => {
        initScene();
        initBG();
        animate();
        await loadModel();

        window.addEventListener("resize", onWindowResize);
    });

    onUnmounted(() => {
        window.removeEventListener("resize", onWindowResize);

        // Cleanup Three.js resources
        scene?.traverse((object) => {
            if (object.geometry) {
                object.geometry.dispose();
            }
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach((material) => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });

        renderer?.dispose();
        controls?.dispose();
    });
</script>
