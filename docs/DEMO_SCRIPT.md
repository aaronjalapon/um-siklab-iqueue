# Five-Minute IQueue Demo Script

## 0:00–0:45 — Problem

Intercity terminals often react after queues form. IQueue links demand
forecasting, explainable boarding decisions, and outcome feedback in one loop.
State clearly that the prototype uses synthetic data and simulation.

## 0:45–2:00 — Operator Forecast

Open `/operator`, select Davao City to Cagayan de Oro, and show the seven-day
volume forecast, confidence range, model version, risk level, and recommended
action. Accept or modify the recommendation and explain that the immutable
snapshot preserves exactly what the operator saw.

## 2:00–3:00 — Passenger Boarding

Book a passenger, explicitly opt in or out of seatmate matching, and show the
seat recommendation reasons. Open the signed QR pass and verify it at
`/operator/scanner`, including a tampered-token rejection.

## 3:00–4:00 — Close the Learning Loop

Record the route outcome on the operator dashboard. Replay the learning cycle:
snapshot join, ground-truth validation, candidate comparison, and promotion
gate. Emphasize that the replay is simulated and does not mutate the champion.

## 4:00–4:40 — Evidence

Open `/operator/evidence`. Show the model-comparison protocol label, chatbot
language/intent audit, allocation benchmark, QR tamper benchmark, and SimPy
queue scenario. Until the final canonical GPU run is complete, call forecasting
numbers legacy validation evidence, not untouched-test evidence. Call all
operational improvements simulation estimates, not field results.

## 4:40–5:00 — Close

IQueue is not an autonomous dispatcher. It is a human-governed decision system
that records evidence, learns from outcomes, and remains usable when one model
degrades. End with the next milestone: a real operator pilot and external validation.
