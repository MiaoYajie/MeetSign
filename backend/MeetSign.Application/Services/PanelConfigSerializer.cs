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
            return JsonSerializer.Deserialize<PanelConfigDto>(json, Options) ?? PanelConfigDefaults.Default;
        }
        catch
        {
            return PanelConfigDefaults.Default;
        }
    }

    public static string Serialize(PanelConfigDto config) =>
        JsonSerializer.Serialize(config, Options);
}
