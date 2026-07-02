namespace MeetSign.Domain.Entities;

public class FormLayoutItem
{
    public Guid Id { get; set; }
    public Guid EventId { get; set; }
    public string FieldKey { get; set; } = string.Empty;
    public int Row { get; set; }
    public int Col { get; set; }
    public int ColSpan { get; set; } = 12;

    public Event Event { get; set; } = null!;
}
