namespace Habit_Tracker.DTO
{
    public class DashboardHabitDto
    {
        public int HabitId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Frequency { get; set; } = "Daily";
        public DateTime CreatedAtUtc { get; set; }
        public bool CompletedToday { get; set; }
        public bool CompletedInCurrentPeriod { get; set; }
        public int CurrentStreak { get; set; }
        public double CompletionRate { get; set; }
    }
}
