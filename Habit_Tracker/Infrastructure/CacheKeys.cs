namespace Habit_Tracker.Infrastructure
{
    public static class CacheKeys
    {
        public static string Dashboard(int userId)
            => $"dashboard:user:{userId}";
        public static string HabitStats(int habitId)
            => $"habit:stats:{habitId}";
    }
}
