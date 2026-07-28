# NetFilmx - Movie Catalog (Original 2024 Version)

> [!NOTE]
> This is the archived original version of the project created in July 2024 as a university coursework ("Szkolenie Techniczne 2"). 
> For the latest modernized version with Docker deployment, see the `main` branch.

## About The Project

NetFilmx is a movie catalog web application built with ASP.NET Core MVC. This version uses SQL Server (LocalDB) and represents the state of the project before infrastructure and DevOps modernization.

### Tech Stack
* C#
* ASP.NET Core MVC
* Entity Framework Core
* SQL Server

### Architecture
The project follows a multi-layered architecture:
* `NetFilmx_Web` - Presentation layer
* `NetFilmx_Service` - Business logic layer
* `NetFilmx_Storage` - Data access layer
* `Common` - Shared DTOs and contracts
