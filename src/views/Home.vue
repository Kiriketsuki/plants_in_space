<template>
    <div class="w-screen h-screen flex flex-col items-center justify-center">
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
        <div class="title text-white text-[10rem] z-10 font-instr flex flex-col items-center">
            <div class="first flex flex-row items-start w-full">
                <h1>Aetherial</h1>
            </div>
            <div class="second flex flex-row-reverse w-full">
                <h1>Verdancy</h1>
            </div>
        </div>

        <div class="nav z-10 flex w-full fixed bottom-[10vh] items-start gap-10 px-[10vw]">
            <button @click="redirect('/grow')">Grow</button>
            <button @click="redirect('/latest')">Latest</button>
            <button @click="redirect('/forest')">Forest</button>
        </div>
    </div>
</template>

<script>
    export default {
        methods: {
            redirect(link) {
                this.$router.push(link);
            },
        },
    };
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
</style>
