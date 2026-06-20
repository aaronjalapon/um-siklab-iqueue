# IQueue AI Model, Training Notebook, and App Integration Improvement Plan

**Project:** IQueue — AI-Powered Smart Boarding and Passenger Surge Forecasting  
**Team:** UM SIKLAB  
**Track:** Smart Cities / ASEAN AI Hackathon  
**Prepared for:** Model, backend, frontend, and documentation teammates  
**Current purpose of notebook:** Training and exporting the AI model, not serving as the final app

> **Implementation update (June 20, 2026):** the application now includes the
> continuous-learning tables and APIs, shared ground-truth builder, non-mutating
> retraining replay, seven-model comparison pipeline, evidence dashboard,
> consent-aware seat explanations, QR verification, and CPU-only ML container.
> The active model bundle is still labeled legacy validation evidence. One
> canonical Kaggle/Colab GPU retrain remains before claiming untouched-test
> metrics. See `docs/MODEL_CARD.md`, `docs/DATA_CARD.md`, and
> `docs/DEMO_SCRIPT.md`.

---

## 1. Executive Summary

The current IQueue forecasting notebook already proves that the project has a real AI component: it trains models for passenger demand forecasting and surge detection across multiple inter-provincial routes. However, for a stronger ASEAN AI Hackathon entry, the notebook should be improved from a simple model-training experiment into a professional **train → validate → export → test inference → app integration** pipeline.

The main improvement is not simply adding a more complex model. The stronger improvement is to make the model **usable, explainable, exportable, and connected to real terminal actions**.

The final goal is this:

> IQueue should not only predict passenger demand. It should forecast demand, detect surge risk, explain the risk, and send app-ready recommendations such as opening extra boarding lanes, preparing standby buses, or activating crowd-control measures.

---

## 2. Current System Understanding

The notebook currently functions as a training environment for the IQueue forecasting model. It includes:

- Route definitions for Mindanao inter-provincial routes.
- Synthetic/simulated ridership data.
- Exploratory data analysis.
- Preprocessing for Prophet and LSTM.
- A Prophet forecasting model.
- An LSTM passenger-demand forecasting model.
- A LightGBM surge classifier.
- Evaluation and plotting.
- Artifact export through a ZIP file.
- A sanity-check prediction section.

The app will later download and connect to the trained model. Because of this, the notebook should focus on producing a reliable **model bundle** that the app/backend can load safely.

---

## 3. Main Goal of the Improvements

The improved notebook and app integration should prove the following:

1. The model was trained using a defensible time-series workflow.
2. The model was compared against simple baselines.
3. The best model was exported together with all required preprocessing artifacts.
4. The exported model can run outside the notebook.
5. The model output can be used directly by the IQueue app.
6. The app can convert model predictions into operational decisions.
7. The team is honest about limitations, especially synthetic data and the need for real terminal data.

---

## 4. High-Level Improvement Summary for Teammates

### What will be improved?

The notebook will be upgraded from a training-only experiment into a complete ML training and export pipeline. It will still be used for training the model, but it will also prepare everything the app needs to use the model correctly.

### Why are we improving it?

Because a trained model alone is not enough. The app needs the model, the scaler, route configuration, feature columns, surge thresholds, and inference logic. Without these, the app may load the model but produce wrong predictions.

### What will the app receive from the notebook?

The notebook will export a complete model bundle containing:

- Demand forecasting model.
- Surge detection model.
- Preprocessing scaler.
- Feature column list.
- Route configuration.
- Surge thresholds.
- Holiday/event configuration.
- Model metadata.
- Inference helper script.
- Example API request and response.

### What is the biggest change?

The output will no longer be only:

> Predicted passengers = 850

Instead, the final model output should become:

> Route: Davao → General Santos  
> Forecast: 850 passengers  
> Surge probability: 78%  
> Risk level: Critical  
> Recommended action: Prepare standby bus and open extra boarding lane

---

## 5. Priority Improvements

## Priority 1 — Fix the Training and Evaluation Workflow

### Problem

Time-series models can look better than they really are if future data accidentally leaks into training or preprocessing.

### Improvement

Use strict time-based splitting:

```text
Train data      → used for model training and preprocessing
Validation data → used for tuning and checking model behavior
Test data       → final untouched evaluation
Future data     → never used in training
```

Suggested split:

```text
2022–2023       → Train
Jan–Jun 2024    → Validation
Jul–Dec 2024    → Test
```

### Required changes

- Compute scalers using training data only.
- Compute outlier caps using training data only.
- Compute surge thresholds using training data only.
- Train Prophet only on training dates before forecasting validation/test dates.
- Avoid centered rolling averages that use future values.
- Use past-only rolling features.
- Make target alignment explicit, especially for tomorrow’s surge prediction.

### Acceptance criteria

The notebook should clearly show:

```text
No future passenger values are used during training, preprocessing, or threshold calculation.
```

---

## Priority 2 — Add Baseline Comparison

### Problem

Judges may ask: “Why do we need AI for this?”

If we only show the final model, we do not prove that it is better than simple methods.

### Improvement

Add baseline models:

1. Yesterday’s demand as tomorrow’s prediction.
2. 7-day moving average.
3. Prophet only.
4. LSTM only.
5. LSTM + LightGBM surge classifier.

### Output table

The notebook should produce a comparison like this:

| Model | MAE | RMSE | MAPE | Surge Precision | Surge Recall | Surge F1 |
|---|---:|---:|---:|---:|---:|---:|
| Yesterday baseline | TBD | TBD | TBD | TBD | TBD | TBD |
| 7-day moving average | TBD | TBD | TBD | TBD | TBD | TBD |
| Prophet only | TBD | TBD | TBD | TBD | TBD | TBD |
| LSTM only | TBD | TBD | TBD | TBD | TBD | TBD |
| LSTM + LightGBM surge classifier | TBD | TBD | TBD | TBD | TBD | TBD |

### Why this matters

This gives the team a strong explanation:

> Simple baselines can estimate normal demand, but they struggle with surge periods. Our hybrid approach improves both demand forecasting and surge-risk detection.

---

## Priority 3 — Reframe the Model Architecture Correctly

### Problem

The current model should not be explained as “LSTM predicts surges” if the surge detection mainly comes from LightGBM.

### Improved framing

Use this explanation:

```text
Prophet: Captures seasonality and route-level travel patterns.
LSTM: Predicts baseline passenger demand from recent sequential patterns.
LightGBM: Detects surge probability using route, holiday, recent demand, and calendar features.
Decision Layer: Converts demand forecast and surge probability into terminal actions.
```

### Final architecture statement

> IQueue uses a hybrid forecasting and surge-detection pipeline. The LSTM forecasts baseline passenger demand, while the LightGBM classifier estimates surge risk. The app then converts the combined output into operational recommendations for terminal administrators.

---

## Priority 4 — Add a Real 7-Day Forecast Export

### Problem

The current future forecasting section should be improved so that it gives a usable multi-day forecast for the app.

### Improvement

The notebook should output a 7-day forecast table per route:

| Date | Route | Forecast Passengers | Surge Probability | Risk Level | Recommended Action |
|---|---|---:|---:|---|---|
| 2026-06-20 | Davao → Cagayan de Oro | 820 | 0.64 | High | Open extra boarding lane |
| 2026-06-21 | Davao → General Santos | 940 | 0.81 | Critical | Prepare standby bus |

### Implementation options

#### Option A — Recommended for hackathon

Use Prophet for the multi-day future baseline forecast and LightGBM for daily surge probability.

This is easier to explain and faster to implement.

#### Option B — More advanced

Use recursive LSTM forecasting:

```text
Predict Day 1
Use Day 1 prediction as part of the next input window
Predict Day 2
Repeat until Day 7
```

This is more complex and may introduce error accumulation.

### Recommended decision

Use **Option A** for the hackathon because it is stable, explainable, and easier to connect to the app.

---

## Priority 5 — Add an Operational Decision Layer

### Problem

A forecast alone is not enough for a smart-city solution. Terminal administrators need recommended actions.

### Improvement

Create rules that convert model output into actions.

### Suggested risk thresholds

| Surge Probability | Risk Level | Recommended Action |
|---:|---|---|
| 0.00–0.30 | Normal | Continue normal boarding operations |
| 0.30–0.55 | Watch | Monitor queue and prepare staff |
| 0.55–0.75 | High | Open extra boarding lane and notify dispatcher |
| 0.75–1.00 | Critical | Prepare standby bus, activate crowd-control plan, and alert admin |

### Additional operational metrics

The app can also calculate:

```text
Expected excess demand = predicted_passengers - available_seats
Required extra buses = ceil(expected_excess_demand / bus_capacity)
```

### Example output

```json
{
  "route": "Davao → General Santos",
  "forecast_date": "2026-06-20",
  "predicted_passengers": 940,
  "available_seats": 720,
  "expected_excess_demand": 220,
  "required_extra_buses": 5,
  "surge_probability": 0.81,
  "risk_level": "Critical",
  "recommended_action": "Prepare standby bus, open extra boarding lane, and alert terminal admin"
}
```

---

## Priority 6 — Export a Complete Model Bundle

### Problem

The app cannot use the model correctly if only the model file is exported.

### Improvement

Export a full model bundle.

### Recommended folder structure

```text
iqueue_model_bundle/
│
├── models/
│   ├── lstm_demand_model.pt
│   ├── lightgbm_surge_model.pkl
│   └── prophet_models/
│       ├── davao_cagayan.pkl
│       ├── davao_cotabato.pkl
│       ├── davao_gensan.pkl
│       ├── cagayan_iligan.pkl
│       ├── davao_butuan.pkl
│       └── cotabato_zamboanga.pkl
│
├── preprocessing/
│   ├── scaler.pkl
│   ├── feature_columns.json
│   ├── route_encoder.json
│   └── sequence_config.json
│
├── configs/
│   ├── route_config.json
│   ├── surge_thresholds.json
│   ├── holiday_calendar.json
│   └── risk_action_rules.json
│
├── inference/
│   ├── inference.py
│   └── sample_request.json
│
├── reports/
│   ├── model_metrics.json
│   ├── baseline_comparison.csv
│   └── model_card.md
│
├── requirements.txt
└── model_metadata.json
```

### Why this matters

The app needs exactly the same preprocessing and feature order used during training. If feature order or scaling changes, the model can produce invalid predictions.

---

## Priority 7 — Add an Inference Smoke Test

### Problem

A model may work inside the notebook but fail when loaded by the backend.

### Improvement

After exporting the bundle, reload the exported files and run a sample prediction.

### Sample request

```json
{
  "route_id": "davao-gensan",
  "forecast_date": "2026-06-20",
  "recent_daily_passengers": [420, 450, 470, 510, 530, 600, 650],
  "scheduled_trips": 12,
  "bus_capacity": 45,
  "available_seats": 540,
  "is_weekend": true,
  "is_holiday": false,
  "weather_condition": "normal"
}
```

### Expected response

```json
{
  "route_id": "davao-gensan",
  "route_label": "Davao → General Santos",
  "forecast_date": "2026-06-20",
  "predicted_passengers": 735,
  "surge_probability": 0.68,
  "risk_level": "High",
  "expected_excess_demand": 195,
  "required_extra_buses": 5,
  "recommended_action": "Open extra boarding lane and prepare standby bus"
}
```

### Acceptance criteria

The notebook should show:

```text
Export successful.
Reload successful.
Sample inference successful.
Output is valid JSON.
```

---

## Priority 8 — Add Model Metadata and Model Card

### Problem

Hackathon judges appreciate transparency. A model card makes the AI system look more professional and ethical.

### `model_metadata.json`

```json
{
  "model_name": "IQueue Demand Forecasting and Surge Detection Model",
  "version": "v1.0-hackathon",
  "training_date": "2026-06-19",
  "forecast_horizon_days": 7,
  "input_window_days": 14,
  "supported_routes": [
    "Davao → Cagayan de Oro",
    "Davao → Cotabato",
    "Davao → General Santos",
    "Cagayan de Oro → Iligan",
    "Davao → Butuan",
    "Cotabato → Zamboanga"
  ],
  "model_components": [
    "Prophet",
    "LSTM",
    "LightGBM"
  ],
  "target_outputs": [
    "predicted_passenger_demand",
    "surge_probability",
    "risk_level",
    "recommended_action"
  ],
  "limitations": [
    "Prototype trained on simulated route data",
    "Requires real terminal ticketing, boarding, dispatch, and queue data before production deployment",
    "Predictions should support human decision-making, not replace terminal administrators"
  ]
}
```

### Model card sections

The notebook should generate or include a `model_card.md` with:

- Model purpose.
- Input features.
- Output fields.
- Training data description.
- Metrics.
- Intended users.
- Limitations.
- Ethical considerations.
- Human oversight requirement.

---

## Priority 9 — Add Explainability

### Problem

Judges may ask why the model predicted a surge.

### Improvement

Add feature importance for the LightGBM surge classifier.

### Example explanation

```text
The model predicted high surge risk because:
1. Passenger demand increased sharply over the last 7 days.
2. The forecast date is near a holiday/weekend.
3. The route historically experiences high demand during this period.
4. Available seats are lower than expected demand.
```

### Suggested output

| Feature | Importance |
|---|---:|
| rolling_7day_mean | TBD |
| is_holiday | TBD |
| day_of_week | TBD |
| route_id | TBD |
| previous_day_passengers | TBD |

### App use

The app can show a simple admin explanation:

> High surge risk due to recent demand increase and weekend travel pattern.

---

## Priority 10 — Add Uncertainty Ranges

### Problem

Single-number forecasts can be misleading.

### Improvement

Export lower and upper forecast bounds.

Example:

```json
{
  "predicted_passengers": 850,
  "forecast_lower": 720,
  "forecast_upper": 980
}
```

### Why this matters

Terminal admins can prepare better if they know the possible range:

```text
Expected passengers: 850
Possible range: 720–980
```

This is more realistic than pretending the model knows the exact future passenger count.

---

## Priority 11 — Add Real-World Data Integration Plan

### Problem

The current model uses simulated/synthetic data. This is okay for a prototype, but not enough for real-world deployment.

### Improvement

Add a section in the notebook explaining how the model will be retrained with real data.

### Real-world data needed

| Data Type | Source |
|---|---|
| Tickets sold | Terminal ticketing system |
| Passenger boarding count | Boarding gate scanner/manual count |
| Queue length | Camera/manual staff input |
| Scheduled trips | Operator schedule database |
| Actual dispatched buses | Dispatcher records |
| Bus capacity | Operator fleet database |
| Delay time | Terminal operations log |
| Holidays/events | Calendar/event database |
| Weather | Weather API |
| Traffic | Traffic API or LGU data |

### Real-world deployment statement

> The current model demonstrates the AI pipeline using simulated route data. For production, the same training process should be repeated using actual terminal ticketing, boarding, queue, dispatch, weather, and holiday data.

---

## Priority 12 — Add Retraining Plan

### Problem

Passenger behavior changes over time. A model trained once will eventually become outdated.

### Improvement

Define a retraining workflow.

### Suggested retraining cycle

```text
Daily app usage data
        ↓
Database storage
        ↓
Weekly/monthly model retraining
        ↓
Validation against recent data
        ↓
Deploy new model only if performance improves
        ↓
Archive old model version
```

### Model monitoring metrics

Track these after deployment:

- Forecast MAPE.
- Surge recall.
- Surge false alarm rate.
- Average passenger waiting time.
- Number of overcrowding incidents.
- Number of extra buses recommended.
- Number of recommendations followed by admins.

---

# 6. App Integration Plan

## 6.1 Recommended Architecture

Use a Python model service for inference.

```text
Frontend / Mobile App
        ↓
Main Backend
        ↓ HTTP request
Python FastAPI Model Service
        ↓
Model Bundle
        ↓
Forecast JSON Response
```

### Why FastAPI?

- Easier to load PyTorch, Prophet, LightGBM, and scikit-learn.
- Easier to reuse notebook inference code.
- Avoids forcing Node.js or frontend code to load ML models directly.
- Faster for hackathon integration.

---

## 6.2 Backend Endpoint

Suggested endpoint:

```http
POST /api/forecast
```

### Request body

```json
{
  "route_id": "davao-gensan",
  "forecast_date": "2026-06-20",
  "recent_daily_passengers": [420, 450, 470, 510, 530, 600, 650],
  "scheduled_trips": 12,
  "bus_capacity": 45,
  "available_seats": 540,
  "is_weekend": true,
  "is_holiday": false,
  "weather_condition": "normal"
}
```

### Response body

```json
{
  "route_id": "davao-gensan",
  "route_label": "Davao → General Santos",
  "forecast_date": "2026-06-20",
  "predicted_passengers": 735,
  "forecast_lower": 650,
  "forecast_upper": 850,
  "surge_probability": 0.68,
  "risk_level": "High",
  "expected_excess_demand": 195,
  "required_extra_buses": 5,
  "recommended_action": "Open extra boarding lane and prepare standby bus",
  "model_version": "v1.0-hackathon"
}
```

---

## 6.3 Admin Dashboard Improvements

The admin dashboard should show:

- Forecasted passenger demand per route.
- Surge probability.
- Risk level badge.
- Recommended terminal action.
- Expected excess demand.
- Required extra buses.
- Forecast range.
- Explanation of why a route is high risk.
- Last model update/version.

### Suggested dashboard cards

```text
Route: Davao → General Santos
Forecast: 735 passengers
Available seats: 540
Excess demand: 195
Required extra buses: 5
Surge probability: 68%
Risk level: High
Action: Open extra boarding lane and prepare standby bus
```

---

## 6.4 Passenger App Improvements

The passenger-facing app should not show complicated ML metrics.

It should show simple useful information:

- Expected crowd level.
- Suggested travel time.
- Boarding status.
- Queue status.
- Seat availability.
- Delay alerts.
- Recommended arrival time.

Example passenger message:

```text
High passenger volume is expected for Davao → General Santos today.
Please arrive 30–45 minutes earlier than usual. Extra boarding support may be activated.
```

---

## 7. Notebook Structure After Improvement

Recommended final notebook structure:

```text
1. Project Overview
   - What IQueue predicts
   - Why demand forecasting matters

2. Environment Setup
   - Libraries
   - Runtime detection

3. Data Loading
   - Simulated route data
   - Data dictionary
   - Real-world data integration note

4. Exploratory Data Analysis
   - Demand trends
   - Route comparison
   - Holiday and weekend patterns
   - Surge-day distribution

5. Leakage-Safe Preprocessing
   - Train/validation/test split
   - Train-only scaling
   - Train-only thresholds
   - Past-only rolling features

6. Baseline Models
   - Yesterday baseline
   - 7-day moving average
   - Prophet baseline

7. AI Model Training
   - LSTM demand forecasting
   - LightGBM surge classifier

8. Hybrid Forecasting System
   - Baseline forecast
   - Surge probability
   - Adjusted forecast

9. Evaluation
   - MAE, RMSE, MAPE
   - Surge precision, recall, F1
   - Baseline comparison
   - Holiday-only evaluation

10. Explainability
   - Feature importance
   - Surge reason generation

11. Decision Layer
   - Risk levels
   - Recommended actions
   - Extra bus calculation

12. 7-Day Forecast Generation
   - Route-level future forecast table
   - Admin-ready output

13. Model Export
   - Save models
   - Save preprocessing
   - Save configs
   - Save metadata
   - ZIP model bundle

14. Inference Smoke Test
   - Reload exported bundle
   - Run sample app request
   - Validate JSON response

15. Model Card and Limitations
   - Synthetic data note
   - Human oversight
   - Privacy
   - Real-world deployment requirements
```

---

# 8. Tasks by Team Role

## ML teammate

- Fix leakage-safe train/validation/test split.
- Add baseline comparison.
- Improve 7-day forecast generation.
- Export complete model bundle.
- Add inference smoke test.
- Generate model metadata and model card.
- Add explainability and uncertainty intervals if time allows.

## Backend teammate

- Create FastAPI model service or backend route.
- Load model bundle.
- Implement `/api/forecast`.
- Validate request body.
- Return forecast JSON.
- Add error handling for missing routes or invalid inputs.
- Log predictions for future retraining.

## Frontend teammate

- Add admin dashboard forecast cards.
- Show risk level badges.
- Show recommended action.
- Show passenger-facing crowd alerts.
- Avoid showing raw ML complexity to passengers.
- Make model outputs easy to understand.

## Documentation/pitch teammate

- Update hackathon report to explain the improved pipeline.
- Emphasize that AI supports human decision-making.
- Be transparent that the current prototype uses simulated data.
- Explain real-world data requirements.
- Prepare a short diagram of the AI pipeline.

---

# 9. Suggested Development Phases

## Phase 1 — Must Finish Before Demo

- Leakage-safe preprocessing.
- Baseline comparison.
- Final model training.
- Complete model bundle export.
- Inference smoke test.
- App API contract.
- Admin dashboard prediction display.

## Phase 2 — Strong Hackathon Enhancements

- Explainability.
- Forecast uncertainty range.
- 7-day route forecast.
- Extra bus calculation.
- Risk-level action recommendations.
- Model card and metadata.

## Phase 3 — Real-World Readiness

- Replace synthetic data with real terminal data.
- Integrate ticketing and boarding records.
- Add queue-length data.
- Monitor prediction performance.
- Create retraining pipeline.
- Add privacy and consent workflow.

---

# 10. Final Hackathon Framing

The improved IQueue AI system should be explained like this:

> IQueue uses a hybrid AI forecasting pipeline to predict route-level passenger demand and detect surge risk. The trained model is exported from the notebook as a complete model bundle and connected to the app through an inference API. Instead of only displaying predictions, IQueue converts AI outputs into practical terminal actions such as opening extra boarding lanes, preparing standby buses, and alerting administrators before overcrowding occurs. The current prototype uses simulated route data to demonstrate the AI pipeline, while real-world deployment will require actual ticketing, boarding, dispatch, occupancy, and queue data from terminal operations.

---

# 11. Final Checklist

## Notebook checklist

- [ ] Strict time-based split.
- [ ] Train-only preprocessing.
- [ ] Baseline models added.
- [ ] Prophet/LSTM/LightGBM results compared.
- [ ] Surge classification metrics added.
- [ ] 7-day forecast table generated.
- [ ] Risk level and action rules added.
- [ ] Model bundle exported.
- [ ] Inference smoke test passed.
- [ ] Model metadata created.
- [ ] Model card created.
- [ ] Synthetic data limitation clearly stated.

## App checklist

- [ ] Backend can load model bundle.
- [ ] `/api/forecast` endpoint created.
- [ ] Forecast response returns valid JSON.
- [ ] Admin dashboard displays risk level and action.
- [ ] Passenger app shows simple crowd-level alerts.
- [ ] Prediction logs stored for future retraining.
- [ ] Error handling added for unsupported routes.

## Pitch checklist

- [ ] Explain why AI is needed.
- [ ] Show baseline vs improved model.
- [ ] Show model output in the actual app.
- [ ] Mention human oversight.
- [ ] Mention real-world data requirements.
- [ ] Avoid claiming production readiness without real data.

---

# 12. Short Summary for Team Chat

We are improving the IQueue AI notebook so it becomes a professional training and export pipeline, not just a model experiment. The notebook will still be used for training, but it will now also export a complete model bundle for the app, including the model files, scaler, feature columns, route configs, surge thresholds, metadata, and inference logic.

The app will use the exported model through an API. Instead of only showing predicted passengers, the system will return forecasted demand, surge probability, risk level, expected excess demand, required extra buses, and recommended terminal actions.

The biggest improvements are: leakage-safe evaluation, baseline comparison, real 7-day forecast output, model export bundle, inference smoke test, API-ready JSON output, and a decision layer that converts predictions into useful terminal actions.

This makes IQueue stronger for the ASEAN AI Hackathon because it shows that our AI is not just a notebook result. It is designed to support an actual smart-city transportation app.
