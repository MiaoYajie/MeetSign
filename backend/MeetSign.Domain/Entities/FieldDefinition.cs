using MeetSign.Domain.Enums;

namespace MeetSign.Domain.Entities;

public class FieldDefinition
{
    public Guid Id { get; set; }
    public Guid EventId { get; set; }
    public string Key { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public FieldType FieldType { get; set; } = FieldType.Text;
    public bool IsBuiltIn { get; set; }
    public bool Required { get; set; }
    public int SortOrder { get; set; }

    public Event Event { get; set; } = null!;
}
