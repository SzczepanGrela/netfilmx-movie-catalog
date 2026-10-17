using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NetFilmx_Storage.Migrations;

public partial class DurableUploadIntent : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // The historical snapshot contained PostgreSQL type names. Correcting the
        // SQLite snapshot must not rewrite every existing SQLite table/column.
        migrationBuilder.AddColumn<string>("SourceUploadId", "Videos", type: "TEXT", maxLength: 32, nullable: true);
        migrationBuilder.AddColumn<string>("UploadJobId", "Videos", type: "TEXT", maxLength: 100, nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn("SourceUploadId", "Videos");
        migrationBuilder.DropColumn("UploadJobId", "Videos");
    }
}
