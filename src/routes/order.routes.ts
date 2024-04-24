import { Router, Response } from "express";
import prisma from "../config/prisma";
import { AuthenticatedRequest } from "../interfaces";
import { hasRole, isAuthenticated, restaurantExists, isOrderForUser } from "../middleware";
import { OrderItem } from "@prisma/client";

const router = Router({ mergeParams: true });

router.post("/", isAuthenticated, hasRole("customer"), restaurantExists, async (req: AuthenticatedRequest, res: Response) => {
    try {
        // Create new order for current user
        const userId = req.user.sub;
        const { restaurantId, items } = req.body;

        // Extract item IDs
        const itemIds = items.map((item: any) => item.id);

        // Ensure items exist
        const itemDetailsReq = await fetch(
            `http://${process.env.RESTAURANT_SERVICE_URL ?? 'restaurant:3000'}/internal/items`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ restaurantId: restaurantId, itemIds: itemIds }),
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

        // Create new order
        const newOrder = await prisma.order.create({
            data: {
                forUser: userId,
                forRestaurant: restaurantId.toString(),
            },
        })

        if (!newOrder) {
            return res.status(500).json({
                error: {
                    message: "Order failed to be created"
                }
            });
        }

        console.log("Order created")

        // Create order items
        const orderItems = items.map((item: any) => {
            const itemDetail = itemDetails.data.find((detail: any) => detail.id === item.id);

            return prisma.orderItem.create({
                data: {
                    order: {
                        connect: {
                            id: newOrder.id,
                        },
                    },
                    itemId: item.id,
                    price: itemDetail.price,
                    quantity: item.quantity,
                },
            });
        });

        await prisma.$transaction(orderItems);

        console.log("Order items created")

        const order = await prisma.order.findUnique({
            where: {
                id: newOrder.id,
            },
            include: {
                items: true,
            },
        });

        res.status(200).json({
            data: order
        });
    } catch (error) {
        res.status(500).json({
            error: {
                message: "Failed to create new order",
                details: error
            }
        });
    }
});

router.get("/:orderId", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { orderId } = req.params;

        const order = await prisma.order.findUnique({
            where: {
                id: orderId,
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
                message: "Failed to remove item from order",
                details: error
            }
        });
    }
});

router.delete("/:orderId", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { orderId } = req.params;

        const order = await prisma.order.delete({
            where: {
                id: orderId,
            },
        });

        res.status(200).json({
            data: order
        });
    } catch (error) {
        res.status(500).json({
            error: {
                message: "Failed to remove item from order",
                details: error
            }
        });
    }
});

router.post("/:orderId/checkout", isAuthenticated, hasRole("customer"), isOrderForUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { orderId } = req.params;
        const userId = req.user.sub;
        
        console.log("Checking out order")

        // Ensure order is not checked out already
        const existingTransaction = await prisma.transaction.findFirst({
            where: {
                orderId: orderId,
            },
        });

        if (existingTransaction) {
            return res.status(403).json({
                error: {
                    message: "Order already checked out."
                }
            });
        }

        console.log("Order validated as not checked out")

        // Get latest order
        const order = await prisma.order.findUnique({
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
            },
        });

        console.log("Transaction created")

        // Send order to kitchen service
        const sendOrderToKitchenReq = await fetch(`http://${process.env.KITCHEN_SERVICE_URL ?? 'kitchen:3000'}/internal/orders/receive`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Request-From": "tableside-order"
            },
            body: JSON.stringify({
                restaurantId: order.forRestaurant,
                orderId: orderId,
                userId: userId,
                items: order.items.map((item: OrderItem) => ({
                    itemId: item.itemId,
                    quantity: item.quantity,
                })),
            }),
        });

        // Circuit break: order could not be sent to kitchen
        if (!sendOrderToKitchenReq.ok) {
            // Remove order transaction from database
            await prisma.transaction.delete({
                where: {
                    id: transaction.id,
                }
            });

            console.log('Failed to send order to kitchen')

            return res.status(500).json({
                error: {
                    message: "Failed to send order to kitchen.",
                    details: await sendOrderToKitchenReq.json()
                }
            });
        }

        console.log("Order sent to kitchen")

        const completedOrder = await prisma.order.findUnique({
            where: {
                id: orderId,
            },
            include: {
                items: true,
                transaction: true
            },
        });

        console.log("Order check out completed")

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
