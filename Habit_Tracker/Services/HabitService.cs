using Habit_Tracker.Data;
using Habit_Tracker.Infrastructure;
using Habit_Tracker.Models;
using Microsoft.EntityFrameworkCore;

namespace Habit_Tracker.Services
{
    public class HabitService
    {
        private readonly AppDbContext _context;
        private readonly RedisCacheService _redis;

        public HabitService(AppDbContext context, RedisCacheService redis)
        {
            _context = context;
            _redis = redis;
        }

        public async Task<Habit> CreateHabitAsync(int userId, string title, HabitFrequency frequency = HabitFrequency.Daily)
        {
            if (string.IsNullOrWhiteSpace(title))
                throw new Exception("Введите название привычки");

            var habit = new Habit(userId, title.Trim(), frequency);
            _context.Habits.Add(habit);
            await _context.SaveChangesAsync();
            await _redis.RemoveAsync(CacheKeys.Dashboard(userId));
            return habit;
        }

        public async Task<List<Habit>> GetUserHabitAsync(int userid)
        {
            return await _context.Habits
                .Where(x => x.UserId == userid)
                .OrderBy(x => x.CreatedAtUtc)
                .ToListAsync();
        }

        public async Task<Habit?> GetHabitByIdAsync(int id, int userId)
        {
            return await _context.Habits
                .FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId);
        }

        public async Task UpdateHabitAsync(int id, int userId, string title, HabitFrequency? frequency = null, TimeOnly? reminderTimeUtc = null)
        {
            if (string.IsNullOrWhiteSpace(title))
                throw new Exception("Введите название привычки");

            var habit = await GetHabitByIdAsync(id, userId);
            if (habit == null)
                throw new Exception("Habit не существует");

            var frequencyChanged = frequency.HasValue && frequency.Value != habit.Frequency;

            habit.Title = title.Trim();
            if (frequency.HasValue)
                habit.Frequency = frequency.Value;

            // Если время напоминания или периодичность изменились, сбрасываем отметку "уже напоминали".
            if (habit.ReminderTimeUtc != reminderTimeUtc || frequencyChanged)
                habit.LastReminderPeriodStart = null;
            habit.ReminderTimeUtc = reminderTimeUtc;

            await _context.SaveChangesAsync();
            await _redis.RemoveAsync(CacheKeys.Dashboard(userId));
            await _redis.RemoveAsync(CacheKeys.HabitStats(id));
        }

        public async Task DeleteHabitAsync(int id, int userId)
        {
            var habit = await GetHabitByIdAsync(id, userId);
            if (habit == null)
                throw new Exception("Habit не существует");

            _context.Habits.Remove(habit);
            await _context.SaveChangesAsync();
            await _redis.RemoveAsync(CacheKeys.Dashboard(userId));
            await _redis.RemoveAsync(CacheKeys.HabitStats(id));
        }

        public async Task AddEntryAsync(int habitId, int userId, DateTime date, bool completed)
        {
            var habit = await GetHabitByIdAsync(habitId, userId);
            if (habit == null)
                throw new Exception("Habit не существует");

            var entryDate = HabitPeriodHelper.NormalizeUtcDate(date);
            var periodStart = HabitPeriodHelper.GetPeriodStart(habit.CreatedAtUtc, entryDate, habit.Frequency);
            var periodEnd = HabitPeriodHelper.GetPeriodEnd(habit.CreatedAtUtc, periodStart, habit.Frequency);

            if (!completed)
            {
                var periodEntries = await _context.HabitEntries
                    .Where(x => x.HabitId == habitId && x.Date >= periodStart && x.Date < periodEnd)
                    .ToListAsync();

                _context.HabitEntries.RemoveRange(periodEntries);
            }
            else
            {
                var existing = await _context.HabitEntries
                    .FirstOrDefaultAsync(x => x.HabitId == habitId && x.Date == entryDate);

                if (existing != null)
                    existing.Completed = true;
                else
                {
                    var entry = new HabitEntry(habitId, entryDate, true);
                    _context.HabitEntries.Add(entry);
                }
            }

            await _context.SaveChangesAsync();
            await _redis.RemoveAsync(CacheKeys.Dashboard(userId));
            await _redis.RemoveAsync(CacheKeys.HabitStats(habitId));
        }

        public async Task<List<HabitEntry>> GetEntriesAsync(int habitId, int userId)
        {
            var habit = await GetHabitByIdAsync(habitId, userId);
            if (habit == null)
                throw new Exception("Habit не существует");

            return await _context.HabitEntries
                .Where(x => x.HabitId == habitId)
                .OrderBy(x => x.Date)
                .ToListAsync();
        }

        public async Task RemoveEntryAsync(int habitId, int userId, DateTime date)
        {
            var habit = await GetHabitByIdAsync(habitId, userId);
            if (habit == null)
                throw new Exception("Habit не существует");

            var entryDate = HabitPeriodHelper.NormalizeUtcDate(date);
            var entry = await _context.HabitEntries
                .FirstOrDefaultAsync(x => x.HabitId == habitId && x.Date == entryDate);
            if (entry == null)
                return;

            _context.HabitEntries.Remove(entry);
            await _context.SaveChangesAsync();
            await _redis.RemoveAsync(CacheKeys.Dashboard(userId));
            await _redis.RemoveAsync(CacheKeys.HabitStats(habitId));
        }

    }
}
