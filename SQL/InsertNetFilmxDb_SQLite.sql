-- Wstawianie rekordów do tabeli users
INSERT INTO Users (Username, Email, PasswordHash, CreatedAt, UpdatedAt)
VALUES 
('john_doe', 'john@example.com', 'hashedpassword123', datetime('now'), datetime('now')),
('jane_smith', 'jane@example.com', 'hashedpassword456', datetime('now'), datetime('now')),
('alice_wonder', 'alice@example.com', 'hashedpassword789', datetime('now'), datetime('now'));

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
INSERT INTO Series (Name, Price, Description, CreatedAt, UpdatedAt)
VALUES 
('Series 1', 19.99, 'First series', datetime('now'), datetime('now')),
('Series 2', 24.99, 'Second series', datetime('now'), datetime('now')),
('Series 3', 29.99, 'Third series', datetime('now'), datetime('now'));

-- Wstawianie rekordów do tabeli videos
INSERT INTO Videos (Title, Description, Price, VideoUrl, ThumbnailUrl, Views, CreatedAt, UpdatedAt)
VALUES 
('Video 1', 'First video description', 4.99, 'https://www.youtube.com/watch?v=5kozt0uDa4c', 'https://i.ytimg.com/vi/5kozt0uDa4c/hqdefault.jpg?sqp=-oaymwEbCKgBEF5IVfKriqkDDggBFQAAiEIYAXABwAEG\u0026rs=AOn4CLCY6jwMkYEkVikHjNGKdocMX6RFJg', 100, datetime('now'), datetime('now')),
('Video 2', 'Second video description', 5.99, 'https://www.youtube.com/watch?v=Zv11L-ZfrSg', 'https://i.ytimg.com/vi/Zv11L-ZfrSg/hqdefault.jpg?sqp=-oaymwEbCKgBEF5IVfKriqkDDggBFQAAiEIYAXABwAEG\u0026rs=AOn4CLB0dDN2i9Pfn-M4oJsvZWmuRxumUA', 200, datetime('now'), datetime('now')),
('Video 3', 'Third video description', 6.99, 'https://www.youtube.com/watch?v=oRDRfikj2z8', 'https://i.ytimg.com/vi/oRDRfikj2z8/hqdefault.jpg?sqp=-oaymwEbCKgBEF5IVfKriqkDDggBFQAAiEIYAXABwAEG\u0026rs=AOn4CLBHPvBaFuF4cioIuImk6WumMXetWQ', 300, datetime('now'), datetime('now'));

-- Wstawianie rekordów do tabeli video_tags
INSERT INTO VideoTag (TagId, VideoId)
VALUES 
((SELECT id FROM Tags WHERE name = 'Exciting'), (SELECT id FROM Videos WHERE title = 'Video 1')),
((SELECT id FROM Tags WHERE name = 'Funny'), (SELECT id FROM Videos WHERE title = 'Video 2')),
((SELECT id FROM Tags WHERE name = 'Sad'), (SELECT id FROM Videos WHERE title = 'Video 3'));

-- Wstawianie rekordów do tabeli video_series
INSERT INTO VideoSeries (SeriesId, VideoId)
VALUES 
((SELECT id FROM Series WHERE name = 'Series 1'), (SELECT id FROM Videos WHERE title = 'Video 1')),
((SELECT id FROM Series WHERE name = 'Series 2'), (SELECT id FROM Videos WHERE title = 'Video 2')),
((SELECT id FROM Series WHERE name = 'Series 3'), (SELECT id FROM Videos WHERE title = 'Video 3'));

-- Wstawianie rekordów do tabeli video_categories
INSERT INTO VideoCategory (VideoId, CategoryId)
VALUES 
((SELECT id FROM Videos WHERE title = 'Video 1'), (SELECT id FROM Categories WHERE name = 'Action')),
((SELECT id FROM Videos WHERE title = 'Video 2'), (SELECT id FROM Categories WHERE name = 'Comedy')),
((SELECT id FROM Videos WHERE title = 'Video 3'), (SELECT id FROM Categories WHERE name = 'Drama'));

-- Wstawianie rekordów do tabeli comments
INSERT INTO Comments (VideoId, UserId, Content, CreatedAt, UpdatedAt)
VALUES 
((SELECT id FROM Videos WHERE title = 'Video 1'), (SELECT id FROM Users WHERE username = 'john_doe'), 'Great video!', datetime('now'), datetime('now')),
((SELECT id FROM Videos WHERE title = 'Video 2'), (SELECT id FROM Users WHERE username = 'jane_smith'), 'Very funny!', datetime('now'), datetime('now')),
((SELECT id FROM Videos WHERE title = 'Video 3'), (SELECT id FROM Users WHERE username = 'alice_wonder'), 'So sad!', datetime('now'), datetime('now'));

-- Wstawianie rekordów do tabeli likes
INSERT INTO Likes (VideoId, UserId, CreatedAt)
VALUES 
((SELECT id FROM Videos WHERE title = 'Video 1'), (SELECT id FROM Users WHERE username = 'john_doe'), datetime('now')),
((SELECT id FROM Videos WHERE title = 'Video 2'), (SELECT id FROM Users WHERE username = 'jane_smith'), datetime('now')),
((SELECT id FROM Videos WHERE title = 'Video 3'), (SELECT id FROM Users WHERE username = 'alice_wonder'), datetime('now'));
