# 0016 — Spending patterns name the habit

- **Status:** accepted (2026-11-14). No contract change: the pattern sentence is part of the existing `reason` text.
- **Context:** the coach used to explain the same concept for every habit, even when it did not fit (for example "small purchases add up" for three taxi rides of about EUR 33). The explanation has to follow what the customer's own data shows.
- **Decision:** every suggested habit gets exactly one pattern, found by `services/habits/patterns.py` from the customer's transactions, with no model involved. The first rule that matches wins:
  1. **Rising:** this week's spend is at least 30 percent above the habit's usual week (average of the 3 weeks before). Sentence: "That is up from about X in a usual week."
  2. **Weekend:** at least 2 purchases and at least 60 percent of the week's spend on Saturday and Sunday. "Most of it is spent on the weekend."
  3. **Many small purchases:** at least 3 purchases averaging at most EUR 15. "Many small purchases, about X each, that add up."
  4. **A few bigger purchases:** anything else. "A few bigger purchases, about X each."
- **Where it shows:** the sentence ends the `reason` of the suggestion card, and the assistant receives it with the card's facts, so "Why this habit?" is answered from the real pattern.
- **Reversibility:** easy. The thresholds are constants at the top of the module.
