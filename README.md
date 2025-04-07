
# 🧠 Step Mom Test — Real-Time Interview Coach for Customer Discovery

**Step Mom Test** is an open-source Chrome extension that listens to your customer interviews and gives you real-time feedback — calling out when you break the rules of _The Mom Test_.

It’s brutally honest (like a stepmom), but it makes you a better interviewer.

---

## 🚀 Features

- 🎙️ **Live transcription** using your mic or tab audio
- 🧠 **GPT-4o-powered analysis** of your conversation
- 🚨 Real-time flags for:
  - FLUFF — vague praise
  - SPECULATION — asking hypotheticals
  - PITCHING — selling your product
  - LEADING — guiding the answer
- 💡 Smart follow-up question suggestions
- 📝 Rolling summaries + full transcript
- ⏱️ Interview timer
- ⚡ 100% local and frontend-only — no server, no database

---

## 📚 What’s *The Mom Test*?

Rob Fitzpatrick’s book teaches you how to ask questions **even your mom can’t lie to you about**.

> ❌ “Would you use this?”
> ✅ “When’s the last time you dealt with this problem?”

It’s all about avoiding biased feedback and uncovering real user needs.

---

## 🔧 How to Install (Chrome Extension)

1. Download this repository:
   ```bash
   git clone https://github.com/RaghavKatta/step-mom-test.git
   ```

2. Open Chrome and go to:
   ```
   chrome://extensions/
   ```

3. Toggle on **Developer Mode** (top-right corner)

4. Click **Load unpacked** and select the project folder (the one containing `manifest.json`)

5. The Step Mom Test icon should now appear in your extension bar

---

## 🗝️ How to Use

1. Open the extension
2. Paste your OpenAI API key (get one at [platform.openai.com](https://platform.openai.com))
3. Optionally fill in:
   - The problem you're testing
   - Customer archetype
   - 3 key insights you want from the call
4. Start an interview (on Zoom, Meet, in person, etc.)
5. Click **Start**
6. Watch it flag issues and suggest better questions in real time
7. Click **Stop** to end, and reflect on your transcript & summary

---

## 💻 Tech Stack

- Vanilla JavaScript (no frameworks)
- HTML / CSS
- `webkitSpeechRecognition` for real-time transcription
- `chrome.tabCapture` for tab audio
- OpenAI GPT-4o-mini for analysis
- No backend — all processing is done client-side

---

## 🛠 Dev Notes

- All prompts are in `sidebar.js`
- HTML structure is in `index.html`
- Styling in `sidebar.css`
- Uses local context (problem/customer/questions) to generate personalized summaries and suggestions
- Built with speed and usability in mind for early-stage founders, researchers, and builders

---

## 📦 Folder Structure

```
📁 step-mom-test/
├── manifest.json
├── index.html
├── sidebar.js
├── sidebar.css
└── README.md
```

---

## 🤝 Contributing

Feel free to fork this repo, open issues, or submit pull requests!  
This is a weekend project, but we’d love to see it grow with help from the community.

---

## ⚡ Built at Station F  
By Raghav Katta & Samu in one caffeine-fueled night  
Inspired by *The Mom Test* by Rob Fitzpatrick

---

## License

MIT — do whatever you want with it, just don’t build a nicer version and call it **Cool Aunt Test** without letting us try it first 😎
