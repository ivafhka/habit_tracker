namespace Habit_Tracker.DTO
{
    public class HabitstaticsDto
    {
        public int HabitId { get; set; }
        public int TotalCompletions { get; set; }
        public int CurrentStreak {  get; set; }
        public int LongestStreak { get; set; }
        public double CompletionRate { get; set; }
    }
}
