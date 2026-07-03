using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MeetSign.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPanelConfig : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PanelConfigJson",
                table: "Sign_Events",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PanelConfigJson",
                table: "Sign_Events");
        }
    }
}
