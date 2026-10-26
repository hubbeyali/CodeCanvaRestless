Project Title: SpendSense AI
Team Members: J MEER HUBBEYALI[RRN:250071601284]
              U SAMEER AHAMED[250071601051]

SpendSense AI is an AI-powered personal finance dashboard built for Code Canvas ’26 — MoneyMatters. It helps users track expenses, understand spending patterns, manage budgets, and get personalised insights through an AI financial assistant.

Key Features

Track income and expenses.
Import transactions using CSV.
View spending charts and category breakdowns.
Monitor budgets.
Ask AI questions about your financial activity.

AI Transparency

AI tools used: ChatGPT for development assistance and Google Gemini API for the in-app AI assistant.
AI-assisted work: Planning, code suggestions, debugging assistance and AI integration.
Important prompts: Building the finance dashboard, implementing CSV import, and connecting the Express backend to Gemini.


 Important Prompts Used

1. Dashboard Development: Build a modern, responsive personal finance dashboard using React and Vite with a trustworthy fintech design.

2. Transaction Management: Implement transaction tracking, category-wise spending, budget monitoring, charts, search, and filters while preserving existing features.

3. CSV Import:** Add CSV transaction import with data validation, duplicate detection, and a preview before importing.

4. AI Financial Assistant:** Integrate Google Gemini API to answer natural-language questions using the user's recorded financial data.

5. Backend Integration:** Connect the React frontend to a Node.js and Express backend while keeping the Gemini API key secure on the server.

6. Debugging and Refinement: Identify and resolve integration issues, handle API errors, and improve the user interface without breaking existing functionality.


Bug: Gemini API Model Error (404)

- Problem: The AI assistant failed to generate responses because the configured Gemini model was unavailable.
- Diagnosis:Checked the API error response and identified the model configuration as the issue.
- Fix:Updated the model configuration to a supported model and tested the API request again.
- Verification: Confirmed that the API returned a successful response.


### AI-Generated Code That Was Modified

AI assistance was used to generate and refine parts of the application. The generated code was reviewed, adapted, and tested during development.

- **`src/App.jsx`** — Dashboard integration, transaction handling, and component wiring.
- **`src/FinanceAssistant.jsx`** — AI chat interface and financial-context handling.
- **`src/App.css`** — Dashboard styling and responsive UI refinements.
- **`server/index.js`** — Express backend and Gemini API integration.

The code was modified and tested to fit the project's requirements while preserving existing functionality.
