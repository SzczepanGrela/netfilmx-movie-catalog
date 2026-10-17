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
FROM mcr.microsoft.com/dotnet/aspnet:10.0.13-noble@sha256:d5633778c754e89a386882eddf8dbee6942447a8a4b8267c19cf1e1158d0b0ac AS runtime
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
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
