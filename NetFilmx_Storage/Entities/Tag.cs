using NetFilmx_Storage.Entities;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NetFilmx_Storage.Entities
{
    [Table("Tags")]
    public class Tag : BaseEntity
    {
        internal Tag()
        {
            Videos = new List<Video>();
        }

        public Tag(string name) : this()
        {
            Name = name;
        }

        [Required]
        [MaxLength(100)]
        [MinLength(1)]
        public string Name { get; set; }



        public virtual ICollection<Video> Videos { get; set; }


    }
}
