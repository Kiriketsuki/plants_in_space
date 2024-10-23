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
            this.length = type === "root" ? (parent ? parent.length + 1 : 0) : null;
            this.moveSpeed = 1;
        }
        addChild(child) {
            this.children.push(child);
        }
        toString() {
            return `Node(${this.x}, ${this.y}, ${this.z}, type=${this.type}, length=${this.length}, children=${this.children.length})`;
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
                scene.add(gridHelper);

                camera.position.set(5, 0, 5);
                camera.lookAt(0, 0, 0);

                const nodeGeometry = new THREE.SphereGeometry(0.1);

                const nodeColors = {
                    root: 0x4b2b15, // Darker Brown
                    stalk: 0x8b4513, // Brown
                };

                const nodes = {
                    root: [],
                    stalk: [],
                };
                const nodeObjects = new THREE.Group();
                const connectionObjects = new THREE.Group();
                scene.add(nodeObjects);
                scene.add(connectionObjects);

                const MAX_ROOT_LENGTH = 4;
                const MAX_CHILDREN = 2;
                const X_VARIANCE = 1; // Maximum x-axis variance
                const Z_VARIANCE = 1; // Maximum z-axis variance

                function addNode(x, y, z, type, parent = null) {
                    const node = new Node(x, y, z, type, parent);
                    nodes[type].push(node);

                    if (parent) {
                        parent.addChild(node);
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
                    // First, try to find a root node that hasn't reached max length and has less than 2 children
                    for (let i = nodes.root.length - 1; i >= 0; i--) {
                        const node = nodes.root[i];
                        if (node.length < MAX_ROOT_LENGTH && node.children.length < MAX_CHILDREN) {
                            return node;
                        }
                    }

                    // If no suitable root nodes, find the earliest root node with less than 2 children
                    for (let i = 0; i < nodes.root.length; i++) {
                        if (nodes.root[i].children.length < MAX_CHILDREN) {
                            return nodes.root[i];
                        }
                    }

                    // If all root nodes have 2 children, start a new root from the last stalk node
                    if (nodes.stalk.length > 0) {
                        return nodes.stalk[nodes.stalk.length - 1];
                    }

                    // This should never happen if we always have the origin node
                    return null;
                }

                const gui = new GUI();
                const nodeFolder = gui.addFolder("Latest Node");
                const nodePosition = { x: 0, y: 0, z: 0 };
                nodeFolder.add(nodePosition, "x", -10, 10).listen();
                nodeFolder.add(nodePosition, "y", -10, 10).listen();
                nodeFolder.add(nodePosition, "z", -10, 10).listen();

                let currentIndex = 0;
                let elapsedTime = 0;
                let currentNode = null;

                function animate(time) {
                    requestAnimationFrame(animate);
                    controls.update();

                    const deltaTime = time - elapsedTime;
                    elapsedTime = time;

                    if (currentIndex < 40) {
                        if (!currentNode) {
                            const isRoot = currentIndex < 25;
                            const type = isRoot ? "root" : "stalk";
                            const direction = isRoot ? -1 : 1;

                            if (currentIndex === 0) {
                                currentNode = addNode(0, 0, 0, "stalk");
                                nodes.root.push(currentNode);
                                currentNode.targetY = 0;
                            } else if (isRoot) {
                                const parent = findAvailableRootParent();
                                currentNode = addNode(parent.x, parent.y, parent.z, type, parent);
                                currentNode.targetY = parent.y - 1;
                                currentNode.targetX = parent.x + (Math.random() * 2 - 1) * X_VARIANCE;
                                currentNode.targetZ = parent.z + (Math.random() * 2 - 1) * Z_VARIANCE;
                            } else {
                                const prevNode = nodes.stalk[nodes.stalk.length - 1];
                                currentNode = addNode(prevNode.x, prevNode.y, prevNode.z, type, prevNode);
                                currentNode.targetY = prevNode.y + 1;
                                currentNode.targetX = prevNode.x + (Math.random() * 2 - 1) * X_VARIANCE;
                                currentNode.targetZ = prevNode.z + (Math.random() * 2 - 1) * Z_VARIANCE;
                            }
                        }

                        const moveAmountY = (currentNode.moveSpeed * deltaTime) / 1000;
                        const moveAmountX = moveAmountY; // Same speed for X and Y
                        const moveAmountZ = moveAmountY; // Same speed for Z
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
                            currentNode.mesh.position.set(currentNode.x, currentNode.y, currentNode.z);

                            if (currentNode.connectionLine) {
                                const positions = currentNode.connectionLine.geometry.attributes.position.array;
                                positions[3] = currentNode.x;
                                positions[4] = currentNode.y;
                                currentNode.connectionLine.geometry.attributes.position.needsUpdate = true;
                            }

                            currentIndex++;
                            currentNode = null;
                        }

                        if (nodes.root.length > 0 || nodes.stalk.length > 0) {
                            const latestNode = nodes.stalk[nodes.stalk.length - 1] || nodes.root[nodes.root.length - 1];
                            nodePosition.x = latestNode.x;
                            nodePosition.y = latestNode.y;
                            nodePosition.z = latestNode.z;
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
