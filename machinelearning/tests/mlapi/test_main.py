from unittest.mock import patch
from fastapi.testclient import TestClient
from mlapi.main import app,ForecastRequest

client = TestClient(app)


def test_forecast_handler_unsupported_model():
    test_data = [
        {"date": "2023-01-01", "value": "10"},
        {"date": "2023-01-02", "value": "20"},
        {"date": "2023-01-03", "value": "30"},
    ]

    test_forecast_request = ForecastRequest(
        model="Bad Model Name",
        metric="value",
        index="date",
        normalise=True,
        data=test_data,
    )

    response = client.post("/api/forecast", json=test_forecast_request.model_dump())

    assert response.status_code == 400
    assert response.headers["Content-Type"] == "application/json"

    res_data = response.json()
    assert res_data["detail"] == "400: Model not supported: Bad Model Name"

@patch("mlapi.main.DataHandler.apply_model")
def test_forecast_handler_supported_model(mock_apply_model):

    test_data = [
        {"date": "2023-01-01", "value": "10"},
        {"date": "2023-01-02", "value": "20"},
        {"date": "2023-01-03", "value": "30"},
    ]

    test_forecast_request = ForecastRequest(
        model="Holt Winters",
        metric="value",
        index="date",
        normalise=True,
        data=test_data,
    )

    mock_apply_model.return_value = {
        "model": "Arima",
        "metric": "value",
        "rms": 1234,
        "forecast": {"2023-01-04": 40, "2023-01-05": 50},
    }

    response = client.post("/api/forecast", json=test_forecast_request.model_dump())

    assert response.status_code == 200
    assert response.headers["Content-Type"] == "application/json"

    res_data = response.json()
    assert res_data["model"] == "Arima"
    assert res_data["metric"] == "value"
    assert res_data["rms"] == 1234
    assert res_data["forecast"] == {"2023-01-04": 40, "2023-01-05": 50}
