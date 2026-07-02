using MeetSign.Domain.Enums;

namespace MeetSign.Domain.Entities;

public class Event
{
    public Guid Id { get; set; }
    public Guid OwnerId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public CheckInMode CheckInMode { get; set; } = CheckInMode.PresetList;
    public string? BackgroundUrl { get; set; }
    public string? LogoUrl { get; set; }
    public string? FooterHtml { get; set; }
    public string SuccessTemplate { get; set; } = "签到成功！";
    public string FailureTemplate { get; set; } = "签到失败，请核对信息后重试。";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User Owner { get; set; } = null!;
    public ICollection<FieldDefinition> FieldDefinitions { get; set; } = [];
    public ICollection<FormLayoutItem> FormLayoutItems { get; set; } = [];
    public ICollection<FieldCondition> FieldConditions { get; set; } = [];
    public ICollection<CheckInSession> Sessions { get; set; } = [];
}
