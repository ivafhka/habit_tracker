namespace Habit_Tracker.DTO
{
    public class DashboardDto
    {
        public int TotalHabits { get; set; }
        public int CompleteToday { get; set; }
        public int CurrentStreak { get; set; }
        public int BestStreak { get; set; }
        public List<DashboardHabitDto> Habits { get; set; } = new();
        public List<DashboardHabitDto> TodayHabits { get; set; } = new();
        public List<DateTime> CompletedDates { get; set; } = new();
    }
}
