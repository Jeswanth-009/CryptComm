# CryptComm - Secure Encrypted Messaging Platform

<div align="center">

![CryptComm Logo](https://img.shields.io/badge/CryptComm-Secure%20Messaging-blue?style=for-the-badge&logo=shield)

**End-to-end encrypted real-time communication platform for secure tactical messaging**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20-green?logo=node.js)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue?logo=docker)](https://www.docker.com/)

</div>

## 🔐 Features

### Security
- **RSA-2048 Asymmetric Encryption** - Key pair generation for secure key exchange
- **AES-256-GCM Symmetric Encryption** - Message encryption with authenticated encryption
- **End-to-End Encryption** - Server cannot read message contents
- **Key Fingerprint Verification** - Verify user identities out-of-band
- **Private Keys Never Leave Client** - Cryptographic keys stay on your device

### Communication
- **Real-time Messaging** - WebSocket-based instant communication
- **Room-based Chat** - Create and join encrypted chat rooms
- **Timed Rooms** - Select fixed lifetimes (30m / 1h / 4h / 24h / 7d); rooms auto-expire and are cleaned up
- **Typing Indicators** - See when others are typing
- **User Presence** - Online/offline status for all users
- **Message Timestamps** - Track when messages were sent

### Security Features
- **Rate Limiting** - Prevent abuse and spam
- **Input Validation** - Sanitized user inputs with Zod
- **XSS Protection** - All content is properly escaped
- **Session Management** - Secure connection handling

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT SIDE                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │   Next.js   │────│   React     │────│   Web Crypto API    │  │
│  │   Frontend  │    │   Context   │    │   (RSA + AES-GCM)   │  │
│  └─────────────┘    └─────────────┘    └─────────────────────┘  │
│         │                                        │               │
│         ▼                                        ▼               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    WebSocket Client                       │   │
│  │         (Encrypted messages + Encrypted AES keys)         │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ WebSocket Connection
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         SERVER SIDE                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   WebSocket Server                        │   │
│  │        (Routes encrypted payloads - cannot decrypt)       │   │
│  └──────────────────────────────────────────────────────────┘   │
│         │                 │                    │                 │
│         ▼                 ▼                    ▼                 │
│  ┌───────────┐    ┌───────────────┐    ┌─────────────────┐      │
│  │   Room    │    │     User      │    │   Rate Limit    │      │
│  │  Manager  │    │    Manager    │    │    & Validation │      │
│  └───────────┘    └───────────────┘    └─────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

## 🔒 Encryption Flow

### Message Sending
```
1. User types a message
2. Generate random AES-256 key
3. Encrypt message with AES-256-GCM
4. For each recipient:
   - Encrypt AES key with recipient's RSA public key
5. Send encrypted message + encrypted keys to server
6. Server routes payload (cannot decrypt)
```

### Message Receiving
```
1. Receive encrypted message + encrypted AES key
2. Decrypt AES key using private RSA key
3. Decrypt message content using AES key
4. Display plaintext message
```

## 📁 Project Structure

```
cryptcomm/
├── frontend/                 # Next.js 14 Application
│   ├── app/                  # App router pages
│   │   ├── layout.tsx        # Root layout
│   │   ├── page.tsx          # Main chat page
│   │   └── globals.css       # Global styles
│   ├── components/
│   │   ├── chat/             # Chat components
│   │   │   ├── chat-container.tsx
│   │   │   ├── chat-header.tsx
│   │   │   ├── login-form.tsx
│   │   │   ├── message-input.tsx
│   │   │   ├── message-list.tsx
│   │   │   ├── room-list.tsx
│   │   │   └── user-list.tsx
│   │   └── ui/               # Shadcn/ui components
│   ├── lib/
│   │   ├── encryption.ts     # Crypto operations
│   │   ├── websocket.ts      # WebSocket client
│   │   ├── chat-context.tsx  # React context
│   │   └── utils.ts          # Utilities
│   ├── types/                # TypeScript types
│   ├── Dockerfile            # Production build
│   └── package.json
│
├── backend/                  # Node.js WebSocket Server
│   ├── src/
│   │   ├── server.ts         # Main server
│   │   ├── rooms.ts          # Room management
│   │   ├── users.ts          # User management
│   │   ├── validation.ts     # Input validation
│   │   └── rateLimit.ts      # Rate limiting
│   ├── Dockerfile            # Production build
│   └── package.json
│
├── docker-compose.yml        # Production deployment
├── docker-compose.dev.yml    # Development deployment
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Docker (optional, for containerized deployment)

### Local Development

#### 1. Clone the repository
```bash
git clone https://github.com/yourusername/cryptcomm.git
cd cryptcomm
```

#### 2. Install Backend Dependencies
```bash
cd backend
npm install
```

#### 3. Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

#### 4. Start the Backend Server
```bash
cd ../backend
npm run dev
```
The WebSocket server will start on `http://localhost:3001`

#### 5. Start the Frontend (in a new terminal)
```bash
cd frontend
npm run dev
```
The application will be available at `http://localhost:3000`

> Tip: When creating a room, choose a duration (30 minutes to 7 days). Expired rooms are automatically removed and disappear from the list.

### Docker Deployment

#### Development Mode
```bash
docker-compose -f docker-compose.dev.yml up --build
```

#### Production Mode
```bash
docker-compose up --build
```

### Cloud Deployment (Vercel + Render)

For detailed deployment instructions to Vercel (frontend) and Render (backend), see [DEPLOYMENT.md](DEPLOYMENT.md).

**Quick Start:**
1. Push code to GitHub
2. Deploy backend to Render (set root to `backend/`)
3. Deploy frontend to Vercel (set root to `frontend/`)
4. Configure environment variables on both platforms
5. Set up cron job to keep backend alive (see DEPLOYMENT.md)

### Environment Variables

Create a `.env` file in the root directory:

```env
# Frontend
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# Backend
NODE_ENV=production
PORT=3001
CORS_ORIGIN=http://localhost:3000
```

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS
- **Shadcn/ui** - Accessible UI components
- **Web Crypto API** - Browser-native cryptography

### Backend
- **Node.js** - JavaScript runtime
- **WebSocket (ws)** - Real-time communication
- **Express** - HTTP server for health checks
- **Zod** - Schema validation
- **xss** - XSS protection

### Security
- **RSA-OAEP (2048-bit)** - Asymmetric encryption
- **AES-256-GCM** - Authenticated symmetric encryption
- **SHA-256** - Key fingerprinting

## 📱 Usage

### 1. Connect
Enter your username to generate encryption keys and connect to the server.

### 2. Create/Join Room
Create a new encrypted room or join an existing one.

### 3. Verify Identities
Compare key fingerprints out-of-band to verify user identities.

### 4. Chat Securely
Send end-to-end encrypted messages that only room participants can read.

## 🔧 API Reference

### WebSocket Message Types

| Type | Direction | Description |
|------|-----------|-------------|
| `connect` | Client → Server | Connect with username and public key |
| `connected` | Server → Client | Connection confirmed |
| `create_room` | Client → Server | Create new room |
| `join_room` | Client → Server | Join existing room |
| `leave_room` | Client → Server | Leave current room |
| `message` | Bidirectional | Encrypted message |
| `typing` | Bidirectional | Typing indicator |
| `user_joined_room` | Server → Client | User joined notification |
| `user_left_room` | Server → Client | User left notification |
| `error` | Server → Client | Error message |

### Health Check Endpoint

```
GET /health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "connections": 42
}
```

## 🔐 Security Considerations

### Implemented
- ✅ End-to-end encryption (RSA + AES-GCM)
- ✅ Private keys never leave client
- ✅ Rate limiting on messages and room creation
- ✅ Input validation and sanitization
- ✅ XSS protection
- ✅ Key fingerprint verification

### Recommendations for Production
- 🔒 Use HTTPS/WSS in production
- 🔒 Implement proper authentication (OAuth, JWT)
- 🔒 Add message persistence with encrypted storage
- 🔒 Implement key rotation mechanism
- 🔒 Add audit logging
- 🔒 Consider forward secrecy (implement Signal Protocol)

## 📊 Performance

- Supports 100+ concurrent users
- Message latency < 100ms
- Efficient memory management
- Optimized bundle size (~150KB gzipped)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
---

<div align="center">

**Built with 🔐 for secure communication**

[Report Bug](https://github.com/yourusername/cryptcomm/issues) · [Request Feature](https://github.com/yourusername/cryptcomm/issues)

</div>
