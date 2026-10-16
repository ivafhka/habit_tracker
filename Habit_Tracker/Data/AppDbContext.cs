using Habit_Tracker.Models;
using Microsoft.EntityFrameworkCore;

namespace Habit_Tracker.Data
{
    public class AppDbContext : DbContext
    {
        public DbSet<User> Users => Set<User>();
        public DbSet<Habit> Habits => Set<Habit>();
        public DbSet<HabitEntry> HabitEntries => Set<HabitEntry>();
        public DbSet<UserPushSubscription> PushSubscriptions => Set<UserPushSubscription>();
        public AppDbContext(DbContextOptions<AppDbContext> opt): base(opt)
        {
        }
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        }
    }
}
