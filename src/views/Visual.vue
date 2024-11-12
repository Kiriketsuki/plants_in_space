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

    export default {
        name: "Visual",
        setup() {
            const container = ref(null);
            let scene, camera, renderer, animationFrameId;
            let cloudGeo,
                cloudMaterial,
                cloudParticles = [];
            let light_one, light_two, light_three;
            const init = () => {
                // Create scene
                scene = new THREE.Scene();

                // Create camera - positioned to look down -Z axis
                camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 3000); // Increased far plane
                camera.position.set(0, 0, -10);
                camera.lookAt(0, 0, -100);

                // Create renderer
                renderer = new THREE.WebGLRenderer({ antialias: true });
                renderer.setSize(window.innerWidth, window.innerHeight);
                container.value.appendChild(renderer.domElement);

                // Fog - reduced density to see further
                scene.fog = new THREE.FogExp2(0x111111, 0.0004);
                renderer.setClearColor(scene.fog.color);

                // loader
                let loader = new THREE.TextureLoader();

                // In the init function, modify the texture loader section:

                loader.load("../assets/polyclouds.png", (texture) => {
                    // Improve texture filtering
                    texture.minFilter = THREE.LinearFilter;
                    texture.magFilter = THREE.LinearFilter;
                    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

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
                        scene.add(cloud);
                    }
                });

                // Add ambient light to provide base illumination
                const ambientLight = new THREE.AmbientLight(0x333333, 1);
                scene.add(ambientLight);

                // Adjust point lights - increased intensity and brought closer to clouds
                light_one = new THREE.PointLight(0xff0033, 150, 1000, 1);
                light_two = new THREE.PointLight(0x0033ff, 150, 1000, 1);
                light_three = new THREE.PointLight(0x00ff00, 150, 1000, 1);

                let helper_one = new THREE.PointLightHelper(light_one, 30);
                let helper_two = new THREE.PointLightHelper(light_two, 30);
                let helper_three = new THREE.PointLightHelper(light_three, 30);

                // Position lights between camera and clouds
                light_one.position.set(0, 300, -300);
                light_two.position.set(200, -300, -300);
                light_three.position.set(-200, -300, -300);

                scene.add(light_one);
                scene.add(light_two);
                scene.add(light_three);

                scene.add(helper_one);
                scene.add(helper_two);
                scene.add(helper_three);

                const stars = createStars();
                scene.add(stars);

                // Start animation loop
                animate();
            };

            const animate = () => {
                animationFrameId = requestAnimationFrame(animate);

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
