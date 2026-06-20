# IQueue Forecasting Model Card

## Purpose

IQueue forecasts route-level passenger demand seven days ahead and converts
surge risk into operator actions. The deployed prototype uses one Prophet and
one LSTM artifact per demonstration route plus a shared LightGBM surge gate.

## Evidence Protocol

**Current active-bundle status (June 20, 2026):** complete for six-route
inference, but its comparison metrics are legacy validation/artifact metrics.
They are not approved as untouched-test evidence. The manifest reports
`evaluation_protocol: legacy_validation_metrics` until the final GPU run
replaces the bundle.

The canonical candidate pipeline uses the following protocol:

- Data: synthetic Mindanao route-day demand; no field pilot has been completed.
- Split: chronological 70% train, 15% validation, 15% untouched test per route.
- Selection: validation only for early stopping, classifier threshold, and surge multiplier.
- Reporting: test MAE, RMSE, MAPE, precision, recall, F1, false-alarm rate, and route-bootstrap 95% intervals.
- Baselines: yesterday, seven-day average, Prophet-only, LSTM-only, Prophet+LSTM, LightGBM, and the decision model.

Run `python ml/forecasting/train.py --validate-only` before training and execute
the full command on Kaggle/Colab GPU. The resulting `model_metadata.json`
contains data hashes, split dates, dependency versions, Git revision, and
artifact checksums.

Do not copy the current `61.33` MAE or `0.817` surge F1 into a test-results
claim. Those values remain useful only as labeled legacy evidence.

## Human Oversight

Operators may accept, modify, or reject recommendations. Overrides are not
treated as truth until joined with actual route-day outcomes. Candidate models
are promoted only when surge F1 or recall improves and MAE regresses by no more
than five percent.

## Limitations

- Current results measure synthetic generalization, not real terminal impact.
- Six route-specific models do not automatically generalize to unseen routes.
- Holiday and recent-demand features depend on accurate operational inputs.
- Confidence intervals describe test variability and are not safety guarantees.
