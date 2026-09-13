import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report


# ==========================================
# 1. LOAD DATASET
# ==========================================

df = pd.read_csv("sleep_quality_dataset_10000.csv")

print("Dataset loaded successfully")
print(df.head())

print("\nDataset shape:")
print(df.shape)

print("\nColumns:")
print(df.columns)


# ==========================================
# 2. SELECT FEATURES
# ==========================================

features = [
    "Heart_Rate",
    "SpO2",
    "Movement",
    "Temperature_C",
    "Humidity_pct",
    "Noise_dB",
    "Sleep_Duration_Hours"
]

X = df[features]

y = df["Sleep_Quality"]


# ==========================================
# 3. ENCODE TARGET
# ==========================================

encoder = LabelEncoder()

y_encoded = encoder.fit_transform(y)

print("\nSleep Quality Classes:")
print(encoder.classes_)


# ==========================================
# 4. TRAIN TEST SPLIT
# ==========================================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y_encoded,
    test_size=0.20,
    random_state=42,
    stratify=y_encoded
)


print("\nTraining samples:", len(X_train))
print("Testing samples:", len(X_test))


# ==========================================
# 5. CREATE MODEL
# ==========================================

model = RandomForestClassifier(
    n_estimators=200,
    random_state=42
)


# ==========================================
# 6. TRAIN MODEL
# ==========================================

model.fit(X_train, y_train)

print("\nModel training completed!")


# ==========================================
# 7. PREDICTION
# ==========================================

y_pred = model.predict(X_test)


# ==========================================
# 8. ACCURACY
# ==========================================

accuracy = accuracy_score(y_test, y_pred)

print("\nModel Accuracy:")
print(accuracy)


# ==========================================
# 9. CLASSIFICATION REPORT
# ==========================================

print("\nClassification Report:")
print(classification_report(
    y_test,
    y_pred,
    target_names=encoder.classes_
))


# ==========================================
# 10. SAVE MODEL
# ==========================================

model_package = {
    "model": model,
    "encoder": encoder,
    "features": features
}

joblib.dump(
    model_package,
    "../model/sleep_quality_model.pkl"
)

print("\nModel saved successfully!")
print("Location:")
print("../model/sleep_quality_model.pkl")