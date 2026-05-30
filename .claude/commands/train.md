# /train — Train or Retrain the Demand Forecasting Model

Train the Prophet + LSTM hybrid model for IQueue passenger surge prediction.

## Pre-flight Checks

1. Verify the cleaned dataset exists at `ml/forecasting/data/cleaned/ridership_cleaned.csv`. If it does not exist, tell the user to run the Sprint 1 data pipeline first (`python data/pipeline/clean.py`).

2. Check that required Python packages are installed:
   ```bash
   pip show prophet torch scikit-learn pandas numpy
   ```
   If any are missing, install from `ml/requirements.txt`:
   ```bash
   pip install -r ml/requirements.txt
   ```

## Training

3. Run the training script:
   ```bash
   cd ml/forecasting && python train.py --data data/cleaned/ridership_cleaned.csv --output artifacts/
   ```

4. After training completes, run the evaluation script and print the results:
   ```bash
   python evaluate.py --artifacts artifacts/
   ```
   Report the following metrics to the user:
   - MAE (Mean Absolute Error) on test set
   - Surge Recall (did the model correctly flag surge days?)
   - Target threshold: ≥70% surge prediction accuracy

5. If the surge recall is below 70%, suggest the following to the user:
   - Check if ASEAN holiday calendar features are correctly joined to the dataset
   - Try increasing LSTM hidden units in `model.py`
   - Verify the train/test split does not leak surge event dates

## After Training

6. Track the new model artifacts with DVC:
   ```bash
   dvc add ml/forecasting/artifacts/prophet_model.pkl ml/forecasting/artifacts/lstm_model.pt
   git add ml/forecasting/artifacts/*.dvc
   git commit -m "ml(forecasting): retrain Prophet+LSTM model"
   ```

7. Update `PROPHET_MODEL_PATH` and `LSTM_MODEL_PATH` in `.env` if the artifact filenames changed.
