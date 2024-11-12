                star.style.cssText = `
                    position: fixed;
                    left: ${clientX}px;
                    top: ${clientY}px;
                    width: 3vw;
                    height: 3vh;
                    pointer-events: none;
                    z-index: 1;
                    transform: translate(-50%, -50%);
                    opacity: 1;
                    transition: opacity 0.5s ease-out;
                `;