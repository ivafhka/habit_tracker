# Habit Tracker — Electron-приложение

Окно размером с телефон (412×820), которое открывает ваш сайт Habit Tracker.
Сервер (ASP.NET + PostgreSQL) работает отдельно, приложение — это клиент к нему.

> **Важно.** Electron работает только на Windows, macOS и Linux. Установить его на Android или iOS
> нельзя. Здесь это «приложение в формате телефона» для компьютера. Если нужен настоящий APK/IPA,
> см. раздел «Если нужен настоящий телефон» в конце.

## Как это устроено

```
Electron-окно  ──http──▶  ASP.NET (Habit_Tracker)  ──▶  PostgreSQL
 (electron-app)           отдаёт wwwroot + /api/*
```

Что изменено в самом проекте:

| Файл | Что |
|---|---|
| `Habit_Tracker/wwwroot/Js/config.js` | `API_URL` теперь `window.location.origin` вместо жёсткого `https://localhost:7210` |
| `Habit_Tracker/wwwroot/Js/Push.js` | В Electron push отключён (там нет сервиса push), показывается понятное сообщение |
| `Habit_Tracker/wwwroot/edit-habit.html` | `Js/push.js` → `Js/Push.js` (имя файла в проекте с большой буквы; на Linux/хостинге с маленькой был бы 404) |
| `electron-app/` | новая папка с приложением |

## Шаг 1. Установить программы (один раз)

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [PostgreSQL](https://www.postgresql.org/download/) (база `HabitTracker`, пароль как в `appsettings.json`)
- [Node.js LTS](https://nodejs.org/) (вместе с ним ставится `npm`)

## Шаг 2. Запустить сервер

```
cd Habit_Tracker
dotnet tool install --global dotnet-ef   # один раз
dotnet ef database update                # применить миграции (приложение само их не применяет)
dotnet run --launch-profile http
```

Сервер поднимется на `http://localhost:5288`. Проверьте, что этот адрес открывается в обычном браузере.

## Шаг 3. Запустить приложение

В **другом** окне терминала:

```
cd electron-app
npm install
npm start
```

Откроется окно приложения. Если сервер не запущен, вы увидите экран «Нет связи с сервером»:
запустите сервер и нажмите «Повторить».

Во время разработки **F12** открывает DevTools.

## Шаг 4. Собрать установщик

```
cd electron-app
npm run dist:win      # Windows: dist/Habit Tracker Setup 1.0.0.exe
npm run dist:mac      # macOS (собирать нужно на Mac)
npm run dist:linux    # Linux: AppImage
```

Результат появится в `electron-app/dist/`. Каждую платформу удобнее собирать на ней самой.

Иконка: положите файл `electron-app/build/icon.png` (512×512 или больше), `electron-builder`
подхватит его сам. Пока иконки нет, используется стандартная иконка Electron.

## Шаг 5. Чтобы приложение работало не только у вас

Установщик содержит только окно. Другой человек сможет им пользоваться, если сервер доступен ему
по сети. Для этого:

1. Разместите сервер и PostgreSQL на хостинге (VPS, Azure, Railway и т. п.) с HTTPS.
2. В `appsettings.json` на сервере замените `JwtSettings:Secret` и пароль БД на свои (сейчас они
   лежат в репозитории открытым текстом, а репозиторий публичный).
3. В приложении укажите адрес сервера: на экране «Нет связи с сервером» поле «Адрес сервера» → «Сохранить».
   Адрес запоминается. Либо перед сборкой поменяйте `DEFAULT_SERVER_URL` в `electron-app/main.js`.

Адрес сервера можно также задать переменной окружения `HABIT_SERVER_URL`
(она главнее сохранённого значения), например:

```
set HABIT_SERVER_URL=https://habits.example.com && npm start      (Windows cmd)
HABIT_SERVER_URL=https://habits.example.com npm start             (macOS/Linux)
```

Если используете `https://localhost:7210` с dev-сертификатом, один раз выполните
`dotnet dev-certs https --trust`.

## Ограничения

- **Push-уведомления в Electron не работают.** Web Push в Electron недоступен (нет FCM). В браузере
  push работает, если на сервере заданы VAPID-ключи (`VapidSettings` в `appsettings.json` сейчас пустые).
  Для Electron нужен отдельный механизм (опрос сервера и системные уведомления) — это отдельная доработка.
- **На странице редактирования привычки в присланном архиве не хватает функций**:
  `applyReminderToForm`, `getReminderTimeUtcFromForm`, `togglePush`, `refreshPushButton` вызываются
  в `edit-habit.js` / `edit-habit.html`, но нигде не определены, поэтому страница покажет ошибку.
  Проверьте `git status`: возможно, они есть у вас локально, но не закоммичены.
- Токен входа живёт 60 минут (`ExpirationMinutes` в `appsettings.json`), потом нужно входить заново.

## Если нужен настоящий телефон

Для Android/iOS подойдёт [Capacitor](https://capacitorjs.com/): он берёт тот же сайт из `wwwroot`
и собирает APK/IPA, а нативные push-уведомления работают через FCM/APNs. Перед этим стоит добавить
`<meta name="viewport" content="width=device-width, initial-scale=1">` во все `.html` (сейчас его нет;
в Electron это не требуется).
