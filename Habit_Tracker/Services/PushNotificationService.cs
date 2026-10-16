using System.Net;
using System.Text.Json;
using Habit_Tracker.Data;
using Habit_Tracker.Models;
using Habit_Tracker.Settings;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using WebPush;

namespace Habit_Tracker.Services
{
    // Отправляет Web Push на все устройства пользователя.
    public class PushNotificationService
    {
        private readonly AppDbContext _context;
        private readonly VapidSettings _vapid;
        private readonly ILogger<PushNotificationService> _logger;
        private readonly WebPushClient _client = new();

        public PushNotificationService(
            AppDbContext context,
            IOptions<VapidSettings> vapidOptions,
            ILogger<PushNotificationService> logger)
        {
            _context = context;
            _vapid = vapidOptions.Value;
            _logger = logger;
        }

        // Возвращает число устройств, на которые уведомление ушло успешно.
        public async Task<int> SendToUserAsync(int userId, string title, string body, string url)
        {
            var subscriptions = await _context.PushSubscriptions
                .Where(x => x.UserId == userId)
                .ToListAsync();

            if (subscriptions.Count == 0)
                return 0;

            var vapidDetails = new VapidDetails(_vapid.Subject, _vapid.PublicKey, _vapid.PrivateKey);
            var payload = JsonSerializer.Serialize(new { title, body, url });
            var delivered = 0;

            foreach (var sub in subscriptions)
            {
                try
                {
                    var pushSubscription = new PushSubscription(sub.Endpoint, sub.P256dh, sub.Auth);
                    await _client.SendNotificationAsync(pushSubscription, payload, vapidDetails);
                    delivered++;
                }
                catch (WebPushException ex)
                    when (ex.StatusCode == HttpStatusCode.Gone || ex.StatusCode == HttpStatusCode.NotFound)
                {
                    // Пользователь отозвал разрешение или удалил подписку - она больше не живая.
                    _context.PushSubscriptions.Remove(sub);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Не удалось отправить push (подписка {SubscriptionId})", sub.Id);
                }
            }

            await _context.SaveChangesAsync();
            return delivered;
        }
    }
}