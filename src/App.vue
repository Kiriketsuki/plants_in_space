<template>
    <div class="h-screen w-full bg-gray-100">
        <canvas
            ref="canvas"
            class="w-full h-full"></canvas>
    </div>
</template>

<script>
    import { ref, onMounted } from "vue";
    import * as THREE from "three";
    import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
    import GUI from "lil-gui";

    export default {
        setup() {
            const canvas = ref(null);

            onMounted(() => {
                const scene = new THREE.Scene();
                const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
                const renderer = new THREE.WebGLRenderer({ canvas: canvas.value });

                renderer.setSize(window.innerWidth, window.innerHeight);

                // Add OrbitControls
                const controls = new OrbitControls(camera, renderer.domElement);
                controls.enableDamping = true;

                const geometry = new THREE.BoxGeometry();
                const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
                const cube = new THREE.Mesh(geometry, material);
                scene.add(cube);

                // Add lighting
                const sceneLight = new THREE.AmbientLight(0xffffff, 0.5);
                scene.add(sceneLight);

                camera.position.z = 5;

                // Setup GUI
                const gui = new GUI();
                const cubeFolder = gui.addFolder("Cube");
                cubeFolder.add(cube.rotation, "x", 0, Math.PI * 2);
                cubeFolder.add(cube.rotation, "y", 0, Math.PI * 2);
                cubeFolder.add(cube.rotation, "z", 0, Math.PI * 2);
                cubeFolder.add(cube.position, "x", -3, 3);
                cubeFolder.add(cube.position, "y", -3, 3);
                cubeFolder.add(cube.position, "z", -3, 3);
                cubeFolder.addColor(material, "color");

                function animate() {
                    requestAnimationFrame(animate);
                    controls.update(); // Update controls in the animation loop
                    renderer.render(scene, camera);
                }

                animate();

                // Handle window resize
                window.addEventListener("resize", onWindowResize, false);
                function onWindowResize() {
                    camera.aspect = window.innerWidth / window.innerHeight;
                    camera.updateProjectionMatrix();
                    renderer.setSize(window.innerWidth, window.innerHeight);
                }
            });

            return { canvas };
        },
    };
</script>
