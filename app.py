# File: backend/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import random

app = Flask(__name__)
CORS(app)

# Load question bank
FILE_PATH ="D:\Personal\福州大学\大三下\公文写作\公文写作与处理选择题.xlsx"
df = pd.read_excel(FILE_PATH, sheet_name="Sheet1")

# Preprocess question list
questions_all = []
for idx, row in df.iterrows():
    question = {
        "id": str(idx),
        "type": int(str(row.iloc[0]).strip()),
        "title": str(row["标题"]).strip(),
        "answer": str(row["答案"]).strip().upper(),
        "options": [
            f"A. {row['选项A']}" if pd.notna(row['选项A']) else None,
            f"B. {row['选项B']}" if pd.notna(row['选项B']) else None,
            f"C. {row['选项C']}" if pd.notna(row['选项C']) else None,
            f"D. {row['选项D']}" if pd.notna(row['选项D']) else None,
            f"E. {row['选项E']}" if pd.notna(row['选项E']) else None,
            f"F. {row['选项F']}" if pd.notna(row['选项F']) else None,
        ],
        "explanation": str(row['本题解析（公布答案后学生可见）']) if '本题解析（公布答案后学生可见）' in row else ""
    }
    question["options"] = [opt for opt in question["options"] if opt]
    questions_all.append(question)

@app.route("/get-questions")
def get_questions():
    count = int(request.args.get("count", 30))
    selected = random.sample(questions_all, min(count, len(questions_all)))
    return jsonify(selected)

@app.route("/submit-answers", methods=["POST"])
def submit_answers():
    user_answers = request.get_json()
    feedback = []
    score = 0

    for q in questions_all:
        qid = q["id"]
        correct_answer = q["answer"].replace(" ", "").upper()
        user_answer = user_answers.get(qid, "").replace(" ", "").upper()
        correct = (user_answer == correct_answer)

        # 仅为选择题/判断题/填空题评分
        if q["type"] in [1, 2, 3, 4] and correct:
            score += 1

        feedback.append({
            "id": qid,
            "title": q["title"],
            "correct_answer": correct_answer,
            "user_answer": user_answer,
            "correct": correct,
            "explanation": q["explanation"]
        })

    return jsonify({"score": score, "total": len(user_answers), "feedback": feedback})

if __name__ == "__main__":
    app.run(debug=True)
