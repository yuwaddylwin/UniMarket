import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from 'cors'; // controls whether a web page can request resources (like data from an API)

const app = express();
dotenv.config();
app.use(cors());

const PORT = process.env.PORT || 8000;
const MONGOURL = process.env.MONGO_URL || "mongodb+srv://yuwaddylwin:ThhDEm2ZWMQbNngz@marketplace-cluster.7hjiut5.mongodb.net/MarketPlace";


// Connect DB
mongoose
.connect(MONGOURL)
.then(()=>{
    console.log("Database is connected successfully.");

    // Show which DB name we connected to
    console.log("Connected DB name:", mongoose.connection.name);


    app.listen(PORT, ()=>{
        console.log(`Server is running on port ${PORT}`);
    });
}).catch((err)=> console.log(err));



// Schema is like a blueprint for your data : it tells mongoose what fields eachh document should have
const userSchema = new mongoose.Schema({
    name: String,
    age: Number,
});


const UserModel = mongoose.model("users", userSchema);


//API route
app.get("/getUsers", async (req, res) => {
    try {
      const userData = await UserModel.find();
      console.log(userData);
      res.json(userData);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });
  