const calendar = document.getElementById("calendar");
const monthYearTitle = document.getElementById("monthYear");
const prevMonthBtn = document.getElementById("prevMonth");
const nextMonthBtn = document.getElementById("nextMonth");

let currentDate = new Date();
let dashboardState = null;
let midnightTimer = null;

const FREQUENCY_LABELS = {
    Daily: "Ежедневная",
    Weekly: "Еженедельная",
    Monthly: "Ежемесячная"
};

// ========== ДАТЫ UTC ==========
function getUtcTodayDateString() {
    return new Date().toISOString().split("T")[0];
}

function formatDateOnly(year, monthIndex, day) {
    const month = String(monthIndex + 1).padStart(2, "0");
    const date = String(day).padStart(2, "0");
    return `${year}-${month}-${date}`;
}

function toDateOnlyString(value) {
    if (!value) return "";

    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
        return value.slice(0, 10);
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toISOString().split("T")[0];
}

function getCompletedDateSet() {
    return new Set((dashboardState?.completedDates || [])
        .map(toDateOnlyString)
        .filter(Boolean));
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
        generateCalendar();
        await loadDashboard();
        scheduleUtcMidnightRefresh();
    }, getMsUntilNextUtcMidnight());
}

// ========== ПРОВЕРКА АВТОРИЗАЦИИ ==========
async function checkAuth() {
    const token = localStorage.getItem("token");

    if (!token) {
        showGuestMenu();
        hideAddHabitButton();
        hideHabitsLink();
        renderGuestState();
        return false;
    }

    try {
        const res = await fetch(`${API_URL}/api/auth/me`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) {
            localStorage.removeItem("token");
            showGuestMenu();
            hideAddHabitButton();
            hideHabitsLink();
            renderGuestState();
            return false;
        }

        const user = await res.json();
        showUserMenu(user.username);
        showAddHabitButton();
        showHabitsLink();
        return true;
    } catch (e) {
        console.error("Auth check failed:", e);
        showGuestMenu();
        hideAddHabitButton();
        hideHabitsLink();
        renderGuestState();
        return false;
    }
}

function showGuestMenu() {
    const authMenu = document.getElementById("auth-menu");
    authMenu.innerHTML = `
        <a href="login.html" class="btn orange">Вход</a>
        <a href="register.html" class="btn ghost">Регистрация</a>
    `;
}

function showUserMenu(username) {
    const authMenu = document.getElementById("auth-menu");
    authMenu.innerHTML = `
        <span class="username">${escapeHtml(username)}</span>
        <button onclick="logout()" class="btn ghost">Выход</button>
    `;
}

function showAddHabitButton() {
    const btn = document.getElementById("addHabitBtn");
    if (btn) btn.style.display = "inline-flex";
}

function hideAddHabitButton() {
    const btn = document.getElementById("addHabitBtn");
    if (btn) btn.style.display = "none";
}

function showHabitsLink() {
    const title = document.getElementById("habitsTitle");
    if (title) title.innerHTML = '<a href="habits.html" class="habits-link">Все привычки</a>';
}

function hideHabitsLink() {
    const title = document.getElementById("habitsTitle");
    if (title) title.textContent = "Все привычки";
}

function logout() {
    localStorage.removeItem("token");
    window.location.href = "/login.html";
}

// ========== КАЛЕНДАРЬ ==========
function generateCalendar(date = currentDate) {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const monthNames = [
        "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
        "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
    ];

    monthYearTitle.textContent = `${monthNames[month]} ${year}`;

    const firstDay = new Date(Date.UTC(year, month, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const firstDayAdjusted = firstDay === 0 ? 6 : firstDay - 1;
    const todayUtc = getUtcTodayDateString();
    const completedDates = getCompletedDateSet();

    calendar.innerHTML = "";

    for (let i = 0; i < firstDayAdjusted; i++) {
        const empty = document.createElement("div");
        empty.className = "day empty";
        calendar.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const div = document.createElement("div");
        const dateString = formatDateOnly(year, month, day);
        const isToday = dateString === todayUtc;
        const isCompletedDate = completedDates.has(dateString);

        div.className = "day";
        div.textContent = day;

        if (isCompletedDate && dateString < todayUtc) {
            div.classList.add("past-completed");
            div.title = "В этот день была выполнена хотя бы одна привычка";
        }

        if (isToday) {
            div.classList.add("today");
            if (dashboardState?.completeToday > 0) {
                div.classList.add("completed");
                div.title = `Сегодня выполнено: ${dashboardState.completeToday}`;
            }
        }

        calendar.appendChild(div);
    }
}

prevMonthBtn.addEventListener("click", () => {
    currentDate = new Date(Date.UTC(
        currentDate.getUTCFullYear(),
        currentDate.getUTCMonth() - 1,
        1
    ));
    generateCalendar(currentDate);
});

nextMonthBtn.addEventListener("click", () => {
    currentDate = new Date(Date.UTC(
        currentDate.getUTCFullYear(),
        currentDate.getUTCMonth() + 1,
        1
    ));
    generateCalendar(currentDate);
});

// ========== DASHBOARD ==========
async function loadDashboard() {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
        const res = await fetch(`${API_URL}/api/dashboard`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) {
            renderErrorState("Не удалось загрузить привычки");
            return;
        }

        dashboardState = await res.json();
        displayDashboard(dashboardState);
        generateCalendar(currentDate);
    } catch (e) {
        console.error("Dashboard error:", e);
        renderErrorState("Ошибка сервера");
    }
}

function displayDashboard(dashboard) {
    const habits = dashboard.habits || [];
    const fallbackTodayHabits = habits.filter(habit => habit.completedToday);
    const todayHabits = Array.isArray(dashboard.todayHabits) && dashboard.todayHabits.length > 0
        ? dashboard.todayHabits
        : fallbackTodayHabits;

    displayAllHabits(habits);
    displayTodayHabits(todayHabits);

    // Серия считается по дням: +1 только за UTC-день, где выполнена хотя бы одна привычка.
    const currentStreak = Number.isInteger(dashboard.currentStreak)
        ? dashboard.currentStreak
        : (todayHabits.length > 0 ? 1 : 0);
    document.getElementById("currentStreak").textContent = currentStreak;
    document.getElementById("maxStreak").textContent = dashboard.bestStreak || 0;
}

function displayAllHabits(habits) {
    const list = document.getElementById("allHabits");
    if (!habits.length) {
        list.innerHTML = '<li class="empty-message">Нет привычек</li>';
        return;
    }

    list.innerHTML = habits.map(habit => `
        <li class="habit-item" onclick="goToEditHabit(${habit.habitId})">
            <div>
                <span class="habit-title">${escapeHtml(habit.title)}</span>
                <span class="frequency-badge">${getFrequencyLabel(habit.frequency)}</span>
            </div>
            <span class="mini-status ${habit.completedInCurrentPeriod ? "done" : "pending"}" title="Статус текущего периода"></span>
        </li>
    `).join("");
}

function displayTodayHabits(habits) {
    const list = document.getElementById("todayHabits");
    const utcDate = getUtcTodayDateString();

    if (!habits.length) {
        list.innerHTML = `
            <li class="empty-message">
                Пока ничего не выполнено сегодня<br>
                <small>UTC: ${utcDate}</small>
            </li>`;
        return;
    }

    list.innerHTML = habits.map(habit => `
        <li class="today-habit-item" onclick="goToEditHabit(${habit.habitId})">
            <span class="checkmark">✓</span>
            <div>
                <span class="habit-title">${escapeHtml(habit.title)}</span>
                <span class="frequency-badge">${getFrequencyLabel(habit.frequency)}</span>
            </div>
        </li>
    `).join("");
}

function renderGuestState() {
    document.getElementById("allHabits").innerHTML = '<li class="empty-message">Войдите, чтобы видеть привычки</li>';
    document.getElementById("todayHabits").innerHTML = '<li class="empty-message">Войдите, чтобы видеть выполненные сегодня привычки</li>';
    document.getElementById("currentStreak").textContent = "0";
    document.getElementById("maxStreak").textContent = "0";
}

function renderErrorState(message) {
    document.getElementById("allHabits").innerHTML = `<li class="error-message">${message}</li>`;
    document.getElementById("todayHabits").innerHTML = `<li class="error-message">${message}</li>`;
}

// ========== УПРАВЛЕНИЕ ПРИВЫЧКАМИ ==========
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

    if (!token) {
        error.innerText = "Необходима авторизация";
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
        await loadDashboard();
    } catch (e) {
        console.error("Add habit error:", e);
        error.innerText = "Ошибка сервера";
    }
}

function goToEditHabit(habitId) {
    window.location.href = `edit-habit.html?id=${habitId}`;
}

function getFrequencyLabel(frequency) {
    return FREQUENCY_LABELS[frequency] || FREQUENCY_LABELS.Daily;
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
    generateCalendar();
    const isAuthorized = await checkAuth();
    if (isAuthorized) {
        await loadDashboard();
        scheduleUtcMidnightRefresh();
    }
});
