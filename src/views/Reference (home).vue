<template>
    <div class="w-[100vw] h-screen bg-yellow-500 flex items-center justify-center border-2 flex-col">
        <Title class="absolute top-0 left-0" />
        <h1 class="text-8xl">hello world</h1>
        <h2>goodbye world</h2>
        <div>
            {{ currentNumber }}
        </div>
        <button @click='increaseNumber'>
            increase number
        </button>

        <button @click="decreaseNumber">
            decrease number
        </button>

        <BigRectangle />

        <button @click="reset">
            reset
        </button>

        <button @click="navTo('desktop/1')">
            go to desktop
        </button>

        <BigRectangle />
        <button @click="navTo('about')">
            about
        </button>

        <button @click="add(3, 2)">add 1 and 2</button>
    </div>

</template>

<script>
import BigRectangle from "../components/BigRectangle.vue";
import Title from "../components/Title.vue";
export default {
    data() {
        return {
            currentNumber: 0,
        }
    },
    components: { BigRectangle, Title },
    methods: {
        increaseNumber() {
            this.currentNumber += 1;
        },
        decreaseNumber() {
            this.currentNumber -= 1;
        },
        reset() {
            this.currentNumber = 0;
        },
        navTo(path) {
            // console.log("path is ");
            // console.log(path)
            this.$router.push(path);
        },
        add(a, b) {
            console.log(a);
            console.log(b);
            console.log(a + b);
        }

    }
}
</script>
<style></style>