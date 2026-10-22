ARG CANDIDATE_IMAGE
FROM ${CANDIDATE_IMAGE} AS candidate
FROM mcr.microsoft.com/dotnet/sdk:10.0.401-noble@sha256:e70cdb7f80b0348f5cb85f19a8f670fca061f033d57eed12fa003d58b0e06317 AS tools
WORKDIR /tools
COPY --from=candidate /app/*.dll /candidate/
COPY qualification/CatalogueRecovery/ ./
RUN mkdir /empty-feed && dotnet restore --source /empty-feed \
    && dotnet publish --no-restore -c Release -o /qualification
FROM candidate
COPY --from=tools /qualification /qualification
ENTRYPOINT ["dotnet", "/qualification/CatalogueRecovery.dll"]
