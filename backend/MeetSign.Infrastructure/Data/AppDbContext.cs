using MeetSign.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace MeetSign.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Event> Events => Set<Event>();
    public DbSet<FieldDefinition> FieldDefinitions => Set<FieldDefinition>();
    public DbSet<FormLayoutItem> FormLayoutItems => Set<FormLayoutItem>();
    public DbSet<FieldCondition> FieldConditions => Set<FieldCondition>();
    public DbSet<CheckInSession> CheckInSessions => Set<CheckInSession>();
    public DbSet<Attendee> Attendees => Set<Attendee>();
    public DbSet<CheckInRecord> CheckInRecords => Set<CheckInRecord>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(e =>
        {
            e.HasIndex(x => x.Email).IsUnique();
            e.ToTable("Sign_Users");
        });

        modelBuilder.Entity<Event>(e =>
        {
            e.HasOne(x => x.Owner).WithMany(x => x.Events).HasForeignKey(x => x.OwnerId);
            e.ToTable("Sign_Events");
        });

        modelBuilder.Entity<FieldDefinition>(e =>
        {
            e.HasOne(x => x.Event).WithMany(x => x.FieldDefinitions).HasForeignKey(x => x.EventId);
            e.HasIndex(x => new { x.EventId, x.Key }).IsUnique();
            e.ToTable("Sign_FieldDefinitions");
        });

        modelBuilder.Entity<FormLayoutItem>(e =>
        {
            e.HasOne(x => x.Event).WithMany(x => x.FormLayoutItems).HasForeignKey(x => x.EventId);
            e.ToTable("Sign_FormLayoutItems");
        });

        modelBuilder.Entity<FieldCondition>(e =>
        {
            e.HasOne(x => x.Event).WithMany(x => x.FieldConditions).HasForeignKey(x => x.EventId);
            e.ToTable("Sign_FieldConditions");
        });

        modelBuilder.Entity<CheckInSession>(e =>
        {
            e.HasOne(x => x.Event).WithMany(x => x.Sessions).HasForeignKey(x => x.EventId);
            e.HasIndex(x => x.PublicToken).IsUnique();
            e.ToTable("Sign_CheckInSessions");
        });

        modelBuilder.Entity<Attendee>(e =>
        {
            e.HasOne(x => x.Session).WithMany(x => x.Attendees).HasForeignKey(x => x.SessionId);
            e.ToTable("Sign_Attendees");
        });

        modelBuilder.Entity<CheckInRecord>(e =>
        {
            e.HasOne(x => x.Session).WithMany(x => x.Records).HasForeignKey(x => x.SessionId);
            e.HasIndex(x => new { x.SessionId, x.ClientFingerprint });
            e.ToTable("Sign_CheckInRecords");
        });
    }
}
