using MeetSign.Application.Interfaces;
using MeetSign.Infrastructure.Data;
using MeetSign.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace MeetSign.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<AppDbContext>(options =>
            options.UseSqlServer(configuration.GetConnectionString("Default")));

        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IEventService, EventService>();
        services.AddScoped<ISessionService, SessionService>();
        services.AddScoped<ICheckInService, CheckInService>();
        services.AddScoped<IAttendeeImportService, AttendeeImportService>();
        services.AddSingleton<IJwtTokenService, JwtTokenService>();
        services.AddSingleton<IQrCodeService, QrCodeService>();
        services.AddScoped<IFileStorageService, AzureBlobStorageService>();

        return services;
    }
}
