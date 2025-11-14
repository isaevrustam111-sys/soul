// ===== Диагностический app.js — чтобы кнопки точно работали =====
(() => {
  'use strict';

  // ЖЁСТКО: максимум слов в ответе
  const MAX_WORDS = 40;

  // удобные ссылки на элементы
  const talkBtn  = document.getElementById("talkBtn");
  const stopBtn  = document.getElementById("stopBtn");
  const statusEl = document.getElementById("status");

  // переключатель языков
  let currentLang = "ru"; // по умолчанию русский
  const langRu = document.getElementById("langRu");
  const langUz = document.getElementById("langUz");

  if (langRu && langUz) {
    langRu.addEventListener("click", () => {
      currentLang = "ru";
      setStatus("🇷🇺 Язык: русский");
    });
    langUz.addEventListener("click", () => {
      currentLang = "uz";
      setStatus("🇺🇿 Til: o‘zbekcha");
    });
  }

  // состояние
  let currentAudio = null;
  let isRecording  = false;
  let recTimeout   = null;

  // безопасный помощник статуса
  const setStatus = (txt) => {
    console.log("STATUS:", txt);
    statusEl.textContent = txt;
  };

  // кнопка Стоп — всегда работает
  function stopPlayback() {
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
    if (window.speechSynthesis?.speaking) window.speechSynthesis.cancel();
    stopBtn.style.display = "none";
    setStatus(""); // убираем статус полностью
  }

  stopBtn.addEventListener("click", () => {
    console.log("Клик: Стоп");
    stopPlayback();
  });

  // Проверяем поддержку распознавания речи
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const srSupported = !!SpeechRecognition;
  console.log("SpeechRecognition supported:", srSupported);

  // === Вариант А: распознавание речи поддерживается ===
  if (srSupported) {
    const rec = new SpeechRecognition();
    rec.lang = "ru-RU"; // по умолчанию, но меняем через currentLang
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      isRecording = true;
      setStatus("🎤 Слушаю...");
      talkBtn.textContent = "🛑 Стоп запись";
      // таймаут — если 5 сек тишина, останавливаем
      recTimeout = setTimeout(() => {
        if (isRecording) { rec.stop(); setStatus("⏹️ Нет звука"); }
      }, 5000);
    };

    rec.onend = () => {
      isRecording = false;
      talkBtn.textContent = "🎙 Говорить";
      clearTimeout(recTimeout);
      console.log("Распознавание завершено");
    };

    rec.onerror = (e) => {
      isRecording = false;
      clearTimeout(recTimeout);
      talkBtn.textContent = "🎙 Говорить";
      setStatus("❌ Ошибка распознавания: " + e.error);
      console.error("SR error:", e);
    };

    rec.onresult = async (ev) => {
      clearTimeout(recTimeout);
      const text = (ev.results[0][0].transcript || "").trim();
      console.log("Распознано:", text);
      if (!text) { setStatus("⏹️ Пусто"); return; }
      setStatus("🚀 Думаю...");

      try {
        const res = await fetch("/api/chat-voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            message: text, 
            max_words: MAX_WORDS,
            lang: currentLang   // отправляем язык
          })
        });

        const ct = res.headers.get("Content-Type") || "";
        console.log("Ответ /api/chat-voice:", res.status, ct);

        if (ct.includes("audio/mpeg")) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          playAudio(url);
        } else {
          const data = await res.json().catch(() => ({}));
          if (data?.reply) speakFallback(data.reply);
          else setStatus("❌ Ошибка ответа");
        }
        // очищаем статус после ответа
        setStatus("");
      } catch (err) {
        console.error("fetch error:", err);
        setStatus("❌ Ошибка сети");
      }
    };

    // обработчик кнопки Говорить (c запросом разрешения микрофона)
    talkBtn.addEventListener("click", () => {
      console.log("Клик: Говорить");
      if (isRecording) { rec.stop(); return; }

      // меняем язык распознавания на основе currentLang
      rec.lang = currentLang === "uz" ? "uz-UZ" : "ru-RU";

      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
          console.log("Микрофон разрешён, запускаю SR");
          rec.start();
        })
        .catch(() => {
          setStatus("❌ Микрофон не доступен");
        });
    });

  } else {
    // === Вариант Б: распознавания нет (Firefox / старый браузер / insecure) ===
    talkBtn.addEventListener("click", () => {
      console.log("Клик: Говорить (SR не поддерживается)");
      setStatus("❌ Голосовой ввод не поддерживается в этом браузере. Открой в Chrome.");
    });
  }

  // Проигрывание mp3 (ElevenLabs)
  function playAudio(url) {
    stopPlayback();
    const a = new Audio(url);
    currentAudio = a;
    a.onplay  = () => stopBtn.style.display = "inline-block";
    a.onended = () => { stopBtn.style.display = "none"; currentAudio = null; };
    a.play().catch((e) => {
      console.error("audio play error:", e);
      stopBtn.style.display = "none"; currentAudio = null;
    });
  }

  // Озвучка браузером как запасной вариант
  function speakFallback(text) {
    if (!window.speechSynthesis) return;
    stopPlayback();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = currentLang === "uz" ? "uz-UZ" : "ru-RU"; 
    u.rate = 0.95; 
    u.pitch = 0.95;
    u.onstart = () => stopBtn.style.display = "inline-block";
    u.onend   = () => stopBtn.style.display = "none";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

})();
