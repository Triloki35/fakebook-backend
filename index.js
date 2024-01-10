const dotenv = require("dotenv");
dotenv.config();



const express = require("express");
const app = express();

const cors = require('cors');
const mongoose = require("mongoose");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
// routes
const userRoute = require("./routes/users");
const authRoute = require("./routes/auth");
const postRoute = require("./routes/posts");
const conversationRoute = require("./routes/conversations");
const messageRoute = require("./routes/messages");
const searchRouter = require('./routes/search');
const mailRoute = require('./routes/mail');

// mogo connect
mongoose.set('strictQuery', true);
mongoose.connect(process.env.MONGO_URL,{
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 30000, // Increase the timeout value
    useNewUrlParser: true,
    useUnifiedTopology: true,},()=>{
    console.log("connected to db");
});

// middleware
app.use("/assets", express.static(path.join(__dirname,"public/assets")));
app.use(express.json());
app.use(helmet());
app.use(morgan("common"));
app.use(cors());

// routes
app.use("/api/users",userRoute);
app.use("/api/auth",authRoute);
app.use("/api/posts",postRoute);
app.use("/api/conversations",conversationRoute);
app.use("/api/messages",messageRoute);
app.use('/api/search', searchRouter);
app.use('/api/mail', mailRoute);


app.listen(8000,()=>{
    console.log("server is running");
})