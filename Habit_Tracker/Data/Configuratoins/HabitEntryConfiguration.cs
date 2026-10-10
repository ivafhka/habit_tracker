using Habit_Tracker.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Habit_Tracker.Data.Configuratoins
{
    public class HabitEntryConfiguration : IEntityTypeConfiguration<HabitEntry>
    {
        public void Configure(EntityTypeBuilder<HabitEntry> builder)
        {
            builder.ToTable("HabitEntries");
            builder.HasKey(x => x.Id);
            builder.Property(x => x.HabitId).IsRequired();
            builder.Property(x => x.Date).HasColumnType("date").IsRequired();
            builder.Property(x=>x.Completed).IsRequired();
            builder.HasIndex(x => new {x.HabitId, x.Date}).IsUnique();
            builder.HasOne(x => x.Habit).WithMany(x => x.Entries).HasForeignKey(x => x.HabitId).OnDelete(DeleteBehavior.Cascade);
        }
    }
}
