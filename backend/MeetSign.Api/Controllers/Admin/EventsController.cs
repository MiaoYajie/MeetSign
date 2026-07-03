using System.Security.Claims;
using MeetSign.Application.DTOs.Events;
using MeetSign.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MeetSign.Api.Controllers.Admin;

[ApiController]
[Authorize]
[Route("api/admin/events")]
public class EventsController : ControllerBase
{
    private readonly IEventService _eventService;
    private readonly IFileStorageService _fileStorage;

    public EventsController(IEventService eventService, IFileStorageService fileStorage)
    {
        _eventService = eventService;
        _fileStorage = fileStorage;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<EventListItemDto>>> List(CancellationToken cancellationToken) =>
        Ok(await _eventService.ListAsync(GetUserId(), cancellationToken));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<EventDetailDto>> Get(Guid id, CancellationToken cancellationToken)
    {
        try { return Ok(await _eventService.GetAsync(GetUserId(), id, cancellationToken)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    [HttpPost]
    public async Task<ActionResult<EventDetailDto>> Create(CreateEventRequest request, CancellationToken cancellationToken) =>
        Ok(await _eventService.CreateAsync(GetUserId(), request, cancellationToken));

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<EventDetailDto>> Update(Guid id, UpdateEventRequest request, CancellationToken cancellationToken)
    {
        try { return Ok(await _eventService.UpdateAsync(GetUserId(), id, request, cancellationToken)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        try { await _eventService.DeleteAsync(GetUserId(), id, cancellationToken); return NoContent(); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    [HttpPut("{id:guid}/branding")]
    public async Task<ActionResult<EventDetailDto>> UpdateBranding(Guid id, [FromForm] UpdateBrandingRequest request, IFormFile? background, IFormFile? logo, CancellationToken cancellationToken)
    {
        try
        {
            string? backgroundUrl = null;
            string? logoUrl = null;
            if (background != null)
            {
                var stored = await _fileStorage.SaveImageAsync(background.OpenReadStream(), background.FileName, cancellationToken);
                backgroundUrl = _fileStorage.GetPublicUrl(stored);
            }
            if (logo != null)
            {
                var stored = await _fileStorage.SaveImageAsync(logo.OpenReadStream(), logo.FileName, cancellationToken);
                logoUrl = _fileStorage.GetPublicUrl(stored);
            }
            return Ok(await _eventService.UpdateBrandingAsync(GetUserId(), id, request, backgroundUrl, logoUrl, cancellationToken));
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPut("{id:guid}/fields")]
    public async Task<ActionResult<EventDetailDto>> UpdateFields(Guid id, UpdateFieldsRequest request, CancellationToken cancellationToken)
    {
        try { return Ok(await _eventService.UpdateFieldsAsync(GetUserId(), id, request, cancellationToken)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    [HttpPut("{id:guid}/form-layout")]
    public async Task<ActionResult<EventDetailDto>> UpdateFormLayout(Guid id, UpdateFormLayoutRequest request, CancellationToken cancellationToken)
    {
        try { return Ok(await _eventService.UpdateFormLayoutAsync(GetUserId(), id, request, cancellationToken)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    [HttpPut("{id:guid}/conditions")]
    public async Task<ActionResult<EventDetailDto>> UpdateConditions(Guid id, UpdateConditionsRequest request, CancellationToken cancellationToken)
    {
        try { return Ok(await _eventService.UpdateConditionsAsync(GetUserId(), id, request, cancellationToken)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    [HttpPut("{id:guid}/templates")]
    public async Task<ActionResult<EventDetailDto>> UpdateTemplates(Guid id, UpdateTemplatesRequest request, CancellationToken cancellationToken)
    {
        try { return Ok(await _eventService.UpdateTemplatesAsync(GetUserId(), id, request, cancellationToken)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    [HttpPut("{id:guid}/mode")]
    public async Task<ActionResult<EventDetailDto>> UpdateMode(Guid id, UpdateModeRequest request, CancellationToken cancellationToken)
    {
        try { return Ok(await _eventService.UpdateModeAsync(GetUserId(), id, request, cancellationToken)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    [HttpPut("{id:guid}/panel-config")]
    public async Task<ActionResult<EventDetailDto>> UpdatePanelConfig(Guid id, UpdatePanelConfigRequest request, CancellationToken cancellationToken)
    {
        try { return Ok(await _eventService.UpdatePanelConfigAsync(GetUserId(), id, request, cancellationToken)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    [HttpGet("{id:guid}/sessions")]
    public async Task<ActionResult> ListSessions(Guid id, [FromServices] ISessionService sessionService, CancellationToken cancellationToken)
    {
        try { return Ok(await sessionService.ListByEventAsync(GetUserId(), id, cancellationToken)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    [HttpPost("{id:guid}/sessions")]
    public async Task<ActionResult> CreateSession(Guid id, [FromBody] MeetSign.Application.DTOs.Sessions.CreateSessionRequest request, [FromServices] ISessionService sessionService, CancellationToken cancellationToken)
    {
        try { return Ok(await sessionService.CreateAsync(GetUserId(), id, request, cancellationToken)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
