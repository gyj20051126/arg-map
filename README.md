# ARG MAP - Global Antimicrobial Resistance Gene Surveillance

This platform is a comprehensive 3D visualization tool designed to monitor and analyze the distribution of Antimicrobial Resistance Genes (ARGs) across different global habitats.

## 🚀 Features

*   **Global 3D Surveillance**: Interactive WebGL globe visualizing metagenomic sampling sites, colored by continent.
*   **Ecological Niche Analysis**: Filter data by habitats (Soil, Marine, Sewage, etc.) to observe transmission patterns.
*   **PCoA Analytics**: Beta-diversity analysis using Bray-Curtis dissimilarity metrics to visualize cluster trends.
*   **Trend Forecasting**: A "One Health" drift model predicting ARG trajectory towards 2035.
*   **AI Assistant**: Integrated AI chat to help interpret data trends and provide insights.
*   **User Data Upload**: Ability to upload custom CSV data for comparative analysis.

## 🛠️ Technology Stack

*   **Frontend**: React 19, TypeScript
*   **Visualization**: 
    *   `react-globe.gl` / `three.js` (3D Globe)
    *   `recharts` (Statistical Charts)
*   **Styling**: Tailwind CSS
*   **AI Integration**: Google Gemini API
*   **Animation**: Framer Motion

## 📂 Data Structure

The platform relies on structured CSV data containing:
*   `Sample_ID`: Unique identifier
*   `PC1` / `PC2`: PCoA coordinates (Bray-Curtis based)
*   `Habitats`: Ecological classification
*   `Regions`: Geographic location
*   `Continents`: For color coding

## 📦 Setup

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Run development server**:
    ```bash
    npm start
    ```

## 📜 License

This project is open-source and available under the MIT License.
