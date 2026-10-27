using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NetFilmx_Storage.Context;
using NetFilmx_Web.Playback;

namespace NetFilmx_Web.Controllers;

[Route("playback")]
[RequestSizeLimit(4096)]
[RequestFormLimits(ValueCountLimit = 4, ValueLengthLimit = 2048)]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class PlaybackController(NetFilmxDbContext db, PlaybackCatalogue catalogue, PlaybackGrantIssuer issuer,
    ITurnstileVerifier turnstile, IConfiguration configuration) : Controller
{
    [HttpPost("grant")]
    public async Task<IActionResult> Grant([FromForm] int videoId, [FromForm] string? token, CancellationToken cancellationToken)
    {
        if (!issuer.Enabled) return StatusCode(503, new { error = "playback_closed" });
        if (videoId <= 0 || !ModelState.IsValid) return BadRequest();
        var url = await db.Videos.AsNoTracking().Where(v => v.Id == videoId).Select(v => v.VideoUrl).SingleOrDefaultAsync(cancellationToken);
        if (url is null) return NotFound();
        var film = catalogue.Find(url, configuration["CloudflareR2:PublicUrl"]);
        if (film is null) return StatusCode(503, new { error = "catalogue_not_approved" });
        if (!await turnstile.VerifyAsync(token, TurnstileVerifier.PlaybackAction, cancellationToken))
            return BadRequest(new { error = "verification_failed" });
        try { return Json(issuer.Issue(film.Value.Key, film.Value.Value)); }
        catch (Exception error) when (error is InvalidOperationException or System.Security.Cryptography.CryptographicException or IOException or UnauthorizedAccessException)
        { return StatusCode(503, new { error = "playback_closed" }); }
    }
}
