# NetFilmx - Premium VOD Platform

> Trwają przygotowania do migracji na Coolify. Ta gałąź zawiera zachowaną lokalną
> pracę oraz osobne migracje PostgreSQL. Nie jest jeszcze gotowym wydaniem
> produkcyjnym. Aktualny zakres, testy i warunki zachowania mediów opisuje
> [przewodnik baz danych](docs/database-baseline.md).

Stan kandydata i pozostałe warunki wydania: [work-status](docs/work-status.md).

Zależności są przypięte w lockfile i sprawdzane pod kątem podatności w CI.
Aktualizacje, audyty NuGet/npm i testy opisuje
[przewodnik zależności](docs/dependencies.md).

NetFilmx to aplikacja webowa VOD (Video on Demand) w technologii ASP.NET Core 10 MVC.

## Główne Funkcjonalności

- **Przetwarzanie wideo (FFmpeg + Hangfire)**: Opcjonalne uploady są konwertowane w tle do HLS. Wymagają prywatnego trwałego katalogu, PostgreSQL i R2; domyślnie są wyłączone. [Konfiguracja i ograniczenia](docs/upload-processing.md).
- **Zewnętrzny Storage (Cloudflare R2)**: Zoptymalizowane przechowywanie plików statycznych oraz segmentów wideo z wykorzystaniem technologii S3 (AWS SDK).
- **Architektura CQRS (MediatR)**: Logika biznesowa i operacje wejścia/wyjścia podzielone są na komendy (Commands) i zapytania (Queries), co poprawia testowalność i modularność.
- **Bezpieczeństwo**:
  - Hashowanie haseł algorytmem Argon2id.
  - Generowanie oraz autoryzacja żądań przy użyciu tokenów (JWT przechowywany w ciasteczkach `HttpOnly`).
  - Restrykcyjny panel administratora (`/admin`) oparty na walidacji roli (`[Authorize(Roles="Admin")]`).
- **Premium UI (Glassmorphism)**: Kliencki interfejs użytkownika korzystający z motywu dark mode (m.in. `#040814`) ze wstawkami fioletu, karuzelami wideo, responsywnym playerem (Vidstack) oraz trybem Ambient Mode. Płatności są mockowane (wirtualne kredyty).

## Technologie

- **Framework**: .NET 10 (ASP.NET Core MVC), SDK z `global.json`
- **Architektura**: CQRS (MediatR), Clean Architecture (Storage / Service / Web)
- **Baza Danych**: Entity Framework Core (osobne migracje SQLite i PostgreSQL;
  testy InMemory oraz rzeczywistych baz)
- **Background Jobs**: Hangfire
- **Frontend**: HTML5, CSS3, Vidstack Player (HLS)
- **Testy**: xUnit, Moq, FluentAssertions
- **DevOps**: Docker, GitHub Actions (Tailscale OIDC)

## Uruchomienie lokalne

```bash
# 1. Klonowanie repozytorium
git clone https://github.com/SzczepanGrela/netfilmx-movie-catalog.git
cd netfilmx-movie-catalog

# 2. Przywrócenie narzędzia EF Core zgodnego z projektem
dotnet tool restore

# 3. Po skonfigurowaniu połączenia — jawne migracje
dotnet run --project NetFilmx_Web -- database migrate --confirm-reviewed-migrations

# 4. Po skonfigurowaniu JWT i prywatnego keyringu — uruchomienie
dotnet run --project NetFilmx_Web
```

Przed uruchomieniem ustaw `ConnectionStrings__DefaultConnection` oraz
`JwtSettings__SecretKey`, `JwtSettings__Issuer` i `JwtSettings__Audience`
przez zmienne środowiskowe albo .NET User Secrets. Użyj własnego klucza JWT.
Nie zapisuj sekretów w repozytorium ani obrazie. Ustaw też
`DataProtection__KeyRingPath` na istniejący prywatny katalog poza aplikacją
(Linux: `0700`, właściciel zgodny z procesem).
Start aplikacji sprawdza gotowość schematu. Migracje uruchamia się oddzielnie
zgodnie z [instrukcją wydania bazy](docs/release-database.md).
Konta demonstracyjne można włączyć wyłącznie w środowisku `Development`,
ustawiając `Database__SeedDemoData=true`. Szczegóły i ograniczenia opisuje
[przewodnik baz danych](docs/database-baseline.md).

## Wydanie kandydata

CI buduje i testuje jeden obraz. Po przejściu bramek na `main` publikuje ten
sam obraz do GHCR wraz z poświadczeniem pochodzenia i SBOM.
Wdrożenie przez Coolify pozostaje wyłączone do zatwierdzenia prywatnego
kontraktu i warunków odzyskiwania danych. Szczegóły:
[wydanie przez GHCR i Coolify](docs/release-delivery.md).

Ta gałąź usuwa dawny deploy przez SSH; produkcja nadal wymaga osobnego
przeglądu i przełączenia. Nie przywracaj Nginx Proxy Manager na podstawie
historycznych skryptów.
