import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../interfaces';
import prisma from "../config/prisma";

const isOrderForUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    console.log(`Request params: ${JSON.stringify(req.params)}`)
    const { orderId } = req.params;
    const userId = req.user.sub;
    const order = await prisma.order.findUnique({
        where: {
            id: orderId,
            transaction: null
        }
    });

    if (!order) {
        res.status(404).json({
            error: {
                message: "Order not found"
            }
        });
        return;
    }
    
    if (order.forUser !== userId) {
        res.status(403).json({
            error: {
                message: "Unauthorized",
                details: "Order is not for this user"
            }
        });
        return;
    }
    
    next();
}

export default isOrderForUser;