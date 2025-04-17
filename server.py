from fastapi import FastAPI, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from openai import OpenAI

# Initialize OpenAI client
client = OpenAI()
app = FastAPI()

# Allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount frontend
frontend_path = os.path.join(os.path.dirname(__file__), r"C:\Users\shrit\Desktop\Ml_Projects\DeepRead\DeepRead\frontend")
app.mount("/frontend", StaticFiles(directory=frontend_path), name="static")

@app.get("/")
async def serve_frontend():
    return FileResponse(os.path.join(frontend_path, "index.html"))

# ---------------- Load Models ---------------- #

gender_model_path = r"C:\Users\shrit\Desktop\Ml_Projects\DeepRead\DeepRead\gender_bias_model"
gender_tokenizer_path = r"C:\Users\shrit\Desktop\Ml_Projects\DeepRead\DeepRead\gender_bias_tokenizer"

political_lnr_model_path = r"C:\Users\shrit\Desktop\Ml_Projects\DeepRead\DeepRead\political_bias_LNR_model"
political_lnr_tokenizer_path = r"C:\Users\shrit\Desktop\Ml_Projects\DeepRead\DeepRead\political_bias_LNR_tokenizer"

race_model_path = r"C:\Users\shrit\Desktop\Ml_Projects\DeepRead\DeepRead\race_bias_model"
race_tokenizer_path = r"C:\Users\shrit\Desktop\Ml_Projects\DeepRead\DeepRead\race_bias_tokenizer"

gender_model = AutoModelForSequenceClassification.from_pretrained(gender_model_path)
gender_tokenizer = AutoTokenizer.from_pretrained(gender_tokenizer_path)

political_lnr_model = AutoModelForSequenceClassification.from_pretrained(political_lnr_model_path)
political_lnr_tokenizer = AutoTokenizer.from_pretrained(political_lnr_tokenizer_path)

race_model = AutoModelForSequenceClassification.from_pretrained(race_model_path)
race_tokenizer = AutoTokenizer.from_pretrained(race_tokenizer_path)

# ---------------- Helper Functions ---------------- #

def run_model(model, tokenizer, text):
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True)
    outputs = model(**inputs)
    probs = torch.softmax(outputs.logits, dim=1)
    score = probs[0][1].item() if probs.shape[1] > 1 else probs[0][0].item()
    return round(score, 4)

import html

def explain_and_rewrite(sentence, bias_type):
    try:
        prompt = f"""
This sentence may reflect {bias_type} bias:
"{sentence}"

1. Explain briefly why it might be considered biased. One sentence, no more than 12 words.
2. Suggest a rewritten version that removes the bias while preserving the meaning.

Respond as:
Explanation: <your explanation>
Rewrite: <your rewritten sentence>
"""
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt.strip()}],
            max_tokens=100,
        )
        result = response.choices[0].message.content.strip()
        result = html.escape(result)  # ✅ Escapes characters like " > < to prevent HTML corruption
        return result
    except Exception:
        return f"Explanation: {bias_type.title()} bias detected.\nRewrite: (could not rewrite)"


# ---------------- Bias Detection Endpoint ---------------- #

@app.post("/detect-bias")
async def detect_bias(request: Request):
    data = await request.json()
    text = data.get("text", "")

    sentences = [s.strip() for s in text.split('.') if s.strip()]
    biased_count = 0

    gender_scores, political_lnr_scores, race_scores = [], [], []
    highlighted_sentences, rewrite_summaries = [], []

    for sent in sentences:
        g_score = run_model(gender_model, gender_tokenizer, sent)
        p_score = run_model(political_lnr_model, political_lnr_tokenizer, sent)
        r_score = run_model(race_model, race_tokenizer, sent)

        gender_scores.append(g_score)
        political_lnr_scores.append(p_score)
        race_scores.append(r_score)

        if r_score > 0.95:
            style = "background-color: red; color: white;"
            result = explain_and_rewrite(sent, "racial")
            highlighted_sentences.append(f"<mark style='{style}' title=\"{result}\">{sent}</mark>")
            rewrite_summaries.append(f"Original: {sent}\n{result}")
            biased_count += 1

        elif g_score > 0.5:
            style = "background-color: green; color: white;"
            result = explain_and_rewrite(sent, "gender")
            highlighted_sentences.append(f"<mark style='{style}' title=\"{result}\">{sent}</mark>")
            rewrite_summaries.append(f"Original: {sent}\n{result}")
            biased_count += 1

        elif p_score < 0.1 or p_score > 0.9:
            style = "background-color: blue; color: white;"
            result = explain_and_rewrite(sent, "political")
            highlighted_sentences.append(f"<mark style='{style}' title=\"{result}\">{sent}</mark>")
            rewrite_summaries.append(f"Original: {sent}\n{result}")
            biased_count += 1

        else:
            highlighted_sentences.append(sent)

    highlighted_text = '. '.join(highlighted_sentences) + '.'

    def avg(lst):
        return round(sum(lst) / len(lst), 4) if lst else 0.0

    return {
        "summary": "Bias detection results across categories (averaged per sentence):",
        "highlighted": highlighted_text,
        "scores": {
            "gender": avg(gender_scores),
            "political_lnr": avg(political_lnr_scores),
            "race": avg(race_scores),
        },
        "biased_sentences": biased_count,
        "total_sentences": len(sentences),
        "rewrites": "\n\n".join(rewrite_summaries)
    }

# ---------------- Optional Reset Endpoint ---------------- #

@app.post("/reset")
async def reset_state():
    return {"status": "reset", "message": "State has been cleared."}

# ---------------- Fallback Route ---------------- #

@app.get("/{full_path:path}")
async def catch_all(full_path: str, request: Request):
    if full_path.startswith("detect-bias") or full_path.startswith("frontend"):
        return {"detail": "Not Found"}
    return FileResponse(os.path.join(frontend_path, "index.html"))
