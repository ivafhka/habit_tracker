namespace Habit_Tracker.Models
{
    public class HabitEntry
    {
        public int Id { get; private set; }
        public int HabitId { get; private set; }
        public DateTime Date {  get; set; }
        public bool Completed {  get; set; }
        public Habit Habit { get; private set; }
        public HabitEntry() { }
        public HabitEntry(int habitId,  DateTime date, bool completed)
        {
            HabitId = habitId;
            Date  = date;
            Completed = completed;
        }
    }
}
