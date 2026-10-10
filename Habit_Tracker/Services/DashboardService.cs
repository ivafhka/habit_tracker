using Habit_Tracker.Data;
using Habit_Tracker.DTO;
using Habit_Tracker.Infrastructure;
using Habit_Tracker.Models;
using Microsoft.EntityFrameworkCore;

namespace Habit_Tracker.Services
{
    public class DashboardService
    {
        private readonly AppDbContext _context;
        private readonly StatisticsService _statisticsService;
        private readonly RedisCacheService _redis;

        public DashboardService(AppDbContext context, StatisticsService statisticsService, RedisCacheService redis)
        {
            _context = context;
            _statisticsService = statisticsService;
            _redis = redis;
        }

        public async Task<DashboardDto> GetDashboard(int userId)
        {
            var cacheKey = CacheKeys.Dashboard(userId);
            var cached = await _redis.GetAsync<DashboardDto>(cacheKey);
            if (cached != null)
                return cached;

            var today = DateTime.UtcNow.Date;

            var habits = await _context.Habits
                .Where(x => x.UserId == userId)
                .OrderBy(x => x.CreatedAtUtc)
                .ToListAsync();

            var habitIds = habits.Select(x => x.Id).ToList();

            var completedEntries = await _context.HabitEntries
                .Where(x => habitIds.Contains(x.HabitId) && x.Completed)
                .ToListAsync();

            var completedHabitIdsToday = completedEntries
                .Where(x => IsSameUtcDate(x.Date, today))
                .Select(x => x.HabitId)
                .Distinct()
                .ToHashSet();

            var completedUtcDates = GetCompletedUtcDates(completedEntries, today);

            var dashboard = new DashboardDto
            {
                TotalHabits = habits.Count,
                CompleteToday = completedHabitIdsToday.Count,

                CurrentStreak = CalculateUserDailyCurrentStreak(completedEntries, today),
                BestStreak = CalculateUserDailyLongestStreak(completedEntries, today),

                CompletedDates = completedUtcDates.OrderBy(x => x).ToList()
            };


            foreach (var habit in habits)
            {
                var stats = await _statisticsService.GetHabitStatistics(habit.Id, userId);
                var completedToday = completedHabitIdsToday.Contains(habit.Id);
                var completedInCurrentPeriod = completedEntries.Any(x =>
                    x.HabitId == habit.Id && HabitPeriodHelper.IsInCurrentPeriod(x.Date, today, habit.CreatedAtUtc, habit.Frequency));

                var dashboardHabit = new DashboardHabitDto
                {
                    HabitId = habit.Id,
                    Title = habit.Title,
                    Frequency = habit.Frequency.ToString(),
                    CreatedAtUtc = habit.CreatedAtUtc,
                    CompletedToday = completedToday,
                    CompletedInCurrentPeriod = completedInCurrentPeriod,
                    CurrentStreak = stats.CurrentStreak,
                    CompletionRate = stats.CompletionRate
                };

                dashboard.Habits.Add(dashboardHabit);

                if (completedToday)
                    dashboard.TodayHabits.Add(dashboardHabit);
            }

            await _redis.SetAsync(cacheKey, dashboard, GetCacheTtlUntilNextUtcMidnight(TimeSpan.FromMinutes(5)));

            return dashboard;
        }


        private static int CalculateUserDailyCurrentStreak(List<HabitEntry> completedEntries, DateTime todayUtcDate)
        {
            var completedDates = GetCompletedUtcDates(completedEntries, todayUtcDate);
            if (completedDates.Count == 0)
                return 0;

            var expectedDate = completedDates.Contains(todayUtcDate)
                ? todayUtcDate
                : todayUtcDate.AddDays(-1);

            var streak = 0;
            while (completedDates.Contains(expectedDate))
            {
                streak++;
                expectedDate = expectedDate.AddDays(-1);
            }

            return streak;
        }

        private static int CalculateUserDailyLongestStreak(List<HabitEntry> completedEntries, DateTime todayUtcDate)
        {
            var completedDates = GetCompletedUtcDates(completedEntries, todayUtcDate)
                .OrderBy(x => x)
                .ToList();

            if (completedDates.Count == 0)
                return 0;

            var longest = 1;
            var current = 1;

            for (var i = 1; i < completedDates.Count; i++)
            {
                if (completedDates[i] == completedDates[i - 1].AddDays(1))
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

        private static HashSet<DateTime> GetCompletedUtcDates(List<HabitEntry> completedEntries, DateTime todayUtcDate)
        {
            return completedEntries
                .Select(x => x.Date.Date)
                .Where(x => x <= todayUtcDate)
                .Distinct()
                .ToHashSet();
        }

        private static bool IsSameUtcDate(DateTime date, DateTime todayUtcDate)
        {
            return date.Date.Year == todayUtcDate.Year
                && date.Date.Month == todayUtcDate.Month
                && date.Date.Day == todayUtcDate.Day;
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
