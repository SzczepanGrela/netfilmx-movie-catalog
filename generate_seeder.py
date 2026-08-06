#!/usr/bin/env python3
import json
from pathlib import Path

def generate_seeder(manifest_path, output_path):
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    cdn_base = manifest.get("cdn_base", "https://netfilmx-assets.grela.dev")

    # Accumulators for generated C# strings
    videos_cs = []
    series_cs = []
    bundles_cs = []
    video_series_links = [] # { VideoId, SeriesId }
    bundle_video_links = [] # { BundleId, VideoId }
    bundle_series_links = [] # { BundleId, SeriesId }

    video_map = {} # slug -> id
    series_map = {} # slug -> id
    
    # Base ID counters
    v_id = 1
    s_id = 1
    b_id = 1

    def to_str(val):
        if val is None:
            return "null"
        val = str(val).replace('"', '\\"')
        return f'"{val}"'
    
    def to_url(path):
        if not path:
            return "null"
        return to_str(f"{cdn_base}{path}")
    
    def to_int(val):
        return str(val) if val is not None else "null"

    # --- Videos ---
    for v in manifest.get("videos", []):
        video_map[v["slug"]] = v_id
        
        title = to_str(v["title"])
        desc = to_str(v["description"])
        price = f'{v.get("price_credits", 50)}m'
        
        # cdn_paths
        paths = v.get("cdn_paths", {})
        video_url = to_str(paths.get("video"))
        poster_url = to_url(paths.get("poster"))
        backdrop_url = to_url(paths.get("backdrop"))
        
        year = to_int(v.get("year"))
        duration = to_int(v.get("duration_minutes"))
        director = to_str(v.get("director"))
        cast = to_str(v.get("cast"))
        age = to_str(v.get("age_rating"))
        badge = to_str(v.get("quality_badge"))
        warning = to_str(v.get("maturity_warning"))

        cs = f"""                new Video
                {{
                    Id = {v_id},
                    Title = {title},
                    Description = {desc},
                    Price = {price},
                    VideoUrl = {video_url} ?? "missing",
                    ThumbnailUrl = {poster_url} ?? "missing",
                    BackdropUrl = {backdrop_url},
                    ReleaseYear = {year},
                    DurationMinutes = {duration},
                    Director = {director},
                    Cast = {cast},
                    AgeRating = {age},
                    QualityBadge = {badge},
                    MaturityWarning = {warning},
                    CreatedAt = new DateTime(2025, 1, 1),
                    UpdatedAt = new DateTime(2025, 1, 1)
                }}"""
        videos_cs.append(cs)
        v_id += 1

    # --- Series & Episodes (also as Videos) ---
    for s in manifest.get("series", []):
        series_map[s["slug"]] = s_id
        
        s_title = to_str(s.get("name") or s.get("title"))
        s_desc = to_str(s["description"])
        s_price = f'{s.get("price_credits", 250)}m'
        
        s_paths = s.get("cdn_paths", {})
        s_poster = to_url(s_paths.get("poster"))
        s_backdrop = to_url(s_paths.get("backdrop"))
        
        s_year = to_int(s.get("year"))
        s_director = to_str(s.get("director"))
        s_cast = to_str(s.get("cast"))
        s_age = to_str(s.get("age_rating"))
        s_badge = to_str(s.get("quality_badge"))

        cs = f"""                new Series
                {{
                    Id = {s_id},
                    Name = {s_title},
                    Description = {s_desc},
                    Price = {s_price},
                    PosterUrl = {s_poster},
                    BackdropUrl = {s_backdrop},
                    ReleaseYear = {s_year},
                    Director = {s_director},
                    Cast = {s_cast},
                    AgeRating = {s_age},
                    QualityBadge = {s_badge},
                    CreatedAt = new DateTime(2025, 1, 1),
                    UpdatedAt = new DateTime(2025, 1, 1)
                }}"""
        series_cs.append(cs)

        # Process Episodes as Videos
        for ep in s.get("episodes", []):
            video_map[ep["slug"]] = v_id
            ep_title = to_str(ep["title"])
            ep_desc = to_str(ep["description"])
            ep_price = f'{ep.get("price_credits", 50)}m'
            
            paths = ep.get("cdn_paths", {})
            video_url = to_str(paths.get("video"))
            poster_url = to_url(paths.get("poster"))
            backdrop_url = to_url(paths.get("backdrop"))
            
            year = to_int(ep.get("year"))
            duration = to_int(ep.get("duration_minutes"))
            director = to_str(ep.get("director"))
            cast = to_str(ep.get("cast"))
            age = to_str(ep.get("age_rating"))
            badge = to_str(ep.get("quality_badge"))
            warning = to_str(ep.get("maturity_warning"))

            v_cs = f"""                new Video
                {{
                    Id = {v_id},
                    Title = {ep_title},
                    Description = {ep_desc},
                    Price = {ep_price},
                    VideoUrl = {video_url} ?? "missing",
                    ThumbnailUrl = {poster_url} ?? "missing",
                    BackdropUrl = {backdrop_url},
                    ReleaseYear = {year},
                    DurationMinutes = {duration},
                    Director = {director},
                    Cast = {cast},
                    AgeRating = {age},
                    QualityBadge = {badge},
                    MaturityWarning = {warning},
                    CreatedAt = new DateTime(2025, 1, 1),
                    UpdatedAt = new DateTime(2025, 1, 1)
                }}"""
            videos_cs.append(v_cs)
            
            # Link Video to Series
            video_series_links.append(f"                new {{ VideosId = {v_id}, SeriesId = {s_id} }}")
            
            v_id += 1

        s_id += 1

    # --- Bundles ---
    for b in manifest.get("bundles", []):
        b_title = to_str(b.get("name"))
        b_desc = to_str(b.get("description"))
        b_price = f'{b.get("price", 600)}m'
        
        # We can just pick the poster/backdrop of the first video for the bundle
        first_video_slug = b.get("videos", [None])[0]
        # or just leave them null if we don't have bundle-specific assets
        
        cs = f"""                new Bundle
                {{
                    Id = {b_id},
                    Name = {b_title},
                    Description = {b_desc},
                    Price = {b_price},
                    CreatedAt = new DateTime(2025, 1, 1),
                    UpdatedAt = new DateTime(2025, 1, 1)
                }}"""
        bundles_cs.append(cs)

        # Bundle-Video Links
        for vs in b.get("videos", []):
            vid = video_map.get(vs)
            if vid:
                bundle_video_links.append(f"                new {{ BundlesId = {b_id}, VideosId = {vid} }}")

        # Bundle-Series Links
        for ss in b.get("series", []):
            sid = series_map.get(ss)
            if sid:
                bundle_series_links.append(f"                new {{ BundlesId = {b_id}, SeriesId = {sid} }}")
                
        b_id += 1


    # Join blocks
    videos_str = ",\n".join(videos_cs)
    series_str = ",\n".join(series_cs)
    bundles_str = ",\n".join(bundles_cs)
    vs_links_str = ",\n".join(video_series_links)
    bv_links_str = ",\n".join(bundle_video_links)
    bs_links_str = ",\n".join(bundle_series_links)

    # Generate full DataSeeder.cs content
    content = f"""using Microsoft.EntityFrameworkCore;
using NetFilmx_Storage.Entities;
using System;

namespace NetFilmx_Storage.Context
{{
    public static class DataSeeder
    {{
        public static void SeedData(ModelBuilder modelBuilder)
        {{
            var videos = new[]
            {{
{videos_str}
            }};

            var series = new[]
            {{
{series_str}
            }};

            var bundles = new[]
            {{
{bundles_str}
            }};

            modelBuilder.Entity<Video>().HasData(videos);
            modelBuilder.Entity<Series>().HasData(series);
            modelBuilder.Entity<Bundle>().HasData(bundles);

            // Junction tables (Implicit Many-to-Many)
            // Assuming EF Core default conventions for implicit many-to-many junction tables
            
            var videoSeries = new[]
            {{
{vs_links_str}
            }};
            
            var bundleVideos = new[]
            {{
{bv_links_str}
            }};
            
            var bundleSeries = new[]
            {{
{bs_links_str}
            }};

            modelBuilder.Entity("SeriesVideo").HasData(videoSeries);
            modelBuilder.Entity("BundleVideo").HasData(bundleVideos);
            modelBuilder.Entity("BundleSeries").HasData(bundleSeries);
            
            // Add some base users
            var users = new[]
            {{
                new User {{ Id = 1, Username = "Admin", Email = "admin@netfilmx.pl", PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123"), CreatedAt = new DateTime(2025, 1, 1), UpdatedAt = new DateTime(2025, 1, 1) }},
                new User {{ Id = 2, Username = "User", Email = "user@netfilmx.pl", PasswordHash = BCrypt.Net.BCrypt.HashPassword("User123"), CreatedAt = new DateTime(2025, 1, 1), UpdatedAt = new DateTime(2025, 1, 1) }},
            }};
            modelBuilder.Entity<User>().HasData(users);
        }}
    }}
}}
"""

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(content)

if __name__ == "__main__":
    generate_seeder("r2_assets/manifest.json", "NetFilmx_Storage/Context/DataSeeder.cs")
