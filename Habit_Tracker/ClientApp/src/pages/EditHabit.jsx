import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, safeJson } from "../api.js";
import {
  FREQUENCY_LABELS,
  MS_IN_DAY,
  formatUtcDate,
  getCurrentPeriod,
  getUtcTodayDateString,
  isDateInPeriod,
  msUntilNextUtcMidnight,
} from "../utils/dates.js";
import { enablePush, disablePush, getCurrentPushSubscription } from "../push.js";

const pad = (n) => String(n).padStart(2, "0");

// Местное "HH:mm" -> UTC "HH:mm:00" (сдвиг считаем от сегодняшней даты)
function localTimeToUtc(local) {
  const [h, m] = local.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:00`;
}

// UTC "HH:mm[:ss]" -> местное "HH:mm"
function utcTimeToLocal(utc) {
  const [h, m] = String(utc).split(":").map(Number);
  const d = new Date();
  d.setUTCHours(h, m, 0, 0);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EditHabit() {
  const { habitId } = useParams();
  const navigate = useNavigate();

  const [habit, setHabit] = useState(null);
  const [title, setTitle] = useState("");
  const [frequency, setFrequency] = useState("Daily");
  const [entries, setEntries] = useState([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("20:00");
  const [pushOn, setPushOn] = useState(false);
  const [pushStatus, setPushStatus] = useState("");
  const [error, setError] = useState("");
  const [today, setToday] = useState(getUtcTodayDateString());

  // Загрузка привычки
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api(`/api/habits/${habitId}`);
        if (!res.ok) {
          const data = await safeJson(res);
          if (!cancelled) setError(data?.message || "Ошибка загрузки привычки");
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setHabit(data);
        setTitle(data.title);
        setFrequency(data.frequency || "Daily");
        setReminderEnabled(Boolean(data.reminderTimeUtc));
        if (data.reminderTimeUtc) setReminderTime(utcTimeToLocal(data.reminderTimeUtc));
      } catch (e) {
        console.error("Load habit error:", e);
        if (!cancelled) setError("Ошибка сервера: " + e.message);
      }
    })();
    return () => { cancelled = true; };
  }, [habitId]);

  // Записи выполнения
  const loadEntries = useCallback(async () => {
    try {
      const res = await api(`/api/habits/${habitId}/entries`);
      if (res.ok) setEntries(await res.json());
    } catch (e) {
      console.error("Load entries error:", e);
    }
  }, [habitId]);

  useEffect(() => {
    loadEntries();
    const timer = setTimeout(() => setToday(getUtcTodayDateString()), msUntilNextUtcMidnight());
    return () => clearTimeout(timer);
  }, [loadEntries, today]);

  // Состояние push на этом устройстве
  useEffect(() => {
    getCurrentPushSubscription()
      .then((sub) => setPushOn(Boolean(sub)))
      .catch(() => {});
  }, []);

  // Текущий период и статус выполнения в нём
  const period = useMemo(
    () => (habit ? getCurrentPeriod(habit.createdAtUtc, frequency) : null),
    [habit, frequency, today]
  );

  const completedInPeriod = useMemo(
    () => !!period && entries.some((e) => e.completed && e.date && isDateInPeriod(e.date, period)),
    [entries, period]
  );

  useEffect(() => {
    setIsCompleted(completedInPeriod);
  }, [completedInPeriod]);

  const completionLabel =
    frequency === "Weekly" ? "Выполнение текущей недели"
    : frequency === "Monthly" ? "Выполнение текущего месяца"
    : "Выполнение сегодня";

  const periodText = period
    ? `Текущий период: ${formatUtcDate(period.start)} — ${formatUtcDate(new Date(period.end.getTime() - MS_IN_DAY))}`
    : "Период загружается...";

  async function handleSave() {
    setError("");
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Введите название привычки");
      return;
    }

    try {
      const updateRes = await api(`/api/habits/${habitId}`, {
        method: "PUT",
        body: {
          title: trimmed,
          frequency,
          reminderTimeUtc: reminderEnabled ? localTimeToUtc(reminderTime) : null,
        },
      });
      if (!updateRes.ok) {
        const data = await safeJson(updateRes);
        setError(data?.message || "Ошибка обновления");
        return;
      }

      const entryRes = await api(`/api/habits/${habitId}/entries`, {
        method: "POST",
        body: { date: getUtcTodayDateString(), completed: isCompleted },
      });
      if (!entryRes.ok) {
        const data = await safeJson(entryRes);
        setError(data?.message || "Ошибка сохранения статуса");
        return;
      }

      navigate("/");
    } catch (e) {
      console.error("Save error:", e);
      setError("Ошибка сервера: " + e.message);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Удалить привычку вместе со всей историей выполнения?")) return;
    setError("");

    try {
      const res = await api(`/api/habits/${habitId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await safeJson(res);
        setError(data?.message || "Ошибка удаления");
        return;
      }
      navigate("/");
    } catch (e) {
      console.error("Delete error:", e);
      setError("Ошибка сервера: " + e.message);
    }
  }

  async function togglePush() {
    setPushStatus("");
    try {
      if (pushOn) {
        await disablePush();
        setPushOn(false);
        setPushStatus("Уведомления на этом устройстве отключены");
      } else {
        await enablePush();
        setPushOn(true);
        setPushStatus("Уведомления включены на этом устройстве");
      }
    } catch (e) {
      setPushStatus(e.message);
    }
  }

  return (
    <div className="edit-container">
      <div className="card">
        <h2>{habit ? habit.title : "Загрузка..."}</h2>

        <div className="form-group">
          <label htmlFor="title">Название привычки</label>
          <input
            id="title"
            type="text"
            placeholder="Название привычки"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="frequency">Периодичность</label>
          <select id="frequency" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
            {Object.entries(FREQUENCY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>
            {completionLabel}{" "}
            <span className="utc-pill">UTC: <span>{today}</span></span>
          </label>

          <div className="status-buttons">
            <button
              type="button"
              id="completedBtn"
              className={`status-btn ${isCompleted ? "active" : ""}`}
              onClick={() => setIsCompleted(true)}
            >
              Выполнена
            </button>
            <button
              type="button"
              id="notCompletedBtn"
              className={`status-btn ${!isCompleted ? "active" : ""}`}
              onClick={() => setIsCompleted(false)}
            >
              Не выполнена
            </button>
          </div>

          <p className="hint">{periodText}</p>
          <p className="hint">
            Для ежедневной привычки прогресс сбрасывается каждый день, для еженедельной — через 7 дней от даты создания, для ежемесячной — каждый месяц от даты создания.
          </p>
        </div>

        <div className="form-group">
          <label htmlFor="reminderTime">Напоминание (push-уведомление)</label>
          <div className="reminder-row">
            <input
              id="reminderEnabled"
              type="checkbox"
              checked={reminderEnabled}
              onChange={(e) => setReminderEnabled(e.target.checked)}
            />
            <input
              id="reminderTime"
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
            />
          </div>
          <p className="hint">
            Придёт, если в последний день периода привычка ещё не выполнена. Время указывается по вашему местному времени.
          </p>

          <button type="button" className="btn gray" id="pushBtn" onClick={togglePush}>
            {pushOn ? "Отключить уведомления на этом устройстве" : "Включить уведомления на этом устройстве"}
          </button>
          <p className="hint">{pushStatus}</p>
        </div>

        <p className="error">{error}</p>

        <div className="action-buttons">
          <button className="btn orange" onClick={handleSave}>Сохранить</button>
          <button className="btn gray" onClick={() => navigate("/")}>Отмена</button>
          <button className="btn danger" onClick={handleDelete}>Удалить</button>
        </div>
      </div>
    </div>
  );
}
