namespace MeetSign.Domain.Entities;

public class CheckInSession
{
    public Guid Id { get; set; }
    public Guid EventId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string PublicToken { get; set; } = string.Empty;
    public DateTime OpenStart { get; set; }
    public DateTime OpenEnd { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Event Event { get; set; } = null!;
    public ICollection<Attendee> Attendees { get; set; } = [];
    public ICollection<CheckInRecord> Records { get; set; } = [];
}
