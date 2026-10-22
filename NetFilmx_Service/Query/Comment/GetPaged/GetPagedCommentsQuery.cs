using MediatR;
using NetFilmx_Service.Result;

namespace NetFilmx_Service.Query.Comment
{
    public sealed class GetPagedCommentsQuery<TDto> : IRequest<QResult<PaginatedList<TDto>>>
    {
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public string SearchTerm { get; set; }

        public GetPagedCommentsQuery(int pageNumber, int pageSize, string searchTerm)
        {
            PageNumber = pageNumber;
            PageSize = pageSize;
            SearchTerm = searchTerm;
        }
    }
}
