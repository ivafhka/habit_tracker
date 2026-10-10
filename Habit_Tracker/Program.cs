using Habit_Tracker.Data;
using Habit_Tracker.Services;
using Habit_Tracker.Settings;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);


builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));


builder.Services.Configure<JwtSettings>(
    builder.Configuration.GetSection("JwtSettings"));

var jwtSection = builder.Configuration.GetSection("JwtSettings");
var secret = jwtSection["Secret"];

if (string.IsNullOrEmpty(secret))
    throw new Exception("JWT Secret пустой! Проверь appsettings.json");

var key = Encoding.UTF8.GetBytes(secret);


builder.Services.AddAuthentication(opt =>
{
    opt.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    opt.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(opt =>
{
    opt.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateIssuerSigningKey = true,
        ValidateLifetime = true,

        ValidIssuer = jwtSection["Issuer"],
        ValidAudience = jwtSection["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(key)
    };
});

builder.Services.AddAuthorization();

// ✅ ЗАМЕНА REDIS НА IN-MEMORY CACHE
// Закомментируйте Redis:
// builder.Services.AddStackExchangeRedisCache(opt =>
// {
//     opt.Configuration = "localhost:6379";
//     opt.InstanceName = "HabitTracker";
// });

// Добавьте встроенный InMemory кэш:
builder.Services.AddDistributedMemoryCache();

// Сервисы остаются без изменений
builder.Services.AddScoped<AuthService>();
builder.Services.AddTransient<HabitService>();
builder.Services.AddScoped<DashboardService>();
builder.Services.AddScoped<StatisticsService>();
builder.Services.AddScoped<RedisCacheService>(); // ← Работает с IDistributedCache
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });
builder.Services.AddEndpointsApiExplorer();
var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();