using Habit_Tracker.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Habit_Tracker.Data.Configuratoins
{
    public class UserPushSubscriptionConfiguration : IEntityTypeConfiguration<UserPushSubscription>
    {
        public void Configure(EntityTypeBuilder<UserPushSubscription> builder)
        {
            builder.ToTable("PushSubscriptions");
            builder.HasKey(x => x.Id);
            builder.Property(x => x.Endpoint).IsRequired().HasMaxLength(2048);
            builder.Property(x => x.P256dh).IsRequired().HasMaxLength(256);
            builder.Property(x => x.Auth).IsRequired().HasMaxLength(256);
            builder.Property(x => x.CreatedAtUtc).HasColumnType("timestamp with time zone").IsRequired();
            builder.HasIndex(x => x.Endpoint).IsUnique();
            builder.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}