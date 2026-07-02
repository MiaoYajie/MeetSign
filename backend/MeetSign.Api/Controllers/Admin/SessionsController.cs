using System.Security.Claims;
using MeetSign.Application.DTOs.Sessions;
using MeetSign.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MeetSign.Api.Controllers.Admin;

[ApiController]
[Authorize]
[Route("api/admin/sessions")]
public class SessionsController : ControllerBase
{
    private readonly ISessionService _sessionService;
    private readonly IAttendeeImportService _attendeeImportService;

    public SessionsController(ISessionService sessionService, IAttendeeImportService attendeeImportService)
    {
        _sessionService = sessionService;
        _attendeeImportService = attendeeImportService;
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<SessionDetailDto>> Get(Guid id, CancellationToken cancellationToken)
    {
        try { return Ok(await _sessionService.GetAsync(GetUserId(), id, cancellationToken)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<SessionDetailDto>> Update(Guid id, UpdateSessionRequest request, CancellationToken cancellationToken)
    {
        try { return Ok(await _sessionService.UpdateAsync(GetUserId(), id, request, cancellationToken)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        try { await _sessionService.DeleteAsync(GetUserId(), id, cancellationToken); return NoContent(); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    [HttpGet("{id:guid}/url")]
    public async Task<ActionResult<SessionUrlDto>> GetUrl(Guid id, CancellationToken cancellationToken)
    {
        try { return Ok(await _sessionService.GetUrlAsync(GetUserId(), id, cancellationToken)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    [HttpGet("{id:guid}/qrcode")]
    public async Task<IActionResult> GetQrCode(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var bytes = await _sessionService.GetQrCodeAsync(GetUserId(), id, cancellationToken);
            return File(bytes, "image/png", "qrcode.png");
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    [HttpPost("{id:guid}/attendees/import")]
    public async Task<ActionResult<ImportResultDto>> ImportAttendees(Guid id, IFormFile file, CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "请上传文件。" });

        try
        {
            await using var stream = file.OpenReadStream();
            return Ok(await _attendeeImportService.ImportAsync(GetUserId(), id, stream, file.FileName, cancellationToken));
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    [HttpPost("{id:guid}/attendees/import-text")]
    public async Task<ActionResult<ImportResultDto>> ImportAttendeesText(Guid id, ImportTextRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Text))
            return BadRequest(new { message = "请输入名单内容。" });

        try
        {
            return Ok(await _attendeeImportService.ImportTextAsync(GetUserId(), id, request.Text, cancellationToken));
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    [HttpGet("{id:guid}/attendees/count")]
    public async Task<ActionResult<object>> GetAttendeeCount(Guid id, CancellationToken cancellationToken)
    {
        try { return Ok(new { count = await _attendeeImportService.GetAttendeeCountAsync(GetUserId(), id, cancellationToken) }); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    [HttpDelete("{id:guid}/attendees/{attendeeId:guid}")]
    public async Task<IActionResult> DeleteAttendee(Guid id, Guid attendeeId, CancellationToken cancellationToken)
    {
        try
        {
            await _attendeeImportService.DeleteAttendeeAsync(GetUserId(), id, attendeeId, cancellationToken);
            return NoContent();
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpGet("{id:guid}/attendance")]
    public async Task<ActionResult<object>> GetAttendance(
        Guid id,
        [FromQuery] string? q,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var (columns, data) = await _sessionService.GetAttendanceAsync(GetUserId(), id, q, status, page, pageSize, cancellationToken);
            return Ok(new { columns, items = data.Items, total = data.Total, page = data.Page, pageSize = data.PageSize });
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    [HttpGet("{id:guid}/records")]
    public async Task<ActionResult<PagedResult<CheckInRecordDto>>> GetRecords(Guid id, [FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] bool? isSuccess = null, CancellationToken cancellationToken = default)
    {
        try { return Ok(await _sessionService.GetRecordsAsync(GetUserId(), id, page, pageSize, isSuccess, cancellationToken)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    [HttpGet("{id:guid}/records/export")]
    public async Task<IActionResult> ExportRecords(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var bytes = await _sessionService.ExportRecordsAsync(GetUserId(), id, cancellationToken);
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "checkin-records.xlsx");
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
