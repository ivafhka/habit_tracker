using Habit_Tracker.Data;
using Habit_Tracker.Models;
using Microsoft.EntityFrameworkCore;

namespace Habit_Tracker.Services
{
    // Раз в минуту ищет привычки, о которых пора напомнить, и шлёт push.
    public class HabitReminderService : BackgroundService
    {
        private static readonly TimeSpan CheckInterval = TimeSpan.FromMinutes(1);

        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<HabitReminderService> _logger;

        public HabitReminderService(IServiceScopeFactory scopeFactory, ILogger<HabitReminderService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            using var timer = new PeriodicTimer(CheckInterval);

            do
            {
                try
                {
                    await CheckRemindersAsync(DateTime.UtcNow, stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    // Ошибка одной проверки не должна останавливать сервис.
                    _logger.LogError(ex, "Ошибка при проверке напоминаний");
                }
            }
            while (await WaitNextTickAsync(timer, stoppingToken));
        }

        private static async Task<bool> WaitNextTickAsync(PeriodicTimer timer, CancellationToken ct)
        {
            try { return await timer.WaitForNextTickAsync(ct); }
            catch (OperationCanceledException) { return false; }
        }

        private async Task CheckRemindersAsync(DateTime nowUtc, CancellationToken ct)
        {
            // DbContext - scoped, а BackgroundService - singleton, поэтому scope создаём вручную.
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var push = scope.ServiceProvider.GetRequiredService<PushNotificationService>();

            var today = HabitPeriodHelper.NormalizeUtcDate(nowUtc);
            var timeNow = TimeOnly.FromDateTime(nowUtc);

            // Грубая выборка в БД: напоминание включено и время суток уже наступило.
            var candidates = await db.Habits
                .Where(h => h.ReminderTimeUtc != null && h.ReminderTimeUtc <= timeNow)
                .ToListAsync(ct);

            foreach (var habit in candidates)
            {
                var periodStart = HabitPeriodHelper.GetPeriodStart(habit.CreatedAtUtc, today, habit.Frequency);
                var periodEnd = HabitPeriodHelper.GetPeriodEnd(habit.CreatedAtUtc, periodStart, habit.Frequency);

                // Напоминаем в последний день периода (для ежедневной - это сегодня).
                if (today < periodEnd.AddDays(-1))
                    continue;

                // Уже напоминали за этот период.
                if (habit.LastReminderPeriodStart == periodStart)
                    continue;

                var completed = await db.HabitEntries.AnyAsync(e =>
                    e.HabitId == habit.Id && e.Completed && e.Date >= periodStart && e.Date < periodEnd, ct);
                if (completed)
                    continue;

                var delivered = await push.SendToUserAsync(
                    habit.UserId,
                    "Habit Tracker",
                    BuildMessage(habit),
                    "/index.html");

                // Если ни одно устройство не получило, попробуем снова на следующем тике.
                if (delivered > 0)
                {
                    habit.LastReminderPeriodStart = periodStart;
                    await db.SaveChangesAsync(ct);
                }
            }
        }

        private static string BuildMessage(Habit habit) => habit.Frequency switch
        {
            HabitFrequency.Weekly => $"Сегодня последний день недели: «{habit.Title}» ещё не выполнена",
            HabitFrequency.Monthly => $"Сегодня последний день месяца: «{habit.Title}» ещё не выполнена",
            _ => $"Не забудьте выполнить: «{habit.Title}»"
        };
    }
}