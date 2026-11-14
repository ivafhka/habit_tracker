import { MONTH_NAMES } from "../utils/dates.js";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export default function Calendar({ currentDate, onPrev, onNext, completedDates, today, completeToday }) {
  const year = currentDate.getUTCFullYear();
  const month = currentDate.getUTCMonth();
  const firstDay = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const cells = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <>
      <div className="calendar-header">
        <button className="month-nav" onClick={onPrev}>◀</button>
        <h2>{`${MONTH_NAMES[month]} ${year}`}</h2>
        <button className="month-nav" onClick={onNext}>▶</button>
      </div>

      <div className="weekdays">
        {WEEKDAYS.map((d) => <div key={d}>{d}</div>)}
      </div>

      <div className="calendar">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} className="day empty" />;

          const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const classes = ["day"];
          let title;

          if (completedDates.has(ds) && ds < today) {
            classes.push("past-completed");
            title = "В этот день была выполнена хотя бы одна привычка";
          }

          if (ds === today) {
            classes.push("today");
            if (completeToday > 0) {
              classes.push("completed");
              title = `Сегодня выполнено: ${completeToday}`;
            }
          }

          return (
            <div key={ds} className={classes.join(" ")} title={title}>
              {day}
            </div>
          );
        })}
      </div>
    </>
  );
}
