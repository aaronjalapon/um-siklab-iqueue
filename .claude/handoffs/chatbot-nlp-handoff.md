# Handoff: Multilingual Chatbot NLP — XLM-RoBERTa + MASSIVE

## What You're Building

Fine-tune `FacebookAI/xlm-roberta-base` on a filtered + augmented subset of the
`qanastek/MASSIVE` dataset to classify user queries into 5 IQueue intents. Expose
the model as a FastAPI endpoint and wire it to the existing Next.js chatbot panel.

---

## Intents (5 classes, label index in parentheses)

| Index | Intent | Example query |
|---|---|---|
| 0 | `check_booking` | "Where is my booking?", "Nasaan ang aking booking?" |
| 1 | `request_requeue` | "I missed my bus, can I rebook?", "Nais ko pong mag-rebook" |
| 2 | `get_departure_info` | "When does the 10am bus to Davao leave?" |
| 3 | `surge_info` | "Is Holy Week going to be crowded?", "Puno ba ngayong Pasko?" |
| 4 | `fallback` | Anything that doesn't match the above |

Languages: Filipino (tl-PH), Bahasa Indonesia (id-ID), Vietnamese (vi-VN), English (en-US).

---

## File Layout

Work inside the existing IQueue project. Create these files — do not touch anything
outside `ml/chatbot/` and `backend/app/services/chatbot/` and `backend/app/api/v1/chatbot.py`.

```
ml/chatbot/
├── prepare_dataset.py       # Step 1: pull MASSIVE, remap intents, generate synthetic rows
├── train.py                 # Step 2: fine-tune XLM-RoBERTa
├── evaluate.py              # Step 3: per-language accuracy + confusion matrix
├── data/
│   ├── iqueue_train.csv     # output of prepare_dataset.py  (git-ignored, DVC-tracked)
│   ├── iqueue_val.csv
│   └── iqueue_test.csv
└── artifacts/
    ├── xlm-roberta-iqueue/  # saved model dir (HF format, DVC-tracked)
    └── label_map.json       # {"0": "check_booking", ...}

backend/app/services/chatbot/
├── bot.py                   # ChatbotService class (inference only)
└── __init__.py

backend/app/api/v1/
└── chatbot.py               # POST /api/v1/chatbot/message
```

---

## Step 1 — Dataset Preparation (`ml/chatbot/prepare_dataset.py`)

### Install deps
```bash
pip install datasets transformers torch scikit-learn pandas anthropic langdetect
```

### MASSIVE intent remap

Pull these MASSIVE scenario+intent combos and reclassify them to IQueue labels:

| IQueue label | MASSIVE intents to pull |
|---|---|
| `get_departure_info` | `transport_query`, `datetime_query` |
| `fallback` | `general_quirky`, `qa_factoid`, `qa_maths` |
| `check_booking` | `calendar_query`, `recommendation_events` |
| `request_requeue` | `transport_ticket` |

Sample balanced: aim for **~60 rows per intent per language** from MASSIVE (240 rows
per language × 4 languages = 960 rows total from MASSIVE).

```python
from datasets import load_dataset

LOCALES = ["en-US", "tl-PH", "id-ID", "vi-VN"]
REMAP = {
    "transport_query":          "get_departure_info",
    "datetime_query":           "get_departure_info",
    "general_quirky":           "fallback",
    "qa_factoid":               "fallback",
    "qa_maths":                 "fallback",
    "calendar_query":           "check_booking",
    "recommendation_events":    "check_booking",
    "transport_ticket":         "request_requeue",
}

rows = []
for locale in LOCALES:
    ds = load_dataset("qanastek/MASSIVE", locale, split="train")
    for item in ds:
        intent_name = item["intent"]   # already a string in this version
        if intent_name in REMAP:
            rows.append({
                "text":     item["utt"],
                "label":    REMAP[intent_name],
                "language": locale,
                "source":   "massive",
            })
```

> **Note:** The `intent` field in MASSIVE is an integer. Map it to a string using the
> dataset's `features["intent"].int2str(item["intent"])` before remapping.

### Synthetic rows for gaps

`surge_info` and `request_requeue` have very few MASSIVE examples. Use the Anthropic
API to generate ~25 synthetic utterances per intent per language (100 rows each).

```python
import anthropic, json

client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from env

LANGS = {
    "en-US": "English",
    "tl-PH": "Filipino (Tagalog)",
    "id-ID": "Bahasa Indonesia",
    "vi-VN": "Vietnamese",
}

def generate_synthetic(intent: str, language_label: str, n: int = 25) -> list[str]:
    prompt = (
        f"Generate {n} short, natural user queries in {language_label} that express "
        f"the intent '{intent}' in the context of a bus terminal booking app. "
        f"Return ONLY a JSON array of strings, no explanations."
    )
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}],
    )
    return json.loads(response.content[0].text)
```

### Output

Save three CSVs with columns `text, label, language, source` using an 80/10/10
train/val/test split, stratified by label and language.

DVC-track the outputs:
```bash
dvc add ml/chatbot/data/iqueue_train.csv ml/chatbot/data/iqueue_val.csv ml/chatbot/data/iqueue_test.csv
```

---

## Step 2 — Fine-tuning (`ml/chatbot/train.py`)

```python
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer,
)
import torch, json
from datasets import Dataset
import pandas as pd

MODEL_NAME = "FacebookAI/xlm-roberta-base"
LABELS = ["check_booking", "request_requeue", "get_departure_info", "surge_info", "fallback"]
LABEL2ID = {l: i for i, l in enumerate(LABELS)}
ID2LABEL = {i: l for i, l in enumerate(LABELS)}

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForSequenceClassification.from_pretrained(
    MODEL_NAME,
    num_labels=5,
    id2label=ID2LABEL,
    label2id=LABEL2ID,
)

def tokenize(batch):
    return tokenizer(batch["text"], truncation=True, padding="max_length", max_length=128)

# Load CSVs → HF Dataset → tokenize → train
train_df = pd.read_csv("ml/chatbot/data/iqueue_train.csv")
train_df["label"] = train_df["label"].map(LABEL2ID)
train_ds = Dataset.from_pandas(train_df).map(tokenize, batched=True)

args = TrainingArguments(
    output_dir="ml/chatbot/artifacts/xlm-roberta-iqueue",
    num_train_epochs=5,
    per_device_train_batch_size=16,
    evaluation_strategy="epoch",
    save_strategy="best",
    load_best_model_at_end=True,
    metric_for_best_model="eval_accuracy",
    logging_steps=20,
    warmup_ratio=0.1,
    learning_rate=2e-5,
)

# Wire val dataset the same way, then:
trainer = Trainer(model=model, args=args, train_dataset=train_ds, ...)
trainer.train()

model.save_pretrained("ml/chatbot/artifacts/xlm-roberta-iqueue")
tokenizer.save_pretrained("ml/chatbot/artifacts/xlm-roberta-iqueue")

with open("ml/chatbot/artifacts/label_map.json", "w") as f:
    json.dump(ID2LABEL, f)
```

Target: **≥80% per-language accuracy** on the test set. If below that, increase epochs
to 8 and check that synthetic data isn't too homogeneous.

DVC-track the artifact:
```bash
dvc add ml/chatbot/artifacts/xlm-roberta-iqueue
```

---

## Step 3 — Evaluate (`ml/chatbot/evaluate.py`)

Run evaluation separately per language. Print accuracy and a confusion matrix for
each of the 4 locales. Flag any intent with recall < 0.70 — that intent needs more
training examples before the demo.

---

## Step 4 — Backend Service (`backend/app/services/chatbot/bot.py`)

```python
from transformers import pipeline
from langdetect import detect
import json, os

class ChatbotService:
    def __init__(self):
        model_path = os.getenv("CHATBOT_MODEL_PATH", "ml/chatbot/artifacts/xlm-roberta-iqueue")
        with open(f"{model_path}/../label_map.json") as f:
            self.id2label = json.load(f)

        self.pipe = pipeline(
            "text-classification",
            model=model_path,
            tokenizer=model_path,
            device=-1,          # CPU; set to 0 if GPU available
            top_k=None,         # return all scores
        )

    def classify(self, text: str) -> dict:
        try:
            lang = detect(text)
        except Exception:
            lang = "unknown"

        results = self.pipe(text)[0]          # list of {label, score}
        top = max(results, key=lambda x: x["score"])

        return {
            "intent":            top["label"],
            "confidence":        round(top["score"], 4),
            "detected_language": lang,
            "all_scores":        {r["label"]: round(r["score"], 4) for r in results},
        }

# Instantiate once at module level so the model loads on startup, not per request
chatbot_service = ChatbotService()
```

Add `CHATBOT_MODEL_PATH` to `.env` and `.env.example`.

---

## Step 5 — API Endpoint (`backend/app/api/v1/chatbot.py`)

```python
from fastapi import APIRouter
from pydantic import BaseModel
from app.services.chatbot.bot import chatbot_service

router = APIRouter(prefix="/chatbot", tags=["chatbot"])

class ChatRequest(BaseModel):
    query: str
    booking_id: str | None = None

class ChatResponse(BaseModel):
    intent: str
    confidence: float
    detected_language: str
    response_text: str
    suggested_actions: list[str]

RESPONSE_TEMPLATES = {
    "check_booking":      "Let me look up your booking. Please provide your booking ID or phone number.",
    "request_requeue":    "I can help you rebook. Please share your original booking reference.",
    "get_departure_info": "Which route and date are you checking? I'll pull the schedule.",
    "surge_info":         "Passenger volumes are forecast to be high during that period. Would you like to see the 7-day forecast?",
    "fallback":           "I didn't quite catch that. You can ask about your booking, departure times, or rebooking.",
}

ACTIONS = {
    "check_booking":      ["Provide Booking ID", "Search by Phone"],
    "request_requeue":    ["Start Rebooking", "View Available Buses"],
    "get_departure_info": ["Show Schedule", "Book Now"],
    "surge_info":         ["View Forecast", "Book Early"],
    "fallback":           ["Check Booking", "View Schedule", "Contact Support"],
}

@router.post("/message", response_model=ChatResponse)
async def chat(req: ChatRequest):
    result = chatbot_service.classify(req.query)
    intent = result["intent"]
    return ChatResponse(
        intent=intent,
        confidence=result["confidence"],
        detected_language=result["detected_language"],
        response_text=RESPONSE_TEMPLATES[intent],
        suggested_actions=ACTIONS[intent],
    )
```

Register the router in `backend/app/main.py`:
```python
from app.api.v1 import chatbot
app.include_router(chatbot.router, prefix="/api/v1")
```

---

## Step 6 — Frontend (`frontend/src/components/ChatbotPanel.tsx`)

The panel already exists from Sprint 3. Wire it to the live endpoint:

```typescript
// In lib/api.ts — add this function
export async function sendChatMessage(query: string, bookingId?: string) {
  const res = await axios.post<ChatResponse>("/chatbot/message", {
    query,
    booking_id: bookingId ?? null,
  });
  return res.data;
}
```

In `ChatbotPanel.tsx`, replace any mock/placeholder `handleSend` with:
```typescript
const handleSend = async () => {
  if (!input.trim()) return;
  setMessages(prev => [...prev, { role: "user", text: input }]);
  setInput("");
  setLoading(true);
  try {
    const data = await sendChatMessage(input, bookingId);
    setMessages(prev => [
      ...prev,
      {
        role:    "bot",
        text:    data.response_text,
        intent:  data.intent,
        actions: data.suggested_actions,
        lang:    data.detected_language,
      },
    ]);
  } finally {
    setLoading(false);
  }
};
```

Render `suggested_actions` as tappable pill buttons below each bot message. On tap,
send the action label back as the next `query`.

---

## Environment Variables to Add

```bash
# .env and .env.example
CHATBOT_MODEL_PATH=ml/chatbot/artifacts/xlm-roberta-iqueue
ANTHROPIC_API_KEY=<your-key>   # only needed during dataset generation (Step 1)
```

---

## Acceptance Checklist

- [ ] `prepare_dataset.py` produces balanced CSVs (~200–400 rows total, no language
      with fewer than 40 rows per intent)
- [ ] `train.py` completes without OOM error on the target machine
- [ ] Per-language test accuracy ≥ 80% for all 4 locales
- [ ] No intent with recall < 0.70 on the test set
- [ ] `POST /api/v1/chatbot/message` returns 200 with correct intent for sample queries
- [ ] Filipino query ("Nasaan ang aking booking?") → `check_booking`
- [ ] Indonesian query ("Kapan bus ke Jakarta?") → `get_departure_info`
- [ ] Vietnamese query ("Xe có đông không?") → `surge_info`
- [ ] Frontend panel sends user input and renders bot response + action pills
- [ ] Model artifacts DVC-tracked and committed
