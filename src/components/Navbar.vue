<template>
    <div class="w-screen z-10 text-white flex flex-row justify-between px-[5vw] py-[2vw] fixed bottom-0">
        <div class="flex gap-[5vw]">
            <button
                @click="redirect('/about')"
                data-value="ABOUT">
                About
            </button>
            <button
                @click="redirect('/grow')"
                data-value="GROW">
                Grow
            </button>
        </div>
        <div class="flex gap-[5vw]">
            <button
                @click="redirect('/latest')"
                data-value="LATEST">
                Latest
            </button>
            <button
                @click="redirect('/forest')"
                data-value="FOREST">
                Forest
            </button>
        </div>
    </div>
</template>

<script>
    import { onMounted } from "vue";

    export default {
        methods: {
            redirect(link) {
                this.$router.push(link);
            },
        },
        setup() {
            onMounted(() => {
                // Letters
                const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
                let intervals = {};

                document.querySelectorAll("button").forEach((button) => {
                    button.onmouseover = (event) => {
                        let iteration = 0;

                        // Clear previous interval for this specific button
                        clearInterval(intervals[event.target.dataset.value]);

                        intervals[event.target.dataset.value] = setInterval(() => {
                            event.target.innerText = event.target.dataset.value
                                .split("")
                                .map((letter, index) => {
                                    if (index < iteration) {
                                        return event.target.dataset.value[index];
                                    }

                                    return letters[Math.floor(Math.random() * 26)];
                                })
                                .join("");

                            if (iteration >= event.target.dataset.value.length) {
                                clearInterval(intervals[event.target.dataset.value]);
                            }

                            iteration += 1 / 3;
                        }, 30);
                    };
                });
            });
        },
    };
</script>

<style scoped>
    button {
        @apply hover:border-white border-b-2 border-transparent p-2 text-3xl text-white font-code uppercase;
    }
</style>
