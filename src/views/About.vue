<template>
    <div class="w-screen h-screen flex flex-col items-center justify-center">
        <div class="bg w-full h-full fixed left-0 top-0 -z-2 bg-back">
            <img
                src="../assets/testbg.png"
                class="w-full h-full -z-1"
                alt="" />
        </div>
        <div class="main-display fixed left-0 top-0 h-screen w-screen flex items-center justify-center flower -z-1 pointer-events-none">
            <img
                src="../assets/flower_1.png"
                class="w-[24vw] h-[50vw] pt-[13vh]"
                alt="" />
        </div>

        <div class="main-content flex flex-col items-center justify-start z-0 w-screen h-screen gap-20 pt-[13vh]">
            <div class="headers flex flex-col gap-5">
                <h1
                    class="text-white font-instr text-5xl cursor-pointer"
                    @click="$router.push('/')">
                    Aetherial Verdancy
                </h1>
                <h2 class="text-white font-instr italic text-9xl select-none">about.</h2>
            </div>
            <p class="text-white font-code text-2xl text-center w-[59vw]">
                In a future where Earth faces extreme overpopulation, the challenge of sustainable food production has grown more pressing than ever. We try to envision a new approach to growing
                <span class="space"
                    ><span class="space-star">
                        <svg viewBox="0 0 512 512">
                            <defs>
                                <linearGradient
                                    id="star-gradient"
                                    x1="0%"
                                    y1="0%"
                                    x2="100%"
                                    y2="0%">
                                    <stop
                                        offset="0%"
                                        style="stop-color: #e38295" />
                                    <stop
                                        offset="50%"
                                        style="stop-color: #9370d8" />
                                    <stop
                                        offset="100%"
                                        style="stop-color: #eac086" />
                                </linearGradient>
                            </defs>
                            <path d="M512 255.1c0 11.34-7.406 20.86-18.44 23.64l-171.3 42.78l-42.78 171.1C276.7 504.6 267.2 512 255.9 512s-20.84-7.406-23.62-18.44l-42.66-171.2L18.47 279.6C7.406 276.8 0 267.3 0 255.1c0-11.34 7.406-20.83 18.44-23.61l171.2-42.78l42.78-171.1C235.2 7.406 244.7 0 256 0s20.84 7.406 23.62 18.44l42.78 171.2l171.2 42.78C504.6 235.2 512 244.6 512 255.1z" /></svg></span
                    ><span class="space-star">
                        <svg viewBox="0 0 512 512">
                            <defs>
                                <linearGradient
                                    id="star-gradient"
                                    x1="0%"
                                    y1="0%"
                                    x2="100%"
                                    y2="0%">
                                    <stop
                                        offset="0%"
                                        style="stop-color: #e38295" />
                                    <stop
                                        offset="50%"
                                        style="stop-color: #9370d8" />
                                    <stop
                                        offset="100%"
                                        style="stop-color: #eac086" />
                                </linearGradient>
                            </defs>
                            <path d="M512 255.1c0 11.34-7.406 20.86-18.44 23.64l-171.3 42.78l-42.78 171.1C276.7 504.6 267.2 512 255.9 512s-20.84-7.406-23.62-18.44l-42.66-171.2L18.47 279.6C7.406 276.8 0 267.3 0 255.1c0-11.34 7.406-20.83 18.44-23.61l171.2-42.78l42.78-171.1C235.2 7.406 244.7 0 256 0s20.84 7.406 23.62 18.44l42.78 171.2l171.2 42.78C504.6 235.2 512 244.6 512 255.1z" /></svg></span
                    ><span class="space-star">
                        <svg viewBox="0 0 512 512">
                            <defs>
                                <linearGradient
                                    id="star-gradient"
                                    x1="0%"
                                    y1="0%"
                                    x2="100%"
                                    y2="0%">
                                    <stop
                                        offset="0%"
                                        style="stop-color: #e38295" />
                                    <stop
                                        offset="50%"
                                        style="stop-color: #9370d8" />
                                    <stop
                                        offset="100%"
                                        style="stop-color: #eac086" />
                                </linearGradient>
                            </defs>
                            <path d="M512 255.1c0 11.34-7.406 20.86-18.44 23.64l-171.3 42.78l-42.78 171.1C276.7 504.6 267.2 512 255.9 512s-20.84-7.406-23.62-18.44l-42.66-171.2L18.47 279.6C7.406 276.8 0 267.3 0 255.1c0-11.34 7.406-20.83 18.44-23.61l171.2-42.78l42.78-171.1C235.2 7.406 244.7 0 256 0s20.84 7.406 23.62 18.44l42.78 171.2l171.2 42.78C504.6 235.2 512 244.6 512 255.1z" /></svg></span
                    ><span class="space-text">plants in space</span> </span
                >, where music becomes an essential part of their environment, much like how sound can influence the development of a baby in the womb. By playing various types of music, we explore how sound could theoretically impact the growth, structure, and resilience of various plants, adapting them to the
                <span class="space"
                    ><span class="space-star">
                        <svg viewBox="0 0 512 512">
                            <defs>
                                <linearGradient
                                    id="star-gradient"
                                    x1="0%"
                                    y1="0%"
                                    x2="100%"
                                    y2="0%">
                                    <stop
                                        offset="0%"
                                        style="stop-color: #e38295" />
                                    <stop
                                        offset="50%"
                                        style="stop-color: #9370d8" />
                                    <stop
                                        offset="100%"
                                        style="stop-color: #eac086" />
                                </linearGradient>
                            </defs>
                            <path d="M512 255.1c0 11.34-7.406 20.86-18.44 23.64l-171.3 42.78l-42.78 171.1C276.7 504.6 267.2 512 255.9 512s-20.84-7.406-23.62-18.44l-42.66-171.2L18.47 279.6C7.406 276.8 0 267.3 0 255.1c0-11.34 7.406-20.83 18.44-23.61l171.2-42.78l42.78-171.1C235.2 7.406 244.7 0 256 0s20.84 7.406 23.62 18.44l42.78 171.2l171.2 42.78C504.6 235.2 512 244.6 512 255.1z" /></svg></span
                    ><span class="space-star">
                        <svg viewBox="0 0 512 512">
                            <defs>
                                <linearGradient
                                    id="star-gradient"
                                    x1="0%"
                                    y1="0%"
                                    x2="100%"
                                    y2="0%">
                                    <stop
                                        offset="0%"
                                        style="stop-color: #e38295" />
                                    <stop
                                        offset="50%"
                                        style="stop-color: #9370d8" />
                                    <stop
                                        offset="100%"
                                        style="stop-color: #eac086" />
                                </linearGradient>
                            </defs>
                            <path d="M512 255.1c0 11.34-7.406 20.86-18.44 23.64l-171.3 42.78l-42.78 171.1C276.7 504.6 267.2 512 255.9 512s-20.84-7.406-23.62-18.44l-42.66-171.2L18.47 279.6C7.406 276.8 0 267.3 0 255.1c0-11.34 7.406-20.83 18.44-23.61l171.2-42.78l42.78-171.1C235.2 7.406 244.7 0 256 0s20.84 7.406 23.62 18.44l42.78 171.2l171.2 42.78C504.6 235.2 512 244.6 512 255.1z" />
                        </svg> </span
                    ><span class="space-star">
                        <svg viewBox="0 0 512 512">
                            <defs>
                                <linearGradient
                                    id="star-gradient"
                                    x1="0%"
                                    y1="0%"
                                    x2="100%"
                                    y2="0%">
                                    <stop
                                        offset="0%"
                                        style="stop-color: #e38295" />
                                    <stop
                                        offset="50%"
                                        style="stop-color: #9370d8" />
                                    <stop
                                        offset="100%"
                                        style="stop-color: #eac086" />
                                </linearGradient>
                            </defs>
                            <path d="M512 255.1c0 11.34-7.406 20.86-18.44 23.64l-171.3 42.78l-42.78 171.1C276.7 504.6 267.2 512 255.9 512s-20.84-7.406-23.62-18.44l-42.66-171.2L18.47 279.6C7.406 276.8 0 267.3 0 255.1c0-11.34 7.406-20.83 18.44-23.61l171.2-42.78l42.78-171.1C235.2 7.406 244.7 0 256 0s20.84 7.406 23.62 18.44l42.78 171.2l171.2 42.78C504.6 235.2 512 244.6 512 255.1z" /></svg></span
                    ><span class="space-text">unique conditions of space</span> </span
                >. This approach aims to redefine how we cultivate plants, using sound as a nurturing force that shapes plant growth in ways that could ultimately sustain human life beyond Earth.
            </p>
        </div>
    </div>
    <Navbar />
    <div id="blob"></div>
</template>

<script setup>
    import { onMounted, onUnmounted } from "vue";
    import Navbar from "../components/Navbar.vue";

    let blobElement = null;
    let pointerMoveListener = null;

    onMounted(() => {
        blobElement = document.getElementById("blob");

        pointerMoveListener = (event) => {
            const { clientX, clientY } = event;

            blobElement?.animate(
                {
                    left: `${clientX}px`,
                    top: `${clientY}px`,
                },
                { duration: 200, fill: "forwards" },
            );

            if (Math.random() < 0.01) {
                const star = document.createElement("img");

                star.src = Math.random() < 0.5 ? "../assets/star.PNG" : "../assets/star2.PNG";
                const randomSize = Math.random() * 4 + 1;
                star.style.cssText = `
                    position: fixed;
                    left: ${clientX}px;
                    top: ${clientY}px;
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

        const starInterval = 4000;
        const initialDelay = 2000;

        const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

        const animate = (star) => {
            star.style.setProperty("--star-left", `${rand(-10, 110)}%`);
            star.style.setProperty("--star-top", `${rand(-40, 140)}%`);

            star.style.animation = "none";
            star.offsetHeight;
            star.style.animation = "";
        };

        const stars = document.getElementsByClassName("space-star");

        Array.from(stars).forEach((star, i) => {
            setTimeout(() => {
                star.classList.add("active");
                animate(star);

                setInterval(() => animate(star), starInterval);
            }, initialDelay + i * 500);
        });
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

    * {
        overflow-y: hidden;
        overflow-x: hidden;
    }

    :root {
        --orange: #e38295;
        --blue: #9370d8;
        --yellow: #eac086;
    }

    .flower {
        filter: brightness(0.6) blur(2px);
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
        position: absolute;
        left: 50%;
        top: 50%;
        translate: -50% -50%;
        border-radius: 50%;
        background: linear-gradient(to right, aquamarine, #9370d8);
        animation: rotate 20s infinite;
        opacity: 0.8;
        filter: blur(200px);
        pointer-events: none;
    }

    .space-text {
        animation: background-pan 3s linear infinite;
        background: linear-gradient(to right, var(--orange), var(--blue), var(--yellow), var(--orange)); /* Added the first color again to make smooth transition */
        background-size: 200%;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        color: transparent;
    }

    .space {
        position: relative;
    }

    .space-star > svg {
        animation: rotate 1000ms linear infinite;
        display: block;
        opacity: 0.7;
    }

    .space-star > svg > path {
        fill: url(#star-gradient);
    }

    .space-star {
        --size: clamp(20px, 1.5vw, 30px);
        animation: scale 1000ms ease forwards;
        display: block;
        height: var(--size);
        left: var(--star-left);
        position: absolute;
        top: var(--star-top);
        width: var(--size);
        opacity: 0;
        z-index: -2;
        filter: blur(1px);
    }

    .space-star.active {
        opacity: 1;
        transition: opacity 600ms ease;
    }

    @keyframes background-pan {
        from {
            background-position: 0% center;
        }
        to {
            background-position: -200% center;
        }
    }

    @keyframes scale {
        from,
        to {
            transform: scale(0);
        }

        50% {
            transform: scale(0.5);
        }
    }

    @keyframes rotate {
        from {
            transform: rotate(0deg);
        }

        to {
            transform: rotate(180deg);
        }
    }
</style>
