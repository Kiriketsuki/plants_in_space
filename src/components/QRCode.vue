<template>
    <div class="qr-code-container">
        <canvas id="qr-code"></canvas>
    </div>
</template>

<script>
    import { defineComponent, onMounted, watch } from "vue";
    import QRCode from "qrcode";

    export default defineComponent({
        name: "QRCode",
        props: {
            data: {
                type: String,
                required: true,
            },
            size: {
                type: Number,
                default: 200,
            },
            darkColor: {
                type: String,
                default: "#000000",
            },
            lightColor: {
                type: String,
                default: "#FFFFFF",
            },
        },
        setup(props) {
            const generateQR = async () => {
                try {
                    const canvas = document.getElementById("qr-code");
                    await QRCode.toCanvas(canvas, props.data, {
                        width: props.size,
                        margin: 1,
                        color: {
                            dark: props.darkColor,
                            light: props.lightColor,
                        },
                    });
                } catch (err) {
                    console.error("Error generating QR code:", err);
                }
            };

            onMounted(() => {
                generateQR();
            });

            // Regenerate QR code when data changes
            watch(
                () => props.data,
                () => {
                    generateQR();
                },
            );

            return {
                generateQR,
            };
        },
    });
</script>

<style scoped>
    .qr-code-container {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
    }
</style>
