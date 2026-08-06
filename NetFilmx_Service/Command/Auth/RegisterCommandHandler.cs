using MediatR;
using NetFilmx_Service.Result;
using EntityUser = NetFilmx_Storage.Entities.User;
using NetFilmx_Storage.Repositories;
using NetFilmx_Service.Security;
using Microsoft.Extensions.Configuration;
using NetFilmx_Storage.Entities; // Needed for UserRole, WalletTransaction, etc.

namespace NetFilmx_Service.Command.Auth
{
    public class RegisterCommandHandler : IRequestHandler<RegisterCommand, CResult>
    {
        private readonly IUserRepository _userRepository;
        private readonly IPasswordHasher _passwordHasher;
        private readonly IConfiguration _configuration;

        public RegisterCommandHandler(
            IUserRepository userRepository,
            IPasswordHasher passwordHasher,
            IConfiguration configuration)
        {
            _userRepository = userRepository;
            _passwordHasher = passwordHasher;
            _configuration = configuration;
        }

        public async Task<CResult> Handle(RegisterCommand request, CancellationToken cancellationToken)
        {
            if (!await _userRepository.IsUsernameAvailableAsync(request.Username))
                return CResult.Fail("Username already exists");

            // No IsEmailAvailableAsync in repository, assuming we should just try
            var user = new EntityUser(request.Username, request.Email, "temporary");
            user.PasswordHash = _passwordHasher.HashPassword(request.Password);
            user.Role = UserRole.User;

            var bonusStr = _configuration["WalletSettings:RegistrationBonus"] ?? "100.00";
            if (!decimal.TryParse(bonusStr, out var bonus))
                bonus = 100.00m;

            user.Balance = bonus;

            var transaction = new WalletTransaction(
                user.Id, // Although user is not saved yet, this might be 0
                bonus,
                TransactionType.TopUp,
                "Bonus powitalny",
                bonus
            )
            {
                User = user // keep the reference so EF Core knows the relation before SaveChanges
            };

            user.WalletTransactions.Add(transaction);

            await _userRepository.AddUserAsync(user);

            return CResult.Ok();
        }
    }
}
