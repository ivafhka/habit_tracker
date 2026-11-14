import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api.js";
import {
  FREQUENCY_LABELS,
  getUtcTodayDateString,
  msUntilNextUtcMidnight,
  toDateOnlyString,
} from "../utils/dates.js";
import Calendar from "../components/Calendar.jsx";
import AddHabitModal from "../components/AddHabitModal.jsx";

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [today, setToday] = useState(getUtcTodayDateString());
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [modalOpen, setModalOpen] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      const res = await api("/api/dashboard");
      if (!res.ok) {
        setError("Не удалось загрузить привычки");
        return;
      }
      setDashboard(await res.json());
      setError("");
    } catch (e) {
      console.error("Dashboard error:", e);
      setError("Ошибка сервера");
    }
  }, []);

  // Загрузка + перезагрузка в начале каждого UTC-дня
  useEffect(() => {
    if (!user) {
      setDashboard(null);
      return;
    }
    loadDashboard();
    const timer = setTimeout(() => setToday(getUtcTodayDateString()), msUntilNextUtcMidnight());
    return () => clearTimeout(timer);
  }, [user, today, loadDashboard]);

  const habits = dashboard?.habits ?? [];
  const todayHabits = dashboard?.todayHabits?.length
    ? dashboard.todayHabits
    : habits.filter((h) => h.completedToday);

  const completedDates = useMemo(
    () => new Set((dashboard?.completedDates ?? []).map(toDateOnlyString).filter(Boolean)),
    [dashboard]
  );

  const currentStreak = Number.isInteger(dashboard?.currentStreak)
    ? dashboard.currentStreak
    : todayHabits.length > 0 ? 1 : 0;

  const shiftMonth = (delta) =>
    setCurrentDate((d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + delta, 1)));

  const leftContent = !user
    ? <li className="empty-message">Войдите, чтобы видеть привычки</li>
    : error
      ? <li className="error-message">{error}</li>
      : habits.length === 0
        ? <li className="empty-message">Нет привычек</li>
        : habits.map((h) => (
            <li key={h.habitId} className="habit-item" onClick={() => navigate(`/edit/${h.habitId}`)}>
              <div>
                <span className="habit-title">{h.title}</span>
                <span className="frequency-badge">
                  {FREQUENCY_LABELS[h.frequency] ?? FREQUENCY_LABELS.Daily}
                </span>
              </div>
              <span
                className={`mini-status ${h.completedInCurrentPeriod ? "done" : "pending"}`}
                title="Статус текущего периода"
              />
            </li>
          ));

  const rightContent = !user
    ? <li className="empty-message">Войдите, чтобы видеть выполненные сегодня привычки</li>
    : todayHabits.length === 0
      ? (
          <li className="empty-message">
            Пока ничего не выполнено сегодня<br />
            <small>UTC: {today}</small>
          </li>
        )
      : todayHabits.map((h) => (
          <li key={h.habitId} className="today-habit-item" onClick={() => navigate(`/edit/${h.habitId}`)}>
            <span className="checkmark">✓</span>
            <div>
              <span className="habit-title">{h.title}</span>
              <span className="frequency-badge">
                {FREQUENCY_LABELS[h.frequency] ?? FREQUENCY_LABELS.Daily}
              </span>
            </div>
          </li>
        ));

  return (
    <div className="container">
      <aside className="sidebar left">
        <h3>
          {user ? <Link to="/habits" className="habits-link">Все привычки</Link> : "Все привычки"}
        </h3>

        {user && (
          <button className="btn orange add-habit-btn" onClick={() => setModalOpen(true)}>
            + Добавить
          </button>
        )}

        <ul id="allHabits">{leftContent}</ul>
      </aside>

      <main className="center">
        <Calendar
          currentDate={currentDate}
          onPrev={() => shiftMonth(-1)}
          onNext={() => shiftMonth(1)}
          completedDates={completedDates}
          today={today}
          completeToday={dashboard?.completeToday ?? 0}
        />

        <div className="streaks">
          <div>Текущая серия: <span>{currentStreak}</span></div>
          <div>Лучшая серия: <span>{dashboard?.bestStreak ?? 0}</span></div>
        </div>
      </main>

      <aside className="sidebar right">
        <h3>Привычки сегодня</h3>
        <ul id="todayHabits">{rightContent}</ul>
      </aside>

      <AddHabitModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={loadDashboard}
      />
    </div>
  );
}
