// Get the current hostname (IP address or localhost)
const hostname = window.location.hostname;
const SOCKET_URL = `http://${hostname}:3000`;

export { SOCKET_URL };
