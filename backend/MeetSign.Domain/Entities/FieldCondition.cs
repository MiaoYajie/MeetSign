namespace MeetSign.Domain.Entities;

public class FieldCondition
{
    public Guid Id { get; set; }
    public Guid EventId { get; set; }
    public string TargetFieldKey { get; set; } = string.Empty;
    public string ConditionJson { get; set; } = "{}";

    public Event Event { get; set; } = null!;
}
