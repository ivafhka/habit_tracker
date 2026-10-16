using Habit_Tracker.Models;
using Habit_Tracker.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Habit_Tracker.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/habits")]
    public class HabitsController : ControllerBase
    {
        private readonly HabitService _habitService;

        public HabitsController(HabitService habitService)
        {
            _habitService = habitService;
        }

        private int GetUserId()
        {
            return int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        }

        [HttpPost]
        public async Task<IActionResult> Create(CreateHabitRequest request)
        {
            try
            {
                var userId = GetUserId();
                var habit = await _habitService.CreateHabitAsync(userId, request.Title, request.Frequency);
                return Ok(ToHabitResponse(habit));
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            try
            {
                var userId = GetUserId();
                var habits = await _habitService.GetUserHabitAsync(userId);
                return Ok(habits.Select(ToHabitResponse));
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> Get(int id)
        {
            try
            {
                var userId = GetUserId();
                var habit = await _habitService.GetHabitByIdAsync(id, userId);
                if (habit == null)
                    return NotFound(new { message = "Привычка не найдена" });

                return Ok(ToHabitResponse(habit));
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, UpdateHabitRequest request)
        {
            try
            {
                var userId = GetUserId();

                TimeOnly? reminderTime = null;
                if (!string.IsNullOrWhiteSpace(request.ReminderTimeUtc))
                {
                    if (!TimeOnly.TryParseExact(request.ReminderTimeUtc, "HH:mm", out var parsed))
                        return BadRequest(new { message = "Время напоминания должно быть в формате HH:mm" });
                    reminderTime = parsed;
                }

                await _habitService.UpdateHabitAsync(id, userId, request.Title, request.Frequency, reminderTime);

                var habit = await _habitService.GetHabitByIdAsync(id, userId);
                return Ok(ToHabitResponse(habit!));
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var userId = GetUserId();
                await _habitService.DeleteHabitAsync(id, userId);
                return Ok(new { message = "Привычка удалена" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{habitId}/entries")]
        public async Task<IActionResult> AddEntry(int habitId, AddHabitRequest request)
        {
            try
            {
                var userId = GetUserId();
                await _habitService.AddEntryAsync(habitId, userId, request.Date, request.Completed);

                return Ok(new
                {
                    habitId,
                    date = HabitPeriodHelper.NormalizeUtcDate(request.Date).ToString("yyyy-MM-dd"),
                    completed = request.Completed
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("{habitId}/entries")]
        public async Task<IActionResult> GetEntries(int habitId)
        {
            try
            {
                var userId = GetUserId();
                var entries = await _habitService.GetEntriesAsync(habitId, userId);

                return Ok(entries.Select(x => new
                {
                    date = x.Date.ToString("yyyy-MM-dd"),
                    completed = x.Completed
                }));
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{habitId}/entries")]
        public async Task<IActionResult> DeleteEntry(int habitId, DateTime date)
        {
            try
            {
                var userId = GetUserId();
                await _habitService.RemoveEntryAsync(habitId, userId, date);
                return Ok(new { message = "Запись удалена" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        private static object ToHabitResponse(Habit habit)
        {
            return new
            {
                id = habit.Id,
                title = habit.Title,
                frequency = habit.Frequency.ToString(),
                createdAtUtc = habit.CreatedAtUtc,
                reminderTimeUtc = habit.ReminderTimeUtc?.ToString("HH:mm")
            };
        }


        public class CreateHabitRequest
        {
            public string Title { get; set; } = string.Empty;
            public HabitFrequency Frequency { get; set; } = HabitFrequency.Daily;
        }

        public class UpdateHabitRequest
        {
            public string Title { get; set; } = string.Empty;
            public HabitFrequency? Frequency { get; set; }
            // "HH:mm" в UTC или null, если напоминание выключено
            public string? ReminderTimeUtc { get; set; }
        }

        public record AddHabitRequest(DateTime Date, bool Completed);
    }
}
