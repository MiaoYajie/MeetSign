using System.Text.Json;
using MeetSign.Application.DTOs.Events;

namespace MeetSign.Application.Services;

public static class ConditionEvaluator
{
    public static HashSet<string> GetVisibleFields(
        IEnumerable<string> layoutFieldKeys,
        IEnumerable<FieldConditionDto> conditions,
        Dictionary<string, string> partialValues,
        Func<string, bool>? isFieldDuplicateInPresetList = null)
    {
        var visible = new HashSet<string>(layoutFieldKeys, StringComparer.OrdinalIgnoreCase);

        foreach (var condition in conditions)
        {
            if (!EvaluateCondition(condition, partialValues, isFieldDuplicateInPresetList))
            {
                visible.Remove(condition.TargetFieldKey);
            }
        }

        return visible;
    }

    public static bool EvaluateCondition(
        FieldConditionDto condition,
        Dictionary<string, string> partialValues,
        Func<string, bool>? isFieldDuplicateInPresetList)
    {
        if (string.IsNullOrWhiteSpace(condition.ConditionJson))
            return true;

        using var doc = JsonDocument.Parse(condition.ConditionJson);
        var root = doc.RootElement;

        var type = root.TryGetProperty("type", out var typeProp)
            ? typeProp.GetString()
            : null;

        return type switch
        {
            "fieldDuplicate" => EvaluateFieldDuplicate(root, partialValues, isFieldDuplicateInPresetList),
            "always" => true,
            "never" => false,
            _ => true
        };
    }

    private static bool EvaluateFieldDuplicate(
        JsonElement condition,
        Dictionary<string, string> partialValues,
        Func<string, bool>? isFieldDuplicateInPresetList)
    {
        if (isFieldDuplicateInPresetList == null)
            return false;

        if (!condition.TryGetProperty("sourceFieldKey", out var sourceProp))
            return false;

        var sourceKey = sourceProp.GetString();
        if (string.IsNullOrWhiteSpace(sourceKey))
            return false;

        if (!partialValues.TryGetValue(sourceKey, out var value) || string.IsNullOrWhiteSpace(value))
            return false;

        return isFieldDuplicateInPresetList(value);
    }
}
