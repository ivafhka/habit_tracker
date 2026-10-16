using Habit_Tracker.Data;
using Habit_Tracker.Models;
using Habit_Tracker.Settings;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Security.Claims;

namespace Habit_Tracker.Controllers
{
    [ApiController]
    [Route("api/push")]
    public class PushController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly VapidSettings _vapid;

        public PushController(AppDbContext context, IOptions<VapidSettings> vapidOptions)
        {
            _context = context;
            _vapid = vapidOptions.Value;
        }

        private int GetUserId()
        {
            return int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        }

        // Публичный ключ нужен браузеру для подписки. Он не секретный.
        [HttpGet("public-key")]
        public IActionResult GetPublicKey()
        {
            return Ok(new { publicKey = _vapid.PublicKey });
        }

        [Authorize]
        [HttpPost("subscribe")]
        public async Task<IActionResult> Subscribe(SubscribeRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Endpoint)
                || string.IsNullOrWhiteSpace(request.Keys?.P256dh)
                || string.IsNullOrWhiteSpace(request.Keys?.Auth))
            {
                return BadRequest(new { message = "Некорректная подписка" });
            }

            var userId = GetUserId();

            var existing = await _context.PushSubscriptions
                .FirstOrDefaultAsync(x => x.Endpoint == request.Endpoint);

            if (existing != null)
                existing.UpdateKeys(userId, request.Keys.P256dh, request.Keys.Auth);
            else
                _context.PushSubscriptions.Add(
                    new UserPushSubscription(userId, request.Endpoint, request.Keys.P256dh, request.Keys.Auth));

            await _context.SaveChangesAsync();
            return Ok(new { message = "Уведомления включены" });
        }

        [Authorize]
        [HttpPost("unsubscribe")]
        public async Task<IActionResult> Unsubscribe(UnsubscribeRequest request)
        {
            var userId = GetUserId();

            var existing = await _context.PushSubscriptions
                .FirstOrDefaultAsync(x => x.Endpoint == request.Endpoint && x.UserId == userId);

            if (existing != null)
            {
                _context.PushSubscriptions.Remove(existing);
                await _context.SaveChangesAsync();
            }

            return Ok(new { message = "Уведомления отключены" });
        }

        public record SubscribeRequest(string Endpoint, SubscriptionKeys Keys);
        public record SubscriptionKeys(string P256dh, string Auth);
        public record UnsubscribeRequest(string Endpoint);
    }
}