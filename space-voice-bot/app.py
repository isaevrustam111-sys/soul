from flask import Flask, request, jsonify, Response, send_from_directory
from dotenv import load_dotenv
from openai import OpenAI
import os, requests, re

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
EL_API_KEY     = os.getenv("ELEVENLABS_API_KEY", "").strip()
VOICE_ID       = os.getenv("ELEVENLABS_VOICE_ID", "0uyIzbLH7qhXYieiUexx")

client = OpenAI(api_key=OPENAI_API_KEY)
app = Flask(__name__, static_folder="public", static_url_path="")

@app.route("/")
def root():
    return send_from_directory("public", "index.html")

@app.route("/<path:path>")
def static_files(path):
    return send_from_directory("public", path)

def limit_25_words(text: str) -> str:
    """Ограничение: максимум 25 слов и не более 2 предложений"""
    words = re.split(r"\s+", text.strip())
    if len(words) > 25:
        text = " ".join(words[:25]).rstrip(",;") + "."
    sentences = text.split(".")
    if len(sentences) > 2:
        text = ".".join(sentences[:2]).strip() + "."
    return text

@app.post("/api/chat-voice")
def chat_voice():
    data = request.get_json(force=True) if request.data else {}
    user_text = (data.get("message") or "").strip()
    lang = data.get("lang", "ru")  # по умолчанию русский

    if not user_text:
        return jsonify({"error": "empty"}), 400

    # разные system message в зависимости от языка
    if lang == "uz":
        system_msg = (
            "Sen — samimiy kosmos bo‘yicha gid. Faqat kosmos haqida javob ber. "
            "Javob juda qisqa bo‘lsin, maksimal 25 ta so‘z."
        )
    else:
        system_msg = (
            "Ты — дружелюбный гид по космосу. Отвечай только о космосе. "
            "Ответ делай очень коротким, максимум 25 слов."
        )

    # 1) короткий текстовый ответ от OpenAI
    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_text},
            ],
            temperature=0.3,
            max_tokens=120,
        )
        reply = (resp.choices[0].message.content or "").strip()
    except Exception:
        reply = (
            "Faqat kosmos haqida gapiraman. Sayyoralar, yulduzlar yoki galaktikalar haqida so‘rashingiz mumkin."
            if lang == "uz"
            else "Говорю только о космосе. Спроси про планеты, звёзды или галактики."
        )
    reply = limit_25_words(reply)

    # 2) озвучивание через ElevenLabs (поддержка узб и рус)
    try:
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
        headers = {
            "xi-api-key": EL_API_KEY,
            "accept": "audio/mpeg",
            "Content-Type": "application/json",
        }
        payload = {"text": reply, "model_id": "eleven_multilingual_v2"}
        r = requests.post(url, headers=headers, json=payload, timeout=60)
        if r.ok and (r.headers.get("Content-Type", "").startswith("audio")):
            return Response(r.content, mimetype="audio/mpeg")
        else:
            return jsonify({"reply": reply})
    except Exception:
        return jsonify({"reply": reply})

if __name__ == "__main__":
    # http://127.0.0.1:5000
    app.run(host="127.0.0.1", port=5000, debug=False)
