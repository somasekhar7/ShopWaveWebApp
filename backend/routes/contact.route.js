import express from "express";
import {
  postUserQuery,
  getUserQuery,
  respondToQuery,
} from "../controllers/contact.controller.js";

const router = express.Router();

router.post("/post-user-query", postUserQuery);
router.get("/get-user-query", getUserQuery);
router.post("/respond-query", respondToQuery);
export default router;
