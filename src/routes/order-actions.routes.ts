import { Router, Response } from "express";
import prisma from "../config/prisma";
import { AuthenticatedRequest } from "../interfaces";
import { hasRole, isAuthenticated, restaurantExists, isOrderForUser } from "../middleware";
import { OrderItem } from "@prisma/client";

const router = Router();

router.delete("/:orderId/abandon", isAuthenticated, hasRole("customer"), isOrderForUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { orderId } = req.params;

        // Ensure order is not checked out
        const existingTransaction = await prisma.transaction.findFirst({
            where: {
                orderId: orderId,
            },
        });

        if (existingTransaction) {
            return res.status(403).json({
                error: {
                    message: "Order cannot be abandoned",
                    details: "Order has already been checked out."
                }
            });
        }

        // Delete order
        const deletedOrder = await prisma.order.delete({
            where: {
                id: orderId,
            },
        });

        if (!deletedOrder) {
            return res.status(404).json({
                error: {
                    message: "Order not deleted",
                    details: "Order could not be found. Ensure ID is correct and that order has not been deleted already."
                }
            });
        }

        res.status(200).json({
            data: deletedOrder
        });
    } catch (error) {
        res.status(500).json({
            error: {
                message: "Failed to abandon order",
                details: error
            }
        });
    }
});

router.post("/:orderId/checkout", isAuthenticated, hasRole("customer"), isOrderForUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { orderId } = req.params;
        const userId = req.user.sub;

        // Ensure order is not checked out already
        const existingTransaction = await prisma.transaction.findFirst({
            where: {
                orderId: orderId,
            },
        });

        if (existingTransaction) {
            return res.status(403).json({
                error: {
                    message: "Order cannot be abandoned",
                    details: "Order has already been checked out."
                }
            });
        }
        // Get order details
        let order = await prisma.order.findUnique({
            where: {
                id: orderId,
            },
            include: {
                items: true,
            },
        });

        // Fetch latest order item details
        const itemIds = order.items.map((item: OrderItem) => item.itemId);
        const itemDetailsReq = await fetch(`${process.env.RESTAURANT_SERVICE_URL ?? 'restaurant'}/internal/items`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Request-From": "tableside-order"
            },
            body: JSON.stringify({ itemIds }),
        });
        const itemDetails = await itemDetailsReq.json();
        
        // Update order item prices
        const orderItemUpdates = itemDetails.map((item: { id: string, isAvailable: boolean, price: number }) => {
            // Find corresponding item in order
            const orderItem = order.items.find((orderItem: OrderItem) => orderItem.itemId === item.id);

            if (item.isAvailable === false) {
                return prisma.orderItem.delete({
                    where: {
                        id: orderItem.id,
                    },
                });
            }

            return prisma.orderItem.update({
                where: {
                    id: item.id,
                },
                data: {
                    price: item.price,
                },
            });
        });
        await prisma.$transaction(orderItemUpdates); // Do as transaction in order to ensure order is updated atomically

        // Get latest order
        order = await prisma.order.findUnique({
            where: {
                id: orderId,
            },
            include: {
                items: true,
            },
        });

        // Create transaction
        const transaction = await prisma.transaction.create({
            data: {
                amount: order.items.reduce((acc, item: OrderItem) => acc + (item.price.toNumber() * item.quantity), 0),
                order: {
                    connect: {
                        id: orderId,
                    },
                },
                currency: "GBP" // todo: obtain currency from restaurant service
            },
        });

        const completedOrder = await prisma.order.update({
            where: {
                id: orderId,
            },
            data: {
                transaction: {
                    connect: {
                        id: transaction.id,
                    },
                },
            },
        });

        // Send order to kitchen service
        const sendOrderToKitchenReq = await fetch(`${process.env.KITCHEN_SERVICE_URL ?? 'restaurant'}/internal/orders/receive`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Request-From": "tableside-order"
            },
            body: JSON.stringify({
                restaurantId: completedOrder.forRestaurant,
                orderId: orderId,
                userId: userId,
                items: order.items.map((item: OrderItem) => ({
                    itemId: item.itemId,
                    quantity: item.quantity,
                })),
            }),
        });

        // Circuit break: order could not be sent to kitchen
        const sendOrderToKitchenResBody = await sendOrderToKitchenReq.json();
        if (!sendOrderToKitchenReq.ok) {
            // Remove order transaction from database
            await prisma.transaction.delete({
                where: {
                    id: transaction.id,
                },
            });

            return res.status(500).json({
                error: {
                    message: "Failed to send order to kitchen.",
                    details: await sendOrderToKitchenResBody.json()
                }
            });
        }

        res.status(200).json({
            data: completedOrder
        });
    } catch (error) {
        res.status(500).json({
            error: {
                message: "Failed to checkout order",
                details: error
            }
        });
    }
});

export default router;
