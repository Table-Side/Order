import { Router, Request, Response } from "express";
import prisma from "../config/prisma";

const router = Router({ mergeParams: true });

router.get("/:orderId", async (req: Request, res: Response) => {
    try {
        const { orderId } = req.params;

        const order = await prisma.order.findUnique({
            where: {
                id: orderId,
            },
        });

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        res.status(200).json({
            data: order
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to remove item from order" });
    }
});



export default router;
