import { Router } from "express";
import { getNotifications, markAllNotificationsRead, getSavedSearches, createSavedSearch, updateSavedSearch, deleteSavedSearch, updateProfile, getUserProfile, getUserReviews, createReview } from "../controllers/users.controller";
import { authenticate } from "../middleware/auth";
const router = Router();
// /me MUST come before /:id
router.patch("/me",                        authenticate, updateProfile);
router.get("/me/notifications",            authenticate, getNotifications);
router.patch("/me/notifications/read-all", authenticate, markAllNotificationsRead);
router.get("/me/saved-searches",           authenticate, getSavedSearches);
router.post("/me/saved-searches",          authenticate, createSavedSearch);
router.patch("/me/saved-searches/:id",     authenticate, updateSavedSearch);
router.delete("/me/saved-searches/:id",    authenticate, deleteSavedSearch);
router.post("/reviews",                    authenticate, createReview);
router.get("/:id",         getUserProfile);
router.get("/:id/reviews", getUserReviews);
export default router;
