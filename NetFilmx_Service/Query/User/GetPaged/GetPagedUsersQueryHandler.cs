using AutoMapper;
using MediatR;
using NetFilmx_Service.Dtos.User;
using NetFilmx_Service.Result;
using NetFilmx_Storage.Repositories;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace NetFilmx_Service.Query.User
{
    public sealed class GetPagedUsersQueryHandler<TDto> : IRequestHandler<GetPagedUsersQuery<TDto>, QResult<PaginatedList<TDto>>>
        where TDto : IUserDto
    {
        private readonly IUserRepository _repository;
        private readonly IMapper _mapper;

        public GetPagedUsersQueryHandler(IUserRepository repository, IMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        public async Task<QResult<PaginatedList<TDto>>> Handle(GetPagedUsersQuery<TDto> query, CancellationToken cancellationToken)
        {
            try
            {
                var (users, totalCount) = await _repository.GetPagedUsersAsync(query.PageNumber, query.PageSize, query.SearchTerm);
                var usersDto = _mapper.Map<List<TDto>>(users);
                var paginatedList = new PaginatedList<TDto>(usersDto, totalCount, query.PageNumber, query.PageSize);
                return QResult<PaginatedList<TDto>>.Ok(paginatedList);
            }
            catch (Exception ex)
            {
                return QResult<PaginatedList<TDto>>.Fail(ex.Message);
            }
        }
    }
}
