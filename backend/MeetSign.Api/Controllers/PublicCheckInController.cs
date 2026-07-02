using MeetSign.Application.DTOs.Public;
using MeetSign.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace MeetSign.Api.Controllers;

[ApiController]
[Route("api/public/sessions/{token}")]
public class PublicCheckInController : ControllerBase
{
    private readonly ICheckInService _checkInService;

    public PublicCheckInController(ICheckInService checkInService)
    {
        _checkInService = checkInService;
    }

    [HttpGet]
    public async Task<ActionResult<PublicSessionConfigDto>> GetConfig(string token, CancellationToken cancellationToken)
    {
        try { return Ok(await _checkInService.GetPublicConfigAsync(token, cancellationToken)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    [HttpPost("evaluate")]
    public async Task<ActionResult<EvaluateResponse>> Evaluate(string token, EvaluateRequest request, CancellationToken cancellationToken)
    {
        try { return Ok(await _checkInService.EvaluateAsync(token, request, cancellationToken)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    [HttpPost("submit")]
    public async Task<ActionResult<SubmitResponse>> Submit(string token, SubmitRequest request, CancellationToken cancellationToken)
    {
        try { return Ok(await _checkInService.SubmitAsync(token, request, cancellationToken)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpGet("latest")]
    public async Task<ActionResult<CachedResultDto?>> GetLatest(string token, [FromQuery] string clientFingerprint, CancellationToken cancellationToken)
    {
        try { return Ok(await _checkInService.GetLatestResultAsync(token, clientFingerprint, cancellationToken)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }
}
