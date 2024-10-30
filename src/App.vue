<template>
    <BigRectangle></BigRectangle>
    <router-view></router-view>
</template>

<script>
import BigRectangle from "./components/BigRectangle.vue"
export default {
    name: "App",
    components: { BigRectangle }
};
</script>
