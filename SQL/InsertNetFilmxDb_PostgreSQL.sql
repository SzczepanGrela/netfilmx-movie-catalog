-- NetFilmx PostgreSQL Initial Seed Data (Bilingual: EN & PL, Adaptive HLS)

-- 1. Users (Admin & User with Argon2id passwords)
INSERT INTO "Users" ("Id", "Username", "Email", "PasswordHash", "Role", "Balance", "CreatedAt", "UpdatedAt") VALUES 
(1, 'Admin', 'admin@netfilmx.pl', '$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHQxMjM0NTY3OA==$Kx2iO1jN8dK6jX8V2kL1M4P3Q5R7S9T0U1V2W3X4Y5Z=', 1, 0.0, NOW(), NOW()),
(2, 'User', 'user@netfilmx.pl', '$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHQxMjM0NTY3OA==$Kx2iO1jN8dK6jX8V2kL1M4P3Q5R7S9T0U1V2W3X4Y5Z=', 0, 100.0, NOW(), NOW())
ON CONFLICT ("Id") DO NOTHING;

-- 2. Categories
INSERT INTO "Categories" ("Id", "Name", "Description") VALUES 
(1, 'Action', 'High-octane action movies and adventures'),
(2, 'Animation', 'Masterpieces of 3D animation and open source art'),
(3, 'Sci-Fi', 'Futuristic worlds, dystopian adventures and technology')
ON CONFLICT ("Id") DO NOTHING;

-- Category Translations (EN & PL)
INSERT INTO "CategoryTranslations" ("CategoryId", "LanguageCode", "Name", "Description", "CreatedAt", "UpdatedAt") VALUES 
(1, 'en', 'Action', 'High-octane action movies and adventures', NOW(), NOW()),
(1, 'pl', 'Akcja', 'Filmy pełne dynamicznej akcji i niesamowitych przygód', NOW(), NOW()),
(2, 'en', 'Animation', 'Masterpieces of 3D animation and open source art', NOW(), NOW()),
(2, 'pl', 'Animacja', 'Arcydzieła animacji 3D i sztuki open-source', NOW(), NOW()),
(3, 'en', 'Sci-Fi', 'Futuristic worlds, dystopian adventures and technology', NOW(), NOW()),
(3, 'pl', 'Sci-Fi', 'Futurystyczne światy, dystopijne przygody i zaawansowana technologia', NOW(), NOW())
ON CONFLICT ("CategoryId", "LanguageCode") DO NOTHING;

-- 3. Tags
INSERT INTO "Tags" ("Id", "Name") VALUES 
(1, 'Exciting'),
(2, 'Dragons'),
(3, 'Robots'),
(4, 'Futuristic')
ON CONFLICT ("Id") DO NOTHING;

-- Tag Translations (EN & PL)
INSERT INTO "TagTranslations" ("TagId", "LanguageCode", "Name", "CreatedAt", "UpdatedAt") VALUES 
(1, 'en', 'Exciting', NOW(), NOW()),
(1, 'pl', 'Ekscytujący', NOW(), NOW()),
(2, 'en', 'Dragons', NOW(), NOW()),
(2, 'pl', 'Smoki', NOW(), NOW()),
(3, 'en', 'Robots', NOW(), NOW()),
(3, 'pl', 'Roboty', NOW(), NOW()),
(4, 'en', 'Futuristic', NOW(), NOW()),
(4, 'pl', 'Futurystyczny', NOW(), NOW())
ON CONFLICT ("TagId", "LanguageCode") DO NOTHING;

-- 4. Series
INSERT INTO "Series" ("Id", "Name", "Price", "Description", "PosterUrl", "BackdropUrl", "ReleaseYear", "Director", "Cast", "AgeRating", "QualityBadge", "CreatedAt", "UpdatedAt") VALUES 
(1, 'Caminandes', 9.99, 'Series of animated shorts about Koro the llama in Patagonia.', 'https://netfilmx-assets.grela.dev/posters/caminandes-llamigos_poster.jpg', 'https://netfilmx-assets.grela.dev/backdrops/caminandes-llamigos_backdrop.jpg', 2013, 'Pablo Vazquez', 'Koro, Oti', '7+', 'HD', NOW(), NOW()),
(2, 'Blender Open Movies', 19.99, 'Collection of legendary open source short films by Blender Studio.', 'https://netfilmx-assets.grela.dev/posters/sintel_poster.jpg', 'https://netfilmx-assets.grela.dev/backdrops/big-buck-bunny_backdrop.png', 2010, 'Colin Levy, Ian Hubert', 'Halina Reijn, Thom Hoffman', '13+', '4K', NOW(), NOW())
ON CONFLICT ("Id") DO NOTHING;

-- Series Translations (EN & PL)
INSERT INTO "SeriesTranslations" ("SeriesId", "LanguageCode", "Name", "Description", "Director", "Cast", "CreatedAt", "UpdatedAt") VALUES 
(1, 'en', 'Caminandes', 'Charming series of animated comedy shorts following Koro the llama across harsh Patagonian landscapes.', 'Pablo Vazquez', 'Koro, Oti', NOW(), NOW()),
(1, 'pl', 'Caminandes', 'Zabawna seria krótkometrażowych animacji o przygodach sympatycznej lamy Koro w surowej Patagonii.', 'Pablo Vazquez', 'Koro, Oti', NOW(), NOW()),
(2, 'en', 'Blender Open Movies', 'A premier collection of iconic open-source animated and VFX short films created entirely with Blender.', 'Colin Levy, Ian Hubert', 'Halina Reijn, Thom Hoffman', NOW(), NOW()),
(2, 'pl', 'Blender Open Movies', 'Kolekcja kultowych filmów krótkometrażowych stworzonych w całości w darmowym programie Blender.', 'Colin Levy, Ian Hubert', 'Halina Reijn, Thom Hoffman', NOW(), NOW())
ON CONFLICT ("SeriesId", "LanguageCode") DO NOTHING;

-- 5. Videos (HLS Adaptive Master Streams)
INSERT INTO "Videos" ("Id", "Title", "Description", "Price", "VideoUrl", "ThumbnailUrl", "BackdropUrl", "Views", "DurationMinutes", "ReleaseYear", "Director", "Cast", "AgeRating", "QualityBadge", "CreatedAt", "UpdatedAt") VALUES 
(1, 'Sintel', 'A lonely warrior named Sintel searches for her stolen baby dragon friend across mountains and deserts.', 14.99, 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', 'https://netfilmx-assets.grela.dev/posters/sintel_poster.jpg', 'https://netfilmx-assets.grela.dev/backdrops/tears-of-steel_backdrop.jpg', 1500, 15, 2010, 'Colin Levy', 'Halina Reijn, Thom Hoffman', '13+', '4K', NOW(), NOW()),
(2, 'Tears of Steel', 'A group of warriors and scientists in dystopian Amsterdam attempt to avert a devastating robotic apocalypse.', 15.99, 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8', 'https://netfilmx-assets.grela.dev/posters/tears-of-steel_poster.png', 'https://netfilmx-assets.grela.dev/backdrops/tears-of-steel_backdrop.jpg', 2100, 12, 2012, 'Ian Hubert', 'Derek de Lint, Sergio Hasselbaink', '13+', '4K', NOW(), NOW()),
(3, 'Charge', 'In an old dystopian city, an aging veteran fights cybernetically augmented sentinels to power his dying companion.', 9.99, 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', 'https://netfilmx-assets.grela.dev/posters/charge_poster.jpg', 'https://netfilmx-assets.grela.dev/backdrops/charge_backdrop.jpg', 3200, 4, 2022, 'Hjalti Hjalmarsson', 'Joram van Gink', '16+', '4K HDR', NOW(), NOW())
ON CONFLICT ("Id") DO NOTHING;

-- Video Translations (EN & PL)
INSERT INTO "VideoTranslations" ("VideoId", "LanguageCode", "Title", "Description", "Director", "Cast", "CreatedAt", "UpdatedAt") VALUES 
(1, 'en', 'Sintel', 'A lonely warrior named Sintel searches for her stolen baby dragon friend Scales across treacherous lands.', 'Colin Levy', 'Halina Reijn, Thom Hoffman', NOW(), NOW()),
(1, 'pl', 'Sintel', 'Samotna wojowniczka Sintel wyrusza w niebezpieczną podróż, by odnaleźć porwanego smoka - swojego jedynego przyjaciela.', 'Colin Levy', 'Halina Reijn, Thom Hoffman', NOW(), NOW()),
(2, 'en', 'Tears of Steel', 'A dystopian sci-fi short where fighters and scientists stage a desperate last stand in old Amsterdam against robotic invaders.', 'Ian Hubert', 'Derek de Lint, Sergio Hasselbaink', NOW(), NOW()),
(2, 'pl', 'Tears of Steel', 'Grupa wojowników i naukowców w starym kościele w Amsterdamie próbuje zapobiec apokalipsie ze strony niszczycielskich robotów.', 'Ian Hubert', 'Derek de Lint, Sergio Hasselbaink', NOW(), NOW()),
(3, 'en', 'Charge', 'In a neon dystopian underworld, a desperate fighter takes on elite robotic guards for a critical power battery.', 'Hjalti Hjalmarsson', 'Joram van Gink', NOW(), NOW()),
(3, 'pl', 'Charge', 'W dystopijnej przyszłości starszy mężczyzna walczy z uzbrojonymi strażnikami o baterię zasilającą.', 'Hjalti Hjalmarsson', 'Joram van Gink', NOW(), NOW())
ON CONFLICT ("VideoId", "LanguageCode") DO NOTHING;

-- 6. Relationships (VideoCategory, VideoTag, VideoSeries)
INSERT INTO "VideoCategory" ("VideoId", "CategoryId") VALUES 
(1, 1), (1, 2),
(2, 1), (2, 3),
(3, 1), (3, 3)
ON CONFLICT DO NOTHING;

INSERT INTO "VideoTag" ("VideoId", "TagId") VALUES 
(1, 1), (1, 2),
(2, 1), (2, 3),
(3, 3), (3, 4)
ON CONFLICT DO NOTHING;

INSERT INTO "VideoSeries" ("VideoId", "SeriesId") VALUES 
(1, 2),
(2, 2),
(3, 2)
ON CONFLICT DO NOTHING;
