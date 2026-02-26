import pandas as pd

data = pd.read_csv("../data/creditcard.csv")
print(data.shape)

data= data.sample(20000,random_state=42) 
print(data.shape)

X= data.drop("Class", axis=1) 
Y= data["Class"] 

print("Features shape:", X.shape) 
print("Target shape:", Y.shape)

from sklearn.model_selection import train_test_split
X_train, X_test, y_train, y_test = train_test_split( X, Y, test_size=0.2, random_state=42 )
print("Training data:", X_train.shape) 
print("Testing data:", X_test.shape)

from sklearn.ensemble import RandomForestClassifier

model = RandomForestClassifier(n_estimators=100) 
model.fit(X_train, y_train)

print("Model training complete!")

from sklearn.metrics import classification_report, confusion_matrix 
y_pred = model.predict(X_test)

print("Confusion Matrix:") 
print(confusion_matrix(y_test, y_pred))

print("\nClassification Report:") 
print(classification_report(y_test, y_pred))

import pickle

pickle.dump(model, open("model.pkl", "wb")) 
print("Model saved successfully!")

print(list(X.columns))

import matplotlib.pyplot as plt
importance = model.feature_importances_ 
plt.bar(range(len(importance)), importance) 
plt.title("Feature Importance") 
plt.show()