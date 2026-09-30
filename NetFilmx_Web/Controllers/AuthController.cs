using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using NetFilmx_Service.Command.Auth;
using NetFilmx_Service.Security;
using System.Security.Claims;
using NetFilmx_Storage.Repositories;

namespace NetFilmx_Web.Controllers
{
    [Route("auth")]
    public class AuthController : Controller
    {
        private readonly IMediator _mediator;
        private readonly IJwtTokenService _jwtTokenService;
        private readonly ISessionService _sessionService;
        private readonly IUserRepository _userRepository;

        public AuthController(IMediator mediator, IJwtTokenService jwtTokenService, ISessionService sessionService, IUserRepository userRepository)
        {
            _mediator = mediator;
            _jwtTokenService = jwtTokenService;
            _sessionService = sessionService;
            _userRepository = userRepository;
        }

        [HttpGet("login")]
        public IActionResult Login(string returnUrl = "/")
        {
            if (User.Identity != null && User.Identity.IsAuthenticated)
            {
                return LocalRedirect(returnUrl);
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

            var command = new LoginCommand(request.Username, request.Password, request.RememberMe);
            var result = await _mediator.Send(command);

            if (!result.IsSuccess)
            {
                ModelState.AddModelError(string.Empty, "Invalid login attempt. " + result.Message);
                return View(request);
            }

            var user = result.Data;
            var accessToken = _jwtTokenService.GenerateAccessToken(user);
            var (refreshToken, session) = await _sessionService.CreateSessionAsync(user.Id, request.RememberMe);
            
            SetTokenCookies(accessToken, refreshToken, request.RememberMe);
            
            return LocalRedirect(returnUrl);
        }

        [HttpGet("register")]
        public IActionResult Register(string returnUrl = "/")
        {
            if (User.Identity != null && User.Identity.IsAuthenticated)
            {
                return LocalRedirect(returnUrl);
            }
            ViewData["ReturnUrl"] = returnUrl;
            return View(new RegisterRequest());
        }

        [HttpPost("register")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Register(RegisterRequest request, string returnUrl = "/")
        {
            ViewData["ReturnUrl"] = returnUrl;

            if (!ModelState.IsValid)
            {
                return View(request);
            }

            var command = new RegisterCommand(request.Username, request.Email, request.Password);
            var result = await _mediator.Send(command);

            if (!result.IsSuccess)
            {
                ModelState.AddModelError(string.Empty, result.Message);
                return View(request);
            }

            // Auto-login
            var loginCommand = new LoginCommand(request.Username, request.Password, false);
            var loginResult = await _mediator.Send(loginCommand);
            
            if (loginResult.IsSuccess)
            {
                var user = loginResult.Data;
                var accessToken = _jwtTokenService.GenerateAccessToken(user);
                var (refreshToken, session) = await _sessionService.CreateSessionAsync(user.Id, false);
                SetTokenCookies(accessToken, refreshToken, false);
                return LocalRedirect(returnUrl);
            }
            
            return RedirectToAction(nameof(Login));
        }

        [AcceptVerbs("GET", "POST")]
        [Route("logout")]
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

        // We keep this for SPA-like AJAX calls if needed (e.g. for checking session from JS)
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
            var accessToken = _jwtTokenService.GenerateAccessToken(user);
            
            bool rememberMe = (sessionResult.Value.newSession.ExpiresAt - DateTime.UtcNow).TotalDays > 10;
            
            SetTokenCookies(accessToken, sessionResult.Value.newRefreshToken, rememberMe);
            
            return Ok();
        }

        private void SetTokenCookies(string accessToken, string refreshToken, bool rememberMe)
        {
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = true, // should be true in prod, but keep it true (works on localhost over HTTPS/HTTP if browser allows)
                SameSite = SameSiteMode.Strict,
                Expires = rememberMe ? DateTime.UtcNow.AddDays(30) : DateTime.UtcNow.AddDays(7)
            };
            Response.Cookies.Append("access_token", accessToken, cookieOptions);
            Response.Cookies.Append("refresh_token", refreshToken, cookieOptions);
        }
    }

    public class RegisterRequest
    {
        public string Username { get; set; }
        public string Email { get; set; }
        public string Password { get; set; }
    }

    public class LoginRequest
    {
        public string Username { get; set; }
        public string Password { get; set; }
        public bool RememberMe { get; set; }
    }
}
