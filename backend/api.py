from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
import yfinance as yf
from datetime import datetime, timedelta
import torch
import joblib
import os
import requests
import nltk
from nltk.sentiment import SentimentIntensityAnalyzer
from typing import List, Dict

# Assuming the model and other scripts are in the same directory or accessible
# We will need to refactor the training script to make components reusable
# For now, let's define the necessary components here or import them.

# ================== Model and Scaler Loading (Placeholder) ==================
# In a real application, these would be loaded once at startup.
def load_model_and_scaler(ticker):
    model_path = f"backend/models/{ticker.replace('^', '')}_model.pth"
    scaler_path = f"backend/models/{ticker.replace('^', '')}_scaler.pkl"

    if not os.path.exists(model_path) or not os.path.exists(scaler_path):
        raise HTTPException(status_code=404, detail=f"Model for {ticker} not found. Please train it first.")

    # This is a simplified version of the EnhancedLSTMWithAttention class.
    # For this to work, the class definition must be available.
    # We will need to import it from the training script.
    from main import EnhancedLSTMWithAttention 

    # The parameters (input_size, hidden_sizes, etc.) should be saved during training
    # and loaded here. For now, we use placeholders.
    model = EnhancedLSTMWithAttention(input_size=29, hidden_sizes=[128, 256], output_size=4, dropout=0.3)
    model.load_state_dict(torch.load(model_path))
    model.eval()

    scaler = joblib.load(scaler_path)
    return model, scaler

# ================== Feature Engineering (Placeholder) ==================
# These functions should be imported from a shared module.
def _create_features_for_chunk(df):
    # This is a simplified feature creation function.
    # In a real app, import this from your training script.
    # Assuming talib is installed.
    import talib
    df['SMA_20'] = df['Close'].rolling(window=20).mean()
    df['SMA_50'] = df['Close'].rolling(window=50).mean()
    df['SMA_200'] = df['Close'].rolling(window=200).mean()
    df['EMA_12'] = df['Close'].ewm(span=12, adjust=False).mean()
    df['EMA_26'] = df['Close'].ewm(span=26, adjust=False).mean()
    df['RSI'] = talib.RSI(df['Close'], timeperiod=14)
    df['MACD'], df['MACD_signal'], df['MACD_hist'] = talib.MACD(df['Close'], fastperiod=12, slowperiod=26, signalperiod=9)
    df['MOM'] = talib.MOM(df['Close'], timeperiod=10)
    df['ATR'] = talib.ATR(df['High'], df['Low'], df['Close'], timeperiod=14)
    upper, middle, lower = talib.BBANDS(df['Close'], timeperiod=20, nbdevup=2, nbdevdn=2)
    df['BB_upper'], df['BB_middle'], df['BB_lower'] = upper, middle, lower
    df['OBV'] = talib.OBV(df['Close'], df['Volume'])
    df['AD'] = talib.AD(df['High'], df['Low'], df['Close'], df['Volume'])
    df['ADX'] = talib.ADX(df['High'], df['Low'], df['Close'], timeperiod=14)
    df['Returns'] = df['Close'].pct_change()
    df['LogReturns'] = np.log(df['Close'] / df['Close'].shift(1))
    df['Volatility'] = df['Returns'].rolling(window=20).std()
    df['DayOfWeek'] = df['Date'].dt.dayofweek
    df['Month'] = df['Date'].dt.month
    df['Quarter'] = df['Date'].dt.quarter
    return df

def analyze_sentiment(news_df):
    if news_df.empty:
        return pd.DataFrame(columns=['date', 'sentiment'])
    nltk.download('vader_lexicon', quiet=True)
    sia = SentimentIntensityAnalyzer()
    
    news_df['sentiment'] = news_df['headline'].apply(lambda x: sia.polarity_scores(x)['compound'] if isinstance(x, str) else 0)
    sentiment_by_date = news_df.groupby('date')['sentiment'].mean().reset_index()
    
    return sentiment_by_date

def fetch_news(ticker, start_date, end_date):
    NEWS_API_KEY = "YOUR_NEWS_API_KEY" # IMPORTANT: Add your key here
    params = {
        'q': ticker, 'from': start_date, 'to': end_date,
        'sortBy': 'relevancy', 'apiKey': NEWS_API_KEY
    }
    response = requests.get("https://newsapi.org/v2/everything", params=params)
    articles = response.json().get('articles', [])
    news_data = [{'date': article['publishedAt'][:10], 'headline': article['title']} for article in articles]
    return pd.DataFrame(news_data)

# ================== FastAPI App ==================
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allows all origins
    allow_credentials=True,
    allow_methods=["*"], # Allows all methods
    allow_headers=["*"], # Allows all headers
)

@app.get("/")
def read_root():
    return {"message": "Stock Prediction API"}

@app.post("/predict")
async def get_prediction(ticker: str = Form("RELIANCE.NS")):
    try:
        # 1. Load Model and Scaler
        # Note: This requires the training script to be refactored to share the model class
        # For now, we assume `main.py` is in the parent directory.
        import sys
        sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
        
        model, scaler = load_model_and_scaler(ticker)
        
        # 2. Fetch latest data
        end_date = datetime.now()
        start_date = end_date - timedelta(days=365) # Fetch one year of data to have enough for features
        
        df = yf.download(ticker, start=start_date.strftime('%Y-%m-%d'), end=end_date.strftime('%Y-%m-%d'))
        df.reset_index(inplace=True)
        
        # 3. Feature Engineering
        news_df = fetch_news(ticker, start_date, end_date)
        sentiment_df = analyze_sentiment(news_df)
        
        df = _create_features_for_chunk(df.copy())

        if not sentiment_df.empty:
            df['Date'] = pd.to_datetime(df['Date'])
            sentiment_df['date'] = pd.to_datetime(sentiment_df['date'])
            df = df.merge(sentiment_df, left_on='Date', right_on='date', how='left')
            df['sentiment'] = df['sentiment'].fillna(0)
            df = df.drop(columns=['date'])
        else:
            df['sentiment'] = 0

        df.dropna(inplace=True)

        if df.shape[0] < 100:
             raise HTTPException(status_code=400, detail="Not enough data to make a prediction.")

        # 4. Prepare data for prediction
        features = ['Open', 'High', 'Low', 'Close', 'Volume', 'SMA_20', 'SMA_50', 'SMA_200', 'EMA_12', 'EMA_26', 'RSI', 'MACD', 'MACD_signal', 'MACD_hist', 'MOM', 'ATR', 'BB_upper', 'BB_middle', 'BB_lower', 'OBV', 'AD', 'ADX', 'Returns', 'LogReturns', 'Volatility', 'DayOfWeek', 'Month', 'Quarter', 'sentiment']
        
        last_sequence = df[features].tail(100).values
        scaled_sequence = scaler.transform(last_sequence)
        
        sequence_tensor = torch.tensor(scaled_sequence, dtype=torch.float32).unsqueeze(0)
        
        # 5. Make Prediction
        with torch.no_grad():
            prediction_scaled = model(sequence_tensor)

        # 6. Inverse Transform Prediction
        # Create a dummy array with the same number of features as the scaler expects
        dummy_prediction = np.zeros((1, len(features)))
        # Place the scaled prediction into the correct columns (O, H, L, C)
        dummy_prediction[0, 0:4] = prediction_scaled.numpy()
        
        prediction_rescaled = scaler.inverse_transform(dummy_prediction)[0, 0:4]
        
        return {
            "ticker": ticker,
            "prediction": {
                "Open": prediction_rescaled[0],
                "High": prediction_rescaled[1],
                "Low": prediction_rescaled[2],
                "Close": prediction_rescaled[3]
            }
        }

    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Model for {ticker} not found. Please train the model first by running the main.py script.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/historical")
def get_historical(
    ticker: str = Query(..., description="Stock ticker"),
    start: str = Query(..., description="Start date YYYY-MM-DD"),
    end: str = Query(..., description="End date YYYY-MM-DD")
) -> List[Dict]:
    import yfinance as yf
    import pandas as pd

    df = yf.download(ticker, start=start, end=end)
    df = df.reset_index()
    # Format for lightweight-charts: [{ time: 'YYYY-MM-DD', value: close }, ...]
    data = [
        {"time": row["Date"].strftime("%Y-%m-%d"), "value": row["Close"]}
        for _, row in df.iterrows()
    ]
    return data

# To run this app:
# uvicorn backend.api:app --reload --port 8000
