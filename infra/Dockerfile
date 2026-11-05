# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:10.0.401-noble@sha256:e70cdb7f80b0348f5cb85f19a8f670fca061f033d57eed12fa003d58b0e06317 AS build
WORKDIR /src
COPY . .
RUN dotnet restore "NetFilmx_Web/NetFilmx_Web.csproj" --locked-mode
ARG RELEASE_REVISION=development
RUN dotnet publish "NetFilmx_Web/NetFilmx_Web.csproj" \
    --no-restore -c Release -o /app/publish \
    -p:InformationalVersion="1.0.0+${RELEASE_REVISION}" -p:IncludeSourceRevisionInInformationalVersion=false

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0.14-noble@sha256:de0ee358cdd672f7017a003bed21e9ac9ed48a27c922a59b18175b6e82fa7fee AS runtime
WORKDIR /app
# Refresh APT security packages as well as media tools. Disable retries while
# the base image's APT client may still be affected by CVE-2026-109518.
RUN apt-get -o Acquire::Retries=0 update \
    && apt-get -o Acquire::Retries=0 install -y --no-install-recommends apt libapt-pkg6.0t64 ffmpeg \
    && rm -rf /var/lib/apt/lists/*
RUN groupadd --gid 10001 appuser && useradd --uid 10001 --gid 10001 --no-create-home appuser
COPY --from=build /app/publish .
RUN mkdir -p /app/data && chown -R appuser:appuser /app
USER appuser
ARG RELEASE_REVISION=development
LABEL org.opencontainers.image.source="https://github.com/SzczepanGrela/netfilmx-movie-catalog" \
    org.opencontainers.image.revision="${RELEASE_REVISION}"
ENV ASPNETCORE_URLS=http://+:8080 ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080
HEALTHCHECK --interval=5s --timeout=5s --start-period=10s --retries=10 \
    CMD ["dotnet", "NetFilmx_Web.dll", "healthcheck"]
STOPSIGNAL SIGTERM
ENTRYPOINT ["dotnet", "NetFilmx_Web.dll"]
