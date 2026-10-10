namespace Habit_Tracker.Settings
{
    public class JwtSettings
    {
        public string Secret { get; set; } = null!;
        public int ExpirationMinutes { get; set; }
        public string Issuer { get; set; } = null!;
        public string Audience {  get; set; } = null!;
    }
}
