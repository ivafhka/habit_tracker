import { useEffect, useState } from "react";
import { api, safeJson } from "../api.js";
import { FREQUENCY_LABELS } from "../utils/dates.js";

export default function AddHabitModal({ open, onClose, onCreated }) {
  const [title, setTitle] = useState("");
  const [frequency, setFrequency] = useState("Daily");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setTitle("");
      setFrequency("Daily");
      setError("");
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Введите название привычки");
      return;
    }

    try {
      const res = await api("/api/habits", {
        method: "POST",
        body: { title: trimmed, frequency },
      });
      if (!res.ok) {
        const data = await safeJson(res);
        setError(data?.message || "Ошибка создания привычки");
        return;
      }
      onCreated?.();
      onClose();
    } catch (err) {
      console.error("Add habit error:", err);
      setError("Ошибка сервера");
    }
  }

  return (
    <div
      className="modal"
      style={{ display: "flex" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-content">
        <span className="close" onClick={onClose}>&times;</span>
        <h2>Новая привычка</h2>

        <form onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="habitTitle">Название</label>
          <input
            id="habitTitle"
            type="text"
            placeholder="Например: Утренняя зарядка"
            maxLength={100}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <label className="field-label" htmlFor="habitFrequency">Периодичность</label>
          <select id="habitFrequency" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
            {Object.entries(FREQUENCY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <p className="error">{error}</p>
          <button type="submit" className="btn orange">Создать</button>
        </form>
      </div>
    </div>
  );
}
