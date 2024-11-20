<template>
    <div
        v-if="error"
        class="fixed inset-0 flex items-center justify-center bg-black">
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
        class="h-screen w-screen bg-black">
        <div class="growth-scene h-screen w-screen fixed top-0 left-0 z-0">
            <button
                @click="toggleFullscreen"
                class="fixed top-4 right-4 z-20 p-2 bg-opacity-50 rounded-full hover:bg-opacity-75 transition-colors">
                <svg
                    v-if="!isFullscreen"
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-6 w-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                <svg
                    v-else
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-6 w-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 4l5 5m11-5l-5 5m5 11l-5-5m-11 5l5-5" />
                </svg>
            </button>
            <canvas
                ref="canvas"
                class="w-full h-full">
            </canvas>
        </div>

        <div
            v-if="isLoading"
            class="fixed inset-0 flex items-center justify-center bg-back bg-opacity-50 z-10">
            <div class="text-white text-9xl capitalize font-code">{{ loadingText }}</div>
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

    import gsap from "gsap";
    import { TextPlugin } from "gsap/TextPlugin";

    gsap.registerPlugin(TextPlugin);

    const loadingText = ref("Loading models");
    const loadingOpacity = ref(0);
    let loadingInterval = null;

    const isFullscreen = ref(false);

    // Add fullscreen toggle function
    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            isFullscreen.value = true;
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                isFullscreen.value = false;
            }
        }
    }

    // Update fullscreen state when it changes
    function onFullscreenChange() {
        isFullscreen.value = !!document.fullscreenElement;
    }

    function createLoadingAnimation() {
        gsap.to(loadingOpacity, {
            value: 1,
            duration: 0.5,
            ease: "power2.out",
        });

        let dots = 0;
        loadingInterval = setInterval(() => {
            dots = (dots + 1) % 4;
            loadingText.value = "Loading models" + ".".repeat(dots);
        }, 500);
    }

    function cleanupLoadingAnimation() {
        if (loadingInterval) {
            clearInterval(loadingInterval);
        }
        gsap.killTweensOf(loadingOpacity);
    }

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

    let scene, camera, renderer, controls;

    const app = initializeApp(firebaseConfig);
    const storage = getStorage(app);
    const db = getFirestore(app);

    function initScene() {
        scene = new THREE.Scene();

        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

        camera.position.set(15, 3, 15);

        renderer = new THREE.WebGLRenderer({
            canvas: canvas.value,
            antialias: true,
            alpha: true,
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setClearColor(0x000000, 0);

        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.autoRotate = true;
        controls.target.set(0, 3, 0);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 5, 5);
        scene.add(directionalLight);

        const sceneLight = new THREE.AmbientLight(0xffffff, 0.125);
        scene.add(sceneLight);
    }

    function animate() {
        requestAnimationFrame(animate);
        controls?.update();
        renderer?.render(scene, camera);
    }

    function onWindowResize() {
        if (camera && renderer) {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }

    async function loadModel() {
        try {
            isLoading.value = true;
            const filename = `${props.id}.glb`;
            const fileRef = storageRef(storage, `plants/${filename}`);
            try {
                const url = await getDownloadURL(fileRef);
                const loader = new GLTFLoader();
                const gltf = await loader.loadAsync(url);

                // First, collect all display-case meshes
                const toRemove = [];
                gltf.scene.traverse((node) => {
                    if (node.isMesh) {
                        // console.log(node.name);
                        if (node.name.includes("display-case") || node.name.includes("water")) {
                            toRemove.push(node);
                        } else {
                            if (node.material) {
                                const materials = Array.isArray(node.material) ? node.material : [node.material];
                                materials.forEach((material) => {
                                    material.shadowSide = THREE.FrontSide;
                                    material.needsUpdate = true;
                                });
                            }
                        }
                    }
                });

                // Then remove them after traversal is complete
                toRemove.forEach((mesh) => {
                    if (mesh.parent) {
                        mesh.parent.remove(mesh);
                    }
                });

                scene.add(gltf.scene);
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

    onMounted(async () => {
        createLoadingAnimation();
        initScene();
        animate();
        await loadModel();

        window.addEventListener("resize", onWindowResize);
        // document.documentElement.requestFullscreen();
        document.addEventListener("fullscreenchange", onFullscreenChange);
    });

    onUnmounted(() => {
        cleanupLoadingAnimation();
        window.removeEventListener("resize", onWindowResize);

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
        document.removeEventListener("fullscreenchange", onFullscreenChange);
        renderer?.dispose();
        controls?.dispose();
    });
</script>
