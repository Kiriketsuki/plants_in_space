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
        }

        calculateDepth() {
            if (this.type === "seed") return 0;
            if (this.type === "stalk") return 0;
            if (this.type === "branch") return 0;

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
            // For branches, get parent stalk's height
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

                const controls = new OrbitControls(camera, renderer.domElement);
                controls.enableDamping = true;

                const sceneLight = new THREE.AmbientLight(0xffffff, 0.5);
                scene.add(sceneLight);

                const gridHelper = new THREE.GridHelper(10, 10);
                const gridHelperMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff, opacity: 0.2, transparent: true });
                gridHelper.material = gridHelperMaterial;
                scene.add(gridHelper);

                camera.position.set(10, 0, 10);
                camera.lookAt(0, 0, 0);

                const nodeGeometry = new THREE.SphereGeometry(0.1);

                const nodeColors = {
                    seed: 0x8b4513, // Brown
                    root: 0x4b2b15, // Darker Brown
                    stalk: 0x8b4513, // Brown
                    branch: 0x228b22, // Forest Green
                    // branch: 0x654321, // Saddle Brown
                };

                const nodes = {
                    seed: [],
                    root: [],
                    stalk: [],
                    branch: [],
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

                const growthConfig = {
                    15: "root",
                    23: "stalk",
                    40: "branch",
                    200: "branch",
                };
                const cameraInfluence = 0.1;

                let firstFork = -1;
                function calculateTargetPosition(parentNode, type, camera) {
                    let targetX, targetY, targetZ;
                    switch (type) {
                        case "root":
                            // Calculate camera direction influence for roots
                            const cameraDirX = camera.position.x - parentNode.x;
                            const cameraDirZ = camera.position.z - parentNode.z;
                            const cameraDist = Math.sqrt(cameraDirX * cameraDirX + cameraDirZ * cameraDirZ);

                            const normalizedCameraDirX = cameraDirX / cameraDist;
                            const normalizedCameraDirZ = cameraDirZ / cameraDist;

                            // Calculate current downward angle (for roots this is a random direction)
                            const randomAngle = Math.random() * 2 * Math.PI;
                            const cameraAngle = Math.atan2(normalizedCameraDirZ, normalizedCameraDirX);

                            const varianceScale = 1 - cameraInfluence;
                            const baseVariance = ((Math.random() * 2 * 360) / MAX_STALK_BRANCHES - 360 / MAX_STALK_BRANCHES) * (Math.PI / 180);
                            const variance = baseVariance * varianceScale;

                            // Blend random angle with camera direction
                            const blendedAngle = randomAngle * (1 - cameraInfluence) + cameraAngle * cameraInfluence + variance;

                            // Apply the direction with X_VARIANCE as the growth length
                            targetY = parentNode.y - 1;
                            targetX = parentNode.x + Math.cos(blendedAngle) * X_VARIANCE;
                            targetZ = parentNode.z + Math.sin(blendedAngle) * Z_VARIANCE;
                            break;
                        case "stalk":
                            targetY = parentNode.y + 1;

                            if (parentNode.height === 3) {
                                // For height 3 stalks, grow in a specific direction
                                targetX = parentNode.x - 1 * firstFork;
                                targetZ = parentNode.z + 1 * firstFork;
                                firstFork = firstFork * -1;
                                break;
                            }
                            targetX = parentNode.x + (Math.random() * 2 - 1) * (X_VARIANCE * 0.5);
                            targetZ = parentNode.z + (Math.random() * 2 - 1) * (Z_VARIANCE * 0.5);
                            break;

                        case "branch":
                            if (parentNode.type === "stalk") {
                                // Original stalk branch logic remains the same
                                const branchIndex = parentNode.children.length;
                                const anglePerBranch = 360 / MAX_STALK_BRANCHES;
                                const heightRotation = parentNode.height * 30;
                                const startAngle = heightRotation * (Math.PI / 180);
                                const angle = branchIndex * anglePerBranch * (Math.PI / 180) + startAngle;

                                const baseRadius = 1.0;
                                const heightScale = 0.95;
                                const radius = heightScale ** parentNode.height * baseRadius;
                                // const radius = baseRadius - parentNode.height * heightScale;

                                targetX = parentNode.x + radius * Math.cos(angle);
                                targetZ = parentNode.z + radius * Math.sin(angle);
                                targetY = parentNode.y + (Math.random() * 2 - 1) * 0.125;
                            } else {
                                const stalkParent = findStalkParent(parentNode);
                                if (stalkParent) {
                                    const dirX = parentNode.x - stalkParent.x;
                                    const dirZ = parentNode.z - stalkParent.z;
                                    const length = Math.sqrt(dirX * dirX + dirZ * dirZ);

                                    if (length > 0) {
                                        const cameraDirX = camera.position.x - parentNode.x;
                                        const cameraDirZ = camera.position.z - parentNode.z;
                                        const cameraDist = Math.sqrt(cameraDirX * cameraDirX + cameraDirZ * cameraDirZ);

                                        const normalizedCameraDirX = cameraDirX / cameraDist;
                                        const normalizedCameraDirZ = cameraDirZ / cameraDist;

                                        let currentAngle = Math.atan2(dirZ, dirX);
                                        let cameraAngle = Math.atan2(normalizedCameraDirZ, normalizedCameraDirX);

                                        // Scale variance based on camera influence
                                        const varianceScale = 1 - cameraInfluence;
                                        const baseVariance = ((Math.random() * 2 * 360) / MAX_STALK_BRANCHES - 360 / MAX_STALK_BRANCHES) * (Math.PI / 180);
                                        const variance = baseVariance * varianceScale;

                                        // Blend the angles
                                        const blendedAngle = currentAngle * (1 - cameraInfluence) + cameraAngle * cameraInfluence + variance;

                                        const baseLength = 1.0;
                                        const heightScale = 0.95;
                                        // const growthLength = baseLength - stalkParent.height * heightScale;
                                        const growthLength = heightScale ** stalkParent.height * baseLength;

                                        targetX = parentNode.x + Math.cos(blendedAngle) * growthLength;
                                        targetZ = parentNode.z + Math.sin(blendedAngle) * growthLength;
                                    } else {
                                        targetX = parentNode.x + 1;
                                        targetZ = parentNode.z;
                                    }
                                } else {
                                    targetX = parentNode.x + 0.5;
                                    targetZ = parentNode.z;
                                }
                                targetY = parentNode.y + (Math.random() * 2 - 1) * 0.25;
                            }
                            break;

                        default:
                            targetY = parentNode.y;
                            targetX = parentNode.x;
                            targetZ = parentNode.z;
                    }

                    return {
                        x: targetX,
                        y: targetY,
                        z: targetZ,
                    };
                }

                // Helper function to find the original stalk parent of a branch
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

                function addNode(x, y, z, type, parent = null, targetPos = null) {
                    const node = new Node(x, y, z, type, parent);
                    nodes[type].push(node);

                    if (parent) {
                        parent.addChild(node);
                    }

                    if (targetPos) {
                        node.targetX = targetPos.x;
                        node.targetY = targetPos.y;
                        node.targetZ = targetPos.z;
                    }

                    const nodeColor = nodeColors[type];
                    const nodeMaterial = new THREE.MeshPhongMaterial({ color: nodeColor });

                    const nodeMesh = new THREE.Mesh(nodeGeometry, nodeMaterial);
                    nodeMesh.position.set(x, y, z);
                    nodeObjects.add(nodeMesh);

                    node.mesh = nodeMesh;

                    if (parent) {
                        const connectionGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(parent.x, parent.y, parent.z), new THREE.Vector3(x, y, z)]);
                        const connectionMaterial = new THREE.LineBasicMaterial({ color: nodeColor });
                        const connectionLine = new THREE.Line(connectionGeometry, connectionMaterial);
                        connectionObjects.add(connectionLine);

                        node.connectionLine = connectionLine;
                    }

                    return node;
                }

                function findAvailableRootParent() {
                    const eligibleNodes = [...nodes.root];
                    if (nodes.seed.length > 0) eligibleNodes.push(...nodes.seed);
                    if (nodes.stalk.length > 0) eligibleNodes.push(...nodes.stalk);

                    // Group nodes by their type
                    const categorizedNodes = eligibleNodes.reduce((acc, node) => {
                        const category = node.type === "root" ? "root" : "other";
                        if (!acc[category]) acc[category] = [];
                        acc[category].push(node);
                        return acc;
                    }, {});

                    // Sort root nodes by depth (highest first)
                    if (categorizedNodes.root) {
                        categorizedNodes.root.sort((a, b) => {
                            if (a.depth !== b.depth) return b.depth - a.depth;
                            return a.children.length - b.children.length;
                        });

                        // Check highest depth nodes first
                        for (const node of categorizedNodes.root) {
                            const potentialChildDepth = node.depth + 1;
                            if (potentialChildDepth <= MAX_ROOT_DEPTH && node.children.length < MAX_CHILDREN) {
                                return node;
                            }
                        }
                    }

                    // If no suitable root nodes, check other nodes
                    // Seed has lowest priority, then stalk
                    const otherNodes = categorizedNodes.other || [];
                    otherNodes.sort((a, b) => {
                        if (a.type === "seed" && b.type !== "seed") return 1;
                        if (b.type === "seed" && a.type !== "seed") return -1;
                        return a.children.length - b.children.length;
                    });

                    // Return first eligible non-root node
                    for (const node of otherNodes) {
                        if (node.type === "seed" || node.children.length < MAX_CHILDREN) {
                            return node;
                        }
                    }

                    // Final fallback to seed
                    return nodes.seed[0];
                }

                function findAvailableBranchParent() {
                    const eligibleNodes = [...nodes.branch];
                    if (nodes.stalk.length > 0) eligibleNodes.push(...nodes.stalk);

                    // Calculate branch length and determine if it's an endpoint
                    const getBranchInfo = (node) => {
                        let length = 0;
                        let current = node;
                        let isEndpoint = true;

                        // Traverse up to find length and check if it's a terminal branch
                        while (current && current.type === "branch") {
                            if (current.children.length >= MAX_CHILDREN) {
                                isEndpoint = false;
                            }
                            length++;
                            current = current.parent;
                        }
                        return { length, isEndpoint };
                    };

                    // Group nodes by their type
                    const categorizedNodes = eligibleNodes.reduce((acc, node) => {
                        const category = node.type === "branch" ? "branch" : "stalk";
                        if (!acc[category]) acc[category] = [];
                        acc[category].push(node);
                        return acc;
                    }, {});

                    // Process branch nodes first
                    if (categorizedNodes.branch) {
                        // Sort branches by length (longest first) and endpoints
                        categorizedNodes.branch.sort((a, b) => {
                            const aInfo = getBranchInfo(a);
                            const bInfo = getBranchInfo(b);

                            // Prioritize endpoints of longest branches
                            if (aInfo.isEndpoint !== bInfo.isEndpoint) {
                                return aInfo.isEndpoint ? -1 : 1;
                            }
                            // Then by length
                            if (aInfo.length !== bInfo.length) {
                                return bInfo.length - aInfo.length;
                            }
                            // Finally by number of children
                            return a.children.length - b.children.length;
                        });

                        // Find first eligible branch node
                        for (const node of categorizedNodes.branch) {
                            const branchInfo = getBranchInfo(node);
                            if (branchInfo.length < MAX_BRANCH_LENGTH && node.children.length < MAX_CHILDREN) {
                                return node;
                            }
                        }
                    }

                    // If no suitable branches, check stalks with modified priority
                    if (categorizedNodes.stalk) {
                        // Sort stalks by prioritizing those that already have branches but aren't full
                        const sortedStalks = categorizedNodes.stalk
                            .filter((node) => node.children.length < MAX_STALK_BRANCHES)
                            .sort((a, b) => {
                                // First prioritize stalks that have branches but aren't full
                                const aHasBranches = a.children.length > 0;
                                const bHasBranches = b.children.length > 0;

                                if (aHasBranches !== bHasBranches) {
                                    return bHasBranches ? 1 : -1;
                                }

                                // If both have branches or both don't have branches,
                                // prefer the stalk that's most recently used (higher index)
                                return b.children.length - a.children.length;
                            });

                        if (sortedStalks.length > 0) {
                            return sortedStalks[0];
                        }
                    }

                    // Final fallback to most recent stalk
                    const lastStalk = nodes.stalk[nodes.stalk.length - 1];
                    return lastStalk && lastStalk.children.length < MAX_STALK_BRANCHES ? lastStalk : null;
                }

                // Add this helper function to count specific types of children
                function countChildrenOfType(node, types) {
                    return node.children.filter((child) => types.includes(child.type)).length;
                }

                function hasAvailableParent(type) {
                    switch (type) {
                        case "root":
                            const rootParent = findAvailableRootParent();
                            return rootParent && countChildrenOfType(rootParent, ["root"]) < MAX_CHILDREN;

                        case "stalk":
                            const stalkParent = nodes.stalk[nodes.stalk.length - 1] || nodes.seed[0];
                            // Stalks can always grow from other stalks (no child limit for stalk-to-stalk)
                            return stalkParent != null;

                        case "branch":
                            // Check if any stalks have room for branches
                            const availableStalk = nodes.stalk.some((node) => countChildrenOfType(node, ["branch"]) < MAX_STALK_BRANCHES);
                            if (availableStalk) return true;

                            // Check if any branches have room for sub-branches
                            return nodes.branch.some((node) => {
                                const branchInfo = getBranchInfo(node);
                                return branchInfo.length < MAX_BRANCH_LENGTH && countChildrenOfType(node, ["branch"]) < MAX_CHILDREN;
                            });

                        default:
                            return false;
                    }
                }

                // Update findAvailableBranchParent to use the new counting method
                function findAvailableBranchParent() {
                    const eligibleNodes = [...nodes.branch];
                    if (nodes.stalk.length > 0) eligibleNodes.push(...nodes.stalk);

                    // Calculate branch length and determine if it's an endpoint
                    const getBranchInfo = (node) => {
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
                    };

                    // Group nodes by their type
                    const categorizedNodes = eligibleNodes.reduce((acc, node) => {
                        const category = node.type === "branch" ? "branch" : "stalk";
                        if (!acc[category]) acc[category] = [];
                        acc[category].push(node);
                        return acc;
                    }, {});

                    // Process branch nodes first
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

                    // If no suitable branches, check stalks with modified priority
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

                    // Final fallback to most recent stalk if it has room for branches
                    const lastStalk = nodes.stalk[nodes.stalk.length - 1];
                    return lastStalk && countChildrenOfType(lastStalk, ["branch"]) < MAX_STALK_BRANCHES ? lastStalk : null;
                }

                // Helper function to calculate branch info (moved outside for reuse)
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

                function determineNodeType(index) {
                    if (index === 0) return "seed";

                    // Get the default type based on index
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

                    // If default type has available parents, use it
                    if (hasAvailableParent(defaultType)) {
                        return defaultType;
                    }

                    // 10% chance to try root first
                    if (Math.random() < 0.3) {
                        if (hasAvailableParent("root")) {
                            return "root";
                        }
                        // If no root possible, try stalk
                        if (hasAvailableParent("stalk")) {
                            return "stalk";
                        }
                    } else {
                        // 90% chance to try stalk first
                        if (hasAvailableParent("stalk")) {
                            return "stalk";
                        }
                        // If no stalk possible, try root
                        if (hasAvailableParent("root")) {
                            return "root";
                        }
                    }

                    // Final fallback if neither is possible (shouldn't happen often)
                    return "stalk";
                }
                // Add this variable outside the findParentNode function to track the last used fork
                let lastUsedForkIndex = 0;

                function findParentNode(type) {
                    switch (type) {
                        case "root":
                            return findAvailableRootParent();

                        case "stalk":
                            const currentStalks = nodes.stalk;
                            // Special handling for height 3 stalks
                            const height3Stalks = currentStalks.filter((node) => node.height === 3 && countChildrenOfType(node, ["stalk"]) < 2);

                            if (height3Stalks.length > 0) {
                                // Return a height 3 stalk that doesn't have 2 stalk children yet
                                return height3Stalks[0];
                            }

                            // Get all leaf stalks (stalks with no stalk children)
                            const leafStalks = currentStalks.filter((node) => countChildrenOfType(node, ["stalk"]) === 0);

                            // If we have leaf stalks, alternate between them
                            if (leafStalks.length > 0) {
                                // Sort leaf stalks by their creation order to maintain consistent alternation
                                leafStalks.sort((a, b) => currentStalks.indexOf(a) - currentStalks.indexOf(b));

                                // Alternate between available leaf stalks
                                lastUsedForkIndex = (lastUsedForkIndex + 1) % leafStalks.length;
                                return leafStalks[lastUsedForkIndex];
                            }

                            // Default behavior if no other conditions met
                            return nodes.stalk[nodes.stalk.length - 1] || nodes.seed[0];

                        case "branch":
                            return findAvailableBranchParent();

                        default:
                            return null;
                    }
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
                let currentNode = null;

                function animate(time) {
                    requestAnimationFrame(animate);
                    controls.update();

                    const deltaTime = time - elapsedTime;
                    elapsedTime = time;

                    const maxIndex = Math.max(...Object.keys(growthConfig).map(Number));

                    if (currentIndex <= maxIndex) {
                        if (!currentNode) {
                            const type = determineNodeType(currentIndex);

                            if (currentIndex === 0) {
                                currentNode = addNode(0, 0, 0, type, null, { x: 0, y: 0, z: 0 });
                            } else {
                                const parent = findParentNode(type);
                                const targetPos = calculateTargetPosition(parent, type, camera); // Updated to pass node type
                                currentNode = addNode(parent.x, parent.y, parent.z, type, parent, targetPos);
                            }
                        }

                        const moveAmountY = (currentNode.moveSpeed * deltaTime) / 500;
                        const moveAmountX = moveAmountY;
                        const moveAmountZ = moveAmountY;
                        const remainingDistanceY = Math.abs(currentNode.targetY - currentNode.y);
                        const remainingDistanceX = Math.abs(currentNode.targetX - currentNode.x);
                        const remainingDistanceZ = Math.abs(currentNode.targetZ - currentNode.z);

                        if (remainingDistanceY > moveAmountY || remainingDistanceX > moveAmountX || remainingDistanceZ > moveAmountZ) {
                            if (remainingDistanceY > moveAmountY) {
                                const directionY = currentNode.targetY > currentNode.y ? 1 : -1;
                                currentNode.y += moveAmountY * directionY;
                            }
                            if (remainingDistanceX > moveAmountX) {
                                const directionX = currentNode.targetX > currentNode.x ? 1 : -1;
                                currentNode.x += moveAmountX * directionX;
                            }
                            if (remainingDistanceZ > moveAmountZ) {
                                const directionZ = currentNode.targetZ > currentNode.z ? 1 : -1;
                                currentNode.z += moveAmountZ * directionZ;
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

                        if (currentNode) {
                            nodePosition.x = currentNode.x;
                            nodePosition.y = currentNode.y;
                            nodePosition.z = currentNode.z;
                            nodeInfo.depth = currentNode.depth;
                            nodeInfo.type = currentNode.type;
                        }
                    }

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
