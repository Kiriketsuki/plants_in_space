<template>
    <div class="h-screen w-full bg-black">
        <div class="absolute left-2 top-0 h-full w-64 flex flex-col p-4 bg-black/50">
            <div class="z-10 space-y-4">
                <div class="space-x-4">
                    <button
                        @click="startVisualization"
                        :disabled="isRecording"
                        class="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400">
                        Start
                    </button>
                    <button
                        @click="stopVisualization"
                        :disabled="!isRecording"
                        class="px-4 py-2 bg-red-500 text-white rounded disabled:bg-gray-400">
                        Stop
                    </button>
                </div>

                <div class="text-white">
                    <h3 class="text-lg font-bold mb-2">Top Frequencies</h3>
                    <div class="space-y-2">
                        <div
                            v-for="(freq, index) in topFrequencies"
                            :key="index"
                            class="flex items-center gap-2 max-w-[200px]">
                            <div
                                class="h-3 rounded min-w-[20px]"
                                :style="{
                                    width: `${Math.min(freq.intensity, 100)}%`,
                                    backgroundColor: `rgb(${freq.color.join(',')})`,
                                }"></div>
                            <span class="text-sm whitespace-nowrap flex-shrink-0"> {{ formatFrequency(freq.frequency) }} Hz ({{ Math.round(freq.intensity) }}%) </span>
                        </div>
                    </div>
                </div>

                <div class="text-white mt-4">
                    <h3 class="text-lg font-bold mb-2">Tempo Analysis</h3>
                    <div class="flex items-center gap-4">
                        <div :class="['text-3xl', beatIndicatorActive ? 'text-red-500' : '']">{{ currentBPM || "--" }} BPM</div>
                        <div class="w-20 h-2 bg-gray-700 rounded">
                            <div
                                class="h-full bg-green-500 rounded transition-all duration-300"
                                :style="{ width: `${bpmConfidence * 100}%` }"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div
                class="absolute bottom-4 left-4 right-4 h-[100%] pointer-events-none text-white text-xs"
                ref="frequencyLabels"></div>
        </div>
        <canvas
            ref="canvas"
            class="w-full h-full"></canvas>
    </div>
</template>

<script>
    import { ref, onMounted, onBeforeUnmount } from "vue";
    import * as THREE from "three";
    import { AudioHandler } from "../components/audioHandler";

    export class BPMDetector {
        constructor() {
            this.minBPM = 60;
            this.maxBPM = 200;
            this.energyThreshold = 0.15;
            this.beatHistory = [];
            this.lastBeat = 0;
            this.currentBPM = 0;
            this.tempoBins = new Array(201).fill(0); // Store tempo votes
            this.historyLength = 2; // 2 seconds history
            this.decayRate = 0.05; // Decay rate for tempo bins
        }

        analyzeEnergy(audioData) {
            // Focus only on low frequencies (bass drum range)
            const lowFreqRange = Math.floor(audioData.length * 0.1); // Look at bottom 10% of frequencies
            let bassEnergy = 0;

            // Calculate bass energy
            for (let i = 0; i < lowFreqRange; i++) {
                bassEnergy += (audioData[i] / 255) ** 2;
            }
            bassEnergy = Math.sqrt(bassEnergy / lowFreqRange);

            const now = performance.now();

            // Decay tempo bins
            for (let i = 0; i < this.tempoBins.length; i++) {
                this.tempoBins[i] *= 1 - this.decayRate;
            }

            // Keep recent beat history
            while (this.beatHistory.length > 0 && now - this.beatHistory[0] > this.historyLength * 1000) {
                this.beatHistory.shift();
            }

            // Beat detection
            let isBeat = false;
            if (bassEnergy > this.energyThreshold && now - this.lastBeat > 200) {
                isBeat = true;
                this.lastBeat = now;
                this.beatHistory.push(now);

                // Calculate intervals and update BPM
                if (this.beatHistory.length >= 2) {
                    const recentIntervals = [];
                    for (let i = 1; i < this.beatHistory.length; i++) {
                        const interval = this.beatHistory[i] - this.beatHistory[i - 1];
                        const bpm = Math.round(60000 / interval);
                        if (bpm >= this.minBPM && bpm <= this.maxBPM) {
                            recentIntervals.push(bpm);
                        }
                    }

                    if (recentIntervals.length > 0) {
                        // Update tempo bins
                        recentIntervals.forEach((bpm) => {
                            // Add weight to nearby BPMs
                            for (let i = -2; i <= 2; i++) {
                                const binIndex = bpm + i;
                                if (binIndex >= this.minBPM && binIndex <= this.maxBPM) {
                                    this.tempoBins[binIndex] += 1 - Math.abs(i) * 0.1;
                                }
                            }
                        });

                        // Find strongest tempo
                        let maxValue = 0;
                        let maxIndex = 0;
                        for (let i = this.minBPM; i <= this.maxBPM; i++) {
                            if (this.tempoBins[i] > maxValue) {
                                maxValue = this.tempoBins[i];
                                maxIndex = i;
                            }
                        }

                        if (maxValue > 3) {
                            this.currentBPM = maxIndex;
                        }
                    }
                }
            }

            // Reset if no beats for too long
            if (now - this.lastBeat > 2000) {
                this.currentBPM = 0;
            }

            const confidence = Math.min(1, this.beatHistory.length / 4);

            return {
                energy: bassEnergy,
                bpm: this.currentBPM,
                isBeat,
                confidence,
            };
        }

        reset() {
            this.beatHistory = [];
            this.lastBeat = 0;
            this.currentBPM = 0;
            this.tempoBins.fill(0);
        }
    }

    export default {
        name: "SpectrogramView",
        setup() {
            const canvas = ref(null);
            const frequencyLabels = ref(null);
            const audioHandler = new AudioHandler();
            const isRecording = ref(false);
            const currentDeviceId = ref(null);

            // BPM Detection
            const bpmDetector = new BPMDetector();
            const currentBPM = ref(0);
            const bpmConfidence = ref(0);
            const beatIndicatorActive = ref(false);

            let scene, camera, renderer;
            let spectrogramTexture, spectrogramMesh;
            const WIDTH = 512;
            const HEIGHT = 256;
            const Y_AXIS_MARGIN = 0.15;

            const topFrequencies = ref([]);
            const NUM_TOP_FREQUENCIES = 5;

            const formatFrequency = (freq) => {
                if (freq >= 1000) {
                    return (freq / 1000).toFixed(1) + "k";
                }
                return Math.round(freq);
            };

            const analyzeTopFrequencies = (audioData) => {
                const sampleRate = 48000;
                const frequencies = [];
                const binCount = audioData.length;
                const binToFreq = (binIndex) => (binIndex * sampleRate) / (2 * binCount);

                for (let i = 0; i < binCount; i++) {
                    const frequency = binToFreq(i);
                    if (frequency < 20 || frequency > 20000) continue;

                    const intensity = (audioData[i] / 255) * 100;
                    if (intensity > 10) {
                        frequencies.push({
                            frequency,
                            intensity,
                            color: intensityToColor(audioData[i]),
                            binIndex: i,
                        });
                    }
                }

                frequencies.sort((a, b) => b.intensity - a.intensity);
                topFrequencies.value = frequencies.slice(0, NUM_TOP_FREQUENCIES);
            };

            const createFrequencyLabels = () => {
                if (!frequencyLabels.value) return;

                const container = frequencyLabels.value;
                container.innerHTML = "";

                const labels = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];

                labels.forEach((freq) => {
                    const label = document.createElement("div");
                    label.className = "absolute right-0 transform -translate-y-1/2";
                    const normalizedY = 1 - Math.log10(freq / 20) / Math.log10(20000 / 20);
                    label.style.top = `${normalizedY * 100}%`;
                    label.textContent = freq >= 1000 ? `${freq / 1000}k` : freq;
                    container.appendChild(label);
                });
            };

            const createSpectrogramTexture = () => {
                const data = new Uint8Array(WIDTH * HEIGHT * 4);
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = 0;
                    data[i + 1] = 0;
                    data[i + 2] = 0;
                    data[i + 3] = 255;
                }

                const texture = new THREE.DataTexture(data, WIDTH, HEIGHT, THREE.RGBAFormat, THREE.UnsignedByteType);
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.needsUpdate = true;

                return texture;
            };

            const initThreeJS = () => {
                scene = new THREE.Scene();
                scene.background = new THREE.Color(0x000000);

                const aspect = window.innerWidth / window.innerHeight;
                camera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1, 0.1, 10);
                camera.position.z = 1;

                renderer = new THREE.WebGLRenderer({
                    canvas: canvas.value,
                    antialias: true,
                    alpha: true,
                });
                renderer.setPixelRatio(window.devicePixelRatio);
                renderer.setSize(window.innerWidth, window.innerHeight);

                spectrogramTexture = createSpectrogramTexture();

                const visibleWidth = 2 * aspect * (1 - Y_AXIS_MARGIN);
                const geometry = new THREE.PlaneGeometry(visibleWidth, 2);
                const material = new THREE.MeshBasicMaterial({
                    map: spectrogramTexture,
                    side: THREE.FrontSide,
                    transparent: true,
                });

                spectrogramMesh = new THREE.Mesh(geometry, material);
                spectrogramMesh.position.x = aspect * Y_AXIS_MARGIN;
                scene.add(spectrogramMesh);

                renderer.render(scene, camera);
                createFrequencyLabels();
            };

            const intensityToColor = (intensity) => {
                const normalized = intensity / 255;
                let r, g, b;

                if (normalized < 0.5) {
                    const t = normalized * 2;
                    r = 0;
                    g = Math.floor(255 * t);
                    b = Math.floor(255 * (1 - t));
                } else {
                    const t = (normalized - 0.5) * 2;
                    r = Math.floor(255 * t);
                    g = Math.floor(255 * (1 - t));
                    b = 0;
                }

                return [r, g, b];
            };

            const shiftTextureRight = (data) => {
                for (let y = 0; y < HEIGHT; y++) {
                    for (let x = WIDTH - 1; x >= 1; x--) {
                        const currentIndex = (y * WIDTH + x) * 4;
                        const prevIndex = (y * WIDTH + (x - 1)) * 4;

                        data[currentIndex] = data[prevIndex];
                        data[currentIndex + 1] = data[prevIndex + 1];
                        data[currentIndex + 2] = data[prevIndex + 2];
                        data[currentIndex + 3] = data[prevIndex + 3];
                    }
                }
            };

            const updateSpectrogram = (audioData) => {
                if (!spectrogramTexture || !audioData) return;

                analyzeTopFrequencies(audioData);
                const data = spectrogramTexture.image.data;

                const bpmData = bpmDetector.analyzeEnergy(audioData);
                if (bpmData.bpm > 0) {
                    currentBPM.value = bpmData.bpm;
                    bpmConfidence.value = bpmData.confidence;
                }

                if (bpmData.isBeat) {
                    beatIndicatorActive.value = true;
                    setTimeout(() => {
                        beatIndicatorActive.value = false;
                    }, 50);
                }

                shiftTextureRight(data);

                for (let y = 0; y < HEIGHT; y++) {
                    const normalizedY = y / HEIGHT;
                    const minFreq = 20;
                    const maxFreq = 20000;
                    const freq = minFreq * Math.pow(maxFreq / minFreq, normalizedY);

                    const binIndex = Math.floor((freq * audioData.length * 2) / 48000);

                    if (binIndex < audioData.length) {
                        const intensity = audioData[binIndex];
                        const [r, g, b] = intensityToColor(intensity);

                        const textureIndex = y * WIDTH * 4;
                        data[textureIndex] = r;
                        data[textureIndex + 1] = g;
                        data[textureIndex + 2] = b;
                        data[textureIndex + 3] = 255;
                    }
                }

                spectrogramTexture.needsUpdate = true;
            };

            let animationFrameId = null;

            const animate = () => {
                if (!isRecording.value) return;

                const audioData = audioHandler.getAnalyserData(currentDeviceId.value);
                if (audioData) {
                    updateSpectrogram(audioData);
                    renderer.render(scene, camera);
                }

                animationFrameId = requestAnimationFrame(animate);
            };

            const startVisualization = async () => {
                if (isRecording.value) return;

                const devices = await audioHandler.getAudioDevices();
                if (devices.length === 0) {
                    console.error("No microphones found");
                    return;
                }

                if (spectrogramTexture) {
                    const data = spectrogramTexture.image.data;
                    for (let i = 0; i < data.length; i += 4) {
                        data[i] = 0;
                        data[i + 1] = 0;
                        data[i + 2] = 0;
                        data[i + 3] = 255;
                    }
                    spectrogramTexture.needsUpdate = true;
                }

                currentDeviceId.value = devices[0].deviceId;
                await audioHandler.startRecording([currentDeviceId.value]);
                isRecording.value = true;
                animate();
            };

            const stopVisualization = () => {
                audioHandler.stopRecording();
                isRecording.value = false;
                topFrequencies.value = [];
                bpmDetector.reset();
                currentBPM.value = 0;
                bpmConfidence.value = 0;
                if (animationFrameId) {
                    cancelAnimationFrame(animationFrameId);
                }
            };

            const handleResize = () => {
                if (!camera || !renderer) return;

                const aspect = window.innerWidth / window.innerHeight;

                camera.left = -aspect;
                camera.right = aspect;
                camera.updateProjectionMatrix();

                if (spectrogramMesh) {
                    spectrogramMesh.geometry.dispose();
                    const visibleWidth = 2 * aspect * (1 - Y_AXIS_MARGIN);
                    spectrogramMesh.geometry = new THREE.PlaneGeometry(visibleWidth, 2);
                    spectrogramMesh.position.x = aspect * Y_AXIS_MARGIN;
                }

                renderer.setSize(window.innerWidth, window.innerHeight);
                createFrequencyLabels();
            };

            onMounted(() => {
                initThreeJS();
                window.addEventListener("resize", handleResize);
            });

            onBeforeUnmount(() => {
                stopVisualization();
                window.removeEventListener("resize", handleResize);

                if (spectrogramMesh) {
                    spectrogramMesh.geometry.dispose();
                    spectrogramMesh.material.dispose();
                }
                if (spectrogramTexture) {
                    spectrogramTexture.dispose();
                }
                if (renderer) {
                    renderer.dispose();
                }
            });

            return {
                canvas,
                frequencyLabels,
                isRecording,
                startVisualization,
                stopVisualization,
                topFrequencies,
                formatFrequency,
                currentBPM,
                bpmConfidence,
                beatIndicatorActive,
            };
        },
    };
</script>

<style scoped>
    .frequency-label {
        position: absolute;
        right: 0;
        transform: translateY(-50%);
        color: white;
        font-size: 0.75rem;
    }
</style>
