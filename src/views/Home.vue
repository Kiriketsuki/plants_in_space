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
    import gsap from "gsap";

    class Node {
        constructor(x, y, z, type, parent = null) {
            this.x = x;
            this.y = y;
            this.z = z;
            this.targetX = x;
            this.targetY = y;
            this.targetZ = z;
            this.type = type;
            this.parent = parent;
            this.children = [];
            this.moveSpeed = 1;
            this.depth = this.calculateDepth();
            this.height = this.calculateHeight();
            this.leafCount = 0;
        }

        calculateDepth() {
            if (this.type === "seed") return 0;
            if (this.type === "stalk") return 0;
            if (this.type === "branch") return 0;
            if (this.type === "leaf") return this.parent ? this.parent.depth + 1 : 0;

            let currentNode = this;
            let depth = 0;

            while (currentNode.parent) {
                if (currentNode.parent.type === "seed" || currentNode.parent.type === "stalk" || currentNode.parent.type === "branch") {
                    return depth + 1;
                }
                currentNode = currentNode.parent;
                depth++;
            }

            return depth;
        }

        calculateHeight() {
            if (this.type === "seed") return 0;
            if (this.type === "leaf") return this.parent ? this.parent.height : 0;
            if (this.type === "stalk") {
                let height = 0;
                let current = this;
                while (current.parent) {
                    if (current.parent.type === "stalk" || current.parent.type === "seed") {
                        height++;
                    }
                    current = current.parent;
                }
                return height;
            }
            if (this.type === "branch") {
                let current = this;
                while (current.parent) {
                    if (current.parent.type === "stalk") {
                        return current.parent.height;
                    }
                    current = current.parent;
                }
            }
            return 0;
        }

        addChild(child) {
            this.children.push(child);
        }

        toString() {
            return `Node(${this.x}, ${this.y}, ${this.z}, type=${this.type}, depth=${this.depth}, children=${this.children.length})`;
        }
    }

    export default {
        setup() {
            const canvas = ref(null);

            onMounted(() => {
                const scene = new THREE.Scene();
                const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
                const renderer = new THREE.WebGLRenderer({ canvas: canvas.value });
                renderer.setSize(window.innerWidth, window.innerHeight);

                // const controls = new OrbitControls(camera, renderer.domElement);
                // controls.enableDamping = true;

                const sceneLight = new THREE.AmbientLight(0xffffff, 0.5);
                scene.add(sceneLight);

                // grid representing the water

                const gridHelper = new THREE.GridHelper(10, 10);
                const gridHelperMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff, opacity: 0.2, transparent: true });
                gridHelper.material = gridHelperMaterial;
                scene.add(gridHelper);

                // camera setup

                const cameraTarget = new THREE.Vector3(0, 0, 0);
                let currentRadius = 10; // Start with 15 units radius
                let rotationSpeed = 0.2; // Full rotations per second

                // Set initial camera position
                camera.position.x = currentRadius;
                camera.position.z = 0;
                camera.position.y = 1.5;
                camera.lookAt(cameraTarget);

                function updateCameraPosition(time) {
                    const angle = time * rotationSpeed * Math.PI * 2;
                    camera.position.x = Math.cos(angle) * currentRadius;
                    camera.position.z = Math.sin(angle) * currentRadius;
                    camera.lookAt(new THREE.Vector3(0, camera.position.y, 0));
                }

                function animateCameraForStalk() {
                    const nextRadius = currentRadius + 0.5;
                    const nextHeight = camera.position.y + 1;

                    gsap.to(camera.position, {
                        y: nextHeight,
                        duration: 1,
                        ease: "power2.inOut",
                    });

                    gsap.to(cameraTarget, {
                        y: nextHeight,
                        duration: 1,
                        ease: "power2.inOut",
                    });

                    gsap.to(
                        { value: currentRadius },
                        {
                            value: nextRadius,
                            duration: 1,
                            ease: "power2.inOut",
                            onUpdate: function () {
                                currentRadius = this.targets()[0].value;
                            },
                        },
                    );

                    gsap.to(musicEmitter.position, {
                        y: nextHeight - 0.5,
                        duration: 1,
                        ease: "power2.inOut",
                    });
                }

                // Create music emitter
                const musicEmitterGeometry = new THREE.SphereGeometry(0.1, 12, 12);
                const musicEmitterMaterial = new THREE.MeshPhongMaterial({
                    color: 0xff0000,
                    emissive: 0xff0000,
                    emissiveIntensity: 0.5,
                });
                const musicEmitter = new THREE.Mesh(musicEmitterGeometry, musicEmitterMaterial);
                scene.add(musicEmitter);

                // Music emitter animation properties
                const musicEmitterRadius = 8;
                let musicEmitterSpeed = 0;
                let musicEmitterBaseSpeed = 0.00125;
                let musicEmitterAngle = 0;

                // Mouse position tracking
                let mouseX = 0;

                function updateMusicEmitterSpeed(x) {
                    const windowWidth = window.innerWidth;
                    const centerX = windowWidth / 2;
                    const normalizedX = (x - centerX) / centerX; // Range: -1 to 1
                    const absX = Math.abs(normalizedX);
                    const direction = normalizedX < 0 ? 1 : -1;

                    // Define speed zones
                    if (absX <= 0.1) {
                        // Center 10% - no movement
                        musicEmitterSpeed = 0;
                    } else if (absX <= 0.25) {
                        // 10-25% - speed 0.75
                        musicEmitterSpeed = 0.5 * direction * musicEmitterBaseSpeed;
                    } else if (absX <= 0.5) {
                        // 25-50% - speed 1.5
                        musicEmitterSpeed = 0.75 * direction * musicEmitterBaseSpeed;
                    } else {
                        // 50-100% - speed 3
                        musicEmitterSpeed = 1 * direction * musicEmitterBaseSpeed;
                    }
                }
                // Add mouse move event listener
                window.addEventListener("mousemove", (event) => {
                    mouseX = event.clientX;
                    updateMusicEmitterSpeed(mouseX);
                });

                // Start the music emitter animation
                musicEmitter.position.set(musicEmitterRadius, 0, 0);

                // leaf and node setup

                const leafGeometry = new THREE.CircleGeometry(0.15, 32);
                const nodeGeometry = new THREE.SphereGeometry(0.051);

                const nodeColors = {
                    seed: 0x8b4513,
                    root: 0x4b2b15,
                    stalk: 0x8b4513,
                    branch: 0x228b22,
                    leaf: 0x2e8b57,
                };

                const nodes = {
                    seed: [],
                    root: [],
                    stalk: [],
                    branch: [],
                    leaf: [],
                };

                const nodeObjects = new THREE.Group();
                const connectionObjects = new THREE.Group();
                scene.add(nodeObjects);
                scene.add(connectionObjects);

                const MAX_ROOT_DEPTH = 4;
                const MAX_BRANCH_LENGTH = 3;
                const MAX_CHILDREN = 2;
                const MAX_STALK_BRANCHES = 3;
                const X_VARIANCE = 1;
                const Z_VARIANCE = 1;
                const ANIM_SPEED = 10;
                const emitterInfluence = 1;

                const growthConfig = {
                    15: "root",
                    1000: "leaf",
                };

                let firstFork = -1;
                let lastUsedForkIndex = 0;

                function addNode(x, y, z, type, parent = null, targetPos = null) {
                    const node = new Node(x, y, z, type, parent);
                    nodes[type].push(node);

                    if (parent) {
                        parent.addChild(node);
                        if (type === "leaf") {
                            parent.leafCount++;
                        }
                    }

                    if (targetPos) {
                        node.targetX = targetPos.x;
                        node.targetY = targetPos.y;
                        node.targetZ = targetPos.z;
                    }

                    const nodeColor = nodeColors[type];
                    const nodeMaterial = new THREE.MeshPhongMaterial({ color: nodeColor });

                    let nodeMesh;
                    if (type === "leaf") {
                        nodeMesh = new THREE.Mesh(leafGeometry, nodeMaterial);
                        // Set initial scale to 0 for leaves
                        nodeMesh.scale.set(0, 0, 0);
                        // Add target scale property for animation
                        node.targetScale = 1;
                        // Random rotation for variety
                        nodeMesh.rotation.x = Math.random() * Math.PI;
                        nodeMesh.rotation.y = Math.random() * Math.PI;
                        nodeMesh.rotation.z = Math.random() * Math.PI;
                    } else {
                        nodeMesh = new THREE.Mesh(nodeGeometry, nodeMaterial);
                    }

                    nodeMesh.position.set(x, y, z);
                    nodeObjects.add(nodeMesh);

                    node.mesh = nodeMesh;

                    if (parent && type !== "leaf") {
                        // Only create connection lines for non-leaf nodes
                        const connectionGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(parent.x, parent.y, parent.z), new THREE.Vector3(x, y, z)]);
                        const connectionMaterial = new THREE.LineBasicMaterial({ color: nodeColor });
                        const connectionLine = new THREE.Line(connectionGeometry, connectionMaterial);
                        connectionObjects.add(connectionLine);

                        node.connectionLine = connectionLine;
                    }

                    return node;
                }

                function calculateTargetPosition(parentNode, type) {
                    let targetX, targetY, targetZ;

                    // Get emitter influence direction for all types
                    const emitterDirX = musicEmitter.position.x - parentNode.x;
                    const emitterDirZ = musicEmitter.position.z - parentNode.z;
                    const emitterDist = Math.sqrt(emitterDirX * emitterDirX + emitterDirZ * emitterDirZ);
                    const emitterAngle = Math.atan2(emitterDirZ, emitterDirX);

                    if (type === "leaf") {
                        const randomAngle = Math.random() * Math.PI * 2;
                        const blendedAngle = randomAngle * (1 - emitterInfluence) + emitterAngle * emitterInfluence;
                        const radius = 0.2;

                        targetX = parentNode.x + Math.cos(blendedAngle) * radius;
                        targetY = parentNode.y + (Math.random() * 0.2 - 0.1);
                        targetZ = parentNode.z + Math.sin(blendedAngle) * radius;
                        return { x: targetX, y: targetY, z: targetZ };
                    }

                    switch (type) {
                        case "root": {
                            const randomAngle = Math.random() * 2 * Math.PI;
                            const varianceScale = 1 - emitterInfluence;
                            const baseVariance = ((Math.random() * 2 * 360) / MAX_STALK_BRANCHES - 360 / MAX_STALK_BRANCHES) * (Math.PI / 180);
                            const variance = baseVariance * varianceScale;

                            const blendedAngle = randomAngle * (1 - emitterInfluence) + emitterAngle * emitterInfluence + variance;

                            targetY = parentNode.y - 1;
                            targetX = parentNode.x + Math.cos(blendedAngle) * X_VARIANCE;
                            targetZ = parentNode.z + Math.sin(blendedAngle) * Z_VARIANCE;
                            break;
                        }
                        case "stalk": {
                            targetY = parentNode.y + 1;

                            if (parentNode.height === 3) {
                                const forkDirection = firstFork;
                                firstFork = firstFork * -1;

                                // Blend the forking direction with emitter influence
                                const forkAngle = Math.atan2(forkDirection, -forkDirection);

                                targetX = parentNode.x + Math.cos(forkAngle);
                                targetZ = parentNode.z + Math.sin(forkAngle);
                            } else {
                                const randomAngle = Math.random() * 2 * Math.PI;
                                const blendedAngle = randomAngle * (1 - emitterInfluence) + emitterAngle * emitterInfluence;
                                const variance = X_VARIANCE * 0.5;

                                targetX = parentNode.x + Math.cos(blendedAngle) * variance;
                                targetZ = parentNode.z + Math.sin(blendedAngle) * variance;
                            }
                            break;
                        }
                        case "branch": {
                            if (parentNode.type === "stalk") {
                                const branchIndex = parentNode.children.length;
                                const anglePerBranch = 360 / MAX_STALK_BRANCHES;
                                const heightRotation = parentNode.height * 30;
                                const startAngle = heightRotation * (Math.PI / 180);
                                const baseAngle = branchIndex * anglePerBranch * (Math.PI / 180) + startAngle;

                                // Blend the regular branch angle with emitter influence
                                const blendedAngle = baseAngle * (1 - emitterInfluence) + emitterAngle * emitterInfluence;

                                const baseRadius = 1.0;
                                const heightScale = 0.95;
                                const radius = Math.pow(heightScale, parentNode.height) * baseRadius;

                                targetX = parentNode.x + radius * Math.cos(blendedAngle);
                                targetZ = parentNode.z + radius * Math.sin(blendedAngle);
                                targetY = parentNode.y + (Math.random() * 2 - 1) * 0.125;
                            } else {
                                const stalkParent = findStalkParent(parentNode);
                                if (stalkParent) {
                                    const dirX = parentNode.x - stalkParent.x;
                                    const dirZ = parentNode.z - stalkParent.z;
                                    const length = Math.sqrt(dirX * dirX + dirZ * dirZ);

                                    if (length > 0) {
                                        let currentAngle = Math.atan2(dirZ, dirX);
                                        const varianceScale = 1 - emitterInfluence;
                                        const baseVariance = ((Math.random() * 2 * 360) / MAX_STALK_BRANCHES - 360 / MAX_STALK_BRANCHES) * (Math.PI / 180);
                                        const variance = baseVariance * varianceScale;

                                        const blendedAngle = currentAngle * (1 - emitterInfluence) + emitterAngle * emitterInfluence + variance;

                                        const baseLength = 1.0;
                                        const heightScale = 0.95;
                                        const growthLength = Math.pow(heightScale, stalkParent.height) * baseLength;

                                        targetX = parentNode.x + Math.cos(blendedAngle) * growthLength;
                                        targetZ = parentNode.z + Math.sin(blendedAngle) * growthLength;
                                    } else {
                                        const randomAngle = Math.random() * 2 * Math.PI;
                                        const blendedAngle = randomAngle * (1 - emitterInfluence) + emitterAngle * emitterInfluence;
                                        targetX = parentNode.x + Math.cos(blendedAngle);
                                        targetZ = parentNode.z + Math.sin(blendedAngle);
                                    }
                                } else {
                                    const randomAngle = Math.random() * 2 * Math.PI;
                                    const blendedAngle = randomAngle * (1 - emitterInfluence) + emitterAngle * emitterInfluence;
                                    targetX = parentNode.x + Math.cos(blendedAngle) * 0.5;
                                    targetZ = parentNode.z + Math.sin(blendedAngle) * 0.5;
                                }
                                targetY = parentNode.y + (Math.random() * 2 - 1) * 0.25;
                            }
                            break;
                        }
                        default:
                            targetY = parentNode.y;
                            targetX = parentNode.x;
                            targetZ = parentNode.z;
                    }

                    return { x: targetX, y: targetY, z: targetZ };
                }

                function findStalkParent(node) {
                    let current = node;
                    while (current.parent) {
                        if (current.parent.type === "stalk") {
                            return current.parent;
                        }
                        current = current.parent;
                    }
                    return null;
                }

                function countChildrenOfType(node, types) {
                    return node.children.filter((child) => types.includes(child.type)).length;
                }

                function findAvailableRootParent() {
                    // Only include root nodes and seed node as potential parents
                    const eligibleNodes = [...nodes.root];
                    if (nodes.seed.length > 0) eligibleNodes.push(...nodes.seed);

                    // Group nodes by their type
                    const categorizedNodes = eligibleNodes.reduce((acc, node) => {
                        const category = node.type === "root" ? "root" : "seed";
                        if (!acc[category]) acc[category] = [];
                        acc[category].push(node);
                        return acc;
                    }, {});

                    // Check root nodes first
                    if (categorizedNodes.root) {
                        // Sort root nodes by depth (highest first) and number of children
                        categorizedNodes.root.sort((a, b) => {
                            if (a.depth !== b.depth) return b.depth - a.depth;
                            return countChildrenOfType(a, ["root"]) - countChildrenOfType(b, ["root"]);
                        });

                        // Find first eligible root node
                        for (const node of categorizedNodes.root) {
                            const potentialChildDepth = node.depth + 1;
                            if (potentialChildDepth <= MAX_ROOT_DEPTH && countChildrenOfType(node, ["root"]) < MAX_CHILDREN) {
                                return node;
                            }
                        }
                    }

                    // If no suitable root nodes, return seed if available and eligible
                    if (categorizedNodes.seed && categorizedNodes.seed.length > 0) {
                        const seedNode = categorizedNodes.seed[0];
                        if (countChildrenOfType(seedNode, ["root"]) < MAX_CHILDREN) {
                            return seedNode;
                        }
                    }

                    return nodes.seed[0];
                }

                function findAvailableLeafParent() {
                    const eligibleBranches = nodes.branch.filter((branch) => branch.leafCount < 2);

                    if (eligibleBranches.length === 0) return null;

                    eligibleBranches.sort((a, b) => {
                        const aLeafCount = countChildrenOfType(a, ["leaf"]);
                        const bLeafCount = countChildrenOfType(b, ["leaf"]);
                        return aLeafCount - bLeafCount;
                    });

                    return eligibleBranches[0];
                }

                function getBranchInfo(node) {
                    let length = 0;
                    let current = node;
                    let isEndpoint = true;
                    while (current && current.type === "branch") {
                        if (countChildrenOfType(current, ["branch"]) >= MAX_CHILDREN) {
                            isEndpoint = false;
                        }
                        length++;
                        current = current.parent;
                    }
                    return { length, isEndpoint };
                }

                function findAvailableBranchParent() {
                    const eligibleNodes = [...nodes.branch];
                    if (nodes.stalk.length > 0) eligibleNodes.push(...nodes.stalk);

                    const categorizedNodes = eligibleNodes.reduce((acc, node) => {
                        const category = node.type === "branch" ? "branch" : "stalk";
                        if (!acc[category]) acc[category] = [];
                        acc[category].push(node);
                        return acc;
                    }, {});

                    if (categorizedNodes.branch) {
                        categorizedNodes.branch.sort((a, b) => {
                            const aInfo = getBranchInfo(a);
                            const bInfo = getBranchInfo(b);

                            if (aInfo.isEndpoint !== bInfo.isEndpoint) {
                                return aInfo.isEndpoint ? -1 : 1;
                            }
                            if (aInfo.length !== bInfo.length) {
                                return bInfo.length - aInfo.length;
                            }
                            return countChildrenOfType(a, ["branch"]) - countChildrenOfType(b, ["branch"]);
                        });

                        for (const node of categorizedNodes.branch) {
                            const branchInfo = getBranchInfo(node);
                            if (branchInfo.length < MAX_BRANCH_LENGTH && countChildrenOfType(node, ["branch"]) < MAX_CHILDREN) {
                                return node;
                            }
                        }
                    }

                    if (categorizedNodes.stalk) {
                        const sortedStalks = categorizedNodes.stalk
                            .filter((node) => countChildrenOfType(node, ["branch"]) < MAX_STALK_BRANCHES)
                            .sort((a, b) => {
                                const aHasBranches = countChildrenOfType(a, ["branch"]) > 0;
                                const bHasBranches = countChildrenOfType(b, ["branch"]) > 0;

                                if (aHasBranches !== bHasBranches) {
                                    return bHasBranches ? 1 : -1;
                                }

                                return countChildrenOfType(b, ["branch"]) - countChildrenOfType(a, ["branch"]);
                            });

                        if (sortedStalks.length > 0) {
                            return sortedStalks[0];
                        }
                    }

                    const lastStalk = nodes.stalk[nodes.stalk.length - 1];
                    return lastStalk && countChildrenOfType(lastStalk, ["branch"]) < MAX_STALK_BRANCHES ? lastStalk : null;
                }

                function hasAvailableParent(type) {
                    switch (type) {
                        case "root":
                            const rootParent = findAvailableRootParent();
                            return rootParent && countChildrenOfType(rootParent, ["root"]) < MAX_CHILDREN;

                        case "stalk":
                            const stalkParent = nodes.stalk[nodes.stalk.length - 1] || nodes.seed[0];
                            return stalkParent != null;

                        case "branch":
                            const availableStalk = nodes.stalk.some((node) => countChildrenOfType(node, ["branch"]) < MAX_STALK_BRANCHES);
                            if (availableStalk) return true;

                            return nodes.branch.some((node) => {
                                const branchInfo = getBranchInfo(node);
                                return branchInfo.length < MAX_BRANCH_LENGTH && countChildrenOfType(node, ["branch"]) < MAX_CHILDREN;
                            });

                        case "leaf":
                            return nodes.branch.some((branch) => branch.leafCount < 2);

                        default:
                            return false;
                    }
                }

                function findParentNode(type) {
                    switch (type) {
                        case "root":
                            return findAvailableRootParent();

                        case "stalk": {
                            const currentStalks = nodes.stalk;
                            const height3Stalks = currentStalks.filter((node) => node.height === 3 && countChildrenOfType(node, ["stalk"]) < 2);

                            if (height3Stalks.length > 0) {
                                return height3Stalks[0];
                            }

                            const leafStalks = currentStalks.filter((node) => countChildrenOfType(node, ["stalk"]) === 0);

                            if (leafStalks.length > 0) {
                                leafStalks.sort((a, b) => currentStalks.indexOf(a) - currentStalks.indexOf(b));
                                lastUsedForkIndex = (lastUsedForkIndex + 1) % leafStalks.length;
                                return leafStalks[lastUsedForkIndex];
                            }

                            return nodes.stalk[nodes.stalk.length - 1] || nodes.seed[0];
                        }

                        case "branch":
                            return findAvailableBranchParent();

                        case "leaf":
                            return findAvailableLeafParent();

                        default:
                            return null;
                    }
                }

                function determineNodeType(index) {
                    if (index === 0) return "seed";

                    const sortedRanges = Object.entries(growthConfig)
                        .map(([key, value]) => [parseInt(key), value])
                        .sort((a, b) => a[0] - b[0]);

                    let defaultType;
                    for (const [maxIndex, type] of sortedRanges) {
                        if (index <= maxIndex) {
                            defaultType = type;
                            break;
                        }
                    }
                    if (!defaultType) {
                        defaultType = sortedRanges[sortedRanges.length - 1][1];
                    }

                    if (defaultType === "leaf") {
                        if (hasAvailableParent("leaf")) {
                            return "leaf";
                        }
                        defaultType = "branch";
                    }

                    if (hasAvailableParent(defaultType)) {
                        return defaultType;
                    }

                    if (Math.random() < 0.3) {
                        if (hasAvailableParent("root")) return "root";
                        if (hasAvailableParent("stalk")) return "stalk";
                    } else {
                        if (hasAvailableParent("stalk")) return "stalk";
                        if (hasAvailableParent("root")) return "root";
                    }

                    return "stalk";
                }

                const gui = new GUI();
                const nodeFolder = gui.addFolder("Latest Node");
                const nodePosition = { x: 0, y: 0, z: 0 };
                const nodeInfo = { depth: 0, type: "none" };
                nodeFolder.add(nodePosition, "x", -10, 10).listen();
                nodeFolder.add(nodePosition, "y", -10, 10).listen();
                nodeFolder.add(nodePosition, "z", -10, 10).listen();
                nodeFolder.add(nodeInfo, "depth", 0, 10).listen();
                nodeFolder.add(nodeInfo, "type").listen();

                let currentIndex = 0;
                let elapsedTime = 0;
                let lastStalkHeight = 0;
                let currentNode = null;

                function animate(time) {
                    requestAnimationFrame(animate);
                    // controls.update();
                    updateCameraPosition(time / 25000);

                    const deltaTime = time - elapsedTime;
                    elapsedTime = time;

                    // Smoothly update music emitter position
                    musicEmitterAngle += musicEmitterSpeed * deltaTime;
                    musicEmitter.position.x = Math.cos(musicEmitterAngle) * musicEmitterRadius;
                    musicEmitter.position.z = Math.sin(musicEmitterAngle) * musicEmitterRadius;

                    const maxIndex = Math.max(...Object.keys(growthConfig).map(Number));

                    if (currentIndex <= maxIndex) {
                        if (!currentNode) {
                            const type = determineNodeType(currentIndex);

                            if (type === null) {
                                currentIndex++;
                                return;
                            }

                            if (currentIndex === 0) {
                                currentNode = addNode(0, 0, 0, type, null, { x: 0, y: 0, z: 0 });
                            } else {
                                const parent = findParentNode(type);
                                if (!parent) {
                                    currentIndex++;
                                    return;
                                }
                                const targetPos = calculateTargetPosition(parent, type, camera);
                                currentNode = addNode(parent.x, parent.y, parent.z, type, parent, targetPos);

                                if (type === "stalk") {
                                    if (currentNode.height > lastStalkHeight) {
                                        lastStalkHeight = currentNode.height;
                                        animateCameraForStalk();
                                    }
                                }
                            }
                        }

                        if (currentNode.type === "leaf") {
                            // Handle leaf scaling animation
                            const scaleAmount = (currentNode.moveSpeed * deltaTime) / (1000 / ANIM_SPEED);
                            const currentScale = currentNode.mesh.scale.x;
                            const remainingScale = currentNode.targetScale - currentScale;

                            if (remainingScale > scaleAmount) {
                                const newScale = currentScale + scaleAmount;
                                currentNode.mesh.scale.set(newScale, newScale, newScale);
                            } else {
                                currentNode.mesh.scale.set(currentNode.targetScale, currentNode.targetScale, currentNode.targetScale);
                                currentIndex++;
                                currentNode = null;
                            }
                        } else {
                            // Handle regular node movement animation
                            const moveAmount = (currentNode.moveSpeed * deltaTime) / (1000 / ANIM_SPEED);
                            const remainingDistanceY = Math.abs(currentNode.targetY - currentNode.y);
                            const remainingDistanceX = Math.abs(currentNode.targetX - currentNode.x);
                            const remainingDistanceZ = Math.abs(currentNode.targetZ - currentNode.z);

                            if (remainingDistanceY > moveAmount || remainingDistanceX > moveAmount || remainingDistanceZ > moveAmount) {
                                if (remainingDistanceY > moveAmount) {
                                    const directionY = currentNode.targetY > currentNode.y ? 1 : -1;
                                    currentNode.y += moveAmount * directionY;
                                }
                                if (remainingDistanceX > moveAmount) {
                                    const directionX = currentNode.targetX > currentNode.x ? 1 : -1;
                                    currentNode.x += moveAmount * directionX;
                                }
                                if (remainingDistanceZ > moveAmount) {
                                    const directionZ = currentNode.targetZ > currentNode.z ? 1 : -1;
                                    currentNode.z += moveAmount * directionZ;
                                }

                                currentNode.mesh.position.set(currentNode.x, currentNode.y, currentNode.z);

                                if (currentNode.connectionLine) {
                                    const positions = currentNode.connectionLine.geometry.attributes.position.array;
                                    positions[3] = currentNode.x;
                                    positions[4] = currentNode.y;
                                    positions[5] = currentNode.z;
                                    currentNode.connectionLine.geometry.attributes.position.needsUpdate = true;
                                }
                            } else {
                                currentNode.x = currentNode.targetX;
                                currentNode.y = currentNode.targetY;
                                currentNode.z = currentNode.targetZ;
                                currentNode.mesh.position.set(currentNode.x, currentNode.y, currentNode.z);

                                if (currentNode.connectionLine) {
                                    const positions = currentNode.connectionLine.geometry.attributes.position.array;
                                    positions[3] = currentNode.x;
                                    positions[4] = currentNode.y;
                                    positions[5] = currentNode.z;
                                    currentNode.connectionLine.geometry.attributes.position.needsUpdate = true;
                                }

                                currentIndex++;
                                currentNode = null;
                            }
                        }

                        if (currentNode) {
                            nodePosition.x = currentNode.x;
                            nodePosition.y = currentNode.y;
                            nodePosition.z = currentNode.z;
                            nodeInfo.depth = currentNode.depth;
                            nodeInfo.type = currentNode.type;
                        }
                    }

                    camera.lookAt(cameraTarget);
                    renderer.render(scene, camera);
                }

                animate(0);

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
