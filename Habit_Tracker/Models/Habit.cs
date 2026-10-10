namespace Habit_Tracker.Models
{
    public class Habit
    {
        public int Id { get; private set; }
        public int UserId { get; private set; }
        public string Title { get; set; }
        public HabitFrequency Frequency { get; set; } = HabitFrequency.Daily;
        public DateTime CreatedAtUtc { get; private set; } = DateTime.UtcNow;
        public List<HabitEntry> Entries { get; set; } = new();
        public User User { get; private set; }

        public Habit() { }

        public Habit(int userId, string title, HabitFrequency frequency = HabitFrequency.Daily)
        {
            UserId = userId;
            Title = title;
            Frequency = frequency;
            CreatedAtUtc = DateTime.UtcNow;
        }
    }
}
