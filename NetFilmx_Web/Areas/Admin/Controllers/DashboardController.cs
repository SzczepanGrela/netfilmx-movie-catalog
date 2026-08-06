using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace NetFilmx_Web.Areas.Admin.Controllers
{
    [Area("Admin")]
    [Authorize(Roles = "Admin")]
    public class DashboardController : Controller
    {
        private readonly NetFilmx_Storage.Context.NetFilmxDbContext _dbContext;

        public DashboardController(NetFilmx_Storage.Context.NetFilmxDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public IActionResult Index()
        {
            ViewBag.TotalUsers = _dbContext.Users.Count();
            ViewBag.TotalVideos = _dbContext.Videos.Count();
            ViewBag.TotalPurchases = _dbContext.VideoPurchases.Count();
            return View();
        }
    }
}
