<template>
    <div
        ref="container"
        class="w-screen h-screen"></div>
</template>

<script>
    import { ref, onMounted, onBeforeUnmount } from "vue";
    import * as THREE from "three";
    import GUI from "lil-gui";

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
        const bg_cameraFOV = 60;
        const bg_cameraPosition = new THREE.Vector3(21, 131, 144);
        const lookAtPoint = new THREE.Vector3(0, 0, -100);

        // Calculate bg_camera direction
        const bg_cameraDirection = new THREE.Vector3().subVectors(lookAtPoint, bg_cameraPosition).normalize();

        // Calculate bg_camera right and up vectors
        const bg_cameraUp = new THREE.Vector3(0, 1, 0);
        const bg_cameraRight = new THREE.Vector3().crossVectors(bg_cameraDirection, bg_cameraUp).normalize();
        const bg_cameraUpAdjusted = new THREE.Vector3().crossVectors(bg_cameraRight, bg_cameraDirection).normalize();

        // Gaussian random function
        const gaussianRand = () => {
            const theta = 2 * Math.PI * Math.random();
            const rho = Math.sqrt(-2 * Math.log(1 - Math.random()));
            return (rho * Math.cos(theta) + 1) / 2; // Normalize to 0-1 range
        };

        // Generate stars in view frustum
        for (let i = 0; i < 15000; i++) {
            // Use gaussian distribution for depth, centered around lookAtPoint.z
            const zSpread = 800; // Total depth range
            const gaussianZ = gaussianRand();
            const depth = (gaussianZ * 2 - 1) * zSpread; // Convert 0-1 to -zSpread to +zSpread
            const z = lookAtPoint.z + depth;

            // Calculate visible dimensions at this depth
            const distanceToPlane = Math.abs(bg_cameraPosition.distanceTo(new THREE.Vector3(0, 0, z)));
            const visibleHeight = 2 * Math.tan((bg_cameraFOV * Math.PI) / 360) * distanceToPlane;
            const visibleWidth = visibleHeight * (window.innerWidth / window.innerHeight);

            // Use gaussian distribution for x and y as well
            const xOffset = (gaussianRand() * 2 - 1) * visibleWidth;
            const yOffset = (gaussianRand() * 2 - 1) * visibleHeight;

            // Apply a density falloff based on distance from center
            const distanceFromCenter = Math.sqrt((xOffset / visibleWidth) ** 2 + (yOffset / visibleHeight) ** 2 + (depth / zSpread) ** 2);

            // Skip some stars based on distance from center to create natural falloff
            if (Math.random() < distanceFromCenter * 0.7) continue;

            // Calculate actual position using bg_camera orientation
            const position = new THREE.Vector3().copy(lookAtPoint).add(bg_cameraRight.clone().multiplyScalar(xOffset)).add(bg_cameraUpAdjusted.clone().multiplyScalar(yOffset)).add(bg_cameraDirection.clone().multiplyScalar(depth));

            starsVertices.push(position.x, position.y, position.z);
        }

        starsGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starsVertices, 3));
        const starSystem = new THREE.Points(starsGeometry, starsMaterial);
        return starSystem;
    };

    export default {
        name: "Visual",
        setup() {
            const container = ref(null);
            let bg_scene, bg_camera, bg_renderer, animationFrameId;
            let cloudGeo,
                cloudMaterial,
                cloudParticles = [];
            let light_one, light_two, light_three;
            let gui;

            const createGUI = () => {
                gui = new GUI();

                // bg_camera controls folder
                const bg_cameraFolder = gui.addFolder("bg_camera Position");
                bg_cameraFolder.add(bg_camera.position, "x", -1000, 1000).name("bg_camera X");
                bg_cameraFolder.add(bg_camera.position, "y", -1000, 1000).name("bg_camera Y");
                bg_cameraFolder.add(bg_camera.position, "z", -1000, 1000).name("bg_camera Z");

                // Light One controls
                const lightOneFolder = gui.addFolder("Light One");
                lightOneFolder.add(light_one.position, "x", -1000, 1000).name("Position X");
                lightOneFolder.add(light_one.position, "y", -1000, 1000).name("Position Y");
                lightOneFolder.add(light_one.position, "z", -1000, 1000).name("Position Z");
                lightOneFolder.add(light_one, "intensity", 0, 1000).name("Intensity");
                const lightOneColor = {
                    color: "#e38295",
                };
                lightOneFolder
                    .addColor(lightOneColor, "color")
                    .name("Color")
                    .onChange((value) => {
                        light_one.color.set(value);
                    });

                // Light Two controls
                const lightTwoFolder = gui.addFolder("Light Two");
                lightTwoFolder.add(light_two.position, "x", -1000, 1000).name("Position X");
                lightTwoFolder.add(light_two.position, "y", -1000, 1000).name("Position Y");
                lightTwoFolder.add(light_two.position, "z", -1000, 1000).name("Position Z");
                lightTwoFolder.add(light_two, "intensity", 0, 1000).name("Intensity");
                const lightTwoColor = {
                    color: "#0033ff",
                };
                lightTwoFolder
                    .addColor(lightTwoColor, "color")
                    .name("Color")
                    .onChange((value) => {
                        light_two.color.set(value);
                    });

                // Light Three controls
                const lightThreeFolder = gui.addFolder("Light Three");
                lightThreeFolder.add(light_three.position, "x", -1000, 1000).name("Position X");
                lightThreeFolder.add(light_three.position, "y", -1000, 1000).name("Position Y");
                lightThreeFolder.add(light_three.position, "z", -1000, 1000).name("Position Z");
                lightThreeFolder.add(light_three, "intensity", 0, 1000).name("Intensity");
                const lightThreeColor = {
                    color: "#eac086",
                };
                lightThreeFolder
                    .addColor(lightThreeColor, "color")
                    .name("Color")
                    .onChange((value) => {
                        light_three.color.set(value);
                    });
            };

            const init = () => {
                bg_scene = new THREE.Scene();
                bg_camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 3000);
                bg_camera.position.set(21, 131, 144);
                bg_camera.lookAt(0, 0, -100);

                bg_renderer = new THREE.WebGLRenderer({ antialias: true });
                bg_renderer.setSize(window.innerWidth, window.innerHeight);
                container.value.appendChild(bg_renderer.domElement);

                bg_scene.fog = new THREE.FogExp2(0x111111, 0.0004);
                bg_renderer.setClearColor(bg_scene.fog.color);

                let loader = new THREE.TextureLoader();

                loader.load("../assets/testclouds.png", (texture) => {
                    console.log("Loaded texture");
                    console.log(texture);
                    texture.minFilter = THREE.LinearFilter;
                    texture.magFilter = THREE.LinearFilter;
                    texture.anisotropy = bg_renderer.capabilities.getMaxAnisotropy();

                    cloudGeo = new THREE.PlaneGeometry(800, 800);
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

                    // Modified cloud generation to ensure parallel orientation
                    for (let p = 0; p < 25; p++) {
                        let cloud = new THREE.Mesh(cloudGeo, cloudMaterial);

                        const xSpread = 1200;
                        const ySpread = 600;
                        const zSpread = 200;

                        const x = (gaussianRand() * 2 - 1) * xSpread * 0.5;
                        const y = (gaussianRand() * 2 - 1) * ySpread * 0.5;
                        const z = -700 + gaussianRand() * zSpread;

                        cloud.position.set(x, y, z);

                        // Calculate the rotation to make clouds parallel to viewport
                        const viewMatrix = new THREE.Matrix4();
                        viewMatrix.lookAt(
                            new THREE.Vector3(21, 131, 144), // bg_camera position
                            new THREE.Vector3(0, 0, -100), // Look at point
                            new THREE.Vector3(0, 1, 0), // Up vector
                        );

                        // Extract rotation from view matrix
                        const rotation = new THREE.Euler().setFromRotationMatrix(viewMatrix);
                        cloud.rotation.copy(rotation);

                        // Add random rotation only around Z axis (perpendicular to view)
                        cloud.rotateZ(Math.random() * Math.PI * 2);

                        cloudParticles.push(cloud);
                        bg_scene.add(cloud);
                    }
                });

                const ambientLight = new THREE.AmbientLight(0x333333, 1);
                bg_scene.add(ambientLight);

                light_one = new THREE.PointLight(0xe38295, 865, 1000, 1);
                light_two = new THREE.PointLight(0x0033ff, 336, 1000, 1);
                light_three = new THREE.PointLight(0xeac086, 951, 1000, 1);

                // Keeping your light positions
                light_one.position.set(-102, 180, -250);
                light_two.position.set(200, 58, 21);
                light_three.position.set(-213, -201, -397);

                bg_scene.add(light_one);
                bg_scene.add(light_two);
                bg_scene.add(light_three);

                let helper_one = new THREE.PointLightHelper(light_one, 30);
                let helper_two = new THREE.PointLightHelper(light_two, 30);
                let helper_three = new THREE.PointLightHelper(light_three, 30);

                bg_scene.add(helper_one);
                bg_scene.add(helper_two);
                bg_scene.add(helper_three);

                const stars = createStars();
                bg_scene.add(stars);

                createGUI();
                animate();
            };

            const animate = () => {
                animationFrameId = requestAnimationFrame(animate);

                const time = Date.now() * 0.001;

                cloudParticles.forEach((cloud, i) => {
                    // Only rotate around Z axis to maintain parallel orientation
                    cloud.rotation.z += ((i % 3) + 1) * 0.00015;

                    const distanceFromCenter = new THREE.Vector3().copy(cloud.position).distanceTo(new THREE.Vector3(0, 0, -700));
                    const waveScale = 0.95 + Math.sin(time * Math.PI - distanceFromCenter * 0.005) * 0.005;
                    const individualScale = 1 + Math.sin(time * 0.5 + i * 0.2) * 0.02;
                    const finalScale = waveScale * individualScale;
                    cloud.scale.set(finalScale, finalScale, finalScale);
                });

                bg_renderer.render(bg_scene, bg_camera);
            };

            const handleResize = () => {
                bg_camera.aspect = window.innerWidth / window.innerHeight;
                bg_camera.updateProjectionMatrix();
                bg_renderer.setSize(window.innerWidth, window.innerHeight);
            };

            onMounted(() => {
                init();
                window.addEventListener("resize", handleResize);
            });

            onBeforeUnmount(() => {
                window.removeEventListener("resize", handleResize);
                if (animationFrameId) {
                    cancelAnimationFrame(animationFrameId);
                }
                if (bg_renderer) {
                    bg_renderer.dispose();
                }
                if (bg_scene) {
                    bg_scene.traverse((object) => {
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
                }
            });

            return { container };
        },
    };
</script>

<style scoped></style>
