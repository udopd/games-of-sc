(function(){
'use strict';
window.Tikhon=window.Tikhon||{};
const dict={
ru:{
 'loading.connecting':'Подключаемся к платформе…','loading.player':'Загружаем данные игрока…','loading.save':'Восстанавливаем прогресс…','loading.ready':'Всё готово. Играем!',
 'brand.tagline':'КЛУБ УЮТНЫХ ГОЛОВОЛОМОК',
 'meta.title':'Тихон 2048 — уютная головоломка',
 'meta.description':'Тихон 2048 — уютная пиксельная головоломка о британском коте. Объединяй плитки и собери 2048!',
 'menu.open':'Открыть меню','menu.close':'Закрыть меню','modal.close':'Закрыть',
 'header.tag':'СДЕЛАНО С МУРЧАНИЕМ','brand.name':'ТИХОН','eyebrow.intro':'МАЛЕНЬКАЯ ИГРА ДЛЯ БОЛЬШОГО ОТДЫХА',
 'title.name':'Тихон','intro.copy':'Складывай одинаковые плитки и помоги Тихону найти свою любимую цифру.',
 'cat.label':'Пиксельный британский кот Тихон — погладьте его мышкой или пальцем','story.bottom':'Никуда не спеши.\nУ каждой плитки своё место.',
 'board.label':'Поле 2048','board.aria':'Игровое поле четыре на четыре. Управление стрелками или свайпами.',
 'board.eyebrow':'НАСТОЛЬНЫЕ ПРИКЛЮЧЕНИЯ','board.collect':'Собери',
 'score':'СЧЁТ','best':'РЕКОРД','gesture':'↔ СВАЙП ИЛИ СТРЕЛКИ ↕',
 'footer.name':'ТИХОН 2048','footer.tag':'СОБИРАЙ. ОТДЫХАЙ. МУРЧИ.',
 'drawer.eyebrow':'КОШКИНЫ НАСТРОЙКИ','drawer.title':'Меню',
 'undo.title':'Отменить ход','undo.detail':'Вернуть плитки назад',
 'restart.title':'Новая игра','restart.detail':'Начать с чистого листа',
 'favorite.add':'Добавить в любимое','favorite.remove':'Убрать из любимого',
 'favorite.addDetail':'Сохранить игру в коллекции','favorite.removeDetail':'Уже в любимом · нажми, чтобы убрать',
 'cloud.title':'Синхронизировать','cloud.loading':'Проверяем сохранение…',
 'sound.title':'Звуки','sound.enabled':'Включены','sound.disabled':'Выключены',
 'rules.title':'Как играть','rules.detail':'Правила для новых лапок',
 'drawer.footer':'Тихон напоминает:','drawer.footerStrong':'победа — это хорошо, а отдых — ещё лучше.',
 'cat.idle':'мур-мур…', 'cat.pet':'мррр~ ещё!','cat.newPeak':'Вау! Новый рекорд плитки! ✦', 'cat.merge1':'мяу!', 'cat.merge2':'хорошо!', 'cat.merge3':'мурр~', 'cat.merge4':'ещё!',
 'status.initial':'Мягкие лапки — смелые ходы','status.gain':'+{amount} к счёту!',
 'status.move':'Ход {moves} · всё получится','status.new':'Новая партия · удачи!', 'status.undo':'Ход отменён',
 'cloud.saved':'Прогресс сохранён в облаке','cloud.saveError':'Ошибка сохранения · нажми для повтора',
 'cloud.guestSdk':'Гостевой режим · SDK недоступен','cloud.guest':'Гость · для облака нужен вход',
 'cloud.unknown':'Не удалось распознать сохранение','cloud.restored':'Прогресс загружен из облака',
 'cloud.connected':'Облако подключено','cloud.loadError':'Ошибка загрузки · нажми для повтора',
 'toast.syncing':'Синхронизация уже выполняется','toast.platformMissing':'Платформа пока не подключена',
 'toast.loginCloud':'Войдите в SUPER CUBE для облачного сохранения',
 'toast.unknownSave':'Облачное сохранение в неизвестном формате',
 'toast.restored':'Партия восстановлена и синхронизирована',
 'toast.connected':'Облако подключено','toast.loadError':'Не удалось загрузить прогресс. Повторите позже.',
 'toast.noUndo':'Пока нечего отменять','toast.loginFavorite':'Войдите в SUPER CUBE, чтобы добавить в любимое',
 'toast.favoriteAdded':'Тихон теперь в любимом ♥','toast.favoriteRemoved':'Удалено из любимого',
 'toast.favoriteError':'Не удалось изменить любимое',
 'modal.defaultEyebrow':'ТИХОН ГОВОРИТ','modal.winEyebrow':'ТИХОН ГОРДИТСЯ ТОБОЙ',
 'modal.winTitle':'2048! Мур-ура!','modal.winCopy':'Ты собрал заветную плитку! Можно продолжить игру и установить новый рекорд.',
 'modal.keepPlaying':'Продолжить','modal.newGame':'Новая игра',
 'modal.loseEyebrow':'ПЕРЕДЫШКА ДЛЯ ЛАПОК','modal.loseTitle':'Ходы закончились',
 'modal.loseCopy':'Тихон набрал {score} очков. Попробуем ещё раз?',
 'modal.viewBoard':'Посмотреть поле','modal.restartEyebrow':'НАЧНЁМ СНАЧАЛА?',
 'modal.restartTitle':'Новая партия?','modal.restartCopy':'Текущая раскладка исчезнет, но рекорд останется.',
 'modal.cancel':'Отмена','modal.start':'Начать','modal.rulesEyebrow':'ПРАВИЛА ДЛЯ ЛАПОК',
 'modal.rulesTitle':'Как играть?','modal.rulesCopy':'Свайпай по полю или используй стрелки / WASD. Одинаковые плитки объединяются: 2 + 2 = 4, 4 + 4 = 8… Цель — добраться до 2048. Если на поле нет ходов, партия заканчивается.',
 'modal.gotIt':'Понятно!'
},
en:{
 'loading.connecting':'Connecting to the platform…','loading.player':'Loading player data…','loading.save':'Restoring your progress…','loading.ready':'Ready. Let’s play!',
 'brand.tagline':'COZY MERGE CLUB',
 'meta.title':'Tikhon 2048 — Cozy Merge Club',
 'meta.description':'Tikhon 2048 is a cozy pixel-art puzzle starring a British Shorthair cat. Merge tiles and reach 2048!',
 'menu.open':'Open menu','menu.close':'Close menu','modal.close':'Close',
 'header.tag':'MADE WITH PURRS','brand.name':'TIKHON','eyebrow.intro':'A LITTLE GAME FOR A BIG BREAK',
 'title.name':'Tikhon','intro.copy':'Merge matching tiles and help Tikhon find his favorite number.',
 'cat.label':'Pixel-art British Shorthair Tikhon — stroke with your pointer or finger','story.bottom':'Take your time.\nEvery tile has its place.',
 'board.label':'2048 board','board.aria':'Four-by-four 2048 game board. Use arrow keys or swipe.',
 'board.eyebrow':'COZY TABLETOP ADVENTURES','board.collect':'Reach',
 'score':'SCORE','best':'BEST','gesture':'↔ SWIPE OR ARROWS ↕',
 'footer.name':'TIKHON 2048','footer.tag':'MERGE. RELAX. PURR.',
 'drawer.eyebrow':'CAT SETTINGS','drawer.title':'Menu',
 'undo.title':'Undo move','undo.detail':'Bring back your tiles',
 'restart.title':'New game','restart.detail':'Start with a fresh board',
 'favorite.add':'Add to favorites','favorite.remove':'Remove from favorites',
 'favorite.addDetail':'Save this game to your collection','favorite.removeDetail':'Already saved · tap to remove',
 'cloud.title':'Sync progress','cloud.loading':'Checking your save…',
 'sound.title':'Sounds','sound.enabled':'On','sound.disabled':'Off',
 'rules.title':'How to play','rules.detail':'A quick guide for little paws',
 'drawer.footer':'Tikhon says:','drawer.footerStrong':'winning is nice, but rest is even better.',
 'cat.idle':'purr-purr…', 'cat.pet':'prrr~ more!','cat.newPeak':'A new highest tile! ✦','cat.merge1':'meow!','cat.merge2':'nice!','cat.merge3':'purr~','cat.merge4':'again!',
 'status.initial':'Soft paws, bold moves','status.gain':'+{amount} points!',
 'status.move':'Move {moves} · you got this','status.new':'New game · good luck!', 'status.undo':'Move undone',
 'cloud.saved':'Progress saved to cloud','cloud.saveError':'Save failed · tap to retry',
 'cloud.guestSdk':'Guest mode · SDK unavailable','cloud.guest':'Guest · sign in for cloud saves',
 'cloud.unknown':'Unrecognized cloud save','cloud.restored':'Cloud progress restored',
 'cloud.connected':'Cloud connected','cloud.loadError':'Load failed · tap to retry',
 'toast.syncing':'Sync already in progress','toast.platformMissing':'Platform is not connected yet',
 'toast.loginCloud':'Sign in to SUPER CUBE for cloud saves',
 'toast.unknownSave':'Cloud save format is not recognized',
 'toast.restored':'Game restored and synced', 'toast.connected':'Cloud connected',
 'toast.loadError':'Could not load progress. Please retry later.',
 'toast.noUndo':'Nothing to undo yet','toast.loginFavorite':'Sign in to SUPER CUBE to add favorites',
 'toast.favoriteAdded':'Tikhon is in your favorites ♥','toast.favoriteRemoved':'Removed from favorites',
 'toast.favoriteError':'Could not change favorite status',
 'modal.defaultEyebrow':'TIKHON SAYS','modal.winEyebrow':'TIKHON IS PROUD OF YOU',
 'modal.winTitle':'2048! Purr-fect!','modal.winCopy':'You reached the magical tile! Keep playing to set a new record.',
 'modal.keepPlaying':'Keep playing','modal.newGame':'New game',
 'modal.loseEyebrow':'PAW-SOME BREAK','modal.loseTitle':'No moves left',
 'modal.loseCopy':'Tikhon earned {score} points. Want to try again?',
 'modal.viewBoard':'View board','modal.restartEyebrow':'START OVER?',
 'modal.restartTitle':'New game?','modal.restartCopy':'Your current board will be reset, but your best score stays.',
 'modal.cancel':'Cancel','modal.start':'Start','modal.rulesEyebrow':'A GUIDE FOR LITTLE PAWS',
 'modal.rulesTitle':'How to play','modal.rulesCopy':'Swipe the board or use arrow keys / WASD. Matching tiles merge: 2 + 2 = 4, 4 + 4 = 8… Reach 2048 to win. The game ends when no moves remain.',
 'modal.gotIt':'Got it!'
}};
let lang='ru';
const callbacks=new Set();
function normalize(value){if(typeof value!=='string')return null;const v=value.toLowerCase().replace('_','-');if(v==='en'||v.startsWith('en-'))return 'en';if(v==='ru'||v.startsWith('ru-'))return 'ru';return null;}
function t(key,vars){let value=dict[lang][key]??dict.ru[key]??key;if(vars)for(const [k,v] of Object.entries(vars))value=value.replaceAll(`{${k}}`,typeof v==='number'?number(v):String(v));return value;}
function applyStatic(){
 document.documentElement.lang=lang;
 document.title=t('meta.title');
 const description=document.querySelector('meta[name="description"]');if(description)description.content=t('meta.description');
 document.querySelectorAll('[data-i18n]').forEach(node=>{node.textContent=t(node.dataset.i18n);});
 document.querySelectorAll('[data-i18n-aria]').forEach(node=>{node.setAttribute('aria-label',t(node.dataset.i18nAria));});
}
function setLanguage(value){const next=normalize(value);if(!next)return false;if(next!==lang){lang=next;applyStatic();for(const fn of callbacks){try{fn(lang)}catch(error){console.warn('Localization listener error',error);}}}return true;}
function subscribe(fn){callbacks.add(fn);return()=>callbacks.delete(fn);}
function number(value){return Number(value).toLocaleString(lang==='en'?'en-GB':'ru-RU');}
window.Tikhon.i18n={t,normalize,setLanguage,subscribe,applyStatic,number,getLanguage:()=>lang};
})();
