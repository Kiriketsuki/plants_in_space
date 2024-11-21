<template>
    <div
        v-if="error"
        class="fixed inset-0 flex items-center justify-center bg-back">
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
        class="h-screen w-screen bg-back">
        <div
            ref="bg"
            class="h-screen w-screen fixed top-0 left-0 -z-1"></div>

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
            <div class="text-white text-5xl capitalize font-code">{{ loadingText }}</div>
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

        for (let i = 0; i < 1500; i++) {
            const z = -(Math.random() * 400 + 100);

            const visibleHeight = 2 * Math.tan((60 * Math.PI) / 180 / 2) * Math.abs(z);
            const visibleWidth = visibleHeight * (window.innerWidth / window.innerHeight);

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

        bg_camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 3000);
        bg_camera.position.set(0, 0, -10);
        bg_camera.lookAt(0, 0, -100);

        bg_renderer = new THREE.WebGLRenderer({ antialias: true });
        bg_renderer.setSize(window.innerWidth, window.innerHeight);
        bg.value.appendChild(bg_renderer.domElement);

        bg_scene.fog = new THREE.FogExp2(0x111111, 0.0004);
        bg_renderer.setClearColor(bg_scene.fog.color);

        let loader = new THREE.TextureLoader();

        loader.load("../assets/clouds.png", (texture) => {
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
                alphaTest: 0.01,
                depthWrite: false,
            });

            const gaussianRand = () => {
                const theta = 2 * Math.PI * Math.random();
                const rho = Math.sqrt(-2 * Math.log(1 - Math.random()));
                return (rho * Math.cos(theta) + 1) / 2;
            };

            for (let p = 0; p < 25; p++) {
                let cloud = new THREE.Mesh(cloudGeo, cloudMaterial);

                const xSpread = 1200;
                const ySpread = 600;
                const zSpread = 200;

                const x = (gaussianRand() * 2 - 1) * xSpread * 0.5;
                const y = (gaussianRand() * 2 - 1) * ySpread * 0.5;
                const z = -700 + gaussianRand() * zSpread;

                cloud.position.set(x, y, z);
                cloud.rotateZ(Math.random() * Math.PI * 2);
                cloudParticles.push(cloud);
                bg_scene.add(cloud);
            }
        });

        const ambientLight = new THREE.AmbientLight(0x333333, 1);
        bg_scene.add(ambientLight);

        light_one = new THREE.PointLight(0xff0033, 15, 1000, 1);
        light_two = new THREE.PointLight(0x0033ff, 15, 1000, 1);
        light_three = new THREE.PointLight(0x00ff00, 15, 1000, 1);

        light_one.position.set(0, 300, -300);
        light_two.position.set(200, -300, -300);
        light_three.position.set(-200, -300, -300);

        bg_scene.add(light_one);
        bg_scene.add(light_two);
        bg_scene.add(light_three);

        const stars = createStars();
        bg_scene.add(stars);
    };

    const animate_bg = () => {
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

        cloudParticles.forEach((cloud, i) => {
            cloud.rotation.z += ((i % 3) + 1) * 0.00015;

            cloud.rotation.x = Math.sin(time * 0.2) * 0.01;
            cloud.rotation.y = Math.cos(time * 0.3) * 0.01;

            const distanceFromCenter = new THREE.Vector3().copy(cloud.position).distanceTo(new THREE.Vector3(0, 0, -700));

            const waveScale = 0.95 + Math.sin(time * Math.PI - distanceFromCenter * 0.005) * 0.005;

            const individualScale = 1 + Math.sin(time * 0.5 + i * 0.2) * 0.02;

            const finalScale = waveScale * individualScale;
            cloud.scale.set(finalScale, finalScale, finalScale);
        });

        bg_renderer.render(bg_scene, bg_camera);
    };

    function initScene() {
        scene = new THREE.Scene();

        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

        camera.position.set(25, 0, 25);

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

        // Add auto-rotation
        controls.autoRotate = true;
        controls.autoRotateSpeed = 1.0;

        // Add event listeners for user interaction
        controls.addEventListener("start", () => {
            // User started interacting
            controls.autoRotate = false;
        });

        // Listen for key events
        renderer.domElement.addEventListener("keydown", () => {
            controls.autoRotate = false;
        });

        // Listen for wheel events
        renderer.domElement.addEventListener("wheel", () => {
            controls.autoRotate = false;
        });

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 5, 5);
        scene.add(directionalLight);

        const sceneLight = new THREE.AmbientLight(0xffffff, 0.125);
        scene.add(sceneLight);

        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.1;
        directionalLight.shadow.camera.far = 100;
        directionalLight.shadow.camera.left = -15;
        directionalLight.shadow.camera.right = 15;
        directionalLight.shadow.camera.top = 15;
        directionalLight.shadow.camera.bottom = -15;
        directionalLight.shadow.bias = -0.001;
        directionalLight.position.set(10, 15, 10);
    }

    function animate() {
        requestAnimationFrame(animate);
        animate_bg();
        controls?.update();
        renderer?.render(scene, camera);
    }

    function onWindowResize() {
        if (camera && renderer) {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }

        if (bg_camera && bg_renderer) {
            bg_camera.aspect = window.innerWidth / window.innerHeight;
            bg_camera.updateProjectionMatrix();
            bg_renderer.setSize(window.innerWidth, window.innerHeight);
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

                gltf.scene.traverse((node) => {
                    if (node.isMesh) {
                        node.castShadow = true;
                        node.receiveShadow = true;
                        if (node.name.includes("display-case")) {
                            node.castShadow = false;
                        }

                        if (node.material) {
                            const materials = Array.isArray(node.material) ? node.material : [node.material];

                            materials.forEach((material) => {
                                material.shadowSide = THREE.FrontSide;

                                material.needsUpdate = true;
                            });
                        }
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
        initBG();
        initScene();
        animate();
        await loadModel();

        window.addEventListener("resize", onWindowResize);
        document.addEventListener("fullscreenchange", onFullscreenChange);
    });

    onUnmounted(() => {
        cleanupLoadingAnimation();
        window.removeEventListener("resize", onWindowResize);

        renderer?.domElement.removeEventListener("keydown", () => {
            controls.autoRotate = false;
        });

        renderer?.domElement.removeEventListener("wheel", () => {
            controls.autoRotate = false;
        });

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
