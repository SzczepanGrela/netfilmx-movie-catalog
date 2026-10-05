using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NetFilmx_Storage.PostgreSql.Migrations
{
    /// <inheritdoc />
    public partial class DurableUploadIntent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SourceUploadId",
                table: "Videos",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UploadJobId",
                table: "Videos",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SourceUploadId",
                table: "Videos");

            migrationBuilder.DropColumn(
                name: "UploadJobId",
                table: "Videos");
        }
    }
}
