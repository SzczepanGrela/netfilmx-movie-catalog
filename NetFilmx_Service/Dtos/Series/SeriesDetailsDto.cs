namespace NetFilmx_Service.Dtos.Series
{
    public class SeriesDetailsDto : ISeriesDto
    {

        public SeriesDetailsDto(int id, string name, string? description, decimal price, DateTime createdAt, DateTime updatedAt)
        {
            Id = id;
            Name = name;
            Description = description;
            Price = price;
            CreatedAt = createdAt;
            UpdatedAt = updatedAt;
        }

        public string Name { get; }

        public int Id { get; }

        public string? Description { get; }

        public decimal Price { get; }

        public DateTime CreatedAt { get; }

        public DateTime UpdatedAt { get; }


    }
}
