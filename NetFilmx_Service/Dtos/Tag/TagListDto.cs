namespace NetFilmx_Service.Dtos.Tag
{
    public class TagListDto : ITagDto
    {
        public TagListDto(string name, int id)
        {
            Name = name;
            Id = id;
        }
        public string Name { get; }

        public int Id { get; }

    }
}
