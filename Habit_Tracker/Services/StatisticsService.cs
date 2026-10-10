using Habit_Tracker.Data;
using Habit_Tracker.DTO;
using Habit_Tracker.Infrastructure;
using Habit_Tracker.Models;
using Microsoft.EntityFrameworkCore;

namespace Habit_Tracker.Services
{
    public class StatisticsService
    {
        private readonly AppDbContext _context;
        private readonly RedisCacheService _redis;

        public StatisticsService(AppDbContext context, RedisCacheService redisCacheService)
        {
            _context = context;
            _redis = redisCacheService;
        }

        public async Task<HabitstaticsDto> GetHabitStatistics(int habitId, int? userId = null)
        {
            var habitQuery = _context.Habits.AsNoTracking().Where(x => x.Id == habitId);
            if (userId.HasValue)
                habitQuery = habitQuery.Where(x => x.UserId == userId.Value);

            var habit = await habitQuery.FirstOrDefaultAsync();
            if (habit == null)
                throw new Exception("Habit не существует");

            var cacheKey = CacheKeys.HabitStats(habitId);
            var cached = await _redis.GetAsync<HabitstaticsDto>(cacheKey);
            if (cached != null)
                return cached;

            var entries = await _context.HabitEntries
                .Where(x => x.HabitId == habitId && x.Completed)
                .OrderBy(x => x.Date)
                .ToListAsync();

            var totalCompletions = entries.Count;
            var today = DateTime.UtcNow.Date;
            var currentStreak = CalculateCurrentStreak(entries, habit.Frequency, habit.CreatedAtUtc, today);
            var longestStreak = CalculateLongestStreak(entries, habit.Frequency, habit.CreatedAtUtc, today);
            var completionRate = CalculateCompletionRate(entries, habit.Frequency, habit.CreatedAtUtc, today);

            var result = new HabitstaticsDto
            {
                HabitId = habitId,
                TotalCompletions = totalCompletions,
                CurrentStreak = currentStreak,
                LongestStreak = longestStreak,
                CompletionRate = Math.Round(completionRate, 2)
            };

            await _redis.SetAsync(cacheKey, result, GetCacheTtlUntilNextUtcMidnight(TimeSpan.FromMinutes(10)));

            return result;
        }

        private static int CalculateCurrentStreak(List<HabitEntry> entries, HabitFrequency frequency, DateTime createdAtUtc, DateTime todayUtc)
        {
            var periods = GetCompletedPeriodStarts(entries, frequency, createdAtUtc, todayUtc).ToHashSet();
            if (periods.Count == 0)
                return 0;

            var expectedPeriod = HabitPeriodHelper.GetPeriodStart(createdAtUtc, todayUtc, frequency);
            var streak = 0;

            while (periods.Contains(expectedPeriod))
            {
                streak++;
                expectedPeriod = HabitPeriodHelper.GetPreviousPeriodStart(createdAtUtc, expectedPeriod, frequency);
            }

            return streak;
        }

        private static int CalculateLongestStreak(List<HabitEntry> entries, HabitFrequency frequency, DateTime createdAtUtc, DateTime todayUtc)
        {
            var periods = GetCompletedPeriodStarts(entries, frequency, createdAtUtc, todayUtc).OrderBy(x => x).ToList();
            if (periods.Count == 0)
                return 0;

            var longest = 1;
            var current = 1;

            for (var i = 1; i < periods.Count; i++)
            {
                if (periods[i] == HabitPeriodHelper.GetNextPeriodStart(createdAtUtc, periods[i - 1], frequency))
                {
                    current++;
                    longest = Math.Max(longest, current);
                }
                else
                {
                    current = 1;
                }
            }

            return longest;
        }

        private static double CalculateCompletionRate(List<HabitEntry> entries, HabitFrequency frequency, DateTime createdAtUtc, DateTime todayUtc)
        {
            var periods = GetCompletedPeriodStarts(entries, frequency, createdAtUtc, todayUtc).ToList();
            if (periods.Count == 0)
                return 0;

            var totalExpectedPeriods = HabitPeriodHelper.CountPeriodsFromCreatedTo(createdAtUtc, todayUtc, frequency);
            if (totalExpectedPeriods <= 0)
                return 0;

            return (double)periods.Count / totalExpectedPeriods * 100;
        }

        private static IEnumerable<DateTime> GetCompletedPeriodStarts(List<HabitEntry> entries, HabitFrequency frequency, DateTime createdAtUtc, DateTime todayUtc)
        {
            var currentPeriodStart = HabitPeriodHelper.GetPeriodStart(createdAtUtc, todayUtc, frequency);

            return entries
                .Select(x => HabitPeriodHelper.GetPeriodStart(createdAtUtc, x.Date, frequency))
                .Where(x => x <= currentPeriodStart)
                .Distinct();
        }

        private static TimeSpan GetCacheTtlUntilNextUtcMidnight(TimeSpan maxTtl)
        {
            var now = DateTime.UtcNow;
            var untilMidnight = now.Date.AddDays(1) - now;
            if (untilMidnight <= TimeSpan.Zero)
                return TimeSpan.FromSeconds(1);
            return untilMidnight < maxTtl ? untilMidnight : maxTtl;
        }
    }
}
