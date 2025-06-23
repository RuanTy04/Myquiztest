import React, { useEffect, useState } from "react";
import axios from "axios";

function App() {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [showWrongOnly, setShowWrongOnly] = useState(false);
  const [sessionIds, setSessionIds] = useState([]);
  const [wrongIds, setWrongIds] = useState(JSON.parse(localStorage.getItem("wrongQuestionIds") || "[]"));

  useEffect(() => {
    const storedSessionIds = JSON.parse(localStorage.getItem("sessionQuestionIds") || "[]");

    const loadQuestions = async () => {
      const res = await axios.get("https://myquiztest.onrender.com/get-questions?count=30");
      const newQuestions = res.data.filter(q => !storedSessionIds.includes(q.id));
      const selected = newQuestions.length >= 30 ? newQuestions.slice(0, 30) : res.data.slice(0, 30);

      setQuestions(selected);
      setAnswers({});
      setResult(null);
      const newIds = selected.map(q => q.id);
      const mergedIds = Array.from(new Set([...storedSessionIds, ...newIds]));
      localStorage.setItem("sessionQuestionIds", JSON.stringify(mergedIds));
      setSessionIds(mergedIds);
    };

    if (showWrongOnly) {
      axios.get("http://localhost:5000/get-questions?count=100").then((res) => {
        const wrongQuestions = res.data.filter((q) => wrongIds.includes(q.id));
        setQuestions(wrongQuestions);
        setAnswers({});
        setResult(null);
      });
    } else {
      loadQuestions();
    }
  }, [showWrongOnly]);

  const handleOptionChange = (qid, value, isMulti, checked) => {
    if (!isMulti) {
      setAnswers({ ...answers, [qid]: value });
    } else {
      const current = answers[qid] || "";
      const newAnswer = checked
        ? Array.from(new Set((current + value).split(""))).sort().join("")
        : current
            .split("")
            .filter((c) => c !== value)
            .sort()
            .join("");
      setAnswers({ ...answers, [qid]: newAnswer });
    }
  };

  const handleInputChange = (qid, value) => {
    setAnswers({ ...answers, [qid]: value });
  };

  const handleSubmit = async () => {
    const submittedQuestions = questions.map(q => q.id);
    const filteredAnswers = {};
    submittedQuestions.forEach(id => {
      filteredAnswers[id] = answers[id] || "";
    });

    const res = await axios.post("http://localhost:5000/submit-answers", filteredAnswers);
    const filteredFeedback = res.data.feedback.filter(fb => submittedQuestions.includes(fb.id));

    const detailedFeedback = filteredFeedback.map(fb => {
      const fullQuestion = questions.find(q => q.id === fb.id);
      return {
        ...fb,
        options: fullQuestion?.options || [],
        explanation: fullQuestion?.explanation || ""
      };
    });

    const updatedWrongIds = detailedFeedback
      .filter((fb) => !fb.correct)
      .map((fb) => fb.id);
    localStorage.setItem("wrongQuestionIds", JSON.stringify(updatedWrongIds));
    setWrongIds(updatedWrongIds);

    setResult({
      ...res.data,
      feedback: detailedFeedback
    });
  };

  const progress = Object.keys(answers).length;
  const total = questions.length;

  const resetSession = () => {
    localStorage.removeItem("sessionQuestionIds");
    setShowWrongOnly(false);
  };

  if (result) {
    return (
      <div style={{ padding: 20 }}>
        <h1>🎉 答题结果</h1>
        {result.feedback.map((fb, i) => (
          <div key={i} style={{ marginBottom: 16, border: "1px solid #ccc", padding: 10 }}>
            <strong>{i + 1}. {fb.title}</strong>
            <ul>
              {fb.options.map((opt, idx) => (
                <li key={idx}>{opt}</li>
              ))}
            </ul>
            <p>你的答案：{fb.user_answer} ✅ 正确答案：{fb.correct_answer}</p>
            <p style={{ color: fb.correct ? "green" : "red" }}>
              {fb.correct ? "✅ 正确" : "❌ 错误"}
            </p>
            {fb.explanation && <p>📘 解析：{fb.explanation}</p>}
          </div>
        ))}
        <h3>总分：{result.score} / {result.total}</h3>
        {wrongIds.length > 0 && (
          <button onClick={() => setShowWrongOnly(true)} style={{ padding: "8px 16px", marginTop: 10 }}>
            🔁 再次挑战当前错题（共 {wrongIds.length} 道）
          </button>
        )}
        <button onClick={resetSession} style={{ padding: "8px 16px", marginLeft: 10 }}>
          🏠 继续练习新题（重置已抽）
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>📘 公文写作题库答题系统</h1>
      <div style={{ marginBottom: 10 }}>答题进度：{progress} / {total}</div>
      {questions.map((q, idx) => (
        <div key={q.id} style={{ marginBottom: 20, borderBottom: "1px solid #ccc", paddingBottom: 10 }}>
          <p><strong>{idx + 1}. {q.title}</strong></p>
          {q.options.map((opt, i) => {
            const label = opt[0];
            const isMulti = q.type === 2;
            const isChecked = (answers[q.id] || "").includes(label);
            const inputType = q.type === 1 || q.type === 3 ? "radio" : "checkbox";
            return (
              <label key={i} style={{ display: "block", marginLeft: 10 }}>
                <input
                  type={inputType}
                  name={q.id}
                  value={label}
                  checked={isChecked}
                  onChange={(e) => handleOptionChange(q.id, label, isMulti, e.target.checked)}
                /> {opt}
              </label>
            );
          })}
          {[1, 2, 3].includes(q.type) ? null : (
            <input
              placeholder="请输入答案"
              value={answers[q.id] || ""}
              onChange={(e) => handleInputChange(q.id, e.target.value)}
              style={{ padding: 4, width: 200, marginTop: 8 }}
            />
          )}
        </div>
      ))}
      <button onClick={handleSubmit} style={{ padding: "10px 20px", fontSize: "16px" }}>
        提交答案
      </button>
    </div>
  );
}

export default App;
