const params = new URLSearchParams(window.location.search);
const habitId = params.get("id");

if (!habitId) {
    window.location.href = "/index.html";
}

let currentHabitId = null;
let currentHabit = null;
let currentEntries = [];
let isCompleted = false;
let midnightTimer = null;

const MS_IN_DAY = 24 * 60 * 60 * 1000;

function getUtcTodayDateString() {
    return new Date().toISOString().split("T")[0];
}

function getMsUntilNextUtcMidnight() {
    const now = new Date();
    const nextMidnight = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0, 0, 1
    ));
    return nextMidnight.getTime() - now.getTime();
}

function scheduleUtcMidnightRefresh() {
    if (midnightTimer) clearTimeout(midnightTimer);
    midnightTimer = setTimeout(async () => {
        setCompleted(false);
        await loadTodayStatus();
        scheduleUtcMidnightRefresh();
    }, getMsUntilNextUtcMidnight());
}

// ========== ПРОВЕРКА АВТОРИЗАЦИИ ==========
async function checkAuth() {
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "/login.html";
        return false;
    }

    try {
        const res = await fetch(`${API_URL}/api/auth/me`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) {
            localStorage.removeItem("token");
            window.location.href = "/login.html";
            return false;
        }

        const user = await res.json();
        showUserMenu(user.username);
        return true;
    } catch (e) {
        console.error("Auth check failed:", e);
        window.location.href = "/login.html";
        return false;
    }
}

function showUserMenu(username) {
    const authMenu = document.getElementById("auth-menu");
    authMenu.innerHTML = `
        <span class="username">${escapeHtml(username)}</span>
        <button onclick="logout()" class="btn ghost">Выход</button>
    `;
}

function logout() {
    localStorage.removeItem("token");
    window.location.href = "/login.html";
}

// ========== ЗАГРУЗКА ДАННЫХ ПРИВЫЧКИ ==========
async function loadHabit() {
    const token = localStorage.getItem("token");
    const error = document.getElementById("error");

    try {
        const res = await fetch(`${API_URL}/api/habits/${habitId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) {
            const errorData = await safeJson(res);
            error.innerText = errorData?.message || "Ошибка загрузки привычки";
            return;
        }

        const habit = await res.json();
        currentHabit = habit;
        currentHabitId = habit.id;

        document.getElementById("habitTitle").innerText = habit.title;
        document.getElementById("title").value = habit.title;
        document.getElementById("frequency").value = habit.frequency || "Daily";
        document.getElementById("utcToday").textContent = getUtcTodayDateString();

        await loadTodayStatus();
    } catch (e) {
        console.error("Load habit error:", e);
        error.innerText = "Ошибка сервера: " + e.message;
    }
}

async function loadTodayStatus() {
    const token = localStorage.getItem("token");
    const today = getUtcTodayDateString();
    document.getElementById("utcToday").textContent = today;

    try {
        const res = await fetch(`${API_URL}/api/habits/${habitId}/entries`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (res.ok) {
            currentEntries = await res.json();
            updateCurrentPeriodStatusFromEntries();
        }
    } catch (e) {
        console.error("Load current period status error:", e);
    }
}

function updateCurrentPeriodStatusFromEntries() {
    if (!currentHabit) return;

    const frequency = document.getElementById("frequency")?.value || currentHabit.frequency || "Daily";
    const period = getCurrentPeriod(currentHabit.createdAtUtc, frequency);
    const completedInPeriod = currentEntries.some(entry =>
        entry.completed && entry.date && isDateInPeriod(entry.date, period)
    );

    updatePeriodInfo(period, frequency);
    setCompleted(completedInPeriod);
}

function setCompleted(completed) {
    isCompleted = completed;

    const completedBtn = document.getElementById("completedBtn");
    const notCompletedBtn = document.getElementById("notCompletedBtn");

    if (completed) {
        completedBtn.classList.add("active");
        notCompletedBtn.classList.remove("active");
    } else {
        completedBtn.classList.remove("active");
        notCompletedBtn.classList.add("active");
    }
}

// ========== ПЕРИОДЫ UTC ==========
function parseUtcDateOnly(value) {
    const datePart = String(value).split("T")[0];
    const [year, month, day] = datePart.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
}

function addDaysUtc(date, days) {
    return new Date(date.getTime() + days * MS_IN_DAY);
}

function addMonthsFromCreatedUtc(createdDate, months) {
    const targetFirstDay = new Date(Date.UTC(
        createdDate.getUTCFullYear(),
        createdDate.getUTCMonth() + months,
        1
    ));
    const lastDay = new Date(Date.UTC(
        targetFirstDay.getUTCFullYear(),
        targetFirstDay.getUTCMonth() + 1,
        0
    )).getUTCDate();
    const day = Math.min(createdDate.getUTCDate(), lastDay);

    return new Date(Date.UTC(
        targetFirstDay.getUTCFullYear(),
        targetFirstDay.getUTCMonth(),
        day
    ));
}

function getCurrentPeriod(createdAtUtc, frequency) {
    const created = parseUtcDateOnly(createdAtUtc);
    const today = parseUtcDateOnly(getUtcTodayDateString());

    if (frequency === "Weekly") {
        const daysSinceCreation = Math.max(0, Math.floor((today - created) / MS_IN_DAY));
        const periodIndex = Math.floor(daysSinceCreation / 7);
        const start = addDaysUtc(created, periodIndex * 7);
        return { start, end: addDaysUtc(start, 7) };
    }

    if (frequency === "Monthly") {
        let periodIndex = (today.getUTCFullYear() - created.getUTCFullYear()) * 12
            + today.getUTCMonth() - created.getUTCMonth();
        periodIndex = Math.max(0, periodIndex);

        let start = addMonthsFromCreatedUtc(created, periodIndex);
        if (start > today) {
            periodIndex = Math.max(0, periodIndex - 1);
            start = addMonthsFromCreatedUtc(created, periodIndex);
        }

        return {
            start,
            end: addMonthsFromCreatedUtc(created, periodIndex + 1)
        };
    }

    return { start: today, end: addDaysUtc(today, 1) };
}

function isDateInPeriod(dateString, period) {
    const date = parseUtcDateOnly(dateString);
    return date >= period.start && date < period.end;
}

function updatePeriodInfo(period, frequency) {
    const completionLabel = document.getElementById("completionLabel");
    const periodInfo = document.getElementById("periodInfo");
    const lastDay = addDaysUtc(period.end, -1);

    const label = frequency === "Weekly"
        ? "Выполнение текущей недели"
        : frequency === "Monthly"
            ? "Выполнение текущего месяца"
            : "Выполнение сегодня";

    completionLabel.innerHTML = `${label} <span class="utc-pill">UTC: <span id="utcToday">${getUtcTodayDateString()}</span></span>`;
    periodInfo.textContent = `Текущий период: ${formatUtcDate(period.start)} — ${formatUtcDate(lastDay)}`;
}

function formatUtcDate(date) {
    return date.toISOString().split("T")[0];
}

// ========== СОХРАНЕНИЕ ==========
async function save() {
    const title = document.getElementById("title").value.trim();
    const frequency = document.getElementById("frequency").value;
    const error = document.getElementById("error");
    const token = localStorage.getItem("token");

    error.innerText = "";

    if (!title) {
        error.innerText = "Введите название привычки";
        return;
    }

    try {
        const updateRes = await fetch(`${API_URL}/api/habits/${habitId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ title, frequency })
        });

        if (!updateRes.ok) {
            const errorData = await safeJson(updateRes);
            error.innerText = errorData?.message || "Ошибка обновления";
            return;
        }

        const entryRes = await fetch(`${API_URL}/api/habits/${habitId}/entries`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                date: getUtcTodayDateString(),
                completed: isCompleted
            })
        });

        if (!entryRes.ok) {
            const errorData = await safeJson(entryRes);
            error.innerText = errorData?.message || "Ошибка сохранения статуса";
            return;
        }

        window.location.href = "/index.html";
    } catch (e) {
        console.error("Save error:", e);
        error.innerText = "Ошибка сервера: " + e.message;
    }
}

async function deleteHabit() {
    if (!confirm("Удалить привычку вместе со всей историей выполнения?")) return;

    const error = document.getElementById("error");
    const token = localStorage.getItem("token");
    error.innerText = "";

    try {
        const res = await fetch(`${API_URL}/api/habits/${habitId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) {
            const data = await safeJson(res);
            error.innerText = data?.message || "Ошибка удаления";
            return;
        }

        window.location.href = "/index.html";
    } catch (e) {
        console.error("Delete error:", e);
        error.innerText = "Ошибка сервера: " + e.message;
    }
}

function cancel() {
    window.location.href = "/index.html";
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function safeJson(res) {
    try { return await res.json(); }
    catch { return null; }
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
window.addEventListener("load", async () => {
    const isAuthorized = await checkAuth();
    if (isAuthorized) {
        await loadHabit();
        document.getElementById("frequency")?.addEventListener("change", updateCurrentPeriodStatusFromEntries);
        scheduleUtcMidnightRefresh();
    }
});
