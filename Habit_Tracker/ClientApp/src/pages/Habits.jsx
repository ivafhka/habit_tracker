import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import {
  FREQUENCY_LABELS,
  getUtcTodayDateString,
  msUntilNextUtcMidnight,
} from "../utils/dates.js";
import AddHabitModal from "../components/AddHabitModal.jsx";

function getPeriodStatusText(habit) {
  const done = Boolean(habit.completedInCurrentPeriod);
  if (habit.frequency === "Weekly") return done ? "Выполнена на этой неделе" : "Не выполнена на этой неделе";
  if (habit.frequency === "Monthly") return done ? "Выполнена в этом месяце" : "Не выполнена в этом месяце";
  return done ? "Выполнена сегодня" : "Не выполнена сегодня";
}

function formatDate(date) {
  if (!date) return `UTC: ${getUtcTodayDateString()}`;
  return new Date(date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function Habits() {
  const navigate = useNavigate();
  const [habits, setHabits] = useState(null);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [today, setToday] = useState(getUtcTodayDateString());

  const load = useCallback(async () => {
    try {
      const res = await api("/api/dashboard");
      if (!res.ok) {
        setError("Ошибка загрузки привычек");
        return;
      }
      const data = await res.json();
      setHabits(data.habits ?? []);
      setError("");
    } catch (e) {
      console.error("Load habits error:", e);
      setError("Ошибка сервера");
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setTimeout(() => setToday(getUtcTodayDateString()), msUntilNextUtcMidnight());
    return () => clearTimeout(timer);
  }, [load, today]);

  let content;
  if (error) {
    content = <div className="error-message">{error}</div>;
  } else if (habits === null) {
    content = <div className="loading">Загрузка...</div>;
  } else if (habits.length === 0) {
    content = <div className="empty-message">У вас пока нет привычек. Создайте первую!</div>;
  } else {
    content = habits.map((h) => (
      <div key={h.habitId} className="habit-row" onClick={() => navigate(`/edit/${h.habitId}`)}>
        <div className="habit-name-block">
          <div className="habit-name">{h.title}</div>
          <div className="habit-meta">
            <span className="frequency-badge">{FREQUENCY_LABELS[h.frequency] ?? FREQUENCY_LABELS.Daily}</span>
            <span>{formatDate(h.createdAtUtc)}</span>
          </div>
        </div>
        <div className="habit-status">
          <span className={`status-badge ${h.completedInCurrentPeriod ? "status-completed" : "status-pending"}`}>
            {getPeriodStatusText(h)}
          </span>
        </div>
        <div className="habit-stats">
          <strong>{h.currentStreak || 0}</strong>
          <span>серия</span>
        </div>
      </div>
    ));
  }

  return (
    <div className="habits-container">
      <div className="page-header">
        <h1>Все привычки</h1>
        <button className="btn orange" onClick={() => setModalOpen(true)}>
          + Добавить привычку
        </button>
      </div>

      <div className="habits-list">{content}</div>

      <AddHabitModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={load}
      />
    </div>
  );
}
