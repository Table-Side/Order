import { Router, Response } from "express";
import prisma from "../config/prisma";
import { AuthenticatedRequest } from "../interfaces";
import { isAuthenticated } from "../middleware";

const router = Router({ mergeParams: true });

router.get("/active", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
        let userId = req.user.sub;

        // If userId is supplied in query params and has role restaurant, use that instead
        if (req.query.userId && req.user.realm_access.roles.includes("restaurant")) {
            userId = req.query.userId as string;
        }

        // Get order
        const order = await prisma.order.findMany({
            where: {
                forUser: userId,
                transaction: {
                    is: null
                },
            },
            include: {
                items: true,
                transaction: true
            }
        });

        if (!order) {
            return res.status(404).json({
                error: {
                    message: "Order not found"
                }
            });
        }

        res.status(200).json({
            data: order
        });
    } catch (error) {
        res.status(500).json({
            error: {
                message: "Failed to find order history"
            }
        });
    }
});

router.get("/history", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
        let userId = req.user.sub;

        // If userId is supplied in query params and has role restaurant, use that instead
        if (req.query.userId && req.user.realm_access.roles.includes("restaurant")) {
            userId = req.query.userId as string;
        }

        // Get order
        const order = await prisma.order.findMany({
            where: {
                forUser: userId,
                transaction: {
                    isNot: null,
                },
            },
            include: {
                items: true,
                transaction: true
            }
        });

        if (!order) {
            return res.status(404).json({
                error: {
                    message: "Order not found"
                }
            });
        }

        res.status(200).json({
            data: order
        });
    } catch (error) {
        res.status(500).json({ 
            error: {
                message: "Failed to find user order history",
                details: error
            }
            
        });
    }
});

export default router;
