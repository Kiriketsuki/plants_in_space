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
        class="h-screen w-screen bg-gray-900">
        <canvas
            ref="canvas"
            class="w-full h-full"></canvas>

        <div
            v-if="isLoading"
            class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
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
    import { cameraNear } from "three/webgpu";

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
        // Updated from sRGBEncoding to outputColorSpace
        renderer.outputColorSpace = THREE.SRGBColorSpace;

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
                        node.castShadow = true;
                        node.receiveShadow = true;

                        // Ensure materials are configured for shadows
                        if (node.material) {
                            // Handle both single materials and material arrays
                            const materials = Array.isArray(node.material) ? node.material : [node.material];

                            materials.forEach((material) => {
                                // Enable shadow properties
                                material.shadowSide = THREE.FrontSide;

                                // Ensure proper material settings
                                if (material.map) material.map.encoding = THREE.sRGBEncoding;
                                if (material.emissiveMap) material.emissiveMap.encoding = THREE.sRGBEncoding;

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
