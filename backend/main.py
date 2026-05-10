from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
from sklearn.ensemble import RandomForestRegressor

app = FastAPI(title="AI Traffic Congestion Predictor")

# Allow requests from the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to localhost:5173
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DUMMY ML MODEL TRAINING ---
# In a real-world scenario, you would train a model on historical CSV data
# and load it via `import joblib; model = joblib.load('model.pkl')`.
# Here, we train a Random Forest on synthetic historical data on startup.
print("Initializing and training ML model on historical traffic patterns...")
X_train = np.random.rand(1000, 4) * 100  # Historical 4-lane flows
# Simulate that high traffic now -> even higher traffic in 15 mins
y_train = X_train * np.random.uniform(0.9, 1.4, size=(1000, 4)) 

model = RandomForestRegressor(n_estimators=10, random_state=42)
model.fit(X_train, y_train)
print("ML Model trained successfully and ready for predictions.")

# Pydantic schema for the incoming payload
class TrafficData(BaseModel):
    North: int
    South: int
    East: int
    West: int

@app.post("/predict")
def predict_congestion(data: TrafficData):
    """
    Receives current traffic flow and predicts congestion for T+15m.
    """
    # Prepare features for the ML model
    features = np.array([[data.North, data.South, data.East, data.West]])
    
    # Predict future values
    prediction = model.predict(features)[0]
    
    # Return formatted prediction
    return {
        "North": max(0, int(prediction[0])),
        "South": max(0, int(prediction[1])),
        "East": max(0, int(prediction[2])),
        "West": max(0, int(prediction[3]))
    }

@app.get("/")
def read_root():
    return {"status": "AI Traffic Predictor ML Backend is running", "model": "RandomForestRegressor"}
