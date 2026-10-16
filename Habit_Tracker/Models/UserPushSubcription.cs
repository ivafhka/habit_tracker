namespace Habit_Tracker.Models
{
    // Подписка браузера/телефона пользователя на Web Push.
    // У одного пользователя может быть несколько подписок (телефон, ноутбук).
    public class UserPushSubscription
    {
        public int Id { get; private set; }
        public int UserId { get; private set; }
        public string Endpoint { get; private set; } = string.Empty;
        public string P256dh { get; private set; } = string.Empty;
        public string Auth { get; private set; } = string.Empty;
        public DateTime CreatedAtUtc { get; private set; } = DateTime.UtcNow;
        public User? User { get; private set; }

        public UserPushSubscription() { }

        public UserPushSubscription(int userId, string endpoint, string p256dh, string auth)
        {
            UserId = userId;
            Endpoint = endpoint;
            P256dh = p256dh;
            Auth = auth;
        }

        public void UpdateKeys(int userId, string p256dh, string auth)
        {
            UserId = userId;
            P256dh = p256dh;
            Auth = auth;
        }
    }
}