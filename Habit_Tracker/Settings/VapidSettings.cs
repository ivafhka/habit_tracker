namespace Habit_Tracker.Settings
{
    public class VapidSettings
    {
        // Контакт владельца сервера, например "mailto:you@example.com"
        public string Subject { get; set; } = string.Empty;
        public string PublicKey { get; set; } = string.Empty;
        public string PrivateKey { get; set; } = string.Empty;
    }
}