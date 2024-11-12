module.exports = {
    content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
    theme: {
        extend: {
            fontFamily: {
                instr: ['"Instrument Serif", serif'],
                code: ['"Fira Code", monospace'],
            },
            colors: {
                back: "#191615",
            },
        },
    },
    plugins: [],
};
