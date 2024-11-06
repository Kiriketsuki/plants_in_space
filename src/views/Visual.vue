<template>
    <WaterRipple
        :width="30"
        :height="30"
        :segments="150"
        color="#1a75ff" />>
</template>

<script>
    import WaterRipple from "../components/WaterRipple.vue";

    export default {
        components: {
            WaterRipple,
        },
    };
</script>
