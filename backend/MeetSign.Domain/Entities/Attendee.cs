namespace MeetSign.Domain.Entities;

public class Attendee
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public string FieldValuesJson { get; set; } = "{}";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public CheckInSession Session { get; set; } = null!;
}
