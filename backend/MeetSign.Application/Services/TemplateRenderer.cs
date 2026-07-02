using System.Text.Json;
using System.Text.RegularExpressions;

namespace MeetSign.Application.Services;

public static class TemplateRenderer
{
    private static readonly Regex PlaceholderRegex = new(@"\{\{(\w+)\}\}", RegexOptions.Compiled);

    public static string Render(string template, Dictionary<string, string> values)
    {
        return PlaceholderRegex.Replace(template, match =>
        {
            var key = match.Groups[1].Value;
            return values.TryGetValue(key, out var value) ? value : match.Value;
        });
    }

    public static Dictionary<string, string> ParseJsonValues(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return new Dictionary<string, string>();

        return JsonSerializer.Deserialize<Dictionary<string, string>>(json) ?? new Dictionary<string, string>();
    }

    public static string ToJson(Dictionary<string, string> values)
    {
        return JsonSerializer.Serialize(values);
    }
}
