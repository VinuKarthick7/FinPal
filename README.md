# FinPal - Smart Family Finance Tracker

A full-stack MERN application for family expense tracking, built with React + Vite frontend and Node.js + Express backend.

## 🚀 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development
- **TailwindCSS** for responsive styling
- **React Query** for data fetching
- **Zustand** for state management
- **React Hook Form** for form handling
- **Framer Motion** for animations

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **MongoDB** with Mongoose
- **JWT** for authentication
- **Express Validator** for input validation
- **OpenAI API** for RAG-powered chatbot (FinMate)

## 📁 Project Structure

```
FinPal/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── services/     # API services
│   │   ├── store/        # Zustand store
│   │   └── utils/        # Utility functions
│   └── public/           # Static assets
├── server/                # Node.js backend
│   ├── src/
│   │   ├── config/       # Configuration files
│   │   ├── controllers/  # Route controllers
│   │   ├── middleware/   # Express middleware
│   │   ├── models/       # Mongoose models
│   │   └── routes/       # API routes
│   └── .env              # Environment variables
└── package.json          # Root package.json
```

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. Clone the repository:
```bash
cd C:\Project\FinPal
```

2. Install all dependencies:
```bash
npm run install:all
```

Or install separately:
```bash
# Root dependencies
npm install

# Client dependencies
cd client && npm install

# Server dependencies
cd ../server && npm install
```

3. Set up environment variables:
```bash
# Server .env is already created with defaults
# Update server/.env with your MongoDB URI if needed
```

4. Start MongoDB locally (if not using Atlas):
```bash
mongod
```

5. Run the development servers:
```bash
# Run both frontend and backend
npm run dev

# Or run separately:
npm run dev:client   # Frontend on http://localhost:3000
npm run dev:server   # Backend on http://localhost:5000
```

## 🐳 Docker Setup

You can run the entire FinPal stack (client, server, and MongoDB) using Docker and docker-compose.

### Prerequisites
- [Docker](https://www.docker.com/get-started) and [docker-compose](https://docs.docker.com/compose/) installed

### Quick Start

1. **Copy environment files:**
   - Copy `server/.env.example` to `server/.env` and adjust values as needed.
   - The client does not require changes for Docker by default.

2. **Build and start all services:**
   ```sh
   docker-compose up --build
   ```
   This will start:
   - MongoDB (port 27017)
   - Server API (port 5000)
   - Client (React, served by Nginx, port 3000)

3. **Access the app:**
   - Client: [http://localhost:3000](http://localhost:3000)
   - API: [http://localhost:5000/api](http://localhost:5000/api)

4. **Stop containers:**
   ```sh
   docker-compose down
   ```

### Notes
- Uploaded files (avatars, etc.) are persisted in `server/uploads`.
- MongoDB data is persisted in a Docker volume (`mongo_data`).
- For development, you may still use `npm run dev` in `client` and `server` folders outside Docker.

## 📱 Responsive Design

The app is fully responsive and works on:
- 📱 Mobile phones (320px+)
- 📱 Tablets (768px+)
- 💻 Laptops (1024px+)
- 🖥️ Desktops (1280px+)

## 🔐 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/forgot-password` | Request password reset |
| GET | `/api/auth/verify-email?token=...` | Verify email address |
| POST | `/api/auth/resend-verification` | Resend verification email |

### Email Verification (SMTP)
- Configure SMTP in `server/.env` to actually send emails:
	- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `EMAIL_FROM`
- If `SMTP_HOST` is not set, the server will log the verification link to the console (dev-friendly).

## ✅ Sprint 1 Features (Current)

- [x] Project setup (React + Vite + Node.js)
- [x] Responsive Login page
- [x] Responsive Register page
- [x] Forgot Password page
- [x] User authentication API
- [x] MongoDB integration
- [x] Form validation (client & server)

## 📋 Upcoming Features

- [ ] Dashboard with expense overview
- [ ] Add/Edit/Delete expenses
- [ ] Family mode (create/join family)
- [ ] Bill reminders
- [ ] Loan payment reminders
- [ ] Category-wise expense charts
- [ ] Budget tracking

## � FinMate - AI Chatbot (NEW!)

FinMate is now powered by **RAG (Retrieval-Augmented Generation)** using OpenAI!

### Features
- 💬 Natural language conversations about your finances
- 🎯 Personalized insights based on your real spending data
- 🧠 Semantic search to find relevant financial context
- 💡 Smart suggestions and actionable advice
- 📊 Context-aware responses using GPT-4o-mini

### Setup FinMate
1. Get your OpenAI API key from [platform.openai.com](https://platform.openai.com)
2. Add to `server/.env`:
   ```env
   OPENAI_API_KEY=sk-your-key-here
   OPENAI_MODEL=gpt-4o-mini
   OPENAI_EMBEDDING_MODEL=text-embedding-3-small
   ```
3. Restart the server
4. Chat with FinMate in the app!

📖 **Detailed Guide:** See [RAG_CHATBOT_GUIDE.md](RAG_CHATBOT_GUIDE.md) for complete documentation.

**Example Queries:**
- "How am I doing with my budget?"
- "Where am I spending too much?"
- "Can I afford ₹5000 today?"
- "What bills are due soon?"

## �🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.
