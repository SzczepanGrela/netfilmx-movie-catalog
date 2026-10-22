using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NetFilmx_Storage.Migrations
{
    /// <inheritdoc />
    public partial class AddPremiumMetadata : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AgeRating",
                table: "Videos",
                type: "TEXT",
                maxLength: 10,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BackdropUrl",
                table: "Videos",
                type: "TEXT",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Cast",
                table: "Videos",
                type: "TEXT",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Director",
                table: "Videos",
                type: "TEXT",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DurationMinutes",
                table: "Videos",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LogoUrl",
                table: "Videos",
                type: "TEXT",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MaturityWarning",
                table: "Videos",
                type: "TEXT",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "QualityBadge",
                table: "Videos",
                type: "TEXT",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ReleaseYear",
                table: "Videos",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TrailerUrl",
                table: "Videos",
                type: "TEXT",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AgeRating",
                table: "Series",
                type: "TEXT",
                maxLength: 10,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BackdropUrl",
                table: "Series",
                type: "TEXT",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Cast",
                table: "Series",
                type: "TEXT",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Director",
                table: "Series",
                type: "TEXT",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LogoUrl",
                table: "Series",
                type: "TEXT",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MaturityWarning",
                table: "Series",
                type: "TEXT",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PosterUrl",
                table: "Series",
                type: "TEXT",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "QualityBadge",
                table: "Series",
                type: "TEXT",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ReleaseYear",
                table: "Series",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TrailerUrl",
                table: "Series",
                type: "TEXT",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BackdropUrl",
                table: "Bundles",
                type: "TEXT",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LogoUrl",
                table: "Bundles",
                type: "TEXT",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PosterUrl",
                table: "Bundles",
                type: "TEXT",
                maxLength: 500,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AgeRating",
                table: "Videos");

            migrationBuilder.DropColumn(
                name: "BackdropUrl",
                table: "Videos");

            migrationBuilder.DropColumn(
                name: "Cast",
                table: "Videos");

            migrationBuilder.DropColumn(
                name: "Director",
                table: "Videos");

            migrationBuilder.DropColumn(
                name: "DurationMinutes",
                table: "Videos");

            migrationBuilder.DropColumn(
                name: "LogoUrl",
                table: "Videos");

            migrationBuilder.DropColumn(
                name: "MaturityWarning",
                table: "Videos");

            migrationBuilder.DropColumn(
                name: "QualityBadge",
                table: "Videos");

            migrationBuilder.DropColumn(
                name: "ReleaseYear",
                table: "Videos");

            migrationBuilder.DropColumn(
                name: "TrailerUrl",
                table: "Videos");

            migrationBuilder.DropColumn(
                name: "AgeRating",
                table: "Series");

            migrationBuilder.DropColumn(
                name: "BackdropUrl",
                table: "Series");

            migrationBuilder.DropColumn(
                name: "Cast",
                table: "Series");

            migrationBuilder.DropColumn(
                name: "Director",
                table: "Series");

            migrationBuilder.DropColumn(
                name: "LogoUrl",
                table: "Series");

            migrationBuilder.DropColumn(
                name: "MaturityWarning",
                table: "Series");

            migrationBuilder.DropColumn(
                name: "PosterUrl",
                table: "Series");

            migrationBuilder.DropColumn(
                name: "QualityBadge",
                table: "Series");

            migrationBuilder.DropColumn(
                name: "ReleaseYear",
                table: "Series");

            migrationBuilder.DropColumn(
                name: "TrailerUrl",
                table: "Series");

            migrationBuilder.DropColumn(
                name: "BackdropUrl",
                table: "Bundles");

            migrationBuilder.DropColumn(
                name: "LogoUrl",
                table: "Bundles");

            migrationBuilder.DropColumn(
                name: "PosterUrl",
                table: "Bundles");
        }
    }
}
