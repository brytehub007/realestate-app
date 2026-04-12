import { Router } from "express";
import { getAreaReports, getAreaReport, createAreaReport, upvoteReport } from "../controllers/area.controller";
import { getServiceProviders, createServiceRequest, getMyServiceRequests } from "../controllers/services.controller";
import { authenticate } from "../middleware/auth";

export const areaRouter = Router();
areaRouter.get("/",            getAreaReports);
areaRouter.get("/:state/:lga", getAreaReport);
areaRouter.post("/",           authenticate, createAreaReport);
areaRouter.post("/:id/upvote", authenticate, upvoteReport);

export const servicesRouter = Router();
servicesRouter.get("/providers",     getServiceProviders);
servicesRouter.post("/requests",     authenticate, createServiceRequest);
servicesRouter.get("/requests/mine", authenticate, getMyServiceRequests);
