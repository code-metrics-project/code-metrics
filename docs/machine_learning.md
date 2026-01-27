# Machine learning forecasts

Machine learning forecasts let CodeMetrics produce forward-looking projections for any time-series dataset via a standalone Python-based Machine Learning API. The capability replaces the legacy TensorFlow predictions workflow and is being rolled out incrementally across the stack.

> **Warning**
> Machine learning forecasts are experimental. The user interface, API contract and deployment workflow may continue to change while we validate the approach. The original predictions feature (enabled via `FEATURE_PREDICTIONS`) is still available for backwards compatibility but is scheduled for removal once the new flow is fully adopted.

## Overview

- Available as an optional `Machine learning forecast` transformer for any chart that returns dated metrics.
- Delegates time-series forecasting to the dedicated ML API found in the `machinelearning/` package.
- Currently supports the Holt-Winters, ARIMA and SARIMA models with simple 80/20 training/test data splits.
- Returns a forecast series and root-mean-square error (RMSE) so users can evaluate model fit before overlaying the results in the UI.

## Architecture

### Web UI transformer

- When the backend exposes the feature flag, the UI renders a transformer card with date pickers for the training window and forecast horizon plus a model selector.
- Transformer selections are sent to the backend alongside the source query so each workload can request a forecast.
- The UI overlays the forecast series on top of the baseline chart once results are returned.

### Backend transform

- A new `ml-forecast` transform orchestrates the call to the ML API for each workload associated with the query.
- The current implementation is wrapped in `FEATURE_ML_FORECASTS` and will eventually replace the TensorFlow-based `predict`/`predict2` helpers.
- Until the integration is fully wired, the transform still returns stubbed data while the ML API contract stabilises.

```36:68:backend/src/transforms/impl/mlForecast.ts
async function fetchMLForecast(
  workload,
  { forecastEndDate, forecastModel, forecastStartDate, trainingDataStartDate }: TMLForecastArgs,
): Promise<TMLForecastAPIResponse> {
  // TODO: Fetch this from API.
  const response = await fetch("http://localhost:8080/ml");
  return response.json();
}
```

## Enabling the feature

1. **Run the Mocks**
2. **Expose the transformer** by setting `FEATURE_ML_FORECASTS=true` in the backend environment.
3. Restart the backend so the bootstrap payload to the UI includes the new feature flag.

## API contract

- Endpoint: `POST /api/forecast`
- Request body fields:
  - `model`: one of `"Holt Winters"`, `"Arima"`, `"Sarima"`
  - `metric`: the column to forecast
  - `index`: the column containing ISO-8601 timestamps
  - `normalise`: `true` to normalise data before fitting
  - `data`: array of records (strings are coerced to numeric where possible)

```json
{
  "model": "Holt Winters",
  "metric": "open_bugs",
  "index": "date",
  "normalise": true,
  "data": [
    { "date": "2024-09-01", "open_bugs": "12" },
    { "date": "2024-09-08", "open_bugs": "15" },
    { "date": "2024-09-15", "open_bugs": "21" }
  ]
}
```

```json
{
  "model": "Holt Winters",
  "metric": "open_bugs",
  "rms": 3.27,
  "forecast": {
    "2024-09-22": 24.6,
    "2024-09-29": 26.1
  }
}
```

The backend will adapt the response into the query result structure so the UI can render the forecast alongside historic datapoints.

## Using forecasts in the UI

1. Open any time-series chart (for example, open bugs or deployment frequency).
2. Add the `Machine learning forecast` transformer and choose the training and forecast dates plus a model.
3. Run the query; once the backend finishes the ML request the chart overlays the forecast line and displays the RMSE in the transformer panel.

## Limitations and roadmap

- Data should be supplied at daily granularity to align with the configured seasonal periods.
- Only a single metric per request is forecast today; multi-metric forecasting will arrive alongside richer UI model selection.
- The backend currently returns mocked data while we finish wiring the ML API—update the transform endpoint when the contract is finalised.
- Expect the `FEATURE_PREDICTIONS` flag to be removed after the ML forecasts flow is fully validated.

## Legacy predictions

The previous TensorFlow implementation remains guarded by `FEATURE_PREDICTIONS`. Keep both features disabled in production or run them side-by-side while you compare results. Once the ML forecast journey is ready for general availability the old flag and documentation will be removed.
