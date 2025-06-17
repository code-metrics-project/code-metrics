import os
from fastapi import FastAPI, HTTPException, Response
import pandas as pd
from pmdarima import auto_arima
from pydantic import BaseModel
from typing import Dict, List
import logging
from enum import StrEnum

from statsmodels.tsa.holtwinters import ExponentialSmoothing
from statsmodels.tsa.arima.model import ARIMA
from sklearn.metrics import mean_squared_error
from statsmodels.tsa.statespace.sarimax import SARIMAX


description = """
Machine Learning API that enables Code Metrics to perform Analysis and Predictions based on provided data

## Single Value Analysis

Performs analysis on a single element returning a p

* **coverage** (_not implemented_).

## Multi Value Analysis (Simulation) x

* **coverage** (_not implemented_).

"""
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Code Metrics Machine Learning API",
    description=description,
    summary="Machine Learning Component for Code Metrics",
    version="0.0.1",
    terms_of_service="https://code-metrics-project.github.io/docs/",
    contact={
        "name": "Code Metrics",
        "url": "https://code-metrics-project.github.io/docs/",
        "email": "",
    },
    license_info={
        "url": "https://code-metrics-project.github.io/docs/",
    },
)


class SupportedModels(StrEnum):
    ARIMA = "Arima"
    HOLT_WINTERS = "Holt Winters"
    SARIMA = "Sarima"


class ForecastRequest(BaseModel):
    model: str
    metric: str
    index: str
    normalise: bool
    data: List[Dict[str, str]]


class DataHandler:
    def __init__(self, data: pd.DataFrame):
        self.data = data

    def get_metrics_names(self) -> List:
        return list(self.data.columns)

    def apply_model(self, model: str, metric: str):
        if metric not in list(self.data.columns):
            raise HTTPException(
                status_code=400,
                detail=str(f"Metric not Found: {metric} [{list(self.data.columns)}]"),
            )

        metric_observed = self.data[metric].dropna()

        train_size = int(len(metric_observed) * 80 / 100)  # 80% for training

        train_set = metric_observed[:train_size]
        validation_set = metric_observed[train_size:]

        logger.info(f"Processing using model : {model}")

        all_models_seasonal_periods = 7

        fitted_model = None
        match model:
            case SupportedModels.HOLT_WINTERS:
                fitted_model = ExponentialSmoothing(
                    train_set,
                    trend="add",
                    damped_trend=True,
                    seasonal="add",
                    seasonal_periods=all_models_seasonal_periods,
                    freq="D",
                ).fit()
            case SupportedModels.ARIMA:
                arima_parameters = auto_arima(train_set)
                fitted_model = ARIMA(
                    train_set,
                    order=arima_parameters.order,
                ).fit()

            case SupportedModels.SARIMA:
                sarima_parameters = auto_arima(train_set, seasonal=True, m=all_models_seasonal_periods)

                fitted_model = SARIMAX(
                    train_set,
                    order=sarima_parameters.order,
                    seasonal_order=sarima_parameters.seasonal_order,
                    enforce_invertibility=False,
                ).fit()

            case _:
                raise HTTPException(status_code=400, detail=str(f"Model Not Found: {model}"))

        forecasts = fitted_model.forecast(steps=len(validation_set))

        fc = {}
        fc["model"] = model
        fc["metric"] = metric
        fc["rms"] = mean_squared_error(validation_set, forecasts)
        fc["forecast"] = {date.strftime("%Y-%m-%d"): value for date, value in forecasts.items()}

        return fc

    def get_normalised_data(self):
        return (self.data - self.data.min(skipna=True)) / (self.data.max(skipna=True) - self.data.min(skipna=True))

    def get_data(self, normalise: bool):
        if normalise:
            return self.get_normalised_data()
        else:
            return self.data


@app.get("/api/health/liveness")
async def live_check():
    return {"liveness": "live"}


@app.get("/api/health/readiness")
async def ready_check():
    return {"readiness": "ready"}


@app.post("/api/forecast", status_code=200)
async def forecast_handler(forcast_request: ForecastRequest, response: Response):
    try:
        supported_model = forcast_request.model in SupportedModels._value2member_map_
        logger.info(
            "Received request for model %s  %s",
            forcast_request.model,
            "Supported" if supported_model else "Unsupported",
        )
        if not supported_model:
            raise HTTPException(
                status_code=400,
                detail=str(f"Model not supported: {forcast_request.model}"),
            )

        records = forcast_request.data
        df = pd.DataFrame.from_records(data=records)
        df[forcast_request.index] = pd.to_datetime(df[forcast_request.index])
        df = df.set_index(forcast_request.index)

        numeric_cols = [x for x in df.keys() if x != forcast_request.index]
        for col in numeric_cols:
            try:
                df[col] = pd.to_numeric(df[col], errors="coerce")
            except (ValueError, TypeError):
                pass

        forecast = DataHandler(df).apply_model(forcast_request.model, forcast_request.metric)

        return forecast
    except Exception as e:
        logger.error(str(e))
        raise HTTPException(status_code=400, detail=str(e))


def main():
    import uvicorn

    uvicorn.run(app, port=int(os.getenv("MLAPI_PORT", 8080)), host=os.getenv("MLAPI_ADDR", "0.0.0.0"))


if __name__ == "__main__":
    main()
