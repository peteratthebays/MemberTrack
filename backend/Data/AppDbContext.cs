using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Member> Members => Set<Member>();
    public DbSet<Membership> Memberships => Set<Membership>();
    public DbSet<MembershipMember> MembershipMembers => Set<MembershipMember>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Member
        modelBuilder.Entity<Member>(entity =>
        {
            entity.HasIndex(e => e.DonmanId).IsUnique().HasFilter("[DonmanId] IS NOT NULL");
            entity.HasIndex(e => e.Surname);
            entity.HasIndex(e => e.Email);
        });

        // Membership
        modelBuilder.Entity<Membership>(entity =>
        {
            entity.Property(e => e.Type).HasConversion<string>().HasMaxLength(20);
            entity.Property(e => e.PayType).HasConversion<string>().HasMaxLength(20);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);
            entity.Property(e => e.Rights).HasConversion<string>().HasMaxLength(20);
            entity.Property(e => e.Category).HasConversion<string>().HasMaxLength(20);
            entity.Property(e => e.RenewalStatus).HasConversion<string>().HasMaxLength(20);
        });

        // Many-to-many join table with composite key
        modelBuilder.Entity<MembershipMember>(entity =>
        {
            entity.HasKey(e => new { e.MembershipId, e.MemberId });

            entity.Property(e => e.Role).HasConversion<string>().HasMaxLength(20);

            entity.HasOne(e => e.Membership)
                .WithMany(m => m.MembershipMembers)
                .HasForeignKey(e => e.MembershipId);

            entity.HasOne(e => e.Member)
                .WithMany(m => m.MembershipMembers)
                .HasForeignKey(e => e.MemberId);
        });
    }
}
