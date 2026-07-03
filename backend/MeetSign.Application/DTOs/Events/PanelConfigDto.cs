namespace MeetSign.Application.DTOs.Events;

public record ResultPanelConfigDto(
    string Title = "签到成功",
    string TitleColor = "#15803d",
    string PanelBackgroundColor = "#ffffff",
    double PanelBackgroundOpacity = 0.94,
    string ButtonText = "重新签到",
    string ButtonColor = "#e2e8f0",
    string ButtonFontFamily = "inherit",
    bool UseCheckInBackground = true,
    string CustomPageBackground = "linear-gradient(135deg, #eef2ff, #f8fafc)");

public record PanelConfigDto(
    string Title = "",
    string WelcomeMessage = "",
    bool ShowWelcomeMessage = false,
    string SubmitButtonText = "提交签到",
    string PanelBackgroundColor = "#ffffff",
    double PanelBackgroundOpacity = 0.94,
    string SubmitButtonColor = "#2563eb",
    ResultPanelConfigDto? SuccessResult = null,
    ResultPanelConfigDto? FailureResult = null);

public static class PanelConfigDefaults
{
    public static PanelConfigDto Default { get; } = new(
        SuccessResult: new ResultPanelConfigDto(Title: "签到成功", TitleColor: "#15803d"),
        FailureResult: new ResultPanelConfigDto(Title: "签到失败", TitleColor: "#b91c1c"));
}
