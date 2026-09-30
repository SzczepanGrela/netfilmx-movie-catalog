# NetFilmx - Premium VOD Platform

> Trwają przygotowania do migracji na Coolify. Ta gałąź zawiera zachowaną lokalną
> pracę oraz osobne migracje PostgreSQL. Nie jest jeszcze gotowym wydaniem
> produkcyjnym. Aktualny zakres, testy i warunki zachowania mediów opisuje
> [przewodnik baz danych](docs/database-baseline.md).

NetFilmx to zaawansowana aplikacja webowa VOD (Video on Demand) w technologii ASP.NET Core 8 MVC. Głównym celem tego projektu jest zaprezentowanie pełnego, nowoczesnego ekosystemu streamingu wideo z zachowaniem dobrych praktyk architektonicznych.

## Główne Funkcjonalności

- **Przetwarzanie Wideo (FFmpeg + Hangfire)**: Wgrywane pliki .mp4 są asynchronicznie, w tle (Fire-and-Forget) konwertowane do formatu HLS (.m3u8 i segmenty .ts), co gwarantuje płynne przesyłanie strumieniowe bez zapychania procesu serwera webowego.
- **Zewnętrzny Storage (Cloudflare R2)**: Zoptymalizowane przechowywanie plików statycznych oraz segmentów wideo z wykorzystaniem technologii S3 (AWS SDK).
- **Architektura CQRS (MediatR)**: Logika biznesowa i operacje wejścia/wyjścia podzielone są na komendy (Commands) i zapytania (Queries), co poprawia testowalność i modularność.
- **Bezpieczeństwo**:
  - Hashowanie haseł algorytmem Argon2id.
  - Generowanie oraz autoryzacja żądań przy użyciu tokenów (JWT przechowywany w ciasteczkach `HttpOnly`).
  - Restrykcyjny panel administratora (`/admin`) oparty na walidacji roli (`[Authorize(Roles="Admin")]`).
- **Premium UI (Glassmorphism)**: Kliencki interfejs użytkownika korzystający z motywu dark mode (m.in. `#040814`) ze wstawkami fioletu, karuzelami wideo, responsywnym playerem (Vidstack) oraz trybem Ambient Mode. Płatności są mockowane (wirtualne kredyty).

## Technologie

- **Framework**: .NET 8 (ASP.NET Core MVC)
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

# 3. Po skonfigurowaniu połączenia i JWT — uruchomienie
dotnet run --project NetFilmx_Web
```

Przed uruchomieniem ustaw `ConnectionStrings__DefaultConnection` oraz
`JwtSettings__SecretKey`, `JwtSettings__Issuer` i `JwtSettings__Audience`
przez zmienne środowiskowe albo .NET User Secrets. Użyj własnego klucza JWT.
Nie zapisuj sekretów w repozytorium ani obrazie. W tej wersji aplikacja nadal
wykonuje migracje przy starcie; jawny etap migracji jest częścią dalszych prac.
Konta demonstracyjne można włączyć wyłącznie w środowisku `Development`,
ustawiając `Database__SeedDemoData=true`. Szczegóły i ograniczenia opisuje
[przewodnik baz danych](docs/database-baseline.md).

## Dotychczasowe wdrożenie (do zastąpienia)

Repozytorium nadal zawiera starszy proces wdrożenia:
1. Docker + Docker Compose.
2. Ukrycie IP serwera przez Cloudflare (Orange Cloud).
3. Reverse Proxy w postaci Nginx Proxy Manager.
4. Deploy w ramach zamkniętej sieci Tailscale wyzwalany bezpośrednio z GitHub Actions.

Docelowo: obraz budowany i testowany w CI, niezmienny digest GHCR, wdrożenie
przez Coolify oraz ruch Cloudflare Tunnel → Traefik → sieć aplikacji.
Nie należy uruchamiać ani przywracać Nginx Proxy Manager na podstawie
powyższego opisu historycznego.
