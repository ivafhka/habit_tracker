namespace Habit_Tracker.DTO
{
    public class HabitDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Frequency { get; set; } = "Daily";
        public DateTime CreatedAtUtc { get; set; }
    }
}
