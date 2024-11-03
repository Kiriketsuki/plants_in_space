import { createRouter, createWebHistory } from "vue-router";

// Implement lazy loading for better performance
const Home = () => import("../views/Home.vue");
const Audio = () => import("../views/Audio.vue");
const Desktop = () => import("../views/Desktop.vue");
const Mobile = () => import("../views/Mobile.vue");
const SpotifyRedirect = () => import("../views/SpotifyRedirect.vue");

// Function to generate random alphanumeric ID
const generateRandomId = (length = 8) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join("");
};

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
        // Add a route for /desktop without ID
        path: "/desktop",
        name: "desktop-redirect",
        beforeEnter: (to, from, next) => {
            const randomId = generateRandomId();
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
];

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL), // Updated for Vite
    routes,
    scrollBehavior(to, from, savedPosition) {
        if (savedPosition) {
            return savedPosition;
        } else {
            return { top: 0 };
        }
    },
});

// Add navigation guards for page titles
router.beforeEach((to, from, next) => {
    document.title = to.meta.title ? `${to.meta.title} - Plants in Space` : "Your App Name";
    next();
});

export default router;
