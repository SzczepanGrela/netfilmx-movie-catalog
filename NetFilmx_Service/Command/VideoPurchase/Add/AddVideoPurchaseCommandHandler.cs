using MediatR;
using NetFilmx_Service.Result;
using NetFilmx_Storage.Repositories;

namespace NetFilmx_Service.Command.VideoPurchase
{
    public sealed class AddVideoPurchaseCommandHandler : IRequestHandler<AddVideoPurchaseCommand, CResult>
    {
        private readonly IVideoPurchaseRepository _repository;

        public AddVideoPurchaseCommandHandler(IVideoPurchaseRepository videoPurchaseRepository)
        {
            _repository = videoPurchaseRepository;
        }

        public async Task<CResult> Handle(AddVideoPurchaseCommand command, CancellationToken cancellationToken)
        {
            if (command == null)
            {
                return CResult.Fail("Command is null");
            }

            var videoPurchase = new NetFilmx_Storage.Entities.VideoPurchase(command.UserId, command.VideoId);
            try
            {
                videoPurchase.PurchaseDate = DateTime.UtcNow;
                await _repository.AddVideoPurchaseAsync(videoPurchase);
                return CResult.Ok();
            }
            catch (Exception ex)
            {
                return CResult.Fail(ex.Message);
            }



        }

    }
}
