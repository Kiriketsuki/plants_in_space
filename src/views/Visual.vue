<template>
    <div
        ref="container"
        class="w-screen h-screen"></div>
</template>

<script>
    import { ref, onMounted, onBeforeUnmount } from "vue";
    import * as THREE from "three";

    export default {
        name: "Visual",
        setup() {
            const container = ref(null);
            let scene, camera, renderer, animationFrameId;
            let cloudGeo,
                cloudMaterial,
                cloudParticles = [];

            const init = () => {
                // Create scene
                scene = new THREE.Scene();

                // Create camera
                camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
                camera.position.z = 1;
                camera.rotation.x = 1.16;
                camera.rotation.y = -0.12;
                camera.rotation.z = 0.27;

                // Create renderer
                renderer = new THREE.WebGLRenderer({ antialias: true });
                renderer.setSize(window.innerWidth, window.innerHeight);
                container.value.appendChild(renderer.domElement);

                // Add ambient light
                const ambientLight = new THREE.AmbientLight(0x555555);
                scene.add(ambientLight);

                scene.fog = new THREE.FogExp2(0x03544e, 0.001);
                renderer.setClearColor(scene.fog.color);

                // loader
                let loader = new THREE.TextureLoader();
                loader.load("../assets/polyclouds.png", (texture) => {
                    console.log(texture);
                    cloudGeo = new THREE.PlaneGeometry(500, 500);
                    cloudMaterial = new THREE.MeshLambertMaterial({
                        map: texture,
                        transparent: true,
                    });

                    for (let p = 0; p < 25; p++) {
                        let cloud = new THREE.Mesh(cloudGeo, cloudMaterial);
                        console.log(cloud);
                        cloud.position.set(Math.random() * 800 - 400, 500, Math.random() * 500 - 450);
                        cloud.rotation.x = 1.16;
                        cloud.rotation.y = -0.12;
                        cloud.rotation.z = Math.random() * 360;
                        cloud.material.opacity = 0.25;
                        cloudParticles.push(cloud);
                        scene.add(cloud);
                    }
                });

                let directionalLight = new THREE.DirectionalLight(0xff8c19, 1);
                directionalLight.position.set(0, 0, 1);
                scene.add(directionalLight);

                let orangeLight = new THREE.PointLight(0xcc6600, 50, 450, 1.7);
                let orangeLightHelper = new THREE.PointLightHelper(orangeLight, 30);
                orangeLight.position.set(200, 300, 100);
                scene.add(orangeLight);
                scene.add(orangeLightHelper);
                let redLight = new THREE.PointLight(0xd8547e, 50, 450, 1.7);
                redLight.position.set(100, 300, 100);
                scene.add(redLight);
                let blueLight = new THREE.PointLight(0x3677ac, 50, 450, 1.7);
                blueLight.position.set(300, 300, 200);
                scene.add(blueLight);

                // Start animation loop
                animate();
            };

            const animate = () => {
                animationFrameId = requestAnimationFrame(animate);
                cloudParticles.forEach((p) => {
                    p.rotation.z -= 0.001;
                });
                renderer.render(scene, camera);
            };

            const handleResize = () => {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
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
                if (renderer) {
                    renderer.dispose();
                }
                if (scene) {
                    scene.traverse((object) => {
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
