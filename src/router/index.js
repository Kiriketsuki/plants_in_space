import { createRouter, createWebHistory } from "vue-router";
import { firebaseConfig } from "../../secrets";
import { initializeApp } from "firebase/app";
import { getStorage, ref as storageRef, listAll } from "firebase/storage";

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

// Lazy loading components
const Home = () => import("../views/Home.vue");
const Desktop = () => import("../views/Desktop.vue");
const Mobile = () => import("../views/Mobile.vue");
const Display = () => import("../views/Display.vue");
const DisplayLatest = () => import("../views/DisplayLatest.vue");
const Hologram = () => import("../views/Hologram.vue");
const HologramLatest = () => import("../views/HologramLatest.vue");
const Visual = () => import("../views/Visual.vue");
const ForestDisplay = () => import("../views/ForestDisplay.vue");
const About = () => import("../views/About.vue");

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
        path: "/grow",
        name: "grow-redirect",
        beforeEnter: async (to, from, next) => {
            const randomId = await generateUniqueRandomId();
            next({ name: "grow", params: { id: randomId } });
        },
    },
    {
        path: "/grow/:id",
        name: "grow",
        component: Desktop,
        props: true,
        meta: {
            title: "Grow",
        },
    },
    {
        path: "/controls/:id",
        name: "controls",
        component: Mobile,
        props: true,
        meta: {
            title: "Controls",
        },
    },
    {
        path: "/display",
        name: "display-redirect",
        redirect: "/latest",
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
        name: "latest",
        component: DisplayLatest,
    },
    {
        path: "/hologram",
        name: "hologram-redirect",
        redirect: "/hologram-latest",
    },
    {
        path: "/hologram/:id",
        name: "hologram",
        component: Hologram,
        props: true,
        meta: {
            title: "Hologram",
        },
    },
    {
        path: "/hologram-latest",
        name: "hologram-latest",
        component: HologramLatest,
    },
    {
        path: "/visual",
        name: "visual",
        component: Visual,
        meta: {
            title: "Visual",
        },
    },
    {
        path: "/forest",
        name: "forest",
        component: ForestDisplay,
        meta: {
            title: "Forest",
        },
    },
    {
        path: "/about",
        name: "about",
        component: About,
        meta: {
            title: "About",
        },
    },
    {
        path: "/:catchAll(.*)",
        redirect: "/",
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
    document.title = to.meta.title ? `${to.meta.title} - Aetherial Verdancy` : "Aetherial Verdancy";
    next();
});

export default router;
