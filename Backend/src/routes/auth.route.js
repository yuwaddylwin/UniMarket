import express from "express";
import { signup, login, logout} from "../controllers/auth.controller.js";
const router = express.Router();

router.post("/signup", signup);
console.log("Auth routes loaded");

router.post("/login", login);

router.post("/logout", logout);

export default router;
