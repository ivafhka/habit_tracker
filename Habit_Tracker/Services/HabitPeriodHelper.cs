using Habit_Tracker.Models;

namespace Habit_Tracker.Services
{
    public static class HabitPeriodHelper
    {
        public static DateTime NormalizeUtcDate(DateTime date)
        {
            var utcDate = date.Kind == DateTimeKind.Unspecified
                ? date.Date
                : date.ToUniversalTime().Date;

            // PostgreSQL column type is `date`; keep only the calendar day.
            return DateTime.SpecifyKind(utcDate, DateTimeKind.Unspecified);
        }

        public static DateTime GetPeriodStart(DateTime createdAtUtc, DateTime referenceDate, HabitFrequency frequency)
        {
            var createdDate = NormalizeUtcDate(createdAtUtc);
            var date = NormalizeUtcDate(referenceDate);

            if (date < createdDate)
                return createdDate;

            return frequency switch
            {
                HabitFrequency.Weekly => GetWeeklyPeriodStart(createdDate, date),
                HabitFrequency.Monthly => GetMonthlyPeriodStart(createdDate, date),
                _ => date
            };
        }

        public static DateTime GetPeriodEnd(DateTime createdAtUtc, DateTime periodStart, HabitFrequency frequency)
        {
            var createdDate = NormalizeUtcDate(createdAtUtc);
            var start = NormalizeUtcDate(periodStart);

            return frequency switch
            {
                HabitFrequency.Weekly => start.AddDays(7),
                HabitFrequency.Monthly => createdDate.AddMonths(GetMonthlyPeriodIndex(createdDate, start) + 1),
                _ => start.AddDays(1)
            };
        }

        public static DateTime GetNextPeriodStart(DateTime createdAtUtc, DateTime periodStart, HabitFrequency frequency)
        {
            return GetPeriodEnd(createdAtUtc, periodStart, frequency);
        }

        public static DateTime GetPreviousPeriodStart(DateTime createdAtUtc, DateTime periodStart, HabitFrequency frequency)
        {
            var createdDate = NormalizeUtcDate(createdAtUtc);
            var start = NormalizeUtcDate(periodStart);

            return frequency switch
            {
                HabitFrequency.Weekly => start.AddDays(-7),
                HabitFrequency.Monthly => createdDate.AddMonths(GetMonthlyPeriodIndex(createdDate, start) - 1),
                _ => start.AddDays(-1)
            };
        }

        public static bool IsInPeriod(DateTime date, DateTime createdAtUtc, DateTime periodStart, HabitFrequency frequency)
        {
            var normalizedDate = NormalizeUtcDate(date);
            var start = NormalizeUtcDate(periodStart);
            var end = GetPeriodEnd(createdAtUtc, start, frequency);
            return normalizedDate >= start && normalizedDate < end;
        }

        public static bool IsInCurrentPeriod(DateTime date, DateTime todayUtc, DateTime createdAtUtc, HabitFrequency frequency)
        {
            var start = GetPeriodStart(createdAtUtc, todayUtc, frequency);
            return IsInPeriod(date, createdAtUtc, start, frequency);
        }

        public static int CountPeriodsFromCreatedTo(DateTime createdAtUtc, DateTime todayUtc, HabitFrequency frequency)
        {
            var createdDate = NormalizeUtcDate(createdAtUtc);
            var today = NormalizeUtcDate(todayUtc);
            if (today < createdDate)
                return 0;

            return frequency switch
            {
                HabitFrequency.Weekly => ((today - createdDate).Days / 7) + 1,
                HabitFrequency.Monthly => GetMonthlyPeriodIndex(createdDate, GetMonthlyPeriodStart(createdDate, today)) + 1,
                _ => (today - createdDate).Days + 1
            };
        }

        private static DateTime GetWeeklyPeriodStart(DateTime createdDate, DateTime date)
        {
            var daysSinceCreation = (date - createdDate).Days;
            var periodIndex = daysSinceCreation / 7;
            return createdDate.AddDays(periodIndex * 7);
        }

        private static DateTime GetMonthlyPeriodStart(DateTime createdDate, DateTime date)
        {
            var monthsSinceCreation = ((date.Year - createdDate.Year) * 12) + date.Month - createdDate.Month;
            var periodStart = createdDate.AddMonths(monthsSinceCreation);

            if (periodStart > date)
                periodStart = createdDate.AddMonths(monthsSinceCreation - 1);

            return periodStart;
        }

        private static int GetMonthlyPeriodIndex(DateTime createdDate, DateTime periodStart)
        {
            var index = ((periodStart.Year - createdDate.Year) * 12) + periodStart.Month - createdDate.Month;
            return index;
        }
    }
}
