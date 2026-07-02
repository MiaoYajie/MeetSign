using MeetSign.Application.DTOs.Auth;
using MeetSign.Application.Interfaces;
using MeetSign.Domain.Entities;
using MeetSign.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace MeetSign.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly IJwtTokenService _jwtTokenService;

    public AuthService(AppDbContext db, IJwtTokenService jwtTokenService)
    {
        _db = db;
        _jwtTokenService = jwtTokenService;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(request.Password))
            throw new InvalidOperationException("邮箱和密码不能为空。");

        if (await _db.Users.AnyAsync(u => u.Email == email, cancellationToken))
            throw new InvalidOperationException("该邮箱已注册。");

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password)
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync(cancellationToken);

        var token = _jwtTokenService.GenerateToken(user.Id, user.Email);
        return new AuthResponse(token, user.Id, user.Email);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email, cancellationToken)
            ?? throw new InvalidOperationException("邮箱或密码错误。");

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            throw new InvalidOperationException("邮箱或密码错误。");

        var token = _jwtTokenService.GenerateToken(user.Id, user.Email);
        return new AuthResponse(token, user.Id, user.Email);
    }
}
