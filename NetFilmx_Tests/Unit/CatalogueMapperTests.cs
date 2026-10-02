using System.Reflection;
using System.Runtime.CompilerServices;
using NetFilmx_Service.Dtos.User;
using NetFilmx_Service.Dtos.Video;
using NetFilmx_Service.Mappings;
using NetFilmx_Storage.Entities;

namespace NetFilmx_Tests.Unit;

public sealed class CatalogueMapperTests
{
    // Generic query handlers select DTOs at runtime. Cover every public DTO contract,
    // including the two purchase list views missing from the old profiles.
    public static IEnumerable<object[]> DtoContracts() => typeof(VideoCardDto).Assembly.GetTypes()
        .Where(t => t.IsClass && !t.IsAbstract && t.Namespace?.StartsWith("NetFilmx_Service.Dtos.") == true)
        .Select(t => new object[] { t });

    [Theory]
    [MemberData(nameof(DtoContracts))]
    public void AllDtoContracts_PreserveScalarValues_WithoutRequiringLoadedRelations(Type dtoType)
    {
        var entityName = dtoType.Namespace!.Split('.').Last();
        var entityType = typeof(Video).Assembly.GetType("NetFilmx_Storage.Entities." + entityName)!;
        var entity = RuntimeHelpers.GetUninitializedObject(entityType);
        var number = 10;
        foreach (var property in entityType.GetProperties().Where(p => p.SetMethod?.IsPublic == true))
        {
            var type = Nullable.GetUnderlyingType(property.PropertyType) ?? property.PropertyType;
            object? value = type == typeof(string) ? property.Name + "-test-value"
                : type == typeof(int) ? ++number
                : type == typeof(decimal) ? 12.34m
                : type == typeof(DateTime) ? new DateTime(2026, 1, 2, 3, 4, 5, DateTimeKind.Utc)
                : null;
            if (value != null) property.SetValue(entity, value);
        }
        // Navigation properties remain null, as with unloaded data; mapping must not walk them.
        var mapper = new CatalogueMapper();
        var dto = typeof(CatalogueMapper).GetMethod(nameof(CatalogueMapper.Map))!
            .MakeGenericMethod(dtoType).Invoke(mapper, new[] { entity });
        foreach (var property in dtoType.GetProperties())
        {
            if (property.Name == "Password") Assert.Equal(string.Empty, property.GetValue(dto));
            else Assert.Equal(entityType.GetProperty(property.Name)!.GetValue(entity), property.GetValue(dto));
        }
    }

    [Fact]
    public void UserFormsNeverReceiveStoredPasswordHash()
    {
        var user = new User("member", "member@example.test", "NOT-A-REAL-HASH") { Id = 42 };
        var mapper = new CatalogueMapper();
        Assert.Empty(mapper.Map<UserPasswordDto>(user).Password);
        Assert.Empty(mapper.Map<UserAddDto>(user).Password);
        Assert.Equal(42, mapper.Map<UserPasswordDto>(user).Id);
        Assert.Throws<NotSupportedException>(() => mapper.Map<UserSession>(user));
    }

    [Fact]
    public void MappingMaintainsQueryOrderingAndLeavesMediaReferencesUnchanged()
    {
        var first = new Video("First", null!, 1.23m, "https://media.example.test/retained/master.m3u8", "/cover.jpg") { Id = 50 };
        var second = new Video("Second", "description", 0, "https://media.example.test/older.mp4", "/other.jpg") { Id = 2 };
        var result = new CatalogueMapper().MapList<VideoCardDto>(new[] { first, second });
        Assert.Equal(new[] { 50, 2 }, result.Select(v => v.Id));
        Assert.Equal(first.VideoUrl, result[0].VideoUrl);
        Assert.Equal(second.VideoUrl, result[1].VideoUrl);
        Assert.Null(result[0].Description);
        Assert.Empty(new CatalogueMapper().MapList<VideoCardDto>(Array.Empty<Video>()));
    }
}
