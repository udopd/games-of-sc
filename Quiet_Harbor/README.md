# Quiet Harbor / Тихая бухта

Уютный пиксельный морской бой: одиночная игра против компьютера и сетевые комнаты на двух игроков. RU/EN и тема управляются платформой. В комплекте нет внешних runtime-зависимостей или npm-пакетов.

## Запуск

Из корня этого репозитория: `node scripts/preview-quiet-harbor.mjs`, затем http://localhost:4178/.
Из распакованной игры: `node server/index.js` (порт 3000 либо переменная PORT). Сервер слушает 0.0.0.0; для второго устройства используйте адрес этого сервера, доступный устройству, вместо localhost. Статический файловый сервер не поддерживает комнаты.

Для SUPER CUBE архив теперь имеет **runtime.txt = server**, package.json с type=module и вход server/index.js. Нужен настроенный server runtime manager платформы. Ассеты и API используют относительные URL и рассчитаны на runtime-прокси. Ссылка приглашения ведёт на URL игры с ?room=ABC123; код также можно вставить в главное меню. Публичное развёртывание и Docker runtime в этой работе не выполнялись.

## Одиночная игра

Расставьте 10 кораблей (4,3,3,2,2,2,1,1,1,1). Выберите длину в доке под полем, поверните кнопкой или R, нажмите на свою бухту. Корабли не касаются даже углами. Нажатие на установленный корабль снимает его. Попадание сохраняет ход, промах передаёт его. Компьютер добивает повреждённые корабли и исключает полное окружение потопленных, включая диагонали. Есть отмена последнего залпа/ответной серии до завершения партии, новая игра и сохранения.

## Сетевые комнаты

1. Главное меню → «Создать комнату». Код — 6 шестнадцатеричных символов. Пока второй игрок не вошёл, начать нельзя. Подключение: ссылка или код в главном меню.
2. После подключения второй капитан ждёт, пока создатель нажмёт «Начать расстановку».
3. Сервер даёт обоим 60 секунд на расстановку. «Готов» доступна после установки всех кораблей и блокирует изменения. Когда готовы оба, бой начинается сразу.
4. После минуты сервер дополняет незавершённую расстановку без касаний. Сохраняется частичная расстановка, если её можно дополнить; в редком случае тупика или исчерпания ограниченного поиска выбирается новый допустимый флот.
5. На ход — 10 секунд. Убывающая полоса и число секунд показывают серверный остаток. Время начинается после небольшой паузы на предыдущий выстрел. Попадание оставляет ход и обновляет таймер, промах передаёт ход. По истечении времени ход передаётся без автоматического выстрела.
6. Пинг — время HTTP-запроса и ответа. Зелёный: <120 мс; оранжевый: 120–349 мс; красный: ≥350 мс или ошибка связи.
7. Выход через «Главное меню» или закрытие/перезагрузка страницы отправляет leave (sendBeacon, запасной keepalive fetch). Оставшемуся игроку засчитывается победа и открывается поздравление. Если уведомление не дошло или связь оборвалась, сервер ждёт 15 секунд без heartbeat. Если пропали оба, победителя нет. Сворачивание мобильного браузера на длительное время тоже может привести к поражению.

Сетевая игра хранится только в памяти процесса. Перезапуск сервера обрывает комнаты. Активных комнат не более 500, лобби истекает через 15 минут, завершённые комнаты удаляются через 30 минут. Перезаход по тому же коду в начатый матч не поддержан; для новой партии создайте комнату заново.

## Архитектура и защита правил

- server/rooms.js: комнаты, случайные секретные токены участника, проверка флота, очереди ходов и повторных выстрелов, дедлайны, отключения, результаты. Клиент отправляет намерения; финальные решения принимает сервер.
- server/index.js: Node HTTP API POST api/room и ограниченная отдача клиентских ресурсов. server/ и package.json через HTTP не выдаются. Ограничены размер тела запроса, частота запросов и число комнат. Внешние игровые ID или пользовательские cookie не требуются.
- assets/multiplayer.js: меню, приглашения, heartbeat/poll примерно каждые 400 мс, пинг, серверные часы и отрисовка личного состояния. Собственный токен не включается в приглашение. До конца боя клиент получает только собственный флот, проверенные попадания и потопленные корабли соперника; целиком чужой флот раскрывается после завершения.
- Сетевые партии не пишутся в одиночное облачное сохранение. При возврате из комнаты восстанавливается одиночная партия, которая была до входа. Счётчик сетевых побед хранится отдельно локально. Отмена и облачная синхронизация во время сетевого боя выключены.
- assets/engine.js: правила и геометрия одиночной игры. Клавиатура, Pointer Events, видимый фокус, reduced motion. Поля масштабируются под экран без прокрутки; при расстановке видно только свою бухту.

## Платформа и сохранения

assets/platform-sdk.js изолирует SuperCubePlatform и postMessage. SC_PLATFORM_SETTINGS принимается только от parent, ранние настройки кэшируются. Одиночные сохранения quiet-harbor:v1 валидируются; облачная запись только после loadSave. Конфликт: более поздний updatedAt выбирает целую партию. Часы устройств могут расходиться; локальные данные не изолированы по аккаунтам. Неизвестный облачный формат блокирует запись. Записи объединяются за 320 мс и последовательны. Повтор подключения до 6 минут, затем вручную. На pagehide гарантируется только локальная запись. Избранное требует авторизации и подтверждённого boolean ответа. Аналитика одиночной игры level_start/level_complete, mode quiet-harbor-classic.

## Графика и звук

Синие градиентные переливы, цельная прозрачная текстура с белыми анимированными гребнями, детальные пиксельные SVG корабли с покачиванием, затемнённые промахи, частицы взрыва/воды, шестикадровый огонь в известных клетках попаданий. Пиксельный парусник прелоудера движется по прогрессу, качается и оставляет пену. Рыжий кот-пират имеет 24 кадра idle/happy/pet и реагирует на удержание с движением.

Web Audio: плеск установки/промаха, взрыв попадания, мурлыкание поглаживания. Mute останавливает активные звуки и сохраняется. Мобильная разблокировка: доверенные touch/pointer/click/key события синхронно вызывают resume и запускают беззвучный буфер. Поддерживаются webkitAudioContext, suspended/interrupted/closed и восстановление после возврата. Зависшее resume пересоздаёт контекст при следующем жесте через 1.8 секунды. Реальный iPhone здесь не проверялся. Основание: https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/state#resuming_interrupted_play_states_in_ios_safari .

Капсула media/capsule.jpg — JPEG 630×500; promo.png — оригинальная иллюстрация. Встроенный imagegen; запрос в media/capsule-prompt.txt. Скриншоты в media/screenshots/.

## Проверки

- node scripts/test-harbor-multiplayer.mjs — комнаты, токены, два игрока и запрет третьего, host gate, 60-секундное автозаполнение, раннее Ready, приватность флота, очередь/повторный выстрел/cooldown/таймаут хода, явный выход и потеря связи, реальный HTTP API и запрет выдачи server/.
- node scripts/test-quiet-harbor.mjs — 500 расстановок и игр AI, частичные сохранения, края/касания, 100 полных игр с очередностью, однократная победа, пропуск окружения потопленных.
- node scripts/test-harbor-sound.mjs и scripts/test-harbor-mobile-audio.mjs — звуковые графы, mute, очистка и сценарии iOS разблокировки/восстановления.
- Браузер: два независимых участника, вход по ссылке и коду, запрет старта без гостя, расстановка и ранний старт, сетевой выстрел, таймер и пинг, победа при выходе соперника. Production-прокси, Docker, разные физические устройства и реальный iOS Safari остаются непроверенными.

## Pixel UI and touch placement

Interface uses the locally bundled Tiny5 variable font (Cyrillic and Latin), licensed under SIL OFL 1.1; see assets/fonts/OFL.txt and https://github.com/google/fonts/tree/main/ofl/tiny5. No external font request is needed. The platform light theme uses warm paper cards and blue-gray text; the dark theme uses navy/slate cards. Theme and language still come from the platform, with no in-game switches. Standalone previews accept ?theme=light or ?theme=dark.

The enemy board uses the battle area on desktop and mobile screens. Your fleet becomes a smaller overlay map at the upper left, with a live count of unsunk own ships; tap it to open a full-screen overlay, then return with its button or Escape. Match timers continue while the map is open. In placement the own board remains full-sized. The dock always has four equally sized slots; selecting a ship never changes its dimensions. Drag from a dock slot onto the board using a finger, pen or mouse; the touch preview is raised 30 px above the finger. Existing ships can also be moved by dragging. Invalid drops or gesture cancellation preserve the current fleet. Tap placement and the rotation button remain available.

Validation: node scripts/test-harbor-drag.mjs covers touch offset, vertical placement, invalid/outside drops, cancellation and battle locks. Desktop pointer drag and mobile viewport layouts were checked in the browser. Physical iPhone touch handling and production networking remain device/deployment checks.

## Updated fleet view and computer pursuit

The own harbor is expanded below the enemy sea, using the remaining vertical space without page scrolling. The enemy sea gets 72% of the available square-board budget; the own sea fills the remainder, capped by viewport width. Both stay centered, with own remaining ships shown in its header. Tapping the own board still opens the full-screen map.

The computer groups orthogonally connected visible unsunk hits. After two or more aligned hits, it targets only untried endpoints of that line, reversing when one end misses or reaches an edge. It prioritizes finishing an established line over investigating another isolated hit. Hidden ship orientation is never used for this decision. Regression tests cover both axes, reversal, boundaries, target priority, and full simulated games.
