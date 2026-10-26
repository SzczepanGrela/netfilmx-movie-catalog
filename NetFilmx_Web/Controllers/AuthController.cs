using MediatR;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using NetFilmx_Service.Command.Auth;
using NetFilmx_Service.Security;
using System.Security.Claims;
using NetFilmx_Storage.Repositories;
using NetFilmx_Web.Playback;
using NetFilmx_Storage.Entities;

namespace NetFilmx_Web.Controllers
{
    [Route("auth")]
    [RequestSizeLimit(4096)]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public class AuthController : Controller
    {
        private readonly IMediator _mediator;
        private readonly IJwtTokenService _jwtTokenService;
        private readonly ISessionService _sessionService;
        private readonly IUserRepository _userRepository;
        private readonly ITurnstileVerifier _turnstile;

        public AuthController(IMediator mediator, IJwtTokenService jwtTokenService, ISessionService sessionService, IUserRepository userRepository, ITurnstileVerifier turnstile)
        {
            _mediator = mediator;
            _jwtTokenService = jwtTokenService;
            _sessionService = sessionService;
            _userRepository = userRepository;
            _turnstile = turnstile;
        }

        [HttpGet("login")]
        public IActionResult Login(string returnUrl = "/")
        {
            if (User.IsInRole("Admin"))
            {
                return LocalRedirect(Url.IsLocalUrl(returnUrl) ? returnUrl : "/");
            }
            ViewData["ReturnUrl"] = returnUrl;
            return View(new LoginRequest());
        }

        [HttpPost("login")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Login(LoginRequest request, string returnUrl = "/")
        {
            ViewData["ReturnUrl"] = returnUrl;

            if (!ModelState.IsValid)
            {
                return View(request);
            }

            if (!await _turnstile.VerifyAsync(Request.Form["cf-turnstile-response"], TurnstileVerifier.AdminAction, HttpContext.RequestAborted))
            {
                ModelState.AddModelError(string.Empty, "Administrator verification failed. Please try again.");
                return View(request);
            }
            var command = new LoginCommand(request.Username, request.Password, request.RememberMe);
            var result = await _mediator.Send(command);

            if (!result.IsSuccess || result.Data?.Role != UserRole.Admin)
            {
                ModelState.AddModelError(string.Empty, "Invalid administrator credentials.");
                return View(request);
            }

            var user = result.Data;
            var accessToken = _jwtTokenService.GenerateAccessToken(user);
            var (refreshToken, session) = await _sessionService.CreateSessionAsync(user.Id, request.RememberMe);
            
            SetTokenCookies(accessToken, refreshToken, session.ExpiresAt);
            
            return LocalRedirect(Url.IsLocalUrl(returnUrl) ? returnUrl : "/");
        }

        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            var refreshTokenCookie = Request.Cookies["refresh_token"];
            if (!string.IsNullOrEmpty(refreshTokenCookie))
            {
                await _sessionService.RevokeSessionAsync(refreshTokenCookie);
            }

            Response.Cookies.Delete("access_token");
            Response.Cookies.Delete("refresh_token");

            return RedirectToAction("Index", "Home", new { area = "" });
        }

        // Fetch a token for the current identity, also after an access JWT expires.
        [HttpGet("csrf")]
        [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
        public IActionResult Csrf([FromServices] IAntiforgery antiforgery) =>
            Json(new { token = antiforgery.GetAndStoreTokens(HttpContext).RequestToken });

        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh()
        {
            var refreshTokenCookie = Request.Cookies["refresh_token"];
            if (string.IsNullOrEmpty(refreshTokenCookie))
                return Unauthorized();

            var sessionResult = await _sessionService.RotateSessionAsync(refreshTokenCookie);
            if (sessionResult == null)
                return Unauthorized();

            var user = await _userRepository.GetUserByIdAsync(sessionResult.Value.newSession.UserId);
            if (user?.Role != UserRole.Admin)
            {
                await _sessionService.RevokeSessionAsync(sessionResult.Value.newRefreshToken);
                return Unauthorized();
            }
            var accessToken = _jwtTokenService.GenerateAccessToken(user);
            
            SetTokenCookies(accessToken, sessionResult.Value.newRefreshToken, sessionResult.Value.newSession.ExpiresAt);
            
            return Ok();
        }

        private void SetTokenCookies(string accessToken, string refreshToken, DateTime expiresAt)
        {
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.Strict,
                Expires = new DateTimeOffset(expiresAt),
                Path = "/"
            };
            Response.Cookies.Append("access_token", accessToken, cookieOptions);
            Response.Cookies.Append("refresh_token", refreshToken, cookieOptions);
        }
    }

    public class LoginRequest
    {
        [Required, StringLength(50)]
        public string Username { get; set; } = "";
        [Required, StringLength(128)]
        public string Password { get; set; } = "";
        public bool RememberMe { get; set; }
    }
}
