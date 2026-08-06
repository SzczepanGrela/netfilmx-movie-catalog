using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using NetFilmx_Service.Command.Auth;
using NetFilmx_Web.Auth;
using System.Security.Claims;
using NetFilmx_Storage.Repositories; // if needed to get full user from ID on Get Me, or we can just send query

namespace NetFilmx_Web.Controllers
{
    [ApiController]
    [Route("auth")]
    public class AuthController : ControllerBase
    {
        private readonly IMediator _mediator;
        private readonly IJwtTokenService _jwtTokenService;
        private readonly ISessionService _sessionService;
        private readonly IUserRepository _userRepository; // injecting repo in controller is fine for 'me' or I can use a Query

        public AuthController(IMediator mediator, IJwtTokenService jwtTokenService, ISessionService sessionService, IUserRepository userRepository)
        {
            _mediator = mediator;
            _jwtTokenService = jwtTokenService;
            _sessionService = sessionService;
            _userRepository = userRepository;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            var command = new RegisterCommand(request.Username, request.Email, request.Password);
            var result = await _mediator.Send(command);

            if (!result.IsSuccess)
                return BadRequest(result.Message);

            // Auto-login
            var loginCommand = new LoginCommand(request.Username, request.Password, false);
            var loginResult = await _mediator.Send(loginCommand);
            
            if (loginResult.IsSuccess)
            {
                var user = loginResult.Data;
                var accessToken = _jwtTokenService.GenerateAccessToken(user);
                var (refreshToken, session) = await _sessionService.CreateSessionAsync(user.Id, false);
                SetTokenCookies(accessToken, refreshToken, false);
                return Ok();
            }
            
            return Ok(); // Even if auto-login fails, registration succeeded
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var command = new LoginCommand(request.Username, request.Password, request.RememberMe);
            var result = await _mediator.Send(command);

            if (!result.IsSuccess)
                return Unauthorized(result.Message);

            var user = result.Data;
            var accessToken = _jwtTokenService.GenerateAccessToken(user);
            var (refreshToken, session) = await _sessionService.CreateSessionAsync(user.Id, request.RememberMe);
            
            SetTokenCookies(accessToken, refreshToken, request.RememberMe);
            
            return Ok();
        }

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
            
            // Assume RememberMe depends on session Expiry being far in future (hacky, or just hardcode false)
            bool rememberMe = (sessionResult.Value.newSession.ExpiresAt - DateTime.UtcNow).TotalDays > 10;
            
            SetTokenCookies(accessToken, sessionResult.Value.newRefreshToken, rememberMe);
            
            return Ok();
        }

        [Authorize]
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

            return Ok();
        }

        [Authorize]
        [HttpGet("me")]
        public async Task<IActionResult> GetMe()
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(userIdStr, out var userId)) return Unauthorized();

            var user = await _userRepository.GetUserByIdAsync(userId);

            return Ok(new
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                Balance = user.Balance,
                Role = user.Role.ToString()
            });
        }

        private void SetTokenCookies(string accessToken, string refreshToken, bool rememberMe)
        {
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = true, // should be true in prod, but keeping true
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
