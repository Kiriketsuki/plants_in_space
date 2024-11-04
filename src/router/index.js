import { createRouter, createWebHistory } from "vue-router";
import { firebaseConfig } from "../../secrets";
import { initializeApp } from "firebase/app";
import { getStorage, ref as storageRef, listAll } from "firebase/storage";

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

// Lazy loading components
const Home = () => import("../views/Home.vue");
const Audio = () => import("../views/Audio.vue");
const Desktop = () => import("../views/Desktop.vue");
const Mobile = () => import("../views/Mobile.vue");
const SpotifyRedirect = () => import("../views/SpotifyRedirect.vue");
const Display = () => import("../views/Display.vue");
const DisplayLatest = () => import("../views/DisplayLatest.vue");

// Function to get existing IDs from storage
async function getExistingIds() {
    try {
        const plantsRef = storageRef(storage, "plants");
        const result = await listAll(plantsRef);
        return result.items.map((item) => item.name.replace(".glb", ""));
    } catch (error) {
        console.error("Error listing files:", error);
        return [];
    }
}

// Function to generate unique random ID
async function generateUniqueRandomId(length = 8) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const existingIds = await getExistingIds();

    let id;
    let attempts = 0;
    const maxAttempts = 10; // Prevent infinite loop

    do {
        id = Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join("");
        attempts++;

        if (attempts >= maxAttempts) {
            console.error("Max attempts reached generating unique ID");
            break;
        }
    } while (existingIds.includes(id));

    return id;
}

const routes = [
    {
        path: "/",
        name: "home",
        component: Home,
        meta: {
            title: "Home",
        },
    },
    {
        path: "/audio",
        name: "audio",
        component: Audio,
        meta: {
            title: "Audio",
        },
    },
    {
        path: "/desktop",
        name: "desktop-redirect",
        beforeEnter: async (to, from, next) => {
            const randomId = await generateUniqueRandomId();
            next({ name: "desktop", params: { id: randomId } });
        },
    },
    {
        path: "/desktop/:id",
        name: "desktop",
        component: Desktop,
        props: true,
        meta: {
            title: "Desktop",
        },
    },
    {
        path: "/mobile/:id",
        name: "mobile",
        component: Mobile,
        props: true,
        meta: {
            title: "Mobile",
        },
    },
    {
        path: "/mobile/redirect",
        name: "spotify-redirect",
        component: SpotifyRedirect,
    },
    {
        path: "/display/:id",
        name: "display",
        component: Display,
        props: true,
        meta: {
            title: "Display",
        },
    },
    {
        path: "/latest",
        name: "LatestPlant",
        component: DisplayLatest,
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes: routes.sort((a, b) => {
        if (a.path.includes(":") && !b.path.includes(":")) return 1;
        if (!a.path.includes(":") && b.path.includes(":")) return -1;
        return 0;
    }),
});

router.beforeEach((to, from, next) => {
    document.title = to.meta.title ? `${to.meta.title} - Plants in Space` : "Your App Name";
    next();
});

export default router;
