import { Router, Response } from "express";
import prisma from "../config/prisma";
import { AuthenticatedRequest } from "../interfaces";
import { hasRole, isAuthenticated, restaurantExists, isOrderForUser } from "../middleware";

const router = Router();

router.post("/new", isAuthenticated, hasRole("customer"), restaurantExists, async (req: AuthenticatedRequest, res: Response) => {
    // Create new order for current user
    try {
        const userId = req.user.sub;
        const { restaurantId } = req.body;

        console.timeLog(`RestaurantID: ${restaurantId}`)

        // Ensure the restaurant exists
        const restaurant = await fetch(`http://${process.env.RESTAURANT_SERVICE_URL ?? 'restaurant'}/internal/restaurants/${restaurantId}`);
        if (!restaurant.ok) {
            return res.status(404).json({
                error: {
                    message: "Restaurant not found"
                }
            });
        }

        console.log(`Restaurant found: ${restaurantId}`)

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
                    message: "Order cannot be created"
                }
            });
        }

        res.status(200).json({
            data: newOrder
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

router.put("/:orderId/add", isAuthenticated, hasRole("customer"), isOrderForUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user.sub;
        const { orderId } = req.params;
        const { itemId, quantity } = req.body;

        // Get the order
        const order = await prisma.order.findFirst({
            where: {
                id: orderId,
            },
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
            `http://${process.env.RESTAURANT_SERVICE_URL ?? 'restaurant'}/internal/items`,
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
                    message: "Item not found"
                }
            });
        }

        // Unwrap item details
        const itemDetails = await itemDetailsReq.json();

        // Ensure item is available
        if (!itemDetails.data.isAvailable) {
            return res.status(410).json({
                error: {
                    message: "Item not available for order"
                }
            });
        }

        // Ensure item is not in order yet
        const existingOrderItem = await prisma.orderItem.findFirst({ where: { orderId: orderId, itemId: itemId, }, });
        if (existingOrderItem) {
            return res.status(400).json({
                error: {
                    message: "Item already in order",
                    details: "Once item is in order, update quantity instead of adding again."
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
        });

        res.status(200).json({
            data: updatedOrder
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to add item to order" });
    }
});

router.patch("/:orderId/updateQuantity", isAuthenticated, hasRole("customer"), isOrderForUser, async (req: AuthenticatedRequest, res: Response) => {
    // Ensure order for order ID is for current user
    try {
        const { orderItemId, quantity } = req.body;
        const userId = req.user.sub;

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

        res.status(200).json({
            data: updatedOrder
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to update order item quantity" });
    }
});

router.delete("/:orderId/remove", isAuthenticated, hasRole("customer"), isOrderForUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { orderId } = req.params;
        const { orderItemId } = req.body;

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
        });

        res.status(200).json({
            data: updatedOrder
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to remove item from order" });
    }
});

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
