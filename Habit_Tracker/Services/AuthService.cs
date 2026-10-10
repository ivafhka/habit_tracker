using Habit_Tracker.Data;
using Habit_Tracker.Models;
using Habit_Tracker.Settings;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.IdentityModel.Tokens.Jwt; 
using Microsoft.IdentityModel.Tokens;   
using System.Security.Claims;          
using System.Text;

namespace Habit_Tracker.Services
{
    public class AuthService
    {
        private readonly AppDbContext _context;
        private readonly JwtSettings _jwtSettings;

        public AuthService(AppDbContext context, IOptions<JwtSettings> jwtOptions)
        {
            _context = context;
            _jwtSettings = jwtOptions.Value;
        }

        public async Task<string> RegisterAsync(string name,string email,string password)
        {
            var exist = await _context.Users.AnyAsync(x => x.Email == email);
            if (exist)
                throw new Exception("Такой пользватель уже существует");
            var passwordHash = BCrypt.Net.BCrypt.HashPassword(password);
            var user = new User(name, email, passwordHash);
            _context.Add(user);
            await _context.SaveChangesAsync();
            return GenerateJwtToken(user);
        }
        public async Task<string> LoginAsync(string email,string passsword)
        {
            var user = await _context.Users.FirstOrDefaultAsync(x => x.Email == email);
            if (user == null)
                throw new Exception("Такого пользователя не существует");
            var valid = BCrypt.Net.BCrypt.Verify(passsword, user.PasswordHash);
            if (!valid)
                throw new Exception("Неверный логин или пароль");
            return GenerateJwtToken(user);
        }

        private string GenerateJwtToken(User user)
        {
            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(_jwtSettings.Secret));
            if (string.IsNullOrEmpty(_jwtSettings.Secret))
                throw new Exception("JWT Secret пустой");
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub,user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email,user.Email),
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString())
            };
            var token = new JwtSecurityToken(
                issuer: _jwtSettings.Issuer,
                audience: _jwtSettings.Audience,
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(_jwtSettings.ExpirationMinutes),
                signingCredentials: creds);
            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        public async Task<User?> GetUserAsync(int id)
        {
            return await _context.Users.FindAsync(id);
        } 
    }
}
