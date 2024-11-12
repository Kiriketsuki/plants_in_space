<template>
    <div
        v-if="error"
        class="fixed inset-0 flex items-center justify-center bg-back">
        <div class="text-white text-xl">
            {{ error }}
        </div>
    </div>
    <div
        v-else
        class="fixed inset-0 flex items-center justify-center bg-back">
        <div class="text-white text-9xl capitalize font-code">Finding The Latest Plant</div>
    </div>
</template>

<script setup>
    import { onMounted, ref } from "vue";
    import { useRouter } from "vue-router";
    import { firebaseConfig } from "../../secrets";
    import { initializeApp } from "firebase/app";
    import { getFirestore, collection, query, orderBy, limit, getDocs } from "firebase/firestore";

    const router = useRouter();
    const error = ref(null);

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    async function findLatestPlant() {
        try {
            // Query the plants collection, ordered by ID in descending order, limit to 1
            const q = query(collection(db, "plants"), orderBy("id", "desc"), limit(1));

            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                error.value = "No plants found";
                setTimeout(() => router.push("/"), 2000);
                return;
            }

            // Get the ID of the latest plant
            const latestPlant = querySnapshot.docs[0];
            const originalFilename = latestPlant.data().storageLink.split("/").pop().replace(".glb", "");

            // Redirect to the display route with this ID
            router.push(`/display/${originalFilename}`);
        } catch (err) {
            console.error("Error finding latest plant:", err);
            error.value = "Error loading latest plant";
            setTimeout(() => router.push("/"), 2000);
        }
    }

    onMounted(() => {
        findLatestPlant();
    });
</script>
