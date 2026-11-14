# S-Money Coach

A chat coach for the S-mobiili app. You talk to your own money, and the coach answers with real numbers from your transactions.
Built at Junction 2026 for the S-Pankki challenge **Personal Economic Trainer**.

## 1. Run it

You need: Python 3.10 or newer, Node.js, `uv` (`pip install uv`) and `pnpm` (`npm install -g pnpm`).

**First time only**

| Step | macOS / Linux | Windows |
|---|---|---|
| 1. Download the data | `./download.sh` | `download.bat` |
| 2. Install everything | `./initialize.sh` | `initialize.bat` |
| 3. Add your Gemini key | open `.env`, set `GEMINI_API_KEY=your_key` | same |
| 4. Build the database | `./setup_db.sh` | `setup_db.bat` |

Step 2 creates the `.env` file. Step 4 takes a few minutes. If `db/money_coach.sqlite3` already exists, skip steps 1 and 4.
Get a free Gemini key at https://aistudio.google.com (key icon, "Generate API key").
If the `.csv` files in `Challenge data` look broken, delete them and run step 1 again.

**Every time**

| macOS / Linux | Windows |
|---|---|
| `./run.sh` | `run.bat` |

Open http://localhost:8081 and tap the **AI** tab. Stop with `Ctrl+C`.

**Demo tips**

- The app signs in as demo customer `CUST02706`. "Today" in the demo is **15 September 2026**.
- A habit challenge lasts 7 days. To see its result now, move the demo date forward. Replace `2026-09-22` with the end date of the challenge:
  ```bash
  T=$(curl -s -X POST localhost:8000/api/v1/demo/session -H 'content-type: application/json' -d '{"customer_id":"CUST02706"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
  curl -X PUT localhost:8000/api/v1/demo/clock -H "Authorization: Bearer $T" -H 'content-type: application/json' -d '{"today":"2026-09-22"}'
  ```
- To start with no challenges: `sqlite3 db/money_coach.sqlite3 "delete from challenges;"` and restart.
- Optional keys in `.env`: `ELEVENLABS_API_KEY` (read answers aloud), `OLLAMA_BASE_URL` and `OLLAMA_API_KEY` (local model, see `.env.example`).

## 2. The challenge, and where to find each answer

| The challenge asks for | Where it is |
|---|---|
| Chat with your own money, in your own words | The **AI** tab, in every part |
| Simple and deeper questions ("taxis last month", "What kind of spender am I?") | Understand My Money |
| The three baskets | Understand My Money |
| Benchmarks with open data | Understand My Money |
| "What is safe to spend this week?" | Plan My Finances |
| "What if I cut dining out by 20%?" | Plan My Finances |
| Explain financial concepts in plain language | Every part (five short explanations) |
| Guide users to healthier money habits | Improve My Habits |
| A mobile app, or a web app that fits in one | One Expo (React Native) app with phone-sized screens, tested in the browser |

## 3. Features, by part

### Understand My Money
- Spending in the **three baskets**: euros, percent, number of purchases, top 5 groups, change since last month.
- **Spending question**: "How much did I spend on taxis last month?" gives the exact sum.
- **6-month trend** of the baskets (1 to 12 months). The current month is marked as partial.
- **Spender type**: one type, traits with evidence, tips.
- **Compare with similar people**: your monthly average, the middle value of the group, your place in the group, and the size of the group.
- **Statistics Finland** reference with year and link.
- **See all**: open the transactions behind any number.

### Plan My Finances
- **Balance forecast** for 30, 60 or 90 days. The lowest point is marked.
- **Safe to spend** per day, this week and until payday.
- **What if**: change a category by -100% to +100%. See the saving per month and per year, and months to a savings goal.
- **Upcoming bills**: predicted bills with date, amount and confidence.
- **Expense alerts**: up to 10 purchases at least 3 times bigger than usual for that group.
- **Quick quiz**: one question under the balance forecast and under safe to spend.
- **Reward card** under the what-if with your yearly saving.

### Improve My Habits
- **Finds one habit** in your everyday spending: at least 3 purchases in 28 days and 1 in the last 7 days.
- **Names the pattern**: rising, weekend, many small purchases, or a few bigger ones.
- **Offers a 7-day challenge**: the goal is half of last week, rounded down to whole euros. Yearly saving is shown as an estimate.
- **Start**, **Another challenge**, **Check progress**, **Skip challenge**. One challenge runs at a time.
- **Progress**: spent so far, days left, "doing well" or "careful".
- **Result after 7 days**: goal reached or not, this week against the week before, and one line on what you learned: compare equal periods, and one week is a sign, not proof.
- **Red dot on the bell** when a result is ready.
- **Question buttons** on each challenge card. The coach answers from the card's numbers.
- **Savings goal**: "I want to save 600 EUR for a trip" gives the number of weeks the saving would need (an estimate).
- Say "I want to skip the challenge" in the chat and the coach does it.

### In every part
- **Ask in your own words.** The coach finds the numbers, then explains them.
- **Read aloud** and **talk to the coach** with your voice (ElevenLabs, optional key).
- **Plain-language concepts**: small purchases add up, compare equal periods, fixed vs everyday spending, spending pace, one week is not proof.
- **Private by design**: you can only see your own data.

## 4. How it works

- The **server calculates every number**. The AI model never writes database queries and never sees your raw transactions or your customer id. It only explains numbers that are already checked.
- **Gemini** decides what to look up and writes the answer. You can also set up a local model (Gemma with Ollama). Then answers that contain your numbers are written on your own computer.
- The app and the server follow fixed data formats. They are in `contracts/`.
- **Data**: the test data from S-Pankki in `Challenge data/`. It has about 5,100 customers and 3.6 million transactions. It is not real customer data.

```
frontend/   Expo app (chat, cards, voice)         contracts/  API and tool contracts
backend/    FastAPI, services, tools, tests       docs/       plan, decisions, user stories
db/         SQLite database                       scripts/    data loading, local model
```

## 5. Tests

```bash
cd backend  && uv run pytest -q
cd frontend && pnpm test && pnpm exec tsc --noEmit
```

## 6. Limits

- The free Gemini key has a small daily limit. Use a fresh key for a demo.
- The data is test data. It ends on 30 September 2026.
- The chat does not offer the old monthly spending limit. The API still has it.
- English only. No push notifications: the bell shows a red dot inside the app.
- The Windows scripts are less tested than the macOS ones.

## 7. More

`docs/vertical-slices.md` (the three parts), `docs/architecture.md`, `docs/requirements.md`, `docs/user-stories.md`, `docs/decisions/` (why we chose things).

## Team

Veikka Liukkonen · Luara Silva · Kseniia Shlenskaia
