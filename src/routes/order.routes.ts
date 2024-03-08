import { Router } from "express";
import prisma from "../config/prisma";

const router = Router();

router.post("/new", async (req, res) => {
    // Create new order for current user
    try {
        const { userId } = req.user as { userId: string };

        const newOrder = await prisma.order.create({
            data: {
                forUser: userId,
            },
        });

        res.status(200).json(newOrder);
    } catch (error) {
        res.status(500).json({ error: "Failed to create new order" });
    }
});

router.put("/:orderId/add", async (req, res) => {
    // Ensure order for order ID is for current user
    try {
        const { orderId } = req.params;
        const { itemId, quantity } = req.body;
        const { userId } = req.user as { userId: string };

        const order = await prisma.order.findUnique({
            where: {
                id: orderId,
            },
        });

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        if (order.forUser !== userId) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        const existingOrderItem = await prisma.orderItem.findFirst({ where: { orderId: orderId, itemId: itemId, }, });

        if (existingOrderItem) {
            return res.status(400).json({ error: "Item already exists in order" });
        }

        const orderItem = await prisma.orderItem.create({
            data: {
                itemId: itemId,
                quantity: quantity,
                orderId: orderId,
            },
        });

        const updatedOrder = await prisma.order.update({
            where: {
                id: orderId,
            },
            data: {
                items: {
                    connect: {
                        id: orderItem.id,
                    },
                },
            },
        });

        res.status(200).json(updatedOrder);
    } catch (error) {
        res.status(500).json({ error: "Failed to add item to order" });
    }
});

router.patch("/:orderId/updateQuantity", async (req, res) => {
    // Ensure order for order ID is for current user
    try {
        const { orderId } = req.params;
        const { orderItemId, quantity } = req.body;
        const { userId } = req.user as { userId: string };

        const order = await prisma.order.findUnique({
            where: {
                id: orderId,
            },
        });

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        if (order.forUser !== userId) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        const existingOrderItem = await prisma.orderItem.findFirst({ where: { id: orderItemId }, });

        if (!existingOrderItem) {
            return res.status(404).json({ error: "Order item not found" });
        }

        const updatedOrder = await prisma.orderItem.update({
            where: {
                id: orderItemId,
            },
            data: {
                quantity: quantity,
            },
        });

        res.status(200).json(updatedOrder);
    } catch (error) {
        res.status(500).json({ error: "Failed to update order item quantity" });
    }
});

router.delete("/:orderId/remove", async (req, res) => {
    try {
        const { orderId } = req.params;
        const { orderItemId } = req.body;
        const { userId } = req.user as { userId: string };

        const order = await prisma.order.findUnique({
            where: {
                id: orderId,
            },
        });

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        if (order.forUser !== userId) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        const existingOrderItem = await prisma.orderItem.findFirst({ where: { id: orderItemId }, });

        if (existingOrderItem) {
            return res.status(400).json({ error: "Item already exists in order" });
        }

        const removedItem = await prisma.orderItem.delete({
            where: {
                id: orderItemId,
            },
        });

        const updatedOrder = await prisma.order.findUnique({
            where: {
                id: orderId,
            },
        });

        res.status(200).json(updatedOrder);
    } catch (error) {
        res.status(500).json({ error: "Failed to remove item from order" });
    }
});

router.delete("/:orderId/abandon", async (req, res) => {
    try {
        const { orderId } = req.params;
        const { userId } = req.user as { userId: string };

        const order = await prisma.order.findUnique({
            where: {
                id: orderId,
            },
        });

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        if (order.forUser !== userId) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        const deletedOrder = await prisma.order.delete({
            where: {
                id: orderId,
            },
        });

        res.status(200).json(deletedOrder);
    } catch (error) {
        res.status(500).json({ error: "Failed to abandon order" });
    }
});

router.get("/:orderId", async (req, res) => {
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

        res.status(200).json(order);
    } catch (error) {
        res.status(500).json({ error: "Failed to remove item from order" });
    }
});

router.get("/active", async (req, res) => {
    try {
        const { userId } = req.user as { userId: string };

        const order = await prisma.order.findMany({
            where: {
                forUser: userId,
                transaction: {
                    is: null
                },
            },
        });

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        res.status(200).json(order);
    } catch (error) {
        res.status(500).json({ error: "Failed to remove item from order" });
    }
});

router.get("/history", async (req, res) => {
    try {
        const { userId } = req.user as { userId: string };

        const order = await prisma.order.findMany({
            where: {
                forUser: userId,
                transaction: {
                    isNot: null,
                },
            },
        });

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        res.status(200).json(order);
    } catch (error) {
        res.status(500).json({ error: "Failed to remove item from order" });
    }
});

export default router;
