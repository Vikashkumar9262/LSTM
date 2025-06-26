# ================== Import Libraries ==================
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import yfinance as yf
import torch
import torch.nn as nn
import torch.optim as optim
from sklearn.preprocessing import RobustScaler
from torch.utils.data import DataLoader, TensorDataset
from datetime import datetime, timedelta
import mplfinance as mpf
import talib
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.model_selection import TimeSeriesSplit
import optuna
import joblib
import os
import requests
from nltk.sentiment import SentimentIntensityAnalyzer
import nltk

# ================== Config ==================
class Config:
    TICKER = "^NSEBANK"  # Default ticker
    START_DATE = "2015-01-01"
    END_DATE = datetime.now().strftime('%Y-%m-%d')
    TRAIN_RATIO = 0.7
    VAL_RATIO = 0.15
    TEST_RATIO = 0.15
    SEQUENCE_LENGTH = 100
    FUTURE_STEPS = 1
    BATCH_SIZE = 32
    EPOCHS = 150
    LEARNING_RATE = 0.001
    PATIENCE = 10
    MODEL_BASE_PATH = "backend/models"
    CACHE_DIR = "backend/data_cache"
    NEWS_API_URL = "https://newsapi.org/v2/everything"
    NEWS_API_KEY = "a2a4046a48d74545a3cfa5717ac6185a"  # Replace with your News API key
    CHUNK_SIZE = 10000

    def __init__(self, ticker=None):
        if ticker:
            self.TICKER = ticker
        
        os.makedirs(self.MODEL_BASE_PATH, exist_ok=True)
        os.makedirs(self.CACHE_DIR, exist_ok=True)
        
        self.MODEL_PATH = f"{self.MODEL_BASE_PATH}/{self.TICKER.replace('^', '')}_model.pth"
        self.SCALER_PATH = f"{self.MODEL_BASE_PATH}/{self.TICKER.replace('^', '')}_scaler.pkl"
        self.CACHE_PATH = f"{self.CACHE_DIR}/{self.TICKER.replace('^', '')}.parquet"

# ================== Data Loading ==================
def load_data(config, use_cache=True):
    print(f"Loading data for {config.TICKER}...")
    if use_cache and os.path.exists(config.CACHE_PATH):
        cache_modified_time = os.path.getmtime(config.CACHE_PATH)
        cache_date = datetime.fromtimestamp(cache_modified_time)
        current_date = datetime.now()
        
        if (current_date - cache_date).days < 1 or config.END_DATE != datetime.now().strftime('%Y-%m-%d'):
            print(f"Loading from cache: {config.CACHE_PATH}")
            return pd.read_parquet(config.CACHE_PATH)
    
    try:
        df = yf.download(config.TICKER, start=config.START_DATE, end=config.END_DATE)
        df = df.reset_index()
        df = df.drop(['Adj Close'], axis=1, errors='ignore')
        
        if not df.empty:
            df.to_parquet(config.CACHE_PATH, compression='snappy')
            print(f"Data cached to {config.CACHE_PATH}")
        
        return df
    except Exception as e:
        print(f"Error loading data: {e}")
        if os.path.exists(config.CACHE_PATH):
            print(f"Loading from cache as fallback: {config.CACHE_PATH}")
            return pd.read_parquet(config.CACHE_PATH)
        else:
            raise

def fetch_news(ticker, start_date, end_date):
    print(f"Fetching news for {ticker}...")
    params = {
        'q': ticker,
        'from': start_date,
        'to': end_date,
        'sortBy': 'relevancy',
        'apiKey': Config.NEWS_API_KEY
    }
    response = requests.get(Config.NEWS_API_URL, params=params)
    articles = response.json().get('articles', [])
    
    news_data = [{'date': article['publishedAt'][:10], 'headline': article['title'], 'description': article['description']} for article in articles]
    
    return pd.DataFrame(news_data)

# ================== Sentiment Analysis ==================
def analyze_sentiment(news_df):
    if news_df.empty:
        return pd.DataFrame(columns=['date', 'sentiment'])
    nltk.download('vader_lexicon', quiet=True)
    sia = SentimentIntensityAnalyzer()
    
    news_df['sentiment'] = news_df['headline'].apply(lambda x: sia.polarity_scores(x)['compound'] if isinstance(x, str) else 0)
    sentiment_by_date = news_df.groupby('date')['sentiment'].mean().reset_index()
    
    return sentiment_by_date

# ================== Feature Engineering ==================
def create_features(df, sentiment_df):
    print("Creating technical indicators...")
    df['Date'] = pd.to_datetime(df['Date'])
    df = _create_features_for_chunk(df.copy())
    
    if not sentiment_df.empty:
        sentiment_df['date'] = pd.to_datetime(sentiment_df['date'])
        df = df.merge(sentiment_df, left_on='Date', right_on='date', how='left')
        df['sentiment'] = df['sentiment'].fillna(0)
        df = df.drop(columns=['date'])
    else:
        df['sentiment'] = 0

    df = df.dropna()
    return df

def _create_features_for_chunk(df):
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

# ================== Data Preprocessing ==================
def prepare_data(df, config):
    print("Preparing data for training...")
    features = ['Open', 'High', 'Low', 'Close', 'Volume', 'SMA_20', 'SMA_50', 'SMA_200', 'EMA_12', 'EMA_26', 'RSI', 'MACD', 'MACD_signal', 'MACD_hist', 'MOM', 'ATR', 'BB_upper', 'BB_middle', 'BB_lower', 'OBV', 'AD', 'ADX', 'Returns', 'LogReturns', 'Volatility', 'DayOfWeek', 'Month', 'Quarter', 'sentiment']
    
    df_features = df[features].dropna()
    
    train_size = int(len(df_features) * config.TRAIN_RATIO)
    val_size = int(len(df_features) * config.VAL_RATIO)
    
    data_train = df_features.iloc[:train_size]
    data_val = df_features.iloc[train_size:train_size+val_size]
    data_test = df_features.iloc[train_size+val_size:]
    
    target_cols = ['Open', 'High', 'Low', 'Close']
    target_cols_idx = [features.index(c) for c in target_cols]

    scaler = RobustScaler()
    data_train_scaled = scaler.fit_transform(data_train)
    data_val_scaled = scaler.transform(data_val)
    data_test_scaled = scaler.transform(data_test)
    
    joblib.dump(scaler, config.SCALER_PATH)
    
    x_train, y_train = create_sequences(data_train_scaled, config.SEQUENCE_LENGTH, config.FUTURE_STEPS, target_cols_idx)
    x_val, y_val = create_sequences(data_val_scaled, config.SEQUENCE_LENGTH, config.FUTURE_STEPS, target_cols_idx)
    x_test, y_test = create_sequences(data_test_scaled, config.SEQUENCE_LENGTH, config.FUTURE_STEPS, target_cols_idx)
    
    train_dataset = TensorDataset(torch.tensor(x_train, dtype=torch.float32), torch.tensor(y_train, dtype=torch.float32))
    val_dataset = TensorDataset(torch.tensor(x_val, dtype=torch.float32), torch.tensor(y_val, dtype=torch.float32))
    test_dataset = TensorDataset(torch.tensor(x_test, dtype=torch.float32), torch.tensor(y_test, dtype=torch.float32))
    
    train_loader = DataLoader(train_dataset, batch_size=config.BATCH_SIZE, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=config.BATCH_SIZE, shuffle=False)
    test_loader = DataLoader(test_dataset, batch_size=config.BATCH_SIZE, shuffle=False)
    
    return train_loader, val_loader, test_loader, scaler, features, data_test, target_cols, df['Date'].iloc[train_size+val_size+config.SEQUENCE_LENGTH:]

def create_sequences(data, seq_length, future_steps, target_cols_idx):
    x, y = [], []
    for i in range(seq_length, data.shape[0] - future_steps + 1):
        x.append(data[i-seq_length:i])
        y.append(data[i:i+future_steps, target_cols_idx].flatten())
    return np.array(x), np.array(y)

# ================== Model Architecture ==================
class MultiHeadAttention(nn.Module):
    def __init__(self, hidden_dim, num_heads=8):
        super(MultiHeadAttention, self).__init__()
        self.num_heads = num_heads
        self.head_dim = hidden_dim // num_heads
        
        self.query = nn.Linear(hidden_dim, hidden_dim)
        self.key = nn.Linear(hidden_dim, hidden_dim)
        self.value = nn.Linear(hidden_dim, hidden_dim)
        self.fc = nn.Linear(hidden_dim, hidden_dim)
        
    def forward(self, x):
        batch_size, seq_len, hidden_dim = x.size()
        
        q = self.query(x).view(batch_size, seq_len, self.num_heads, self.head_dim).transpose(1, 2)
        k = self.key(x).view(batch_size, seq_len, self.num_heads, self.head_dim).transpose(1, 2)
        v = self.value(x).view(batch_size, seq_len, self.num_heads, self.head_dim).transpose(1, 2)
        
        scores = torch.matmul(q, k.transpose(-2, -1)) / (self.head_dim ** 0.5)
        attention = torch.softmax(scores, dim=-1)
        
        out = torch.matmul(attention, v)
        out = out.transpose(1, 2).contiguous().view(batch_size, seq_len, hidden_dim)
        out = self.fc(out)
        
        return out

class EnhancedLSTMWithAttention(nn.Module):
    def __init__(self, input_size, hidden_sizes, output_size, dropout=0.2):
        super(EnhancedLSTMWithAttention, self).__init__()
        
        self.lstm1 = nn.LSTM(input_size, hidden_sizes[0], batch_first=True, bidirectional=True)
        self.dropout1 = nn.Dropout(dropout)
        
        self.lstm2 = nn.LSTM(hidden_sizes[0]*2, hidden_sizes[1], batch_first=True, bidirectional=True)
        self.dropout2 = nn.Dropout(dropout)
        
        self.attention = MultiHeadAttention(hidden_sizes[1]*2)
        self.layer_norm = nn.LayerNorm(hidden_sizes[1]*2)
        
        self.fc1 = nn.Linear(hidden_sizes[1]*2, hidden_sizes[1])
        self.dropout3 = nn.Dropout(dropout)
        self.relu = nn.ReLU()
        self.fc2 = nn.Linear(hidden_sizes[1], output_size)

    def forward(self, x):
        out, _ = self.lstm1(x)
        out = self.dropout1(out)
        out, _ = self.lstm2(out)
        out = self.dropout2(out)
        att_out = self.attention(out)
        out = self.layer_norm(out + att_out)
        out = out[:, -1, :]
        out = self.fc1(out)
        out = self.dropout3(out)
        out = self.relu(out)
        out = self.fc2(out)
        
        return out

# ================== Hyperparameter Optimization ==================
def objective(trial, config, train_loader, val_loader, input_size, output_size):
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    hidden_size1 = trial.suggest_int('hidden_size1', 64, 256)
    hidden_size2 = trial.suggest_int('hidden_size2', 128, 512)
    dropout_rate = trial.suggest_float('dropout_rate', 0.1, 0.5)
    lr = trial.suggest_float('lr', 1e-4, 1e-2, log=True)
    
    model = EnhancedLSTMWithAttention(input_size=input_size, hidden_sizes=[hidden_size1, hidden_size2], output_size=output_size, dropout=dropout_rate).to(device)
    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=lr)
    
    best_val_loss = float('inf')
    early_stop_counter = 0
    
    for epoch in range(50): # Reduced epochs for hyperparameter tuning
        model.train()
        for batch_x, batch_y in train_loader:
            batch_x, batch_y = batch_x.to(device), batch_y.to(device)
            optimizer.zero_grad()
            output = model(batch_x)
            loss = criterion(output, batch_y)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 5)
            optimizer.step()
        
        model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for batch_x, batch_y in val_loader:
                batch_x, batch_y = batch_x.to(device), batch_y.to(device)
                output = model(batch_x)
                loss = criterion(output, batch_y)
                val_loss += loss.item()
        val_loss /= len(val_loader)
        
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            early_stop_counter = 0
        else:
            early_stop_counter += 1
            if early_stop_counter >= 5: # Reduced patience for tuning
                break
    return best_val_loss

def optimize_hyperparameters(config, train_loader, val_loader, input_size, output_size):
    print("Optimizing hyperparameters...")
    study = optuna.create_study(direction='minimize')
    study.optimize(lambda trial: objective(trial, config, train_loader, val_loader, input_size, output_size), n_trials=20)
    print(f"Best hyperparameters: {study.best_params}")
    return study.best_params

# ================== Training Function ==================
def train_model(model, train_loader, val_loader, config, best_params=None):
    print("Training model...")
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model.to(device)
    
    lr = best_params['lr'] if best_params else config.LEARNING_RATE
    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=lr)
    
    best_val_loss = float('inf')
    early_stop_counter = 0

    for epoch in range(config.EPOCHS):
        model.train()
        train_loss = 0.0
        for batch_x, batch_y in train_loader:
            batch_x, batch_y = batch_x.to(device), batch_y.to(device)
            optimizer.zero_grad()
            output = model(batch_x)
            loss = criterion(output, batch_y)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 5)
            optimizer.step()
            train_loss += loss.item()
        
        model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for batch_x, batch_y in val_loader:
                batch_x, batch_y = batch_x.to(device), batch_y.to(device)
                output = model(batch_x)
                loss = criterion(output, batch_y)
                val_loss += loss.item()
        
        train_loss /= len(train_loader)
        val_loss /= len(val_loader)
        
        print(f'Epoch {epoch+1}/{config.EPOCHS}, Train Loss: {train_loss:.4f}, Val Loss: {val_loss:.4f}')

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            torch.save(model.state_dict(), config.MODEL_PATH)
            early_stop_counter = 0
            print(f"Model saved to {config.MODEL_PATH}")
        else:
            early_stop_counter += 1
            if early_stop_counter >= config.PATIENCE:
                print("Early stopping triggered.")
                break
    
    model.load_state_dict(torch.load(config.MODEL_PATH))
    return model

# ================== Evaluation Function ==================
def evaluate_model(model, test_loader, scaler, features, target_cols):
    print("Evaluating model...")
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model.to(device)
    model.eval()
    
    predictions = []
    actuals = []
    
    with torch.no_grad():
        for batch_x, batch_y in test_loader:
            batch_x, batch_y = batch_x.to(device), batch_y.to(device)
            output = model(batch_x)
            predictions.extend(output.cpu().numpy())
            actuals.extend(batch_y.cpu().numpy())
            
    predictions = np.array(predictions)
    actuals = np.array(actuals)

    num_features = len(features)
    target_indices = [features.index(col) for col in target_cols]

    dummy_predictions = np.zeros((predictions.shape[0], num_features))
    dummy_predictions[:, target_indices] = predictions
    predictions_rescaled = scaler.inverse_transform(dummy_predictions)[:, target_indices]

    dummy_actuals = np.zeros((actuals.shape[0], num_features))
    dummy_actuals[:, target_indices] = actuals
    actuals_rescaled = scaler.inverse_transform(dummy_actuals)[:, target_indices]
    
    metrics = {}
    for i, col in enumerate(target_cols):
        mse = mean_squared_error(actuals_rescaled[:, i], predictions_rescaled[:, i])
        mae = mean_absolute_error(actuals_rescaled[:, i], predictions_rescaled[:, i])
        r2 = r2_score(actuals_rescaled[:, i], predictions_rescaled[:, i])
        metrics[col] = {'MSE': mse, 'MAE': mae, 'R2': r2, 'RMSE': np.sqrt(mse)}
        print(f"Metrics for {col}:")
        print(f"  MSE: {mse:.4f}, MAE: {mae:.4f}, R2: {r2:.4f}, RMSE: {np.sqrt(mse):.4f}")

    return actuals_rescaled, predictions_rescaled, metrics

# ================== Plotting Function ==================
def plot_results(dates, actual, predicted, ticker, target_col='Close'):
    plt.figure(figsize=(15, 7))
    plt.plot(dates, actual, label=f'Actual {target_col}')
    plt.plot(dates, predicted, label=f'Predicted {target_col}')
    plt.title(f'{ticker} - {target_col} Price Prediction')
    plt.xlabel('Date')
    plt.ylabel('Price')
    plt.legend()
    plt.grid(True)
    plt.show()

# ================== Main Execution ==================
if __name__ == '__main__':
    # Initialize Configuration
    config = Config(ticker="RELIANCE.NS") # Example: Reliance Industries on NSE

    # Load and process data
    stock_data = load_data(config)
    
    # Check if there is enough data
    if stock_data.shape[0] < config.SEQUENCE_LENGTH * 2:
         raise ValueError("Not enough data to create sequences for training, validation, and testing.")

    news_data = fetch_news(config.TICKER, config.START_DATE, config.END_DATE)
    sentiment_data = analyze_sentiment(news_data)
    
    featured_data = create_features(stock_data, sentiment_data)
    
    # Prepare data for model
    train_loader, val_loader, test_loader, scaler, features, data_test, target_cols, test_dates = prepare_data(featured_data, config)
    
    input_size = len(features)
    output_size = len(target_cols)

    # Hyperparameter Optimization (Optional)
    # best_params = optimize_hyperparameters(config, train_loader, val_loader, input_size, output_size)
    best_params = {'hidden_size1': 128, 'hidden_size2': 256, 'dropout_rate': 0.3, 'lr': 0.001} # Example params
    
    # Initialize and train the model
    model = EnhancedLSTMWithAttention(
        input_size=input_size,
        hidden_sizes=[best_params['hidden_size1'], best_params['hidden_size2']],
        output_size=output_size,
        dropout=best_params['dropout_rate']
    )
    
    model = train_model(model, train_loader, val_loader, config, best_params)
    
    # Evaluate the model
    actual_prices, predicted_prices, metrics = evaluate_model(model, test_loader, scaler, features, target_cols)

    # Plot results for 'Close' price
    close_col_index = target_cols.index('Close')
    
    # Ensure test_dates, actual_prices, and predicted_prices align
    min_len = min(len(test_dates), len(actual_prices))

    plot_results(test_dates.iloc[:min_len], actual_prices[:min_len, close_col_index], predicted_prices[:min_len, close_col_index], config.TICKER) 