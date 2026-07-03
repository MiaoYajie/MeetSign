using System.Text.Json;
using MeetSign.Application.DTOs.Events;

namespace MeetSign.Application.Services;

public static class PanelConfigSerializer
{
    private static readonly JsonSerializerOptions Options = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    public static PanelConfigDto Deserialize(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return PanelConfigDefaults.Default;

        try
        {
            var parsed = JsonSerializer.Deserialize<PanelConfigDto>(json, Options);
            if (parsed == null)
                return PanelConfigDefaults.Default;

            var defaults = PanelConfigDefaults.Default;
            return parsed with
            {
                SuccessResult = MergeResult(parsed.SuccessResult, defaults.SuccessResult!),
                FailureResult = MergeResult(parsed.FailureResult, defaults.FailureResult!)
            };
        }
        catch
        {
            return PanelConfigDefaults.Default;
        }
    }

    public static string Serialize(PanelConfigDto config) =>
        JsonSerializer.Serialize(Normalize(config), Options);

    private static PanelConfigDto Normalize(PanelConfigDto config)
    {
        var defaults = PanelConfigDefaults.Default;
        return config with
        {
            SuccessResult = MergeResult(config.SuccessResult, defaults.SuccessResult!),
            FailureResult = MergeResult(config.FailureResult, defaults.FailureResult!)
        };
    }

    private static ResultPanelConfigDto MergeResult(ResultPanelConfigDto? value, ResultPanelConfigDto fallback) =>
        value == null
            ? fallback
            : new ResultPanelConfigDto(
                string.IsNullOrWhiteSpace(value.Title) ? fallback.Title : value.Title,
                string.IsNullOrWhiteSpace(value.TitleColor) ? fallback.TitleColor : value.TitleColor,
                string.IsNullOrWhiteSpace(value.PanelBackgroundColor) ? fallback.PanelBackgroundColor : value.PanelBackgroundColor,
                value.PanelBackgroundOpacity <= 0 ? fallback.PanelBackgroundOpacity : value.PanelBackgroundOpacity,
                string.IsNullOrWhiteSpace(value.ButtonText) ? fallback.ButtonText : value.ButtonText,
                string.IsNullOrWhiteSpace(value.ButtonColor) ? fallback.ButtonColor : value.ButtonColor,
                string.IsNullOrWhiteSpace(value.ButtonFontFamily) ? fallback.ButtonFontFamily : value.ButtonFontFamily,
                value.UseCheckInBackground,
                string.IsNullOrWhiteSpace(value.CustomPageBackground) ? fallback.CustomPageBackground : value.CustomPageBackground);
}
