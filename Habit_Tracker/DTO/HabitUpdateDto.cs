using Habit_Tracker.Models;

namespace Habit_Tracker.DTO
{
    public class HabitUpdateDto
    {
        public string Title { get; set; } = string.Empty;
        public HabitFrequency? Frequency { get; set; }
    }
}
