namespace MeetSign.Application.DTOs.Events;

public record PanelConfigDto(
    string Title = "",
    string WelcomeMessage = "",
    bool ShowWelcomeMessage = false,
    string SubmitButtonText = "提交签到",
    string PanelBackgroundColor = "#ffffff",
    double PanelBackgroundOpacity = 0.94,
    string SubmitButtonColor = "#2563eb");

public static class PanelConfigDefaults
{
    public static PanelConfigDto Default { get; } = new();
}
