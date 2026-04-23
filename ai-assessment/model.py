import pandas as pd
import numpy as np
import os
import torch
import joblib
import re
from tqdm import tqdm
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
from sklearn.preprocessing import StandardScaler
from transformers import pipeline

# Import Colab tools safely
try:
    from google.colab import files
except ImportError:
    files = None

class RiskAssessmentEngine:
    def _init_(self, drive_path, device=None):
        self.path = drive_path
        self.device = device if device else torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = None
        self.scaler = StandardScaler()
        self.classifier = None
        
        # Define core features
        self.meta_features = ['goal', 'backers_count', 'converted_pledged_amount']
        self.llm_features = [
            'problem_statement', 'proof_of_capability', 'idea_clarity', 
            'differentiation', 'gtm_strategy', 'business_model', 
            'vagueness', 'credibility'
        ]
        self.topics = ["MusicFunding", "Storytelling", "Songwriting", "Gaming, Tech, Toys", "ArtDesign"]

    def _clean_score(self, val):
        """Standardizes LLM scores from strings like '[8]' or 'NaN' to float."""
        if pd.isna(val): return 5.0  # Neutral score for missing data
        clean_val = re.sub(r'[\[\]]', '', str(val))
        try:
            return float(clean_val)
        except ValueError:
            return 5.0

    def load_data(self):
        """Loads and prepares the dataset from multiple sources."""
        all_dfs = []
        files_in_folder = [f for f in os.listdir(self.path) if f.endswith('.csv')]
        
        for f in files_in_folder:
            full_path = os.path.join(self.path, f)
            temp_df = pd.read_csv(full_path, encoding='latin-1', on_bad_lines='skip')
            
            # Apply cleaning to LLM score columns
            for col in self.llm_features:
                if col in temp_df.columns:
                    temp_df[col] = temp_df[col].apply(self._clean_score)
                else:
                    temp_df[col] = 5.0 # Default if column doesn't exist
            all_dfs.append(temp_df)
            
        df = pd.concat(all_dfs, ignore_index=True)
        # Filter for binary classification
        df = df[df['state'].isin(['successful', 'failed'])].copy()
        df['target'] = df['state'].apply(lambda x: 1 if x == 'successful' else 0)
        return df

    def run_zero_shot(self, df):
        """Enriches data with industry categories using a Transformer model."""
        print(f"Initializing Transformer on {self.device}...")
        self.classifier = pipeline(
            'zero-shot-classification', 
            model='facebook/bart-large-mnli', 
            device=0 if 'cuda' in str(self.device) else -1
        )
        
        df['pitch'] = df['name'].fillna('') + " " + df['blurb'].fillna('')
        texts = df['pitch'].tolist()
        results = []
        
        batch_size = 32
        for i in tqdm(range(0, len(texts), batch_size), desc="Classifying Industry"):
            batch = texts[i:i+batch_size]
            batch_res = self.classifier(batch, self.topics, multi_label=False)
            results.extend([res['labels'][0] for res in batch_res])
            
        df['industry_category'] = results
        return pd.get_dummies(df, columns=['industry_category'], drop_first=True)

    def train(self, df):
        """Trains an Ensemble model (Random Forest) for robust risk prediction."""
        # Dynamically find dummy columns
        category_cols = [c for c in df.columns if 'industry_category_' in c]
        features = self.meta_features + self.llm_features + category_cols
        
        X = df[features].fillna(0)
        y = df['target']
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Scaling numeric data
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        print("Training Random Forest Classifier...")
        self.model = RandomForestClassifier(n_estimators=200, max_depth=10, random_state=42)
        self.model.fit(X_train_scaled, y_train)
        
        # Evaluation
        preds = self.model.predict(X_test_scaled)
        print("\n=== MODEL PERFORMANCE ===")
        print(f"Accuracy: {accuracy_score(y_test, preds):.4f}")
        print(classification_report(y_test, preds))
        
        # Save the model artifacts for your future DApp
        joblib.dump(self.model, 'risk_model.pkl')
        joblib.dump(self.scaler, 'scaler.pkl')
        
        return features

    def export_results(self, df, features):
        """Generates the final risk score and saves results."""
        X_all_scaled = self.scaler.transform(df[features].fillna(0))
        df['Success_Probability'] = self.model.predict_proba(X_all_scaled)[:, 1]
        df['Risk_Score'] = (1 - df['Success_Probability']) * 10  # Scale 1-10
        
        final_df = df[['name', 'state', 'Risk_Score'] + self.llm_features]
        final_df.to_csv('final_risk_analysis.csv', index=False)
        if files:
            files.download('final_risk_analysis.csv')

# --- EXECUTION ---
FOLDER = '/content/drive/MyDrive/FYP_Kickstarter_Clean_Data/'
engine = RiskAssessmentEngine(FOLDER)

# 1. Load
raw_data = engine.load_data()
# 2. Enrich
enriched_data = engine.run_zero_shot(raw_data)
# 3. Train
feature_list = engine.train(enriched_data)
# 4. Save
engine.export_results(enriched_data, feature_list)