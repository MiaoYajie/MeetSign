namespace MeetSign.Domain.Entities;

public class CheckInRecord
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public string SubmittedValuesJson { get; set; } = "{}";
    public bool IsSuccess { get; set; }
    public string ResultMessage { get; set; } = string.Empty;
    public DateTime CheckedInAt { get; set; } = DateTime.UtcNow;
    public int SubmitIndex { get; set; }
    public string ClientFingerprint { get; set; } = string.Empty;

    public CheckInSession Session { get; set; } = null!;
}
