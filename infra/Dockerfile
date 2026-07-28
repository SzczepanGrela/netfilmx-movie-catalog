# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore "NetFilmx_Web/NetFilmx_Web.csproj"
RUN dotnet publish "NetFilmx_Web/NetFilmx_Web.csproj" \
    -c Release -o /app/publish

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
RUN adduser --disabled-password --no-create-home appuser
COPY --from=build /app/publish .
RUN mkdir -p /app/data && chown -R appuser:appuser /app
USER appuser
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "NetFilmx_Web.dll"]
