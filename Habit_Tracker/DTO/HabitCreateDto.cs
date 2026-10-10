using Habit_Tracker.Models;

namespace Habit_Tracker.DTO
{
    public class HabitCreateDto
    {
        public string Title { get; set; } = string.Empty;
        public HabitFrequency Frequency { get; set; } = HabitFrequency.Daily;
    }
}
