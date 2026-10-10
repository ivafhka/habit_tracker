const FREQUENCY_LABELS = {
    Daily: "Ежедневная",
    Weekly: "Еженедельная",
    Monthly: "Ежемесячная"
};

let midnightTimer = null;

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
        await loadHabits();
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

// ========== ЗАГРУЗКА ПРИВЫЧЕК ==========
async function loadHabits() {
    const token = localStorage.getItem("token");
    const habitsList = document.getElementById("habitsList");

    try {
        const res = await fetch(`${API_URL}/api/dashboard`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) {
            habitsList.innerHTML = '<div class="error-message">Ошибка загрузки привычек</div>';
            return;
        }

        const dashboard = await res.json();
        displayHabits(dashboard.habits || []);
    } catch (e) {
        console.error("Load habits error:", e);
        habitsList.innerHTML = '<div class="error-message">Ошибка сервера</div>';
    }
}

function displayHabits(habits) {
    const habitsList = document.getElementById("habitsList");

    if (!habits.length) {
        habitsList.innerHTML = '<div class="empty-message">У вас пока нет привычек. Создайте первую!</div>';
        return;
    }

    habitsList.innerHTML = habits.map(habit => `
        <div class="habit-row" onclick="goToEditHabit(${habit.habitId})">
            <div class="habit-name-block">
                <div class="habit-name">${escapeHtml(habit.title)}</div>
                <div class="habit-meta">
                    <span class="frequency-badge">${getFrequencyLabel(habit.frequency)}</span>
                    <span>${formatDate(habit.createdAtUtc)}</span>
                </div>
            </div>
            <div class="habit-status">
                <span class="status-badge ${habit.completedInCurrentPeriod ? "status-completed" : "status-pending"}">
                    ${getPeriodStatusText(habit)}
                </span>
            </div>
            <div class="habit-stats">
                <strong>${habit.currentStreak || 0}</strong>
                <span>серия</span>
            </div>
        </div>
    `).join("");
}

function goToEditHabit(habitId) {
    window.location.href = `edit-habit.html?id=${habitId}`;
}

// ========== МОДАЛЬНОЕ ОКНО ==========
function showAddHabitModal() {
    const modal = document.getElementById("addHabitModal");
    const input = document.getElementById("habitTitle");
    const frequency = document.getElementById("habitFrequency");
    const error = document.getElementById("habitError");

    input.value = "";
    if (frequency) frequency.value = "Daily";
    error.innerText = "";
    modal.style.display = "flex";
    input.focus();
}

function closeAddHabitModal() {
    document.getElementById("addHabitModal").style.display = "none";
}

window.onclick = function(event) {
    const modal = document.getElementById("addHabitModal");
    if (event.target === modal) closeAddHabitModal();
};

async function addHabit() {
    const title = document.getElementById("habitTitle").value.trim();
    const frequency = document.getElementById("habitFrequency")?.value || "Daily";
    const error = document.getElementById("habitError");
    const token = localStorage.getItem("token");

    error.innerText = "";

    if (!title) {
        error.innerText = "Введите название привычки";
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/habits`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ title, frequency })
        });

        if (!res.ok) {
            const data = await safeJson(res);
            error.innerText = data?.message || "Ошибка создания привычки";
            return;
        }

        closeAddHabitModal();
        await loadHabits();
    } catch (e) {
        console.error("Add habit error:", e);
        error.innerText = "Ошибка сервера";
    }
}

function getFrequencyLabel(frequency) {
    return FREQUENCY_LABELS[frequency] || FREQUENCY_LABELS.Daily;
}

function getPeriodStatusText(habit) {
    const done = Boolean(habit.completedInCurrentPeriod);

    if (habit.frequency === "Weekly") {
        return done ? "Выполнена на этой неделе" : "Не выполнена на этой неделе";
    }

    if (habit.frequency === "Monthly") {
        return done ? "Выполнена в этом месяце" : "Не выполнена в этом месяце";
    }

    return done ? "Выполнена сегодня" : "Не выполнена сегодня";
}

function formatDate(date) {
    if (!date) return `UTC: ${getUtcTodayDateString()}`;
    const d = new Date(date);
    return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
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
        await loadHabits();
        scheduleUtcMidnightRefresh();
    }
});
