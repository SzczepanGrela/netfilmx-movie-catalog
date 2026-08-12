# NetFilmx - Premium VOD Platform

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
- **Baza Danych**: Entity Framework Core (SQLite / InMemory do testów)
- **Background Jobs**: Hangfire
- **Frontend**: HTML5, CSS3, Vidstack Player (HLS)
- **Testy**: xUnit, Moq, FluentAssertions
- **DevOps**: Docker, GitHub Actions (Tailscale OIDC)

## Uruchomienie lokalne

```bash
# 1. Klonowanie repozytorium
git clone https://github.com/SzczepanGrela/netfilmx-movie-catalog.git
cd netfilmx-movie-catalog

# 2. Utworzenie bazy danych
cd NetFilmx_Web
dotnet ef database update

# 3. Uruchomienie
dotnet run
```

*Zalogowanie do panelu administratora (wymaga dodania testowego konta za pomocą dostępnych skryptów SQL).*

## Architektura Wdrożenia (DevOps)

Aplikacja jest wdrażana na produkcyjny VPS zgodnie z podejściem Zero-Trust:
1. Docker + Docker Compose.
2. Ukrycie IP serwera przez Cloudflare (Orange Cloud).
3. Reverse Proxy w postaci Nginx Proxy Manager.
4. Deploy w ramach zamkniętej sieci Tailscale wyzwalany bezpośrednio z GitHub Actions.
