# NetFilmx Movie Catalog

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![.NET 8](https://img.shields.io/badge/.NET-8.0-purple.svg)
![Docker](https://img.shields.io/badge/docker-ready-blue.svg)

Movie catalog web application built with ASP.NET Core MVC.

## 📦 Deployment & Architecture
The application is containerized using Docker and is deployed under a unified Zero-Trust DevOps architecture.

* **URL:** [https://netfilmx.grela.dev](https://netfilmx.grela.dev)
* **Infrastructure:** Docker, Nginx Proxy Manager, Cloudflare (Orange Cloud)
* **CI/CD:** Automated deployment via GitHub Actions (Tailscale OIDC)
* **Database:** SQLite (Containerized)

## 🏗️ Project Structure
* `NetFilmx_Web` - Presentation layer (ASP.NET Core MVC, Controllers, Views)
* `NetFilmx_Service` - Business logic layer (Services)
* `NetFilmx_Storage` - Data access layer (EF Core)
* `Common` - Shared DTOs and contracts
* `infra/` - Deployment scripts, Docker configuration, and CI/CD setup

## 🚀 Quick Start (Docker)

```bash
# Clone the repository
git clone https://github.com/SzczepanGrela/netfilmx-movie-catalog.git
cd netfilmx-movie-catalog

# Build the Docker image
docker build -t netfilmx-app -f infra/Dockerfile .

# Run the container (maps port 8080)
docker run -d -p 8080:8080 --name netfilmx-app netfilmx-app
```
Then navigate to `http://localhost:8080`.

## 🗄️ Archive
The original 2024 university coursework version is preserved on the [`archive/original-2024`](https://github.com/SzczepanGrela/netfilmx-movie-catalog/tree/archive/original-2024) branch.

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
