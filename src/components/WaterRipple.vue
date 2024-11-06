// WaterRipple.vue
<template>
    <div
        ref="container"
        class="water-container"></div>
</template>

<script>
    import * as THREE from "three";
    import { onMounted, onBeforeUnmount, ref } from "vue";

    export default {
        name: "WaterRipple",
        props: {
            radius: {
                type: Number,
                default: 10,
            },
            segments: {
                type: Number,
                default: 100,
            },
            color: {
                type: String,
                default: "#2288ff",
            },
            frequency: {
                type: Number,
                default: 6,
            },
            amplitude: {
                type: Number,
                default: 0.1,
            },
            speed: {
                type: Number,
                default: 15,
            },
            decay: {
                type: Number,
                default: 2.5,
            },
        },
        setup(props) {
            const container = ref(null);
            let scene;
            let camera;
            let renderer;
            let water;
            let matShader;
            let animationFrameId;

            // Initialize clicks array with inactive waves
            const clicksData = new Float32Array(40); // 10 clicks * 4 components
            for (let i = 0; i < 40; i += 4) {
                clicksData[i] = 0; // time
                clicksData[i + 1] = 0; // isAlive
                clicksData[i + 2] = 0; // unused
                clicksData[i + 3] = 0; // unused
            }
            let clicks = clicksData;

            const init = () => {
                if (!container.value) return;

                scene = new THREE.Scene();

                camera = new THREE.PerspectiveCamera(75, container.value.clientWidth / container.value.clientHeight, 0.1, 1000);
                camera.position.set(0, 4, 4);
                camera.lookAt(0, 0, 0);

                renderer = new THREE.WebGLRenderer({ antialias: true });
                renderer.setPixelRatio(window.devicePixelRatio);
                renderer.setSize(container.value.clientWidth, container.value.clientHeight);
                container.value.appendChild(renderer.domElement);

                // Changed from PlaneGeometry to CircleGeometry
                const geometry = new THREE.CircleGeometry(props.radius, props.segments);

                const material = new THREE.MeshPhongMaterial({
                    color: new THREE.Color(props.color),
                    shininess: 100,
                    side: THREE.DoubleSide,
                });

                material.onBeforeCompile = (shader) => {
                    shader.uniforms.time = { value: 0 };
                    shader.uniforms.clicks = { value: clicksData };
                    shader.uniforms.frequency = { value: props.frequency };
                    shader.uniforms.amplitude = { value: props.amplitude };
                    shader.uniforms.speed = { value: props.speed };
                    shader.uniforms.decay = { value: props.decay };

                    shader.vertexShader =
                        `
          uniform float time;
          uniform float frequency;
          uniform float amplitude;
          uniform float speed;
          uniform float decay;
          uniform vec4 clicks[10];

          float getWave(float dist, float clickTime, float isAlive) {
            if (isAlive < 0.5) return 0.0;
            
            float timeSince = time - clickTime;
            float phase = dist * frequency - timeSince * speed;
            
            // Decay based on time
            float envelope = exp(-timeSince * decay);
            
            // Spatial decay (waves get smaller as they move out)
            float spatialDecay = 1.0 / (1.0 + dist * 0.5);
            
            return sin(phase) * amplitude * envelope * spatialDecay;
          }
        ` + shader.vertexShader;

                    const token = "#include <begin_vertex>";
                    const customTransform = `
          vec3 transformed = vec3(position);
          
          float dx = position.x;
          float dy = position.y;
          float dist = sqrt(dx*dx + dy*dy);
          
          // Only apply wave effect within the circle radius
          if (dist <= ${props.radius.toFixed(1)}) {
            float totalDisplacement = 0.0;
            vec3 totalNormal = vec3(0.0, 0.0, 1.0);
            
            for(int i = 0; i < 10; i++) {
              float clickTime = clicks[i].x;
              float isAlive = clicks[i].y;
              
              float displacement = getWave(dist, clickTime, isAlive);
              totalDisplacement += displacement;
              
              if (isAlive > 0.5) {
                float dzdx = displacement * dx/dist;
                float dzdy = displacement * dy/dist;
                totalNormal += vec3(-dzdx, -dzdy, 0.0);
              }
            }
            
            transformed.z += totalDisplacement;
            objectNormal = normalize(totalNormal);
          } else {
            transformed.z = 0.0;
            objectNormal = vec3(0.0, 0.0, 1.0);
          }
          
          vNormal = normalMatrix * objectNormal;
        `;

                    shader.vertexShader = shader.vertexShader.replace(token, customTransform);
                    matShader = shader;
                };

                water = new THREE.Mesh(geometry, material);
                water.rotation.x = -Math.PI / 2;
                scene.add(water);

                const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
                scene.add(ambientLight);

                const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
                directionalLight.position.set(2, 2, 4);
                scene.add(directionalLight);

                animate(0);
            };

            const handleClick = () => {
                // Find first inactive slot or oldest slot
                let slotIndex = 0;
                for (let i = 0; i < 40; i += 4) {
                    if (clicks[i + 1] === 0) {
                        slotIndex = i;
                        break;
                    }
                }
                if (clicks[slotIndex + 1] !== 0) {
                    // All slots active, use the first (oldest) slot
                    slotIndex = 0;
                }

                // Update click data
                clicks[slotIndex] = performance.now() / 1000; // time
                clicks[slotIndex + 1] = 1; // isAlive
                clicks[slotIndex + 2] = 0; // unused
                clicks[slotIndex + 3] = 0; // unused

                if (matShader) {
                    matShader.uniforms.clicks.value = clicks;
                }
            };

            const animate = (time) => {
                time = time / 1000;

                if (matShader) {
                    matShader.uniforms.time.value = time;

                    // Update wave states
                    for (let i = 0; i < 40; i += 4) {
                        if (clicks[i + 1] > 0) {
                            // if wave is alive
                            const timeSince = time - clicks[i];
                            if (timeSince > 5) {
                                clicks[i + 1] = 0; // deactivate wave
                            }
                        }
                    }
                }

                renderer.render(scene, camera);
                animationFrameId = requestAnimationFrame(animate);
            };

            const handleResize = () => {
                if (!container.value || !renderer || !camera) return;

                const width = container.value.clientWidth;
                const height = container.value.clientHeight;

                camera.aspect = width / height;
                camera.updateProjectionMatrix();

                renderer.setSize(width, height);
                renderer.setPixelRatio(window.devicePixelRatio);
            };

            onMounted(() => {
                init();
                window.addEventListener("resize", handleResize);
                window.addEventListener("click", handleClick);
            });

            onBeforeUnmount(() => {
                window.removeEventListener("resize", handleResize);
                window.removeEventListener("click", handleClick);

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

<style scoped>
    .water-container {
        width: 100%;
        height: 100vh;
        cursor: pointer;
    }
</style>
