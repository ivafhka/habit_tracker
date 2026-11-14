// API на том же адресе, с которого открыт сайт (браузер, Electron, любой хостинг).
// Раньше было "https://localhost:7210" — из-за этого сайт работал только на этом порту.
const API_URL = window.location.origin;
const token = localStorage.getItem("token");
