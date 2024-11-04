<template>
    <div>Aetherial Verdancy</div>

    <button @click="redirect">Grow</button>
</template>

<script>
    export default {
        methods: {
            redirect() {
                this.$router.push("/grow");
            },
        },
    };
</script>
