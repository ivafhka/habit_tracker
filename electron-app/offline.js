// Логика страницы «Нет связи с сервером».
const params = new URLSearchParams(location.search);
const urlInput = document.getElementById("urlInput");
const errorEl = document.getElementById("error");

document.getElementById("serverUrl").textContent = params.get("url") || "";
document.getElementById("reason").textContent = params.get("reason")
    ? "Причина: " + params.get("reason")
    : "";

window.electronAPI.getServerUrl().then((url) => {
    urlInput.value = url;
});

document.getElementById("retryBtn").addEventListener("click", () => {
    errorEl.textContent = "";
    window.electronAPI.retry();
});

async function save() {
    errorEl.textContent = "";
    const result = await window.electronAPI.setServerUrl(urlInput.value);
    if (!result.ok) errorEl.textContent = result.error;
}

document.getElementById("saveBtn").addEventListener("click", save);
urlInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") save();
});
