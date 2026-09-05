# 🛒 UniMarket

UniMarket is a full-stack web application built for university students to buy and sell second-hand items in a secure, real-time marketplace.

## Project Demo
[Website Link](https://unimarket-web.onrender.com)

## 📸 App Screenshots
![image](https://github.com/yuwaddylwin/UniMarket/blob/867d23665e9172d9cc7aca0fb9ce969d6e6f512b/Student-exclusive%20marketplace.jpg)
![image](https://github.com/yuwaddylwin/UniMarket/blob/867d23665e9172d9cc7aca0fb9ce969d6e6f512b/Student-exclusive%20marketplace-2.jpg)
---
## 📌 Overview
UniMarket enables students to:
- List second-hand items for sale
- Browse and search items posted by other students
- Chat with buyers and sellers in real time
- Access the platform securely with authentication and protected routes
This project focuses on real-world full-stack development using RESTful APIs and real-time communication.
  
## Tech Stack

### Frontend
- React
- CSS 
- Axios

### Backend
- Node.js
- Express.js
- MongoDB & Mongoose
- Socket.io

### Authentication & Security
- JWT (JSON Web Tokens)
- bcrypt password hashing
- Protected routes
---
## ✨ Features
- Secure authentication and authorization
- Create, edit, and delete item listings
- Search and filter marketplace items
- Real-time chat using Socket.io
- Optimized MongoDB CRUD operations
- Student-focused marketplace


### Chat safety deployment and testing

Chat continues to use the existing sender/recipient message collection and
`User.blockedUsers`. A conversation identifier in reports is the sorted pair of
participant IDs (`id:id`); no migration or duplicate conversation store is needed.
Legacy messages retain `createdAt` and `seen`; newly read messages also get `seenAt`.
Deleting a chat removes its messages for **both** participants, while keeping reports.

MongoDB must support transactions (Atlas or a replica set). Sends, blocks, unblocks,
read updates and deletion write participant revision fields in the same transaction
so concurrent operations retry against current block state. Standalone MongoDB is
not supported for these operations. Socket connections authenticate with the same
JWT as the REST API and use per-user rooms for multiple tabs. The existing in-memory
Socket.IO deployment remains a single-server deployment; scaling socket delivery
across servers requires a shared Socket.IO adapter.

Report notifications reuse backend `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
`SMTP_PASS`, `EMAIL_FROM`, and `CLIENT_URL`. Set `ADMIN_EMAIL` to
`unimarket.app.official@gmail.com` (also the default). Keep these variables only on
the server. Reports persist before delivery; a worker checks every 30 seconds and
retries failures after five minutes, including after restarts. Inspect
`notificationAttempts`, `notificationRetryAt`, `notificationSentAt` and server logs
for delivery health. Delivery is at least once: a process failure after SMTP accepts
an email can result in a repeated notification with the same report ID. One pending
report per reporter/reported pair prevents duplicate submissions. Administrators
can update report status to `reviewed` or `resolved` through authorized database
administration; this change does not introduce an admin web console.

Run frontend checks with `cd frontend && CI=true npm test -- --watchAll=false --runInBand`
and `npm run build`. The backend integration test uses a dedicated local MongoDB
replica set on port 27029 and **drops only its `unimarket_chat_tests` database**:

```sh
mkdir -p /tmp/unimarket-chat-test-db
mongod --dbpath /tmp/unimarket-chat-test-db --port 27029 --bind_ip 127.0.0.1 --replSet chatTest
# In another terminal, from the repository root:
CHAT_TEST_MONGO_URL=mongodb://127.0.0.1:27029 node --test Backend/test/chat.integration.test.js
```

The test initializes that replica set and exercises real HTTP, JWT authentication,
MongoDB transactions and sockets. SMTP transport is stubbed: it verifies notification
content and retry behavior without sending test reports to the admin inbox.
