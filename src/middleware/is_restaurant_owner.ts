import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../interfaces';
import prisma from "../config/prisma";

const isRestaurantOwner = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const restaurantId = req.params.restaurantId;
    const userId = req.user.sub;
    const restaurant = await prisma.restaurant.findUnique({
        where: {
            id: restaurantId
        },
        include: {
            restaurantOwners: true
        }
    });

    if (!restaurant) {
        res.status(404).json({
            error: {
                message: "Restaurant not found"
            }
        });
        return;
    }

    const isOwner = restaurant.restaurantOwners.some(owner => owner.userId === userId);
    if (!isOwner) {
        res.status(403).json({
            error: {
                message: "Forbidden",
                details: "User is not the owner of the restaurant"
            }
        });
        return;
    }
    
    next();
}

export default isRestaurantOwner;