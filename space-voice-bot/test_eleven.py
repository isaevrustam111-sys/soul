import os, requests
from dotenv import load_dotenv

load_dotenv()

EL_API_KEY = os.getenv("ELEVENLABS_API_KEY")
VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "0uyIzbLH7qhXYieiUexx")

url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
headers = {
    "xi-api-key": EL_API_KEY,
    "accept": "audio/mpeg",
    "Content-Type": "application/json",
}
data = {
    "text": "Привет, я говорю голосом из будущего. Проверка связи.",
    "model_id": "eleven_multilingual_v2"
}

print("Запрос отправлен...")
r = requests.post(url, headers=headers, json=data)

print("Статус:", r.status_code)
if r.ok and r.headers.get("Content-Type","").startswith("audio"):
    with open("test.mp3", "wb") as f:
        f.write(r.content)
    print("✅ Успех! Файл test.mp3 создан, открой его любым плеером.")
else:
    print("❌ Ошибка ElevenLabs:", r.text[:500])
