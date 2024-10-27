import { createRouter, createWebHistory } from "vue-router";

// Implement lazy loading for better performance
const Home = () => import("../views/Home.vue");
const Audio = () => import("../views/Audio.vue");
const Desktop = () => import("../views/Desktop.vue");
const Mobile = () => import("../views/Mobile.vue");
const SpotifyRedirect = () => import("../views/SpotifyRedirect.vue");

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
