using System.Security.Claims;
using System.Text;
using System.Text.Json.Serialization;
using MeetSign.Infrastructure;
using MeetSign.Infrastructure.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.AddSimpleConsole(options =>
{
    options.SingleLine = true;
    options.TimestampFormat = "yyyy-MM-dd HH:mm:ss ";
    options.IncludeScopes = true;
});

builder.Services.AddHttpLogging(options =>
{
    options.LoggingFields = Microsoft.AspNetCore.HttpLogging.HttpLoggingFields.RequestMethod
        | Microsoft.AspNetCore.HttpLogging.HttpLoggingFields.RequestPath
        | Microsoft.AspNetCore.HttpLogging.HttpLoggingFields.ResponseStatusCode
        | Microsoft.AspNetCore.HttpLogging.HttpLoggingFields.Duration;
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });
builder.Services.AddOpenApi();
builder.Services.AddInfrastructure(builder.Configuration);

var jwtSecret = builder.Configuration["Jwt:Secret"] ?? "MeetSign-Dev-Secret-Key-At-Least-32-Chars!";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "MeetSign";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtIssuer,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };
    });

builder.Services.AddAuthorization();

if (builder.Environment.IsDevelopment())
{
    builder.Services.AddCors(options =>
    {
        options.AddDefaultPolicy(policy =>
        {
            policy.WithOrigins(
                    "http://localhost:5173",
                    "http://localhost:5174")
                .AllowAnyHeader()
                .AllowAnyMethod();
        });
    });
}

var app = builder.Build();
var logger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("Startup");
var runtimeVersion = System.Runtime.InteropServices.RuntimeInformation.FrameworkDescription;

logger.LogInformation(
    "MeetSign API starting. Environment={Environment}, Runtime={Runtime}, ContentRoot={ContentRoot}",
    app.Environment.EnvironmentName,
    runtimeVersion,
    app.Environment.ContentRootPath);

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler(errorApp =>
    {
        errorApp.Run(async context =>
        {
            var feature = context.Features.Get<IExceptionHandlerFeature>();
            if (feature?.Error is { } ex)
            {
                var log = context.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("UnhandledException");
                log.LogError(ex, "Unhandled exception: {Method} {Path}", context.Request.Method, context.Request.Path);
            }

            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await context.Response.WriteAsJsonAsync(new { message = "服务器内部错误。" });
        });
    });
}

var dbHealthy = false;
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try
    {
        dbHealthy = db.Database.CanConnect();
        if (dbHealthy)
        {
            var pending = db.Database.GetPendingMigrations().ToList();
            if (pending.Count > 0)
            {
                logger.LogInformation("Applying {Count} pending migrations: {Migrations}", pending.Count, string.Join(", ", pending));
                db.Database.Migrate();
                logger.LogInformation("Database migration completed.");
            }
            else
            {
                logger.LogInformation("Database is up to date.");
            }
        }
        else
        {
            logger.LogWarning("Database CanConnect returned false at startup.");
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Database check failed at startup; API will start but database features may be unavailable.");
    }
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpLogging();
app.UseStaticFiles();
if (app.Environment.IsDevelopment())
    app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/api/health", () => Results.Ok(new
{
    status = "ok",
    environment = app.Environment.EnvironmentName,
    runtime = runtimeVersion,
    database = dbHealthy ? "connected" : "unavailable",
    timestamp = DateTimeOffset.UtcNow
}));

app.MapControllers();

app.MapFallbackToFile("/checkin/{*path:nonfile}", "checkin/index.html");
app.MapFallbackToFile("{*path:nonfile}", "index.html");

logger.LogInformation("MeetSign API ready. DatabaseHealthy={DatabaseHealthy}", dbHealthy);

app.Run();
