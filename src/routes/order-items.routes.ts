import { Router, Response } from "express";
import prisma from "../config/prisma";
import { AuthenticatedRequest } from "../interfaces";
import { hasRole, isAuthenticated, isOrderForUser } from "../middleware";

const router = Router();

router.post("", isAuthenticated, hasRole("customer"), isOrderForUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { orderId } = req.params;
        const { items } = req.body;

        // Get the order
        const order = await prisma.order.findFirst({
            where: {
                id: orderId,
            }
        });
        if (!order) {
            return res.status(404).json({
                error: {
                    message: "Order not found"
                }
            });
        }

        // Extract item IDs
        const itemIds = items.map((item: { id: string, quantity: number }) => item.id);

        // Ensure items exist
        const itemDetailsReq = await fetch(
            `http://${process.env.RESTAURANT_SERVICE_URL ?? 'restaurant:3000'}/internal/items`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ restaurantId: order.forRestaurant, itemIds: itemIds }),
            }    
        );

        if (!itemDetailsReq.ok) {
            return res.status(404).json({
                error: {
                    message: "Item not found",
                    details: await itemDetailsReq.json()
                }
            });
        }

        // Ensure item ids balance with item details
        const itemDetails = await itemDetailsReq.json();
        if (itemDetails.data.length !== items.length) {
            return res.status(400).json({
                error: {
                    message: "Item details mismatch",
                    details: "Ensure all items are valid"
                }
            });
        }

        // Ensure items are not yet in order
        const existingOrderItems = await prisma.orderItem.findMany({
            where: {
                orderId: orderId,
                itemId: {
                    in: itemIds,
                },
            },
        });

        if (existingOrderItems.length > 0) {
            return res.status(400).json({
                error: {
                    message: "Doing it wrong: Items already in order",
                    details: "Update the quantity instead of adding again."
                }
            });
        }

        // Create order items
        const orderItems = await prisma.orderItem.createMany({
            data: items.map((item: { id: string, quantity: number }) => ({
                quantity: item.quantity,
                price: itemDetails.data.find((i: any) => i.id === item.id).price,
                order: {
                    connect: {
                        id: orderId,
                    },
                },
                itemId: item.id,
            })),
        });

        if (!orderItems) {
            return res.status(500).json({ error: "Failed to add items to order" });
        }

        const updatedOrder = await prisma.order.findFirst({
            where: {
                id: orderId,
            },
            include: {
                items: true,
                transaction: true
            }
        });

        res.status(200).json({
            data: updatedOrder
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to add items to order" });
    }
})

router.put("/:itemId", isAuthenticated, hasRole("customer"), isOrderForUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { orderId, itemId } = req.params;
        const { quantity } = req.body;

        // Get the order
        const order = await prisma.order.findFirst({
            where: {
                id: orderId,
            }
        });
        if (!order) {
            return res.status(404).json({
                error: {
                    message: "Order not found"
                }
            });
        }

        // Get item details from restaurant service
        const itemDetailsReq = await fetch(
            `http://${process.env.RESTAURANT_SERVICE_URL ?? 'restaurant:3000'}/internal/items`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ restaurantId: order.forRestaurant, itemIds: [itemId] }),
            }    
        );

        // Ensure item exists
        if (!itemDetailsReq.ok) {
            return res.status(404).json({
                error: {
                    message: "Item not found",
                    details: await itemDetailsReq.json()
                }
            });
        }

        // Unwrap item details
        const itemDetails = await itemDetailsReq.json();

        // Ensure item is available
        if (!itemDetails.data.isAvailable) {
            return res.status(410).json({
                error: {
                    message: "Item not available to order at this time."
                }
            });
        }

        // Ensure item is not in order yet
        const existingOrderItem = await prisma.orderItem.findFirst({ where: { orderId: orderId, itemId: itemId, }, });
        if (existingOrderItem) {
            return res.status(400).json({
                error: {
                    message: "Doing it wrong: Item already in order",
                    details: "Update the quantity instead of adding again."
                }
            });
        }

        // Create order item using details of it
        const orderItem = await prisma.orderItem.create({
            data: {
                quantity: quantity,
                price: itemDetails.data.price,
                order: {
                    connect: {
                        id: orderId,
                    },
                },
                itemId: itemId,
            },
        });

        if (!orderItem) {
            return res.status(500).json({ error: "Failed to add item to order" });
        }

        const updatedOrder = await prisma.order.findFirst({
            where: {
                id: orderId,
            },
            include: {
                items: true,
                transaction: true
            }
        });

        res.status(200).json({
            data: updatedOrder
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to add item to order" });
    }
});


router.patch("/:orderItemId/updateQuantity", isAuthenticated, hasRole("customer"), isOrderForUser, async (req: AuthenticatedRequest, res: Response) => {
    // Ensure order for order ID is for current user
    try {
        const { orderId, orderItemId } = req.params;
        const { quantity } = req.body;

        if (quantity < 1) {
            return res.status(400).json({
                error: {
                    message: "Quantity must be at least 1",
                    details: "To remove item from order, use the /remove endpoint."
                }
            });
        }

        const existingOrderItem = await prisma.orderItem.findFirst({ where: { id: orderItemId }, });

        if (!existingOrderItem) {
            return res.status(404).json({
                error: {
                    message: "Order item not found"
                }
            });
        }

        const updatedOrder = await prisma.orderItem.update({
            where: {
                id: orderItemId,
            },
            data: {
                quantity: quantity,
            },
        });

        if (!updatedOrder) {
            return res.status(500).json({
                error: {
                    message: "Failed to update order item quantity"
                }
            });
        }

        const order = await prisma.order.findUnique({
            where: {
                id: existingOrderItem.orderId,
            },
            include: {
                items: true,
                transaction: true
            }
        });

        res.status(200).json({
            data: order
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to update order item quantity" });
    }
});

router.delete("/:orderItemId", isAuthenticated, hasRole("customer"), isOrderForUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { orderId, orderItemId } = req.params;

        const existingOrderItem = await prisma.orderItem.findFirst({ where: { id: orderItemId }, });

        if (!existingOrderItem) {
            return res.status(400).json({
                error: {
                    message: "Order item not found",
                    details: "Ensure order item ID is correct"
                }
            });
        }

        const removedItem = await prisma.orderItem.delete({
            where: {
                id: orderItemId,
            },
        });

        if (!removedItem) {
            return res.status(500).json({
                error: {
                    message: "Failed to remove item from order",
                }
            });
        }

        const updatedOrder = await prisma.order.findUnique({
            where: {
                id: orderId,
            },
            include: {
                items: true,
                transaction: true
            }
        });

        res.status(200).json({
            data: updatedOrder
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to remove item from order" });
    }
});

export default router;