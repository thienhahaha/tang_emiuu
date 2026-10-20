import json
import threading
from datetime import datetime
from pathlib import Path

from flask import Flask, abort, jsonify, render_template, request, send_from_directory, url_for

# ---------- Đường dẫn ----------
BASE_DIR = Path(__file__).resolve().parent          # .../20thang10/backend
IMAGES_DIR = (BASE_DIR.parent / "images").resolve() # .../20thang10/images
FEEDBACK_FILE = BASE_DIR / "feedback.json"          # cảm nghĩ sẽ được lưu ở đây
ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif"}

app = Flask(
    __name__,
    template_folder="../frontned/templates",
    static_folder="../frontned/static",
)

# ====== SỬA Ở ĐÂY CHO PHÙ HỢP ======
NAME = "emiuuu"
MESSAGE_TITLE = "Chúc mừng ngày 20/10"
LETTER = [
    "Chúc emiuuu 20/100 duii dẻê hạnh phúcccc",
    "luopn dthw xinh đẹp nhaaaa",
    "anh iuu emm"
]
SIGNATURE = "bunn"

# Mỗi lần chạm vào trái tim, một câu ở dưới sẽ hiện ra (đổi thành lời của bạn)
TAP_MESSAGES = [
    "anh iuu emmm 💖",
    "thương bé nhieu lammm 🌸",
    "đc thì cho a sờ nhiều hơn nha hahahaha",
]

# Lời ghi chú cho từng ảnh (không bắt buộc).
# Khoá là TÊN FILE trong thư mục images, ví dụ: "anh1.jpg": "Lần đầu mình đi chơi"
CAPTIONS = {
    # "anh1.jpg": "Lần đầu mình đi chơi",
    # "anh2.jpg": "Sinh nhật em",
}
# ====================================

_feedback_lock = threading.Lock()


def list_memories():
    """Đọc tất cả ảnh trong thư mục images, sắp theo tên file."""
    if not IMAGES_DIR.is_dir():
        return []
    files = sorted(
        (p for p in IMAGES_DIR.iterdir() if p.is_file() and p.suffix.lower() in ALLOWED_EXT),
        key=lambda p: p.name.lower(),
    )
    return [
        {
            "url": url_for("serve_image", filename=p.name),
            "caption": CAPTIONS.get(p.name, ""),
        }
        for p in files
    ]


@app.route("/")
def index():
    return render_template(
        "index.html",
        name=NAME,
        title=MESSAGE_TITLE,
        letter=LETTER,
        signature=SIGNATURE,
        tap_messages=TAP_MESSAGES,
    )


# Phục vụ ảnh từ thư mục images (nằm ngang hàng backend và frontned)
@app.route("/images/<path:filename>")
def serve_image(filename):
    if not IMAGES_DIR.is_dir():
        abort(404)
    return send_from_directory(IMAGES_DIR, filename)


@app.route("/api/memories")
def api_memories():
    return jsonify(list_memories())


@app.route("/api/feedback", methods=["POST"])
def api_feedback():
    data = request.get_json(silent=True) or {}
    text = str(data.get("message", "")).strip()
    mood = str(data.get("mood", "")).strip()[:8]

    if not text:
        return jsonify({"ok": False, "error": "chx viết j maaa 🥺"}), 400
    if len(text) > 1500:
        return jsonify({"ok": False, "error": "=))))))"}), 400

    entry = {
        "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "mood": mood,
        "message": text,
    }

    with _feedback_lock:
        items = []
        if FEEDBACK_FILE.exists():
            try:
                items = json.loads(FEEDBACK_FILE.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                items = []
        items.append(entry)
        FEEDBACK_FILE.write_text(
            json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8"
        )
    
    print("FEEDBACK:", json.dumps(entry, ensure_ascii=False), flush=True)
    return jsonify({"ok": True})


if __name__ == "__main__":
    app.run(debug=True)
