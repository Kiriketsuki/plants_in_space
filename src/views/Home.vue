<template>
    <div class="w-screen h-screen flex flex-col items-center justify-center overflow-hidden">
        <div class="bg w-full h-full fixed left-0 top-0 -z-2 bg-back">
            <img
                src="../assets/testbg.png"
                class="w-full h-full"
                alt="" />
        </div>
        <div class="main-display fixed left-0 top-0 h-screen w-screen flex items-center justify-center elliptical -z-1">
            <img
                src="../assets/gradientbg.png"
                class="w-full h-[100vh]"
                alt="" />
            <img
                src="../assets/flower.png"
                alt="" />
        </div>
        <div class="title text-white text-[10rem] z-10 font-instr flex flex-col items-center select-none">
            <div class="first flex flex-row items-start w-full select-none">
                <h1 data-value="Aetherial">Aetherial</h1>
            </div>
            <div class="second flex flex-row-reverse w-full select-none">
                <h1 data-value="Verdancy">Verdancy</h1>
            </div>
        </div>
        <div id="blob"></div>
    </div>
    <Navbar />
</template>

<script setup>
    import { onMounted, onUnmounted } from "vue";
    import Navbar from "../components/Navbar.vue";

    let blobElement = null;
    let pointerMoveListener = null;

    const constrainPosition = (x, y, element) => {
        const blobSize = element.offsetWidth;
        const padding = 20; // Buffer from window edges
        
        return {
            x: Math.min(Math.max(x, blobSize/2 + padding), window.innerWidth - blobSize/2 - padding),
            y: Math.min(Math.max(y, blobSize/2 + padding), window.innerHeight - blobSize/2 - padding)
        };
    };

    onMounted(() => {
        blobElement = document.getElementById("blob");

        pointerMoveListener = (event) => {
            const { clientX, clientY } = event;

            if (blobElement) {
                const { x, y } = constrainPosition(clientX, clientY, blobElement);

                blobElement.animate(
                    {
                        left: `${x}px`,
                        top: `${y}px`,
                    },
                    { duration: 200, fill: "forwards" },
                );
            }

            if (Math.random() < 0.01) {
                const star = document.createElement("img");
                star.src = Math.random() < 0.5 ? "../assets/star.PNG" : "../assets/star2.PNG";
                const randomSize = Math.random() * 4 + 1;
                
                const maxX = window.innerWidth - (randomSize * window.innerWidth / 100);
                const maxY = window.innerHeight - (randomSize * window.innerWidth / 100);
                const x = Math.min(Math.max(clientX, 0), maxX);
                const y = Math.min(Math.max(clientY, 0), maxY);

                star.style.cssText = `
                    position: fixed;
                    left: ${x}px;
                    top: ${y}px;
                    width: ${randomSize}vw;
                    height: ${randomSize}vw;
                    pointer-events: none;
                    z-index: 1;
                    transform: translate(-50%, -50%);
                    opacity: 1;
                    transition: opacity 0.5s ease-out;
                `;

                document.body.appendChild(star);

                setTimeout(() => {
                    star.style.opacity = "0";
                    setTimeout(() => {
                        document.body.removeChild(star);
                    }, 500);
                }, 2500);
            }
        };

        window.addEventListener("pointermove", pointerMoveListener);
    });

    onUnmounted(() => {
        if (pointerMoveListener) {
            window.removeEventListener("pointermove", pointerMoveListener);
        }
    });
</script>

<style>
    img {
        object-fit: contain;
    }
    .main-display > * {
        @apply w-full h-screen fixed top-0 left-0;
    }
    .nav > * {
        @apply text-3xl text-white font-code uppercase;
    }
    .title {
        width: 40vw;
    }
    @media (max-width: 1080px) {
        .title {
            width: 52vw;
        }
    }
    button {
        @apply hover:border-white border-b-2 border-transparent p-2 text-3xl text-white font-code uppercase;
    }
    @keyframes rotate {
        from {
            rotate: 0deg;
        }
        50% {
            scale: 1 1.5;
        }
        to {
            rotate: 360deg;
        }
    }
    #blob {
        background-color: white;
        height: 5vmax;
        aspect-ratio: 1;
        position: fixed;
        left: 50%;
        top: 50%;
        translate: -50% -50%;
        border-radius: 50%;
        background: linear-gradient(to right, aquamarine, mediumpurple);
        animation: rotate 20s infinite;
        opacity: 0.8;
        filter: blur(200px);
    }
</style>