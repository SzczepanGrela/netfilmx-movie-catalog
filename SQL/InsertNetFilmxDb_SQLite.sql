-- Wstawianie rekordów do tabeli users
-- Użytkownicy zostali usunięci z seeda, ponieważ używamy nowego formatu Argon2id.
-- Zarejestruj się ręcznie przez interfejs użytkownika!

-- Wstawianie rekordów do tabeli categories
INSERT INTO Categories (Name, Description)
VALUES 
('Action', 'Action movies'),
('Comedy', 'Comedy movies'),
('Drama', 'Drama movies');

-- Wstawianie rekordów do tabeli tags
INSERT INTO Tags (Name)
VALUES 
('Exciting'),
('Funny'),
('Sad');

-- Wstawianie rekordów do tabeli series
INSERT INTO Series (Name, Price, Description, CreatedAt, UpdatedAt, AgeRating, QualityBadge, PosterUrl, BackdropUrl, Director, Cast, ReleaseYear)
VALUES 
('Caminandes', 9.99, 'Seria krótkometrażowych animacji opowiadających o przygodach lamy Koro w Patagonii.', datetime('now'), datetime('now'), '7+', 'HD', 'https://netfilmx-assets.grela.dev/posters/caminandes-llamigos_poster.jpg', 'https://netfilmx-assets.grela.dev/backdrops/caminandes-llamigos_backdrop.jpg', 'Pablo Vazquez', 'Koro, Oti', 2013),
('Blender Open Movies', 19.99, 'Kolekcja kultowych filmów krótkometrażowych stworzonych całkowicie za pomocą darmowego oprogramowania Blender.', datetime('now'), datetime('now'), '13+', '4K', 'https://netfilmx-assets.grela.dev/posters/sintel_poster.jpg', 'https://netfilmx-assets.grela.dev/backdrops/sintel_backdrop.png', 'Colin Levy, Ian Hubert', 'Halina Reijn, Thom Hoffman', 2010),
('Spring', 14.99, 'Baśniowa opowieść o pasterce i jej psie, którzy stawiają czoła starożytnym mocom.', datetime('now'), datetime('now'), '7+', '4K HDR', 'https://netfilmx-assets.grela.dev/posters/big-buck-bunny_poster.jpg', 'https://netfilmx-assets.grela.dev/backdrops/big-buck-bunny_backdrop.png', 'Andy Goralczyk', 'N/A', 2019);

-- Wstawianie rekordów do tabeli videos
INSERT INTO Videos (Title, Description, Price, VideoUrl, ThumbnailUrl, Views, CreatedAt, UpdatedAt, AgeRating, QualityBadge, BackdropUrl, DurationMinutes, ReleaseYear, Director, Cast)
VALUES 
('Sintel', 'Samotna wojowniczka Sintel wyrusza w niebezpieczną podróż, by odnaleźć porwanego smoka - swojego jedynego przyjaciela.', 14.99, 'https://netfilmx-assets.grela.dev/videos/sintel.mp4', 'https://netfilmx-assets.grela.dev/posters/sintel_poster.jpg', 1500, datetime('now'), datetime('now'), '13+', '4K', 'https://netfilmx-assets.grela.dev/backdrops/sintel_backdrop.png', 15, 2010, 'Colin Levy', 'Halina Reijn, Thom Hoffman'),
('Tears of Steel', 'Grupa wojowników i naukowców w starym kościele w Amsterdamie próbuje zapobiec apokalipsie ze strony niszczycielskich robotów.', 15.99, 'https://netfilmx-assets.grela.dev/videos/tears-of-steel.mp4', 'https://netfilmx-assets.grela.dev/posters/tears-of-steel_poster.png', 2100, datetime('now'), datetime('now'), '13+', '4K', 'https://netfilmx-assets.grela.dev/backdrops/tears-of-steel_backdrop.jpg', 12, 2012, 'Ian Hubert', 'Derek de Lint, Sergio Hasselbaink'),
('Charge', 'W dystopijnej przyszłości starszy mężczyzna walczy z uzbrojonymi strażnikami o baterię zasilającą.', 9.99, 'https://netfilmx-assets.grela.dev/videos/charge.webm', 'https://netfilmx-assets.grela.dev/posters/charge_poster.jpg', 3200, datetime('now'), datetime('now'), '16+', '4K HDR', 'https://netfilmx-assets.grela.dev/backdrops/charge_backdrop.jpg', 4, 2022, 'Hjalti Hjalmarsson', 'Joram van Gink');

-- Wstawianie rekordów do tabeli video_tags
INSERT INTO VideoTag (TagId, VideoId)
VALUES 
((SELECT id FROM Tags WHERE name = 'Exciting'), (SELECT id FROM Videos WHERE title = 'Sintel')),
((SELECT id FROM Tags WHERE name = 'Funny'), (SELECT id FROM Videos WHERE title = 'Tears of Steel')),
((SELECT id FROM Tags WHERE name = 'Sad'), (SELECT id FROM Videos WHERE title = 'Charge'));

-- Wstawianie rekordów do tabeli video_series
INSERT INTO VideoSeries (SeriesId, VideoId)
VALUES 
((SELECT id FROM Series WHERE name = 'Blender Open Movies'), (SELECT id FROM Videos WHERE title = 'Sintel')),
((SELECT id FROM Series WHERE name = 'Blender Open Movies'), (SELECT id FROM Videos WHERE title = 'Tears of Steel')),
((SELECT id FROM Series WHERE name = 'Blender Open Movies'), (SELECT id FROM Videos WHERE title = 'Charge'));

-- Wstawianie rekordów do tabeli video_categories
INSERT INTO VideoCategory (VideoId, CategoryId)
VALUES 
((SELECT id FROM Videos WHERE title = 'Sintel'), (SELECT id FROM Categories WHERE name = 'Action')),
((SELECT id FROM Videos WHERE title = 'Tears of Steel'), (SELECT id FROM Categories WHERE name = 'Action')),
((SELECT id FROM Videos WHERE title = 'Charge'), (SELECT id FROM Categories WHERE name = 'Action'));


