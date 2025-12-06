Project Name: ReserveIT

This project has a backend (Node.js + MySQL) and a frontend (React).
The frontend uses Axios to communicate with the backend API.

How to Run Backend:

Go to backend folder
cd backend

Install packages
npm install

Start server
node server.js

Make sure XAMPP MySQL is running.

How to Run Frontend:

Go to reservetit-web folder
cd reservetit-web

Install packages
npm install

Start React app
npm start

Open http://localhost:3000

CRUD Features:

Create: Add new room or reservation data through forms.
Read: Fetch and display room lists, reservation details, or other data from the database.
Update: Edit or modify existing items (ex. update room info).
Delete: Remove data such as room entries or reservations.

Notes:
Update API settings in src/config.js
Backend usually runs at http://localhost:5000